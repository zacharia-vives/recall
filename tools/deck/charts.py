"""The two money pictures, drawn in the deck's theme.

Both take their figures from Mattiece's model as it stands in Notion and
nothing else. Year two is deliberately not charted as a result: the model
gives an end-of-year household count for it but never a bottom line, and
inventing one to make a prettier curve would be the sort of thing a jury
asks about.
"""

import layout as L
from PIL import Image, ImageDraw

W, H = L.W, L.H
CREAM, PANEL, RUST, MAROON, INK = L.CREAM, L.PANEL, L.RUST, L.MAROON, L.INK
GOOD = (86, 122, 64)        # a green that sits in this palette, not a stock one
BAD = (176, 62, 44)


def money():
    """The real money-over-time model, captured, with the numbers beside it."""
    return _model(
        "money", "the money", "Money over time",
        "html_money-over-time.png",
        [("Deepest point", "\u20ac0", "it never goes below zero"),
         ("Pays its own way from", "month 17", "563 households"),
         ("Cash at month 36", "\u20ac95k", "everything in, everything out")],
        "Break even: 752 households today. 537 once multiple keepers ship.",
        "zacharia-vives.github.io/recall/m/\u2026/money-over-time.html")


def _model(name, kick, head, shot, figures, line, url):
    """A capture of a live page, with figures read off it in deck type.

    The capture is the point: it is the model the team actually built and it
    is interactive, so the slide says which page to open rather than
    pretending the picture is the whole thing.
    """
    im = L.ground()
    y = L.kicker(im, kick)
    y = L.headline(im, head, y, size=88)
    y += 18
    d = ImageDraw.Draw(im)

    side = 470
    pic = Image.open(shot).convert("RGB")
    room_w = W - L.MARGIN * 2 - side - 46
    room_h = H - y - L.MARGIN - 96
    sc = min(room_w / pic.width, room_h / pic.height)
    pic = pic.resize((int(pic.width * sc), int(pic.height * sc)),
                     Image.LANCZOS)
    px, py = L.MARGIN, int(y)
    d.rounded_rectangle([px + 9, py + 11, px + pic.width + 9,
                         py + pic.height + 11], 18, fill=(190, 110, 70, 70))
    im.paste(pic, (px, py))

    fx = px + pic.width + 46
    fy = y
    for label, big, sub in figures:
        L.card(im, [fx, fy, W - L.MARGIN, fy + 148], radius=24, shadow=False)
        d.text((fx + 30, fy + 34), label.upper(), font=L.body(22, 700),
               fill=PANEL, anchor="la")
        d.text((fx + 30, fy + 70), big, font=L.display(52), fill=MAROON,
               anchor="la")
        d.text((fx + 30, fy + 116), sub, font=L.body(24, 300), fill=INK,
               anchor="la")
        fy += 168

    d.text((L.MARGIN, H - 116), line, font=L.body(30, 500), fill=MAROON,
           anchor="la")
    d.text((L.MARGIN, H - 74),
           "Click the chart to open it live  ·  " + url,
           font=L.body(25, 500), fill=PANEL, anchor="la")
    return L.save(im, name)


CALLS = [
    ("imec.istart", "Belgium call", "30 Sep 2026", "100,000",
     "convertible loan, no upfront equity", True),
    ("VLAIO", "Innovatieve starterssteun", "no deadline", "50,000",
     "company under two years old", False),
    ("Erasmus+ KA210", "through VIVES, digital inclusion", "Mar 2027",
     "30,000 – 60,000", "with the Montpellier partner", False),
    ("Horizon Europe", "independent living, as a partner", "13 Apr 2027",
     "6 – 8 million", "per project, consortium", False),
    ("EIC Accelerator", "once there is traction", "year two – three",
     "up to 2.5 million", "grant plus equity", False),
]


def funding():
    """The real funding map, captured, with the figures beside it."""
    return _model(
        "funding", "funding", "The funding map",
        "html_funding-map.png",
        [("If everything lands", "\u20ac210k", "four routes, all at once"),
         ("Worth, money times chance", "\u20ac58k", "the number to plan on"),
         ("Next deadline", "30 Sep", "imec.istart, Belgium call")],
        "Nine routes. One closes this month.",
        "zacharia-vives.github.io/recall/m/\u2026/funding-map.html")
