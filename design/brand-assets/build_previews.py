"""Render PNG previews from logo-master.svg (vector → raster at each size, no upscaling)."""
import io, cairosvg
from PIL import Image, ImageDraw, ImageFont

def render(px):
    return Image.open(io.BytesIO(cairosvg.svg2png(url="logo-master.svg", output_width=px, output_height=px))).convert("RGBA")

render(1024).save("logo-1024.png")

sizes, gap, pad = [1024, 180, 48, 24], 64, 64
W = sum(sizes) + gap*(len(sizes)-1) + pad*2
H = 1024 + pad*2 + 60
sheet = Image.new("RGB", (W, H), "#E4E3DE")
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
except OSError: font = ImageFont.load_default()
x = pad
for s in sizes:
    y = pad + (1024 - s)//2
    sheet.paste(render(s), (x, y))
    label = f"{s}px"
    tw = d.textlength(label, font=font)
    d.text((x + s/2 - tw/2, pad + 1024 + 18), label, fill="#10131A", font=font)
    x += s + gap
sheet.save("logo-scale-preview.png")
print(sheet.size)
