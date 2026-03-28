"""Run once to generate PNG icons: python generate_icons.py"""
from PIL import Image, ImageDraw, ImageFont
import os

def make_icon(size, path):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # Rounded rect background
    draw.rounded_rectangle([0, 0, size, size], radius=size//5, fill=(99, 102, 241))
    # Emoji-style receipt icon
    margin = size // 6
    rect = [margin, margin, size - margin, size - margin]
    draw.rounded_rectangle(rect, radius=size//12, fill=(255, 255, 255, 230))
    # Lines on receipt
    lm = margin + size // 8
    lw = size - margin - size // 8
    line_y = margin + size // 4
    gap = (size - margin - line_y) // 5
    for i in range(4):
        y = line_y + i * gap
        draw.rounded_rectangle([lm, y, lw, y + max(2, size // 40)], radius=1, fill=(99, 102, 241))
    img.save(path, "PNG")
    print(f"Saved {path}")

os.makedirs("icons", exist_ok=True)
make_icon(192, "icons/icon-192.png")
make_icon(512, "icons/icon-512.png")
print("Icons generated!")
