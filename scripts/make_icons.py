"""Génère les icônes de l'application (PWA, écran d'accueil iPhone)."""
from PIL import Image, ImageDraw, ImageFont

FONT = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'
OCEAN = (11, 106, 135, 255)
WATTLE = (232, 169, 0, 255)


def icon(size, path, maskable=False, rounded=True):
    S = size * 4
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable or not rounded:
        d.rectangle([0, 0, S, S], fill=OCEAN)
    else:
        d.rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * 0.22), fill=OCEAN)
    k = 0.8 if maskable else 1.0  # zone de sécurité des icônes « maskable »
    f = ImageFont.truetype(FONT, int(S * 0.44 * k))
    text = 'Oz'
    bb = d.textbbox((0, 0), text, font=f)
    w, h = bb[2] - bb[0], bb[3] - bb[1]
    x, y = (S - w) / 2 - bb[0], (S - h) / 2 - bb[1]
    d.text((x, y), text, font=f, fill=(255, 255, 255, 255))
    r = S * 0.07 * k
    cx, cy = (S + w) / 2 + r * 0.9, (S - h) / 2 + r * 0.4
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=WATTLE)
    img.resize((size, size), Image.LANCZOS).save(path)


if __name__ == '__main__':
    icon(192, 'public/icons/icon-192.png')
    icon(512, 'public/icons/icon-512.png')
    icon(512, 'public/icons/icon-maskable-512.png', maskable=True)
    icon(180, 'public/icons/apple-touch-icon.png', rounded=False)
    icon(64, 'public/icons/favicon-64.png')
    print('icônes générées')
