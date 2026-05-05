import json
import os
import shutil
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import List

from app.core.config import settings
from app.db.postgres import get_conn
from app.models.schemas import (
    CrossDocumentIssue,
    ProcessShipmentResponse,
    RuleSet,
    ShipmentStatus,
    ShipmentDetails,
)
from app.services.agents import ExtractorAgent, ValidatorAgent, RouterAgent

EXTRACTION_FIELDS = [
    "consignee_name",
    "hs_code",
    "port_of_loading",
    "port_of_discharge",
    "incoterms",
    "description_of_goods",
    "gross_weight",
    "invoice_number",
]


def load_customer_rules() -> RuleSet:
    with open(settings.customer_rules_path, "r") as f:
        data = json.load(f)
    return RuleSet(**data)


def _save_event(cur, shipment_id: str, event_type: str, payload: dict):
    cur.execute(
        "INSERT INTO shipment_events (shipment_id, event_type, payload) VALUES (%s, %s, %s::jsonb)",
        (shipment_id, event_type, json.dumps(payload)),
    )


def create_shipment(customer_name: str, subject: str, source_paths: List[str]) -> str:
    shipment_id = str(uuid.uuid4())
    storage_dir = Path("backend/storage") / shipment_id
    storage_dir.mkdir(parents=True, exist_ok=True)

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO shipments (id, customer_name, subject, status) VALUES (%s, %s, %s, %s)",
                (shipment_id, customer_name, subject, ShipmentStatus.INCOMING.value),
            )
            for src in source_paths:
                doc_id = str(uuid.uuid4())
                src_path = Path(src)
                dst = storage_dir / src_path.name
                shutil.copy2(src_path, dst)
                cur.execute(
                    "INSERT INTO documents (id, shipment_id, file_name, file_path) VALUES (%s, %s, %s, %s)",
                    (doc_id, shipment_id, src_path.name, str(dst)),
                )
            _save_event(cur, shipment_id, "incoming", {"documents": len(source_paths)})
        conn.commit()

    return shipment_id


def process_shipment(shipment_id: str) -> ProcessShipmentResponse:
    print(f"\n🚀 [PIPELINE] Starting process for Shipment: {shipment_id}")
    rules = load_customer_rules()
    extractor = ExtractorAgent()
    validator = ValidatorAgent()
    router = RouterAgent()

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE shipments SET status=%s WHERE id=%s", (ShipmentStatus.PROCESSING.value, shipment_id))
            cur.execute("SELECT id, file_name, file_path FROM documents WHERE shipment_id=%s", (shipment_id,))
            docs = cur.fetchall()
            print(f"📁 [PIPELINE] Found {len(docs)} documents to process.")

            validations_payload = []
            cross_map = defaultdict(dict)
            for d in docs:
                print(f"🔍 [EXTRACTOR] Processing document: {d['file_name']}...")
                extraction = extractor.extract(d["file_path"])
                print(f"✅ [EXTRACTOR] Extracted {len(EXTRACTION_FIELDS)} fields from {d['file_name']}.")

                print(f"⚖️ [VALIDATOR] Checking fields against customer rules for {d['file_name']}...")
                validation = validator.validate(extraction, rules)
                
                mismatches = [f for f in EXTRACTION_FIELDS if getattr(validation, f).status.value != "match"]
                if mismatches:
                    print(f"⚠️ [VALIDATOR] Found {len(mismatches)} discrepancies in {d['file_name']}: {', '.join(mismatches)}")
                else:
                    print(f"💯 [VALIDATOR] All fields matched in {d['file_name']}.")

                for f in EXTRACTION_FIELDS:
                    ext_field = getattr(extraction, f)
                    cur.execute(
                        "INSERT INTO field_extractions (shipment_id, document_id, field_name, field_value, confidence) VALUES (%s,%s,%s,%s,%s)",
                        (shipment_id, d["id"], f, ext_field.value, ext_field.confidence),
                    )
                    cross_map[f][d["file_name"]] = ext_field.value

                    val_field = getattr(validation, f)
                    cur.execute(
                        "INSERT INTO validation_results (shipment_id, document_id, field_name, status, expected, found, message) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                        (shipment_id, d["id"], f, val_field.status.value, val_field.expected, val_field.found, val_field.message),
                    )

                validations_payload.append({"document": d["file_name"], "validation": validation.model_dump()})

            cross_issues: List[CrossDocumentIssue] = []
            for field_name, values in cross_map.items():
                normalized = {k: (v or "").strip().lower() for k, v in values.items()}
                uniq = {v for v in normalized.values() if v != ""}
                if len(uniq) > 1:
                    issue = CrossDocumentIssue(
                        field_name=field_name,
                        values_by_document=values,
                        message=f"Cross-document mismatch on {field_name}",
                    )
                    cross_issues.append(issue)
                    cur.execute(
                        "INSERT INTO cross_validation_results (shipment_id, field_name, values_by_document, message) VALUES (%s,%s,%s::jsonb,%s)",
                        (shipment_id, field_name, json.dumps(values), issue.message),
                    )

            print(f"🚦 [ROUTER] Deciding final outcome...")
            router_input = {
                "document_validations": validations_payload,
                "cross_document_issues": [i.model_dump() for i in cross_issues],
                "guardrails": {"never_auto_send": True},
            }
            decision = router.decide(router_input)
            print(f"🎯 [ROUTER] Decision: {decision.outcome.value}")
            print(f"📧 [ROUTER] Draft Email generated ({len(decision.draft_email)} chars)")

            has_cross = len(cross_issues) > 0
            if has_cross:
                print(f"🔗 [CROSS-VALIDATOR] Found {len(cross_issues)} cross-document mismatches.")

            status = ShipmentStatus.VERIFIED.value
            if decision.outcome.value != "auto_approve" or has_cross:
                status = ShipmentStatus.REVIEW_REQUIRED.value

            cur.execute(
                "UPDATE shipments SET status=%s, decision_outcome=%s, decision_reasoning=%s, draft_email=%s WHERE id=%s",
                (status, decision.outcome.value, decision.reasoning, decision.draft_email, shipment_id),
            )
            _save_event(cur, shipment_id, "processed", {"status": status, "outcome": decision.outcome.value})
            print(f"✨ [PIPELINE] Finished. Shipment status: {status}\n")

        conn.commit()

    return ProcessShipmentResponse(
        shipment_id=shipment_id,
        status=ShipmentStatus(status),
        decision=decision,
        cross_document_issues=cross_issues,
    )


