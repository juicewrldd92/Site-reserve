#!/usr/bin/env python3
"""Exporte le logo en JPEG haute définition.

Le JPEG ne gère pas la transparence : chaque variante est donc composée sur un
fond explicite. Pour un usage web ou une impression avec fond libre, préférer
les PNG de `scripts/generate-icons.py`.

    python3 scripts/generate-logo.py [chemin/vers/PlusJakartaSans-ExtraBold.ttf]
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

CORAIL = (255, 90, 60)
CANVAS = (250, 248, 245)
INK = (26, 26, 26)
WHITE = (255, 255, 255)

SS = 4  # supersampling
QUALITY = 95

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "brand"


def draw_viewfinder(d: ImageDraw.ImageDraw, x0, y0, side, color, bg):
    """Le viseur de scan : quatre équerres + la ligne de lecture."""
    x1, y1 = x0 + side, y0 + side
    w = side * 0.10
    radius = side * 0.26

    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=color, width=int(w))

    # On casse le milieu de chaque bord pour ne garder que les équerres.
    gap = side * 0.20
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    pad = w * 1.2
    d.rectangle([cx - gap, y0 - pad, cx + gap, y0 + w + pad], fill=bg)
    d.rectangle([cx - gap, y1 - w - pad, cx + gap, y1 + pad], fill=bg)
    d.rectangle([x0 - pad, cy - gap, x0 + w + pad, cy + gap], fill=bg)
    d.rectangle([x1 - w - pad, cy - gap, x1 + pad, cy + gap], fill=bg)

    d.rounded_rectangle([x0, cy - w / 2, x1, cy + w / 2], radius=w / 2, fill=color)


def mark(size: int, background) -> Image.Image:
    """Le carré arrondi corail, centré sur un fond."""
    s = size * SS
    img = Image.new("RGB", (s, s), background)
    d = ImageDraw.Draw(img)

    tile = s * 0.78
    offset = (s - tile) / 2
    d.rounded_rectangle(
        [offset, offset, offset + tile, offset + tile],
        radius=tile * 0.225,
        fill=CORAIL,
    )

    glyph = tile * 0.60
    gx = offset + (tile - glyph) / 2
    draw_viewfinder(d, gx, gx, glyph, WHITE, CORAIL)

    return img.resize((size, size), Image.LANCZOS)


def wordmark(width: int, font_path: Path, background, ink) -> Image.Image:
    """Logo horizontal : le carré corail suivi du nom."""
    w = width * SS
    h = int(w * 0.28)
    img = Image.new("RGB", (w, h), background)
    d = ImageDraw.Draw(img)

    tile = h * 0.62
    x = (w - tile * 5.4) / 2
    y = (h - tile) / 2

    d.rounded_rectangle([x, y, x + tile, y + tile], radius=tile * 0.32, fill=CORAIL)
    glyph = tile * 0.59
    gx = x + (tile - glyph) / 2
    draw_viewfinder(d, gx, y + (tile - glyph) / 2, glyph, WHITE, CORAIL)

    font = ImageFont.truetype(str(font_path), int(tile * 0.86))
    text = "Réserve"
    bbox = d.textbbox((0, 0), text, font=font)
    d.text(
        (x + tile * 1.32, y + (tile - (bbox[3] - bbox[1])) / 2 - bbox[1]),
        text,
        font=font,
        fill=ink,
    )

    return img.resize((width, int(width * 0.28)), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    font_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None

    exports = [
        ("logo-mark-fond-clair-2048.jpg", mark(2048, CANVAS)),
        ("logo-mark-fond-blanc-2048.jpg", mark(2048, WHITE)),
        ("logo-mark-fond-sombre-2048.jpg", mark(2048, INK)),
    ]

    if font_path and font_path.exists():
        exports += [
            ("logo-horizontal-fond-clair-3000.jpg", wordmark(3000, font_path, CANVAS, INK)),
            ("logo-horizontal-fond-sombre-3000.jpg", wordmark(3000, font_path, INK, WHITE)),
        ]
    else:
        print("  (police absente — logos horizontaux non générés)")

    for name, image in exports:
        image.save(OUT / name, "JPEG", quality=QUALITY, subsampling=0, optimize=True)
        kb = (OUT / name).stat().st_size / 1024
        print(f"  ✓ {name}  {image.size[0]}×{image.size[1]}  {kb:.0f} Ko")


if __name__ == "__main__":
    main()
