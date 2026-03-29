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


def set_item_claimers(code: str, item_id: str, shares: dict[str, float]) -> Optional[Room]:
    room = get_room(code)
    if room is None or room.receipt is None:
        return None
    for item in room.receipt.items:
        if item.id == item_id:
            item.shares = {k: v for k, v in shares.items() if v > 0}
            item.claimed_by = list(item.shares.keys())
            break
    return room


def update_tip_tax(code: str, tip: float, tax: float) -> Optional[Room]:
    room = get_room(code)
    if room is None or room.receipt is None:
        return None
    room.receipt.tip = tip
    room.receipt.tax = tax
    room.receipt.total = round(room.receipt.subtotal + tax + tip, 2)
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

    unclaimed_items = []
    for item in items:
        claimed_units = sum(item.shares.values()) if item.shares else 0
        unclaimed_units = round(item.quantity - claimed_units, 6)

        if unclaimed_units > 0.001:
            unclaimed_items.append({
                "name": item.name,
                "total": round(unclaimed_units * item.price, 2),
                "unclaimed_units": round(unclaimed_units, 4),
                "total_units": item.quantity,
            })

        if not item.shares:
            continue

        for person, units in item.shares.items():
            if units <= 0:
                continue
            person_price = round(units * item.price, 4)
            if person not in person_items:
                person_items[person] = []
                person_subtotals[person] = 0.0
            person_items[person].append({
                "name": item.name,
                "price": person_price,
                "units": units,
                "unit_price": item.price,
                "total_units": item.quantity,
            })
            person_subtotals[person] += person_price

    # Use actual item sum as base so that sum(person totals) == receipt.total
    actual_subtotal = round(sum(i.price * i.quantity for i in items), 2)
    tax_rate = receipt.tax / actual_subtotal if actual_subtotal > 0 else 0
    tip_rate = receipt.tip / actual_subtotal if actual_subtotal > 0 else 0

    summaries = []
    for person in room.participants:
        subtotal = round(person_subtotals.get(person, 0.0), 2)
        tax_share = round(subtotal * tax_rate, 2)
        tip_share = round(subtotal * tip_rate, 2)
        total = round(subtotal + tax_share + tip_share, 2)
        summaries.append({
            "name": person,
            "items": person_items.get(person, []),
            "subtotal": subtotal,
            "tax_share": tax_share,
            "tip_share": tip_share,
            "total": total,
        })

    allocated_total = round(sum(s["total"] for s in summaries), 2)

    return {
        "room_code": code,
        "participants": summaries,
        "receipt_total": receipt.total,
        "allocated_total": allocated_total,
        "unclaimed_items": unclaimed_items,
        "tax_rate": round(tax_rate * 100, 4),
        "tip_rate": round(tip_rate * 100, 4),
    }
