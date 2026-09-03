from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "skill-tree-overview-updated.jpg"
WIDTH, HEIGHT = 1920, 4920
BG, PANEL, WIRE = "#0b1220", "#121c2d", "#64748b"
WHITE, MUTED = "#f8fafc", "#cbd5e1"
COLORS = {"base": "#1d4ed8", "root": "#0f766e", "t2": "#7c3aed", "t3": "#b45309"}

font_path = r"C:\Windows\Fonts\segoeui.ttf"
bold_path = r"C:\Windows\Fonts\segoeuib.ttf"
FONT = {size: ImageFont.truetype(font_path, size) for size in (22, 26, 30, 34, 42, 56)}
BOLD = {size: ImageFont.truetype(bold_path, size) for size in (24, 28, 34, 42, 52, 66)}

TREES = [
    {
        "title": "OFFENSE", "base": ("Offense Core", "Rounds and critical output"),
        "roots": [
            ("Ordnance", "Projectile payload and overkill", [
                ("Split Volley", "Extra Rounds", "Vector Reversal"),
                ("Reaper’s Gaze", "Damage vs wounded Kethra", "Culling Edict"),
                ("Shrapnel Requiem", "Transfers overkill", "Funeral Circuit"),
            ]),
            ("Cadence", "Firing tempo and status cycling", [
                ("Bio-Tar Rounds", "Slow + longer Thermite", "Bio-Tar Halo"),
                ("Thermite Trace", "Damage over time", "Thermal Rupture"),
                ("Combat Rhythm", "Build sustained APS", "Overclock Protocol"),
            ]),
            ("Precision", "Critical reliability and payoff", [
                ("Deadeye Protocol", "Critical chance", "Focus Cascade"),
                ("Terminal Vector", "Critical multiplier", "Entropy Vector"),
                ("Static Discharge", "Secondary critical hit", "Arc Stagger"),
            ]),
        ],
    },
    {
        "title": "MUTATION", "base": ("Mutation Core", "Kethra physiology and pressure"),
        "roots": [
            ("Carapace", "Protection and damage handling", [
                ("Distributed Shell", "Share incoming damage", "Burden Matrix"),
                ("Failsafe Cocoon", "Survive lethal damage", "Chrysalis Rebirth"),
                ("Swarm Synthesis", "Chimera cohorts", "Brood Fracture"),
            ]),
            ("Kinesis", "Movement and kinetic response", [
                ("Momentum Plating", "Armor from speed", "Inertia Buffer"),
                ("Impact Dynamo", "Damage builds speed", "Pressure Drive"),
                ("Phase Curl", "Chance to advance", "Fractal Brood"),
            ]),
            ("Vital Mass", "Health and regeneration", [
                ("Regrowth Node", "Heal after a lap", "Apex Ascension"),
                ("Biomass Pool", "Death heals the cohort", "Scavenger Instinct"),
                ("Hive Equilibrium", "Equalize sector health", "Aberrant Genesis"),
            ]),
        ],
    },
    {
        "title": "UTILITY", "base": ("Utility Core", "Flux, control and active systems"),
        "roots": [
            ("Reserves", "Flux economy and conversion", [
                ("Echo Reserve", "Purchase echo ticks", "Avarice Engine"),
                ("Flux Battery", "Stored Flux fires Rounds", "Bioforge Program"),
                ("Excess Reclamation", "Overkill returns Flux", "Capital Punishment"),
            ]),
            ("Control Nexus", "Information and command", [
                ("Pain Tolerance", "Higher Core Strain limit", "Redline Protocol"),
                ("Killzone Aperture", "Wider firing sector", "Command Override"),
                ("Spectral Relay", "Opponent reconnaissance", "Signal Corruption"),
            ]),
            ("Surge Core", "Active combat systems", [
                ("Adrenaline Surge", "Enemy speed burst", "Nullifying Purge"),
                ("Saturation Burst", "One strike per target", "Orbital Breach"),
                ("Phase Shift", "Temporary miss chance", "Conjunction of Spheres"),
            ]),
        ],
    },
]

