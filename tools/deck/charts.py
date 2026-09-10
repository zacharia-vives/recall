"""The two money pictures, drawn in the deck's theme.

Both take their figures from Mattiece's model as it stands in Notion and
nothing else. Year two is deliberately not charted as a result: the model
gives an end-of-year household count for it but never a bottom line, and
inventing one to make a prettier curve would be the sort of thing a jury
asks about.
"""

import layout as L
from PIL import ImageDraw

W, H = L.W, L.H
CREAM, PANEL, RUST, MAROON, INK = L.CREAM, L.PANEL, L.RUST, L.MAROON, L.INK
GOOD = (86, 122, 64)        # a green that sits in this palette, not a stock one
BAD = (176, 62, 44)


def money():
    """Year one against year three: households, revenue, costs, result.

    This is the layout Mattiece's own page recommends for the slide, which
    is worth following because it is his model.
    """
    im = L.ground()
    y = L.kicker(im, "the money")
    y = L.headline(im, "Year one, and year three", y, size=92)
    y += 20

    top = y
    bottom = H - 148
    L.card(im, [L.MARGIN, top, W - L.MARGIN, bottom], radius=42)
    d = ImageDraw.Draw(im)

    rows = [
        ("Households, end of year", "345", "2,600"),
        ("Revenue", "4,716", "171,852"),
        ("Costs", "45,000", "145,000"),
    ]
    x0 = L.MARGIN + 62
    cw = (W - L.MARGIN * 2 - 124) / 3.0
    c1 = x0 + cw * 1.32
    c2 = x0 + cw * 2.32

    d.text((c1, top + 54), "YEAR ONE", font=L.body(34, 700), fill=PANEL,
           anchor="mm")
    d.text((c2, top + 54), "YEAR THREE", font=L.body(34, 700), fill=PANEL,
           anchor="mm")
    d.text((x0, top + 54), "lean, no salary   /   salaried",
           font=L.body(24, 300), fill=INK, anchor="lm")

    yy = top + 118
    for label, a, b in rows:
        d.line([x0, yy, W - L.MARGIN - 62, yy], fill=(232, 205, 186), width=2)
        d.text((x0, yy + 46), label, font=L.body(33, 500), fill=INK,
               anchor="lm")
        d.text((c1, yy + 46), a, font=L.body(46, 700), fill=RUST, anchor="mm")
        d.text((c2, yy + 46), b, font=L.body(46, 700), fill=RUST, anchor="mm")
        yy += 94

    d.line([x0, yy, W - L.MARGIN - 62, yy], fill=(232, 205, 186), width=2)
    d.text((x0, yy + 58), "Result", font=L.body(38, 700), fill=MAROON,
           anchor="lm")
    d.text((c1, yy + 58), "− 40,300", font=L.body(58, 700), fill=BAD,
           anchor="mm")
    d.text((c2, yy + 58), "+ 26,900", font=L.body(58, 700), fill=GOOD,
           anchor="mm")

    # The sentence that answers the question before it is asked, inside the
    # card rather than hanging off the bottom of it.
    yy += 118
    d.rounded_rectangle([x0, yy, W - L.MARGIN - 62, yy + 86], 18,
                        fill=(255, 230, 210))
    d.text((x0 + 28, yy + 43),
           "Break even: 752 households today. 537 once multiple keepers ship.",
           font=L.body(30, 500), fill=MAROON, anchor="lm")

    d.text((L.MARGIN, H - 96),
           "Year two is the bridge, and is not separately modelled.",
           font=L.body(28, 300), fill=MAROON, anchor="la")
    return L.save(im, "money")


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
    """The ladder, in order, with the one that closes this month marked.

    Programmes are easy to name; calls are what you can actually apply to.
    So the picture is a timeline of calls, not a list of funds.
    """
    im = L.ground()
    y = L.kicker(im, "funding")
    y = L.headline(im, "The calls that are actually open", y, size=88)
    y += 26

    d = ImageDraw.Draw(im)
    x0 = L.MARGIN + 44
    row_h = 112
    top = y + 10

    # The spine.
    d.rounded_rectangle([x0, top + 26, x0 + 10, top + row_h * len(CALLS) - 30],
                        5, fill=(232, 176, 140))

    for i, (name, what, when, money_, note, urgent) in enumerate(CALLS):
        cy = top + row_h * i + 44
        r = 21 if urgent else 15
        d.ellipse([x0 + 5 - r, cy - r, x0 + 5 + r, cy + r],
                  fill=PANEL if urgent else (222, 150, 112))
        if urgent:
            d.ellipse([x0 + 5 - 8, cy - 8, x0 + 5 + 8, cy + 8], fill=CREAM)

        tx = x0 + 66
        L.card(im, [tx, cy - 44, W - L.MARGIN, cy + 46], radius=22,
               shadow=False, fill=CREAM if not urgent else (255, 236, 220))
        d.text((tx + 30, cy - 16), name, font=L.body(36, 700), fill=RUST,
               anchor="lm")
        d.text((tx + 30, cy + 22), what, font=L.body(26, 300), fill=INK,
               anchor="lm")
        d.text((tx + 700, cy - 16), when, font=L.body(30, 700),
               fill=PANEL if urgent else INK, anchor="lm")
        d.text((tx + 700, cy + 22), note, font=L.body(24, 300), fill=INK,
               anchor="lm")
        d.text((W - L.MARGIN - 34, cy), money_, font=L.body(40, 700),
               fill=MAROON, anchor="rm")

    L.para(d, (L.MARGIN, H - 146),
           "And one line worth more than the table on a Belgian stage: Recall "
           "already meets the eight Caring Technology Principles published by "
           "the King Baudouin Foundation, including the two hardest to "
           "retrofit: autonomous and informed choice, and ownership of "
           "personal data.",
           L.body(27, 300), MAROON, W - L.MARGIN * 2, leading=1.3)
    return L.save(im, "funding")
