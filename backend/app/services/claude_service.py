from google import genai
from google.genai import types
import json
import re
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

RECEIPT_EXTRACTION_PROMPT = """You are a receipt parser. First, determine whether the image is a valid receipt (restaurant bill, grocery receipt, store invoice, etc.).

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "is_receipt": true,
  "items": [
    {"name": "Item name", "price": 9.99, "quantity": 1}
  ],
  "subtotal": 29.97,
  "tax": 2.40,
  "tip": 0.00,
  "total": 32.37
}

If the image is NOT a receipt (e.g. a selfie, random photo, screenshot, document, etc.), return:
{
  "is_receipt": false,
  "items": [],
  "subtotal": 0,
  "tax": 0,
  "tip": 0,
  "total": 0
}

Rules:
- Set "is_receipt" to true only if the image clearly shows a bill or receipt with itemized prices
- Each item must have "name" (string), "price" (number, per-unit price), "quantity" (integer, default 1)
- "price" is the per-item price, NOT the line total
- If tax is not shown, use 0
- If tip is not shown, use 0
- If subtotal is not shown, sum the items
- All prices must be positive numbers
- Return ONLY the JSON object, nothing else
"""


VALIDATION_PROMPT = """Look at this image. Is it a receipt, bill, or invoice that shows purchased items with prices?
Answer with ONLY the word: yes or no"""


async def validate_receipt_image(image_bytes: bytes, media_type: str = "image/jpeg") -> bool:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in environment")

    client = genai.Client(api_key=api_key)

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=media_type),
            VALIDATION_PROMPT,
        ],
    )

    answer = response.text.strip().lower()
    return answer.startswith("yes")


async def extract_receipt_items(image_bytes: bytes, media_type: str = "image/jpeg") -> dict:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not set in environment")

    client = genai.Client(api_key=api_key)

    response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=media_type),
            RECEIPT_EXTRACTION_PROMPT,
        ],
    )

    raw = response.text.strip()

    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    data = json.loads(raw)
    return data
