"""Deterministic generator for the ZXY → XYZ head mark.
All geometry is defined here; output SVG is fully flattened (no transforms, no fonts).
Run: python3 build_logo.py
"""
import math, re
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.geometry.polygon import orient

NAVY, OFFWHITE, COPPER = "#10131A", "#F2F1EC", "#C77A3B"
SIZE = 1024
TILT = -22.0          # degrees: face tilted upward
CONTENT = 820         # target size of the artwork's bounding box inside 1024 canvas

# ---------- geometry helpers ----------
def rot(p, deg, c=(0, 0)):
    a = math.radians(deg); x, y = p[0]-c[0], p[1]-c[1]
    return (c[0] + x*math.cos(a) - y*math.sin(a), c[1] + x*math.sin(a) + y*math.cos(a))

def letter(ch, h):
    """Geometric block letters as polygons in a box (0..w, 0..h). Returns list of polygons."""
    t = 0.25*h; w = 0.86*h
    if ch == "Z":
        return [[(0,0),(w,0),(w,t),(1.25*t,h-t),(w,h-t),(w,h),(0,h),(0,h-t),(w-1.25*t,t),(0,t)]]
    if ch == "X":
        s = 1.1*t
        return [[(0,0),(s,0),(w,h),(w-s,h)], [(w-s,0),(w,0),(s,h),(0,h)]]
    if ch == "Y":
        s = 1.1*t; my = 0.52*h
        return [[(0,0),(s,0),(w/2+s/2,my),(w/2-s/2,my)],
                [(w-s,0),(w,0),(w/2+s/2,my),(w/2-s/2,my)],
                [(w/2-t/2,my-0.05*h),(w/2+t/2,my-0.05*h),(w/2+t/2,h),(w/2-t/2,h)]]

def place(polys, h, center, deg):
    w = 0.86*h
    return [[rot((x-w/2+center[0], y-h/2+center[1]), deg, center) for x, y in poly] for poly in polys]

# ---------- head silhouette (upright, facing right; cubic Béziers) ----------
HEAD = [
    ("M", (334, 700)),
    ("C", (296, 650), (246, 566), (232, 450)),     # lower back of skull → nape
    ("C", (214, 340), (256, 214), (366, 170)),     # occiput → crown
    ("C", (470, 128), (598, 166), (634, 262)),     # crown → forehead
    ("C", (648, 306), (644, 346), (654, 376)),     # forehead → brow
    ("C", (662, 394), (654, 404), (664, 420)),     # bridge
    ("C", (680, 442), (708, 462), (710, 476)),     # nose
    ("C", (712, 486), (698, 492), (682, 494)),     # under nose
    ("C", (688, 504), (690, 516), (684, 524)),     # upper lip
    ("C", (678, 528), (676, 532), (680, 536)),     # mouth
    ("C", (686, 544), (684, 558), (672, 564)),     # lower lip
    ("C", (668, 574), (682, 596), (676, 616)),     # chin
    ("C", (670, 636), (620, 650), (570, 652)),     # under-jaw
    ("C", (554, 662), (548, 690), (548, 760)),     # neck front (clipped)
    ("L", (334, 760)),
    ("L", (334, 700)),
]
MOUTH = (682, 532)
NECK_CUT = (550, 678)   # horizontal cut just below the jaw -> minimal neck
PIVOT = (450, 430)

def bez(p0, p1, p2, p3, n=24):
    return [tuple((1-t)**3*a + 3*(1-t)**2*t*b + 3*(1-t)*t**2*c + t**3*d for a, b, c, d in zip(p0, p1, p2, p3))
            for t in (i/n for i in range(n+1))]

# ---------- build all elements in a "world" frame ----------
def cbez(p0, p1, p2, p3):
    return (p0, p1, p2, p3)

def build():
    head = [(cmd, [rot(p, TILT, PIVOT) for p in pts]) for cmd, *pts in HEAD]
    m = rot(MOUTH, TILT, PIVOT)
    K = 0.82
    off = lambda dx, dy: (m[0]+K*dx, m[1]+K*dy)

    # Jumbled Z X Y: climbing a diagonal inside the cranium, each at its own angle
    inner = []
    for ch, c, d, h in [("Z", (338, 470), -18, 112), ("X", (456, 374), -4, 102), ("Y", (548, 288), -26, 114)]:
        inner += place(letter(ch, h), h, rot(c, TILT, PIVOT), d)

    # Speech / trumpet: two curved copper lines flaring up and out of the mouth
    curves = [
        (off(18, -16), off(110, -50), off(140, -250), off(262, -372)),   # upper line
        (off(18, 14),  off(170, -4),  off(330, -46),  off(424, -212)),   # lower line
    ]

    # Ordered x Y Z rising from small to large inside the flare
    outer = []
    for ch, c, h, d in [("X", off(160, -80), 50, -8), ("Y", off(252, -150), 84, -6), ("Z", off(372, -316), 124, -4)]:
        outer += place(letter(ch, h), h, c, d)
    return head, inner, curves, outer

