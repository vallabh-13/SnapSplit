from app.models import Room, ReceiptItem, Receipt
from typing import Optional
import shortuuid

# In-memory store (replace with Redis/DB for production)
_rooms: dict[str, Room] = {}


def create_room(host_name: str) -> Room:
    room = Room(host=host_name)
    room.participants.append(host_name)
    _rooms[room.code] = room
    return room


def get_room(code: str) -> Optional[Room]:
    return _rooms.get(code.upper())


def join_room(code: str, participant_name: str) -> Optional[Room]:
    room = get_room(code)
    if room is None:
        return None
    if participant_name not in room.participants:
        room.participants.append(participant_name)
    return room


def set_receipt(code: str, receipt: Receipt) -> Optional[Room]:
    room = get_room(code)
    if room is None:
        return None
    room.receipt = receipt
    return room


def claim_item(code: str, item_id: str, participant_name: str, action: str) -> Optional[Room]:
    room = get_room(code)
    if room is None or room.receipt is None:
        return None

    for item in room.receipt.items:
        if item.id == item_id:
            if action == "claim" and participant_name not in item.claimed_by:
                item.claimed_by.append(participant_name)
            elif action == "unclaim" and participant_name in item.claimed_by:
                item.claimed_by.remove(participant_name)
            break

    return room


def set_item_claimers(code: str, item_id: str, claimers: list[str]) -> Optional[Room]:
    room = get_room(code)
    if room is None or room.receipt is None:
        return None
    for item in room.receipt.items:
        if item.id == item_id:
            item.claimed_by = [c for c in claimers if c]
            break
    return room


def update_tip_tax(code: str, tip: float, tax: float) -> Optional[Room]:
    room = get_room(code)
    if room is None or room.receipt is None:
        return None
    room.receipt.tip = tip
    room.receipt.tax = tax
    return room


def compute_summary(code: str) -> Optional[dict]:
    room = get_room(code)
    if room is None or room.receipt is None:
        return None

    receipt = room.receipt
    items = receipt.items

    # Calculate each participant's item subtotal
    person_items: dict[str, list] = {p: [] for p in room.participants}
    person_subtotals: dict[str, float] = {p: 0.0 for p in room.participants}

    for item in items:
        if not item.claimed_by:
            continue
        split_price = round((item.price * item.quantity) / len(item.claimed_by), 2)
        for person in item.claimed_by:
            if person not in person_items:
                person_items[person] = []
                person_subtotals[person] = 0.0
            person_items[person].append({
                "name": item.name,
                "price": split_price,
                "original_price": item.price,
                "quantity": item.quantity,
                "split_with": len(item.claimed_by),
            })
            person_subtotals[person] += split_price

    total_subtotal = sum(person_subtotals.values()) or receipt.subtotal or 1

    summaries = []
    for person in room.participants:
        subtotal = person_subtotals.get(person, 0.0)
        proportion = subtotal / total_subtotal if total_subtotal > 0 else 0
        tax_share = round(receipt.tax * proportion, 2)
        tip_share = round(receipt.tip * proportion, 2)
        total = round(subtotal + tax_share + tip_share, 2)
        summaries.append({
            "name": person,
            "items": person_items.get(person, []),
            "subtotal": round(subtotal, 2),
            "tax_share": tax_share,
            "tip_share": tip_share,
            "total": total,
        })

    return {
        "room_code": code,
        "participants": summaries,
        "receipt_total": receipt.total,
    }
