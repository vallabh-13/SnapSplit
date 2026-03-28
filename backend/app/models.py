from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import shortuuid


class ReceiptItem(BaseModel):
    id: str = Field(default_factory=lambda: shortuuid.uuid()[:8])
    name: str
    price: float
    quantity: int = 1
    claimed_by: list[str] = []  # list of participant names


class Receipt(BaseModel):
    subtotal: float
    tax: float
    tip: float
    total: float
    items: list[ReceiptItem]


class Participant(BaseModel):
    name: str
    joined_at: datetime = Field(default_factory=datetime.utcnow)


class Room(BaseModel):
    code: str = Field(default_factory=lambda: shortuuid.uuid()[:6].upper())
    created_at: datetime = Field(default_factory=datetime.utcnow)
    receipt: Optional[Receipt] = None
    participants: list[str] = []  # participant names
    host: str = ""


class ClaimRequest(BaseModel):
    item_id: str
    participant_name: str
    action: str  # "claim" or "unclaim"


class TipTaxUpdate(BaseModel):
    tip: float
    tax: float


class PersonSummary(BaseModel):
    name: str
    items: list[dict]
    subtotal: float
    tax_share: float
    tip_share: float
    total: float


class RoomSummary(BaseModel):
    room_code: str
    participants: list[PersonSummary]
    receipt_total: float
