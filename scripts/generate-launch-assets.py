from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math

OUT = Path(__file__).resolve().parents[1] / 'docs' / 'launch' / 'assets'
OUT.mkdir(parents=True, exist_ok=True)

RED = '#d01039'
CHARCOAL = '#25272b'
GRAPHITE = '#3b3f46'
LIGHT = '#f7f5f2'
MID = '#d9d6d2'
CYAN = '#65c7d0'
AMBER = '#f0a33a'


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rounded(draw, xy, r, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=r, fill=fill, outline=outline, width=width)


def glow_line(base, points, color, width=6, glow=18):
    overlay = Image.new('RGBA', base.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    c = hex_to_rgb(color)
    od.line(points, fill=(*c, 80), width=width + glow, joint='curve')
    overlay = overlay.filter(ImageFilter.GaussianBlur(glow / 2))
    base.alpha_composite(overlay)
    d = ImageDraw.Draw(base)
    d.line(points, fill=(*c, 230), width=width, joint='curve')


def node(draw, cx, cy, fill=(255, 255, 255, 255), accent=RED, scale=1.0):
    w, h = int(126 * scale), int(70 * scale)
    x0, y0 = cx - w // 2, cy - h // 2
    rounded(draw, (x0, y0, x0 + w, y0 + h), int(18 * scale), fill, outline=hex_to_rgb(MID) + (255,), width=max(1, int(2 * scale)))
    draw.ellipse((x0 + 14 * scale, y0 + 20 * scale, x0 + 42 * scale, y0 + 48 * scale), fill=hex_to_rgb(accent) + (255,))
    draw.line((x0 + 56 * scale, y0 + 25 * scale, x0 + w - 18 * scale, y0 + 25 * scale), fill=hex_to_rgb(GRAPHITE) + (180,), width=max(2, int(3 * scale)))
    draw.line((x0 + 56 * scale, y0 + 43 * scale, x0 + w - 34 * scale, y0 + 43 * scale), fill=hex_to_rgb(MID) + (255,), width=max(2, int(3 * scale)))


def make_blog():
    W, H = 1600, 900
    img = Image.new('RGBA', (W, H), hex_to_rgb(LIGHT) + (255,))
    d = ImageDraw.Draw(img)
    for i in range(9):
        x = 180 + i * 160
        d.line((x, 80, x - 220, H - 90), fill=(230, 226, 221, 100), width=2)
    cx, cy = 840, 450
    rounded(d, (520, 250, 1160, 650), 64, (255, 255, 255, 245), outline=hex_to_rgb(MID) + (255,), width=3)
    rounded(d, (610, 315, 1070, 585), 42, (245, 244, 241, 255), outline=hex_to_rgb(MID) + (255,), width=2)
    rounded(d, (720, 360, 960, 540), 34, hex_to_rgb(CHARCOAL) + (255,), outline=hex_to_rgb(RED) + (255,), width=5)
    for r, col, a in [(92, RED, 230), (64, CYAN, 150), (36, AMBER, 180)]:
        d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=hex_to_rgb(col) + (a,), width=6)
    d.ellipse((cx - 18, cy - 18, cx + 18, cy + 18), fill=hex_to_rgb(RED) + (255,))
    coords = [(360, 250), (360, 650), (1240, 250), (1240, 650), (270, 450), (1330, 450)]
    accents = [RED, CYAN, AMBER, RED, CYAN, AMBER]
    for (x, y), a in zip(coords, accents):
        node(d, x, y, fill=(255, 255, 255, 255), accent=a, scale=1.05)
    paths = [
        [(420, 250), (560, 300), (690, 410), (822, 450)],
        [(420, 650), (560, 600), (690, 490), (822, 450)],
        [(1180, 250), (1050, 300), (990, 410), (858, 450)],
        [(1180, 650), (1050, 600), (990, 490), (858, 450)],
        [(340, 450), (520, 450), (700, 450)],
        [(1280, 450), (1120, 450), (980, 450)],
    ]
    cols = [RED, CYAN, AMBER, RED, CYAN, AMBER]
    for p, c in zip(paths, cols):
        glow_line(img, p, c, width=5, glow=16)
    d.rounded_rectangle((70, 90, 360, 160), radius=22, outline=(220, 215, 210, 130), width=2)
    d.rounded_rectangle((1200, 740, 1510, 810), radius=22, outline=(220, 215, 210, 120), width=2)
    path = OUT / 'commercebackend-blog-cover.png'
    img.convert('RGB').save(path, quality=95)
    return path


def make_square():
    W = H = 1200
    img = Image.new('RGBA', (W, H), hex_to_rgb(LIGHT) + (255,))
    d = ImageDraw.Draw(img)
    cx = cy = 600
    d.ellipse((270, 270, 930, 930), fill=(255, 255, 255, 245), outline=hex_to_rgb(MID) + (255,), width=4)
    d.ellipse((380, 380, 820, 820), fill=(245, 244, 241, 255), outline=hex_to_rgb(MID) + (255,), width=3)
    rounded(d, (485, 485, 715, 715), 36, hex_to_rgb(CHARCOAL) + (255,), outline=hex_to_rgb(RED) + (255,), width=5)
    for r, col, a, w in [(310, RED, 190, 8), (230, CYAN, 135, 5), (150, AMBER, 150, 5)]:
        d.arc((cx - r, cy - r, cx + r, cy + r), 30, 330, fill=hex_to_rgb(col) + (a,), width=w)
    angles = [-90, -18, 54, 126, 198]
    accents = [RED, CYAN, AMBER, RED, CYAN]
    node_positions = []
    for ang, a in zip(angles, accents):
        rad = math.radians(ang)
        x = int(cx + 360 * math.cos(rad))
        y = int(cy + 360 * math.sin(rad))
        node_positions.append((x, y, a))
        node(d, x, y, fill=(255, 255, 255, 255), accent=a, scale=.9)
    for x, y, a in node_positions:
        glow_line(img, [(x, y), (int((x + cx) / 2), int((y + cy) / 2)), (cx, cy)], a, width=4, glow=13)
    for ang in range(0, 360, 45):
        r1, r2 = 470, 520
        rad = math.radians(ang)
        d.line((cx + r1 * math.cos(rad), cy + r1 * math.sin(rad), cx + r2 * math.cos(rad), cy + r2 * math.sin(rad)), fill=hex_to_rgb(MID) + (180,), width=3)
    path = OUT / 'commercebackend-linkedin-square.png'
    img.convert('RGB').save(path, quality=95)
    return path


if __name__ == '__main__':
    print(make_blog())
    print(make_square())