CUT_Y = None
def fit(head, inner, lines, outer, stroke, content=None, radius=None):
    """content: fit bounding box to this size. radius: fit every point inside a centred circle."""
    global CUT_Y
    CUT_Y = rot(NECK_CUT, TILT, PIVOT)[1]
    pts = []
    cur = None
    for cmd, ps in head:
        if cmd == "C": pts += bez(cur, *ps); cur = ps[-1]
        else: pts += ps; cur = ps[-1]
    pts = [p for p in pts if p[1] <= CUT_Y]
    for poly in inner + outer: pts += poly
    for cv in lines: pts += bez(*cv, n=64)
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    cx, cy = (minx+maxx)/2, (miny+maxy)/2
    if radius:
        far = max(math.hypot(x-cx, y-cy) for x, y in pts) + stroke
        k = radius / far
    else:
        k = (content or CONTENT) / max(maxx-minx+2*stroke, maxy-miny+2*stroke)
    ox = SIZE/2 - k*cx; oy = SIZE/2 - k*cy
    return lambda p: (round(ox+k*p[0], 2), round(oy+k*p[1], 2)), k

def f(p): return f"{p[0]:.2f} {p[1]:.2f}"

# Approved head-led Android launcher layout (revised 2026-09-29, "Option C"):
# the head is scaled 1.3725x about the mouth, the copper speech mark is nudged
# 6 units up, then the whole composition is re-centred and fitted to radius 305
# inside the adaptive safe zone (net vs. the original radius=300 mark: head
# +27.2%, speech mark 92.7%). Applied as group transforms on top of the
# radius=300 geometry — these exact values are the approved composition; do
# not re-derive them.
HEAD_LED = dict(
    fit="translate(512 512) scale(0.9270) translate(-466 -479)",
    head="translate(548 553) scale(1.3725) translate(-548 -553)",
    speech="translate(0 -6)",
)

def svg(background=True, letters_inside=True, mono=None, content=None, radius=None, stroke=15, title="ZXY to XYZ mark", head_led=False):
    """background: navy full-bleed square. letters_inside: False = simplified tier.
    mono: a single colour for every element (Android themed-icon layer).
    head_led: wrap the geometry in the approved HEAD_LED transforms."""
    head, inner, lines, outer = build()
    STROKE = stroke
    T, k = fit(head, inner, lines, outer, STROKE/2, content=content, radius=radius)
    d = [cmd + " " + " ".join(f(T(p)) for p in ps) for cmd, ps in head] + ["Z"]
    poly = lambda P: "M " + " L ".join(f(T(p)) for p in P) + " Z"
    inner_d = " ".join(poly(P) for P in inner)
    outer_d = " ".join(poly(P) for P in outer)
    lines_d = " ".join(f"M {f(T(c[0]))} C {f(T(c[1]))} {f(T(c[2]))} {f(T(c[3]))}" for c in lines)
    sw = round(STROKE*k, 2)
    cy = T((0, CUT_Y))[1]
    head_c, cop_c = (mono, mono) if mono else (OFFWHITE, COPPER)
    bg = f'  <rect id="background" width="{SIZE}" height="{SIZE}" fill="{NAVY}"/>\n' if background else ""
    holes = ""
    if letters_inside:   # Z–X–Y as true negative space: unioned glyph outlines appended as holes (even-odd)
        u = unary_union([Polygon([T(p) for p in P]).buffer(0) for P in inner])
        geoms = getattr(u, "geoms", [u])
        holes = " " + " ".join("M " + " L ".join(f(p) for p in list(orient(g).exterior.coords)[:-1]) + " Z" for g in geoms)
    defs = f'<defs><clipPath id="neck-cut"><rect x="0" y="0" width="{SIZE}" height="{cy:.2f}"/></clipPath></defs>'
    head_el = f'<path id="head-with-ZXY-cutouts" fill="{head_c}" fill-rule="evenodd" clip-path="url(#neck-cut)" d="{" ".join(d)}{holes}"/>'
    speech_el = f'<path id="speech" fill="none" stroke="{cop_c}" stroke-width="{sw}" stroke-linecap="round" d="{lines_d}"/>'
    xyz_el = f'<path id="spoken-XYZ" fill="{cop_c}" d="{outer_d}"/>'
    if head_led:
        body = (f'  <g transform="{HEAD_LED["fit"]}">\n    {defs}\n'
                f'    <g transform="{HEAD_LED["head"]}">\n      {head_el}\n    </g>\n'
                f'    <g transform="{HEAD_LED["speech"]}">\n      {speech_el}\n      {xyz_el}\n    </g>\n  </g>\n')
    else:
        body = f"  {defs}\n  {head_el}\n  {speech_el}\n  {xyz_el}\n"
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}">
  <title>{title}</title>
{bg}{body}</svg>
"""

# Production variants — spec: docs/visual-identity.md §2 and §6
VARIANTS = {
    # full-bleed navy, full-detail
    "logo-master.svg":                 dict(),
    # transparent, full-detail, inside Android adaptive safe circle (66/108 of canvas → r≈313),
    # approved head-led layout (fits to r=305)
    "android-icon-foreground.svg":     dict(background=False, radius=300, head_led=True),
    # single colour, simplified, same safe circle and head-led layout
    "android-icon-monochrome.svg":     dict(background=False, letters_inside=False, mono="#FFFFFF", radius=300, head_led=True),
    # transparent, full-detail, tight crop (size set by imageWidth in app.json)
    "splash-icon.svg":                 dict(background=False, content=960),
    # navy, simplified, filled tighter for tiny renders
    "favicon.svg":                     dict(letters_inside=False, content=940, stroke=24),
}

if __name__ == "__main__":
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    for name, kw in VARIANTS.items():
        out = os.path.join(here, name if name == "logo-master.svg" else os.path.join("variants", name))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "w").write(svg(**kw))
        print("wrote", os.path.relpath(out, here))
