from google import genai
from google.genai import types
import json
import re
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent.parent / ".env")

RECEIPT_EXTRACTION_PROMPT = """You are a receipt parser. Analyze this receipt image and extract all line items with their prices.

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "items": [
    {"name": "Item name", "price": 9.99, "quantity": 1}
  ],
  "subtotal": 29.97,
  "tax": 2.40,
  "tip": 0.00,
  "total": 32.37
}

Rules:
- Each item must have "name" (string), "price" (number, per-unit price), "quantity" (integer, default 1)
- "price" is the per-item price, NOT the line total
- If tax is not shown, use 0
- If tip is not shown, use 0
- If subtotal is not shown, sum the items
- All prices must be positive numbers
- Return ONLY the JSON object, nothing else
"""


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
