from fastapi import APIRouter, HTTPException, Query
from app.services import room_service
from app.models import ClaimRequest, TipTaxUpdate
from app.websocket.manager import manager
import io
import base64

router = APIRouter(prefix="/api/rooms", tags=["rooms"])


@router.post("")
async def create_room(host_name: str = Query(..., min_length=1, max_length=40)):
    room = room_service.create_room(host_name)
    return {"room": room.model_dump(), "code": room.code}


@router.get("/{code}")
async def get_room(code: str):
    room = room_service.get_room(code)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"room": room.model_dump()}


@router.post("/{code}/join")
async def join_room(code: str, participant_name: str = Query(..., min_length=1, max_length=40)):
    room = room_service.join_room(code, participant_name)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")

    await manager.broadcast_all(code.upper(), {
        "type": "participant_joined",
        "name": participant_name,
        "participants": room.participants,
    })

    return {"room": room.model_dump()}


@router.post("/{code}/claim")
async def claim_item(code: str, payload: ClaimRequest):
    room = room_service.claim_item(
        code, payload.item_id, payload.participant_name, payload.action
    )
    if room is None:
        raise HTTPException(status_code=404, detail="Room or item not found")

    # Find the updated item to broadcast
    updated_item = next(
        (i for i in room.receipt.items if i.id == payload.item_id), None
    )

    await manager.broadcast_all(code.upper(), {
        "type": "item_claimed",
        "item_id": payload.item_id,
        "claimed_by": updated_item.claimed_by if updated_item else [],
        "participant_name": payload.participant_name,
        "action": payload.action,
    })

    return {"item": updated_item.model_dump() if updated_item else None}


@router.put("/{code}/items/{item_id}/claimers")
async def set_item_claimers(code: str, item_id: str, shares: dict[str, float]):
    room = room_service.set_item_claimers(code, item_id, shares)
    if room is None:
        raise HTTPException(status_code=404, detail="Room or item not found")

    updated_item = next(
        (i for i in room.receipt.items if i.id == item_id), None
    )

    await manager.broadcast_all(code.upper(), {
        "type": "item_claimed",
        "item_id": item_id,
        "claimed_by": updated_item.claimed_by if updated_item else [],
        "shares": updated_item.shares if updated_item else {},
    })

    return {"item": updated_item.model_dump() if updated_item else None}


@router.patch("/{code}/tip-tax")
async def update_tip_tax(code: str, payload: TipTaxUpdate):
    room = room_service.update_tip_tax(code, payload.tip, payload.tax)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")

    await manager.broadcast_all(code.upper(), {
        "type": "tip_tax_updated",
        "tip": payload.tip,
        "tax": payload.tax,
    })

    return {"tip": payload.tip, "tax": payload.tax}


@router.get("/{code}/summary")
async def get_summary(code: str):
    summary = room_service.compute_summary(code)
    if summary is None:
        raise HTTPException(status_code=404, detail="Room not found or no receipt")
    return summary


@router.get("/{code}/qr")
async def get_qr_code(code: str, base_url: str = Query(...)):
    try:
        import qrcode
        from PIL import Image
    except ImportError:
        raise HTTPException(status_code=500, detail="qrcode library not available")

    room = room_service.get_room(code)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")

    url = f"{base_url}/room/{code}"
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    b64 = base64.b64encode(buf.read()).decode()

    return {"qr_data_url": f"data:image/png;base64,{b64}", "url": url}
