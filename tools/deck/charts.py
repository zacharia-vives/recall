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


# ---------------------------------------------------------------- in and out
#
# These went missing. The business section used to carry a table of
# households, revenue, costs and result, and when the money slide was
# replaced with a capture of the live model that table went with it. So the
# section showed where the money comes from and what the curve looks like,
# and never once said what it costs or what comes in.
#
# Every figure is Mattiece's, from his own cost model. Nothing is rounded and
# nothing is invented: where his model does not give a number, the slide says
# so rather than filling the gap.

def _ledger(im, d, x, y, w, title, sub, items, total_label, total,
            total_colour=None, tall=None):
    """One column of a ledger: a heading, lines with amounts, then a total.

    Amounts are right-aligned on a tabular figure so the columns line up,
    which is the whole reason anybody trusts a cost slide."""
    pad = 34
    line_h = 54
    # Measured, not fixed: a subheading that wraps to two lines used to run
    # into the first row of figures.
    sub_font = L.body(23, 300)
    sub_lines = len(L.wrap(d, sub, sub_font, w - pad * 2))
    head_h = 74 + sub_lines * int(23 * 1.24) + 18
    need = head_h + len(items) * line_h + 96
    box_h = tall if tall else need
    L.card(im, [x, y, x + w, y + box_h], radius=28)

    d.text((x + pad, y + 30), title, font=L.body(34, 700), fill=RUST,
           anchor="la")
    L.para(d, (x + pad, y + 68), sub, sub_font, INK, w - pad * 2,
           leading=1.24)

    yy = y + head_h
    money = L.warm._face("mono-400-latin.ttf", 27)
    for label, amount in items:
        d.text((x + pad, yy), label, font=L.body(27, 300), fill=INK,
               anchor="la")
        d.text((x + w - pad, yy), amount, font=money, fill=INK, anchor="ra")
        yy += line_h

    ry = y + box_h - 82
    d.line([x + pad, ry, x + w - pad, ry], fill=(226, 198, 178), width=2)
    d.text((x + pad, ry + 20), total_label, font=L.body(30, 700), fill=MAROON,
           anchor="la")
    d.text((x + w - pad, ry + 18), total,
           font=L.warm._face("mono-700-latin.ttf", 34),
           fill=total_colour or MAROON, anchor="ra")
    return box_h


OUT_Y1 = [("Running the service", "15,600"),
          ("Marketing", "21,500"),
          ("Legal and compliance", "4,000"),
          ("Accounting, insurance, admin", "2,400"),
          ("Three second-hand test devices", "1,500")]

OUT_Y2 = [("One person, gross", "72,000"),
          ("Running the service", "19,200"),
          ("Marketing", "21,500"),
          ("Legal, accounting, admin", "5,300"),
          ("Devices, tooling, contingency", "2,000")]


def costs_out():
    """Money out, line by line, both years."""
    im = L.ground()
    y = L.kicker(im, "the money")
    y = L.headline(im, "What it costs to run", y, size=92)
    y += 22
    d = ImageDraw.Draw(im)

    gap = 44
    col = (W - L.MARGIN * 2 - gap) / 2
    tall = 74 + 1 * 29 + 18 + 5 * 54 + 96
    _ledger(im, d, L.MARGIN, y, col, "Year one, lean",
            "No salary. The build is already paid for.", OUT_Y1,
            "Total out", "45,000", tall=tall)
    _ledger(im, d, L.MARGIN + col + gap, y, col, "Year two onward",
            "The year somebody gets paid to do this.", OUT_Y2,
            "Total out", "120,000", tall=tall)

    ny = y + tall + 30
    d.rounded_rectangle([L.MARGIN, ny, W - L.MARGIN, ny + 84], 20,
                        fill=(255, 230, 210))
    d.text((L.MARGIN + 30, ny + 42),
           "Before either of these: 65,000 to build it, and six months "
           "in which nothing can be sold.",
           font=L.body(29, 500), fill=MAROON, anchor="lm")
    d.text((L.MARGIN, H - 74),
           "Hosting is the small half: about three cents per household per "
           "month, and it falls as households are added.",
           font=L.body(27, 300), fill=MAROON, anchor="la")
    return L.save(im, "costs_out")


IN_Y1 = [("945 household-months at 4.99", "4,716"),
         ("Care organisations", "0")]

IN_Y3 = [("1,900 households at 79.08 a year", "150,252"),
         ("Six organisations, 2 a resident", "21,600")]


def costs_in():
    """Money in, and what is left after the money out."""
    im = L.ground()
    y = L.kicker(im, "the money")
    y = L.headline(im, "What comes in, and what is left", y, size=88)
    y += 22
    d = ImageDraw.Draw(im)

    gap = 44
    col = (W - L.MARGIN * 2 - gap) / 2
    tall = 74 + 2 * 29 + 18 + 3 * 54 + 96
    _ledger(im, d, L.MARGIN, y, col, "Year one",
            "Six months building, six selling. The pilot is twenty "
            "households, free for six months.", IN_Y1,
            "Total in", "4,716", tall=tall)
    _ledger(im, d, L.MARGIN + col + gap, y, col, "Year three",
            "All three price tiers sellable, because multiple keepers has "
            "shipped by then.", IN_Y3,
            "Total in", "171,852", tall=tall)

    # The two bottom lines: what is left, and the sentence that answers the
    # obvious question before anybody asks it.
    ry = y + tall + 28
    half = (W - L.MARGIN * 2 - gap) / 2
    for i, (label, amount, colour) in enumerate((
            ("Year one result", "\u2212 40,300", BAD),
            ("Year three result", "+ 26,900", GOOD))):
        x = L.MARGIN + i * (half + gap)
        L.card(im, [x, ry, x + half, ry + 108], radius=24, shadow=False)
        d.text((x + 34, ry + 54), label, font=L.body(30, 700), fill=MAROON,
               anchor="lm")
        d.text((x + half - 34, ry + 52), amount,
               font=L.warm._face("mono-700-latin.ttf", 46), fill=colour,
               anchor="rm")

    d.text((L.MARGIN, H - 74),
           "Break even: 752 households at the price we can sell today, "
           "537 once multiple keepers ship.",
           font=L.body(29, 500), fill=MAROON, anchor="la")
    return L.save(im, "costs_in")
