import base64
import os
import fitz
from typing import List
from openai import OpenAI
from app.models.schemas import (
    ExtractionResult,
    ValidationResult,
    RuleSet,
    ValidationStatus,
    FieldValidationResult,
    RouterDecision,
)
from app.core.config import settings

client = OpenAI(api_key=settings.openai_api_key)

class ExtractorAgent:
    def __init__(self, model: str = "gpt-4o"):
        self.model = model

    def _pdf_to_base64_images(self, pdf_path: str) -> List[str]:
        doc = fitz.open(pdf_path)
        pages = []
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(dpi=150)
            pages.append(base64.b64encode(pix.tobytes("png")).decode("utf-8"))
        return pages

    def extract(self, file_path: str) -> ExtractionResult:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Missing file: {file_path}")

        if file_path.lower().endswith(".pdf"):
            images = self._pdf_to_base64_images(file_path)
        else:
            with open(file_path, "rb") as f:
                images = [base64.b64encode(f.read()).decode("utf-8")]

        content = [{"type": "text", "text": "Extract trade fields. If missing return empty string and 0.0 confidence."}]
        for img in images:
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{img}", "detail": "high"}
            })

        response = client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert trade document analyzer."},
                {"role": "user", "content": content},
            ],
            response_format=ExtractionResult,
        )
        return response.choices[0].message.parsed

class ValidatorAgent:
    def __init__(self, confidence_threshold: float = 0.8):
        self.confidence_threshold = confidence_threshold

    def _validate_field(self, expected: str, extracted) -> FieldValidationResult:
        found = extracted.value
        conf = extracted.confidence

        if expected == "":
            return FieldValidationResult(status=ValidationStatus.MATCH, expected=expected, found=found, message="Field not required by rules.")
        if conf < self.confidence_threshold:
            return FieldValidationResult(
                status=ValidationStatus.UNCERTAIN,
                expected=expected,
                found=found,
                message=f"Low confidence ({conf:.2f})."
            )
        if found.strip().lower() != expected.strip().lower():
            return FieldValidationResult(
                status=ValidationStatus.MISMATCH,
                expected=expected,
                found=found,
                message=f"Expected '{expected}', found '{found}'."
            )
        return FieldValidationResult(status=ValidationStatus.MATCH, expected=expected, found=found, message="Field matches.")

    def validate(self, extraction: ExtractionResult, rules: RuleSet) -> ValidationResult:
        out = {}
        for f in RuleSet.model_fields.keys():
            out[f] = self._validate_field(getattr(rules, f), getattr(extraction, f))
        return ValidationResult(**out)

class RouterAgent:
    def __init__(self, model: str = "gpt-4o-mini"):
        self.model = model

    def decide(self, validation_payload: dict) -> RouterDecision:
        prompt = f"""
You are Router Agent. Your goal is to decide the next step and DRAFT A REPLY EMAIL.

OUTCOME RULES:
1) Any mismatch or cross-document issue => outcome: "draft_amendment".
2) No mismatches but low confidence (uncertain) exists => outcome: "flag_for_review".
3) All fields match with high confidence => outcome: "auto_approve".

EMAIL CONTENT RULES:
- If drafting an amendment: Be polite but firm. List the specific fields that mismatch and from which documents.
- If auto-approving: Confirm that all documents are verified and correct.
- If flagging for review: State that some fields were hard to read and need manual verification.
- Provide a professional email_subject (e.g., "Amendment Required for Shipment #...").
- Always sign as "Nova Trade Support".

Validation payload:
{validation_payload}
"""
        response = client.beta.chat.completions.parse(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a logistics routing decision engine."},
                {"role": "user", "content": prompt},
            ],
            response_format=RouterDecision,
        )
        return response.choices[0].message.parsed
