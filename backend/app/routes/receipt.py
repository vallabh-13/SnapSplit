from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from app.services.claude_service import extract_receipt_items, validate_receipt_image
from app.services import room_service
from app.models import Receipt, ReceiptItem
from app.websocket.manager import manager
import shortuuid
import traceback
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/receipt", tags=["receipt"])

ALLOWED_MEDIA_TYPES = {
    "image/jpeg": "image/jpeg",
    "image/png": "image/png",
    "image/webp": "image/webp",
    "image/gif": "image/gif",
}


@router.post("/validate")
async def validate_receipt(file: UploadFile = File(...)):
    content_type = file.content_type or "image/jpeg"
    if content_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {content_type}")

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 20 MB)")

    try:
        is_receipt = await validate_receipt_image(image_bytes, ALLOWED_MEDIA_TYPES[content_type])
    except Exception as e:
        logger.error("Validation error:\n%s", traceback.format_exc())
        # On error, allow through so the main scan can handle it
        is_receipt = True

    return {"is_receipt": is_receipt}


@router.post("/scan")
async def scan_receipt(
    file: UploadFile = File(...),
    room_code: str = Form(...),
):
    content_type = file.content_type or "image/jpeg"
    if content_type not in ALLOWED_MEDIA_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported image type: {content_type}")

    image_bytes = await file.read()
    if len(image_bytes) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 20 MB)")

    try:
        data = await extract_receipt_items(image_bytes, ALLOWED_MEDIA_TYPES[content_type])
    except Exception as e:
        logger.error("Gemini API error:\n%s", traceback.format_exc())
        raise HTTPException(status_code=502, detail=f"Gemini API error: {str(e)}")

    if not data.get("is_receipt", True):
        raise HTTPException(
            status_code=422,
            detail="NOT_A_RECEIPT"
        )

    # Build receipt model
    items = [
        ReceiptItem(
            id=shortuuid.uuid()[:8],
            name=item["name"],
            price=float(item["price"]),
            quantity=int(item.get("quantity", 1)),
        )
        for item in data.get("items", [])
    ]

    subtotal = float(data.get("subtotal", sum(i.price * i.quantity for i in items)))
    tax = float(data.get("tax", 0))
    tip = float(data.get("tip", 0))
    receipt = Receipt(
        subtotal=subtotal,
        tax=tax,
        tip=tip,
        total=round(subtotal + tax + tip, 2),
        items=items,
    )

    room = room_service.set_receipt(room_code.upper(), receipt)
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")

    # Broadcast updated receipt to all room members
    await manager.broadcast_all(room_code.upper(), {
        "type": "receipt_updated",
        "receipt": receipt.model_dump(),
    })

    return {"receipt": receipt.model_dump()}
