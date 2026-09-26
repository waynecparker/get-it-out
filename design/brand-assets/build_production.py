"""Export the five Expo production PNGs from the vector variants (docs/visual-identity.md §6)."""
import io, os, cairosvg
from PIL import Image, ImageDraw, ImageFont

OUT = "production"; os.makedirs(OUT, exist_ok=True)
def r(svg, px): return Image.open(io.BytesIO(cairosvg.svg2png(url=svg, output_width=px, output_height=px))).convert("RGBA")

icon = r("logo-master.svg", 1024).convert("RGB")                       # no transparency
icon.save(f"{OUT}/icon.png", optimize=True)
fg = r("variants/android-icon-foreground.svg", 1024); fg.save(f"{OUT}/android-icon-foreground.png", optimize=True)
mono = r("variants/android-icon-monochrome.svg", 1024); mono.save(f"{OUT}/android-icon-monochrome.png", optimize=True)
splash = r("variants/splash-icon.svg", 1024); splash.save(f"{OUT}/splash-icon.png", optimize=True)
fav = r("variants/favicon.svg", 48); fav.save(f"{OUT}/favicon.png", optimize=True)
for n in sorted(os.listdir(OUT)):
    im = Image.open(f"{OUT}/{n}"); print(f"{n:30s} {im.size} {im.mode} {os.path.getsize(f'{OUT}/{n}')//1024}KB")

# ---------- review sheet ----------
NAVY = (16, 19, 26); T = 300
font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
def checker(sz, c=16):
    im = Image.new("RGB", (sz, sz), (200, 200, 200)); d = ImageDraw.Draw(im)
    for y in range(0, sz, c):
        for x in range(0, sz, c):
            if (x//c + y//c) % 2: d.rectangle([x, y, x+c-1, y+c-1], fill=(235, 235, 235))
    return im
def on(bg, img):
    bg = bg.copy(); bg.paste(img, (0, 0), img); return bg
def masked(img, shape):
    m = Image.new("L", img.size, 0); d = ImageDraw.Draw(m); s = img.size[0]
    if shape == "circle": d.ellipse([0, 0, s-1, s-1], fill=255)
    else: d.rounded_rectangle([0, 0, s-1, s-1], radius=int(s*0.225), fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0)); out.paste(img, (0, 0), m); return out

# Android launcher simulation: 108dp layer, 72dp visible → crop centre 2/3 then mask
def launcher(fg_img, shape, fgcol=None):
    base = Image.new("RGBA", (1024, 1024), NAVY + (255,))
    layer = fg_img
    if fgcol is not None:
        solid = Image.new("RGBA", fg_img.size, fgcol + (255,)); solid.putalpha(fg_img.split()[3]); layer = solid
    base.alpha_composite(layer)
    c = 1024*18//108; vis = base.crop((c, c, 1024-c, 1024-c)).resize((T, T), Image.LANCZOS)
    return masked(vis, shape)

tiles = [
    ("icon.png", icon.resize((T, T), Image.LANCZOS).convert("RGBA")),
    ("iOS home (masked)", masked(icon.resize((T, T), Image.LANCZOS).convert("RGBA"), "rr")),
    ("fg (transparent)", on(checker(T), fg.resize((T, T), Image.LANCZOS)).convert("RGBA")),
    ("Android circle", launcher(fg, "circle")),
    ("Android squircle", launcher(fg, "rr")),
    ("monochrome", on(checker(T), mono.resize((T, T), Image.LANCZOS)).convert("RGBA")),
    ("Android themed", launcher(mono, "circle", fgcol=(200, 215, 240))),
    ("splash (transparent)", on(checker(T), splash.resize((T, T), Image.LANCZOS)).convert("RGBA")),
    ("favicon 48 (x4 view)", fav.resize((192, 192), Image.NEAREST)),
]
cols, gap, lab = 3, 40, 36
W = cols*T + (cols+1)*gap; rows = (len(tiles)+cols-1)//cols
H = rows*(T+lab) + (rows+1)*gap
sheet = Image.new("RGB", (W, H), (228, 227, 222)); d = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(tiles):
    cx, cy = gap + (i % cols)*(T+gap), gap + (i//cols)*(T+lab+gap)
    ox, oy = cx + (T-im.size[0])//2, cy + (T-im.size[1])//2
    sheet.paste(im, (ox, oy), im)
    tw = d.textlength(name, font=font); d.text((cx+T/2-tw/2, cy+T+8), name, fill=NAVY, font=font)
sheet.save("production-review.png")

# splash in context: phone 390x844 @ imageWidth ~110 (≈28% width)
ph = Image.new("RGB", (390, 844), NAVY); sw = 110
sp = splash.resize((sw, sw), Image.LANCZOS); ph.paste(sp, ((390-sw)//2, (844-sw)//2), sp)
ph.save("splash-in-context.png")
print("review sheets written")