image = Image.new("RGB", (WIDTH, HEIGHT), BG)
draw = ImageDraw.Draw(image)

def box(cx, y, w, h, color, title, detail=""):
    x = cx - w // 2
    draw.rounded_rectangle((x, y, x + w, y + h), radius=18, fill=color, outline="#cbd5e1", width=2)
    draw_centered(title, cx, y + 18, BOLD[28], WHITE, w - 26)
    if detail:
        draw_centered(detail, cx, y + 76, FONT[22], "#e2e8f0", w - 28)
    return (cx, y, w, h)

def draw_centered(text, cx, y, font, color, max_width):
    words, lines, current = text.split(), [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=font)[2] <= max_width or not current:
            current = candidate
        else:
            lines.append(current); current = word
    if current: lines.append(current)
    for line in lines:
        width = draw.textbbox((0, 0), line, font=font)[2]
        draw.text((cx - width / 2, y), line, font=font, fill=color)
        y += font.size + 5

def connector(a, b):
    ax, ay, _, ah = a; bx, by, _, _ = b
    start, end = (ax, ay + ah), (bx, by)
    draw.line((start, end), fill=WIRE, width=4)
    draw.polygon([(bx - 8, by - 16), (bx + 8, by - 16), (bx, by)], fill=WIRE)

draw.text((80, 42), "TOWER DEFENSE — SKILL TREE", font=BOLD[66], fill=WHITE)
draw.text((84, 126), "Updated structure: Split Volley belongs to Ordnance; Bio-Tar Rounds belong to Cadence.", font=FONT[30], fill=MUTED)
draw.text((84, 174), "Read upward: Core → Tier I family → Tier II specialization → Tier III Ultimate. Choose two of three at each choice layer.", font=FONT[26], fill=MUTED)

for index, tree in enumerate(TREES):
    top = 280 + index * 1540
    draw.rounded_rectangle((50, top, WIDTH - 50, top + 1470), radius=28, fill=PANEL, outline="#334155", width=3)
    draw.text((90, top + 34), tree["title"], font=BOLD[52], fill=WHITE)
    draw.text((90, top + 102), "Tier III Ultimates", font=FONT[26], fill=MUTED)
    draw.text((90, top + 480), "Tier II specializations", font=FONT[26], fill=MUTED)
    draw.text((90, top + 990), "Tier I families", font=FONT[26], fill=MUTED)
    draw.text((90, top + 1250), "Core", font=FONT[26], fill=MUTED)

    t3_y, t2_y, root_y, base_y = top + 180, top + 550, top + 1060, top + 1300
    root_centers = [350, 960, 1570]
    t2_centers = [[150, 350, 550], [760, 960, 1160], [1370, 1570, 1770]]
    base = box(960, base_y, 420, 125, COLORS["base"], *tree["base"])
    root_boxes, t2_boxes, t3_boxes = [], [], []
    for root_index, (root_title, root_detail, choices) in enumerate(tree["roots"]):
        root_box = box(root_centers[root_index], root_y, 400, 145, COLORS["root"], root_title, root_detail)
        root_boxes.append(root_box)
        for choice_index, (choice_title, choice_detail, ultimate) in enumerate(choices):
            cx = t2_centers[root_index][choice_index]
            t2_boxes.append(box(cx, t2_y, 185, 185, COLORS["t2"], choice_title, choice_detail))
            t3_boxes.append(box(cx, t3_y, 185, 175, COLORS["t3"], ultimate, "Tier III Ultimate"))
    for root_box in root_boxes:
        connector(root_box, base)
    for root_index, root_box in enumerate(root_boxes):
        for choice_index in range(3):
            connector(t2_boxes[root_index * 3 + choice_index], root_box)
    for t2_box, t3_box in zip(t2_boxes, t3_boxes):
        connector(t3_box, t2_box)

image.save(OUT, "JPEG", quality=92, optimize=True, progressive=True)
print(OUT)
