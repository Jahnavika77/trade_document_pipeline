from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Optional

class ExtractedField(BaseModel):
    value: str = ""
    confidence: float = 0.0

class ExtractionResult(BaseModel):
    consignee_name: ExtractedField
    hs_code: ExtractedField
    port_of_loading: ExtractedField
    port_of_discharge: ExtractedField
    incoterms: ExtractedField
    description_of_goods: ExtractedField
    gross_weight: ExtractedField
    invoice_number: ExtractedField

class ValidationStatus(str, Enum):
    MATCH = "match"
    MISMATCH = "mismatch"
    UNCERTAIN = "uncertain"

class FieldValidationResult(BaseModel):
    status: ValidationStatus
    expected: str
    found: str
    message: str

class ValidationResult(BaseModel):
    consignee_name: FieldValidationResult
    hs_code: FieldValidationResult
    port_of_loading: FieldValidationResult
    port_of_discharge: FieldValidationResult
    incoterms: FieldValidationResult
    description_of_goods: FieldValidationResult
    gross_weight: FieldValidationResult
    invoice_number: FieldValidationResult

class RuleSet(BaseModel):
    consignee_name: str = ""
    hs_code: str = ""
    port_of_loading: str = ""
    port_of_discharge: str = ""
    incoterms: str = ""
    description_of_goods: str = ""
    gross_weight: str = ""
    invoice_number: str = ""

class RoutingOutcome(str, Enum):
    AUTO_APPROVE = "auto_approve"
    FLAG_FOR_REVIEW = "flag_for_review"
    DRAFT_AMENDMENT = "draft_amendment"

class RouterDecision(BaseModel):
    outcome: RoutingOutcome
    reasoning: str
    draft_email: str

class CrossDocumentIssue(BaseModel):
    field_name: str
    values_by_document: dict
    message: str

class ShipmentStatus(str, Enum):
    INCOMING = "incoming"
    PROCESSING = "processing"
    VERIFIED = "verified"
    REVIEW_REQUIRED = "review_required"
    FAILED = "failed"

class ProcessShipmentResponse(BaseModel):
    shipment_id: str
    status: ShipmentStatus
    decision: Optional[RouterDecision] = None
    cross_document_issues: List[CrossDocumentIssue] = Field(default_factory=list)

class ShipmentListItem(BaseModel):
    id: str
    customer_name: str
    subject: str
    status: str
    created_at: str

class ShipmentDetails(BaseModel):
    shipment_id: str
    status: str
    customer_name: str
    subject: str
    documents: List[dict]
    validation_results: List[dict]
    cross_document_issues: List[dict]
    decision: Optional[dict] = None
