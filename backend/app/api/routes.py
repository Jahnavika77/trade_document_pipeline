from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pathlib import Path
import shutil

from app.models.schemas import ShipmentListItem
from app.services.pipeline import (
    create_shipment,
    process_shipment,
    list_shipments,
    get_shipment_details,
)
from app.services.query import nlp_query

router = APIRouter()

@router.get("/health")
def health():
    return {"ok": True}

@router.post("/shipments/ingest")
def ingest_shipment(
    customer_name: str = Form(...),
    subject: str = Form(...),
    files: list[UploadFile] = File(...),
):
    temp_dir = Path("backend/tmp_uploads")
    temp_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for f in files:
        dst = temp_dir / f.filename
        with dst.open("wb") as out:
            shutil.copyfileobj(f.file, out)
        paths.append(str(dst))

    shipment_id = create_shipment(customer_name, subject, paths)
    return {"shipment_id": shipment_id, "status": "incoming"}

@router.post("/shipments/{shipment_id}/process")
def run_process(shipment_id: str):
    try:
        return process_shipment(shipment_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/shipments")
def shipments(limit: int = 50):
    rows = list_shipments(limit)
    return [ShipmentListItem(id=r["id"], customer_name=r["customer_name"], subject=r["subject"], status=r["status"], created_at=r["created_at"]) for r in rows]

@router.get("/shipments/{shipment_id}")
def shipment_details(shipment_id: str):
    try:
        return get_shipment_details(shipment_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/query")
def query(payload: dict):
    question = payload.get("question", "")
    if not question:
        raise HTTPException(status_code=400, detail="question is required")
    try:
        return nlp_query(question)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
from app.services.email_service import send_trade_email

@router.post("/shipments/{shipment_id}/send-email")
def send_email(shipment_id: str, payload: dict):
    subject = payload.get("subject", "Trade Document Verification")
    body = payload.get("body", "")
    if not body:
        raise HTTPException(status_code=400, detail="Email body is required")
    
    try:
        send_trade_email(subject, body)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Email failed: {str(e)}")