def list_shipments(limit: int = 50):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, customer_name, subject, status, created_at::text FROM shipments ORDER BY created_at DESC LIMIT %s",
                (limit,),
            )
            return cur.fetchall()


def get_shipment_details(shipment_id: str) -> ShipmentDetails:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, customer_name, subject, status, decision_outcome, decision_reasoning, draft_email FROM shipments WHERE id=%s", (shipment_id,))
            ship = cur.fetchone()
            if not ship:
                raise ValueError("Shipment not found")

            cur.execute("SELECT id, file_name, file_path, created_at::text FROM documents WHERE shipment_id=%s ORDER BY created_at ASC", (shipment_id,))
            documents = cur.fetchall()
            cur.execute("SELECT document_id, field_name, status, expected, found, message FROM validation_results WHERE shipment_id=%s", (shipment_id,))
            validations = cur.fetchall()
            cur.execute("SELECT field_name, values_by_document, message FROM cross_validation_results WHERE shipment_id=%s", (shipment_id,))
            cross = cur.fetchall()

    decision = None
    if ship["decision_outcome"]:
        decision = {
            "outcome": ship["decision_outcome"],
            "reasoning": ship["decision_reasoning"],
            "draft_email": ship["draft_email"],
        }

    return ShipmentDetails(
        shipment_id=ship["id"],
        status=ship["status"],
        customer_name=ship["customer_name"],
        subject=ship["subject"],
        documents=documents,
        validation_results=validations,
        cross_document_issues=cross,
        decision=decision,
    )


def process_inbox_folder(shipment_folder: str):
    folder = Path(shipment_folder)
    if not folder.exists() or not folder.is_dir():
        raise ValueError("Shipment folder does not exist")

    meta_path = folder / "metadata.json"
    if not meta_path.exists():
        raise ValueError("metadata.json missing in shipment folder")

    with open(meta_path, "r") as f:
        meta = json.load(f)

    docs = []
    for p in folder.iterdir():
        if p.name == "metadata.json":
            continue
        if p.suffix.lower() in {".pdf", ".png", ".jpg", ".jpeg"}:
            docs.append(str(p))

    if not docs:
        raise ValueError("No supported attachments found")

    shipment_id = create_shipment(meta.get("customer_name", "Unknown"), meta.get("subject", folder.name), docs)
    return process_shipment(shipment_id)
