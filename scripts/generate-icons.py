#!/usr/bin/env python3
"""Génère les icônes PWA de Réserve à partir du logo du design system.

Logo : carré arrondi corail + glyphe « viseur de scan » blanc
(4 coins en équerre + ligne de scan horizontale).

    python3 scripts/generate-icons.py
"""

from pathlib import Path

from PIL import Image, ImageDraw

CORAIL = (255, 90, 60, 255)
WHITE = (255, 255, 255, 255)
SS = 8  # supersampling

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "icons"


def draw_glyph(d: ImageDraw.ImageDraw, box: float, offset: float, scale: float) -> None:
    """Dessine le viseur blanc, centré, occupant `scale` du côté `box`."""
    side = box * scale
    x0 = offset + (box - side) / 2
    y0 = x0
    x1, y1 = x0 + side, y0 + side

    w = side * 0.10
    radius = side * 0.26

    # Cadre complet, puis on « casse » le milieu de chaque bord pour ne
    # garder que les quatre équerres.
    d.rounded_rectangle([x0, y0, x1, y1], radius=radius, outline=WHITE, width=int(w))

    gap = side * 0.20  # demi-longueur de la portion effacée
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    pad = w * 1.2
    d.rectangle([cx - gap, y0 - pad, cx + gap, y0 + w + pad], fill=CORAIL)
    d.rectangle([cx - gap, y1 - w - pad, cx + gap, y1 + pad], fill=CORAIL)
    d.rectangle([x0 - pad, cy - gap, x0 + w + pad, cy + gap], fill=CORAIL)
    d.rectangle([x1 - w - pad, cy - gap, x1 + pad, cy + gap], fill=CORAIL)

    # Ligne de scan
    d.rounded_rectangle(
        [x0, cy - w / 2, x1, cy + w / 2], radius=w / 2, fill=WHITE
    )


def make(size: int, *, maskable: bool = False) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if maskable:
        # Fond plein bord à bord, glyphe dans la zone de sécurité (80 %).
        d.rectangle([0, 0, s, s], fill=CORAIL)
        draw_glyph(d, s, 0, 0.46)
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 0.225, fill=CORAIL)
        draw_glyph(d, s, 0, 0.60)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    targets = [
        ("pwa-192.png", 192, False),
        ("pwa-512.png", 512, False),
        ("pwa-maskable-512.png", 512, True),
        ("apple-touch-icon.png", 180, False),
        ("favicon-32.png", 32, False),
    ]
    for name, size, maskable in targets:
        icon = make(size, maskable=maskable)
        if name == "apple-touch-icon.png":  # iOS n'aime pas la transparence
            flat = Image.new("RGB", icon.size, (250, 248, 245))
            flat.paste(icon, mask=icon.split()[3])
            flat.save(OUT / name)
        else:
            icon.save(OUT / name)
        print(f"  ✓ {name} ({size}px)")


if __name__ == "__main__":
    main()
