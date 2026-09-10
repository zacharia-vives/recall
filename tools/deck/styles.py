"""Six treatments of the same two slides, to choose between.

All six stay in the campaign's colour family, because the films and Julia's
advertisement pages are fixed points and the deck has to sit with them.
What changes is the treatment: ground, whether content sits on cards, how
the heading is set, and how a divider behaves.

Same content in every one, so the comparison is about the treatment and not
about the words.
"""

import os
import sys

AD = r"C:\Users\zpsja\AppData\Local\Temp\recall-ad"
if AD not in sys.path:
    sys.path.insert(0, AD)

from PIL import Image, ImageDraw          # noqa: E402
import warm                                # noqa: E402
import layout as L                         # noqa: E402

W, H = warm.W, warm.H
PEACH, CREAM, PANEL = warm.PEACH, warm.CREAM, warm.PANEL
RUST, MAROON, INK = warm.RUST, warm.MAROON, warm.INK
INKY = (34, 22, 16)          # the ground the live HTML models already use
BONE = (247, 240, 232)

display, body = warm.display, warm.body

# The sample content: one divider and one list slide.
KICK = "gdpr"
HEAD = "Consent, and taking it back"
ITEMS = [
    ("Article 9: health data", "So explicit consent, not legitimate interest."),
    ("Asked out loud", "In her language. The version she heard is recorded."),
    ("The family cannot consent for her", "It is recorded against her phone."),
    ("Article 7(3): withdrawal stops it",
     "Enforced by ten Postgres policies, not by the app."),
    ("Nothing is deleted", "The row is marked. The cards stay on her phone."),
    ("And it can be given again", "From the same screen."),
]
DIV_N, DIV_LABEL = "04", "gdpr"
DIV_BIG = "Her post, her\nphone, her\ndecision"

OUT = os.path.dirname(os.path.abspath(__file__))


def _wrap(d, t, f, w):
    return L.wrap(d, t, f, w)


def _two_col(d, items, x, y, w, gap, tfont, lfont, tcol, lcol, bullet=None,
             lead=1.2):
    """The list, in two columns, with whatever fonts and colours."""
    per = (len(items) + 1) // 2
    col = (w - gap) / 2
    for c in range(2):
        cx = x + c * (col + gap)
        cy = y
        for t, line in items[c * per:(c + 1) * per]:
            if bullet:
                bullet(d, cx, cy)
            tx = cx + (34 if bullet else 0)
            for ln in _wrap(d, t, tfont, col - 34):
                d.text((tx, cy), ln, font=tfont, fill=tcol, anchor="la")
                cy += int(tfont.size * lead)
            cy += 6
            for ln in _wrap(d, line, lfont, col - 34):
                d.text((tx, cy), ln, font=lfont, fill=lcol, anchor="la")
                cy += int(lfont.size * 1.34)
            cy += 34
    return


# ------------------------------------------------------------------ style A
def style_a():
    """As built: peach ground, one cream card, panel divider."""
    im = warm.field(PEACH)
    d = ImageDraw.Draw(im)
    d.text((116, 116), "  ".join(KICK.upper()), font=body(28, 700),
           fill=PANEL, anchor="la")
    d.rounded_rectangle([116, 162, 180, 168], 3, fill=PANEL)
    y = 190
    for ln in _wrap(d, HEAD, display(92), W - 232):
        d.text((116, y), ln, font=display(92), fill=MAROON, anchor="la")
        y += 106
    warm.card(im, [116, y + 24, W - 116, H - 116], radius=42)

    def bul(dd, x, yy):
        dd.rounded_rectangle([x, yy + 12, x + 13, yy + 40], 6, fill=PANEL)
    _two_col(d, ITEMS, 178, y + 86, W - 356, 60, body(44, 700), body(32, 300),
             RUST, INK, bul)

    div = warm.field(PEACH, blobs=True)
    dd = ImageDraw.Draw(div)
    dd.text((W - 116, H - 96), DIV_N, font=display(420), fill=(255, 214, 184),
            anchor="rs")
    dd.text((116, 236), "  ".join(DIV_LABEL.upper()), font=body(30, 700),
            fill=PANEL, anchor="ls")
    yy = 340
    for ln in DIV_BIG.split("\n"):
        dd.text((116, yy), ln, font=display(116), fill=MAROON, anchor="la")
        yy += 134
    return im, div


# ------------------------------------------------------------------ style B
def style_b():
    """Editorial: cream ground, no cards, hairline rules, bigger display."""
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    d.text((116, 116), "  ".join(KICK.upper()), font=body(28, 700),
           fill=RUST, anchor="la")
    y = 176
    for ln in _wrap(d, HEAD, display(112), W - 232):
        d.text((116, y), ln, font=display(112), fill=MAROON, anchor="la")
        y += 126
    y += 16
    d.line([116, y, W - 116, y], fill=(226, 200, 180), width=3)
    y += 52
    _two_col(d, ITEMS, 116, y, W - 232, 96, body(42, 700), body(31, 300),
             RUST, INK)
    # a rule down the gutter, which is what makes it read as a spread
    d.line([W / 2 - 4, y - 10, W / 2 - 4, H - 130], fill=(232, 210, 192),
           width=2)

    div = Image.new("RGB", (W, H), CREAM)
    dd = ImageDraw.Draw(div)
    dd.text((116, 200), DIV_N, font=display(190), fill=(232, 206, 186),
            anchor="la")
    dd.text((116, 470), "  ".join(DIV_LABEL.upper()), font=body(30, 700),
            fill=RUST, anchor="ls")
    dd.line([116, 500, 560, 500], fill=RUST, width=4)
    yy = 540
    for ln in DIV_BIG.split("\n"):
        dd.text((116, yy), ln, font=display(112), fill=MAROON, anchor="la")
        yy += 128
    return im, div


# ------------------------------------------------------------------ style C
def style_c():
    """Panel: the deep rust everywhere, cream type, cream hairlines."""
    im = Image.new("RGB", (W, H), PANEL)
    d = ImageDraw.Draw(im, "RGBA")
    for x, y0, w, h in ((-200, 600, 800, 540), (1520, -140, 840, 660)):
        d.ellipse([x, y0, x + w, y0 + h], fill=(255, 255, 255, 16))
    d.text((116, 116), "  ".join(KICK.upper()), font=body(28, 700),
           fill=(255, 206, 172), anchor="la")
    y = 176
    for ln in _wrap(d, HEAD, display(100), W - 232):
        d.text((116, y), ln, font=display(100), fill=CREAM, anchor="la")
        y += 114
    y += 20
    d.line([116, y, W - 116, y], fill=(255, 255, 255, 70), width=2)
    y += 52

    def bul(dd, x, yy):
        dd.ellipse([x, yy + 16, x + 14, yy + 30], fill=(255, 190, 149))
    _two_col(d, ITEMS, 116, y, W - 232, 80, body(42, 700), body(31, 300),
             (255, 214, 186), (250, 234, 222), bul)

    div = Image.new("RGB", (W, H), INKY)
    dd = ImageDraw.Draw(div)
    dd.text((116, 236), "  ".join(DIV_LABEL.upper()), font=body(30, 700),
            fill=(230, 130, 80), anchor="ls")
    yy = 330
    for ln in DIV_BIG.split("\n"):
        dd.text((116, yy), ln, font=display(120), fill=BONE, anchor="la")
        yy += 138
    dd.text((W - 116, H - 96), DIV_N, font=display(420), fill=(58, 38, 28),
            anchor="rs")
    return im, div


# ------------------------------------------------------------------ style D
def style_d():
    """Split: a solid panel column carries the heading, content on cream."""
    im = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(im)
    band = 620
    d.rectangle([0, 0, band, H], fill=PANEL)
    d.text((88, 132), "  ".join(KICK.upper()), font=body(27, 700),
           fill=(255, 206, 172), anchor="la")
    d.rounded_rectangle([88, 178, 152, 184], 3, fill=(255, 206, 172))
    y = 230
    for ln in _wrap(d, HEAD, display(76), band - 176):
        d.text((88, y), ln, font=display(76), fill=CREAM, anchor="la")
        y += 90
    d.text((88, H - 96), "Recall  ·  2026", font=body(24, 500),
           fill=(255, 190, 149), anchor="ls")

    def bul(dd, x, yy):
        dd.rounded_rectangle([x, yy + 13, x + 12, yy + 37], 6, fill=PANEL)
    _two_col(d, ITEMS, band + 84, 150, W - band - 168, 58,
             body(38, 700), body(29, 300), RUST, INK, bul)

    div = Image.new("RGB", (W, H), PANEL)
    dd = ImageDraw.Draw(div)
    dd.rectangle([0, 0, 620, H], fill=CREAM)
    dd.text((88, 300), DIV_N, font=display(230), fill=(230, 202, 182),
            anchor="la")
    dd.text((704, 300), "  ".join(DIV_LABEL.upper()), font=body(30, 700),
            fill=(255, 206, 172), anchor="ls")
    yy = 360
    for ln in DIV_BIG.split("\n"):
        dd.text((704, yy), ln, font=display(104), fill=CREAM, anchor="la")
        yy += 122
    return im, div


# ------------------------------------------------------------------ style E
def style_e():
    """Framed: one inset cream sheet with a thin rust keyline. Print-like."""
    im = warm.field(PEACH, blobs=False)
    d = ImageDraw.Draw(im)
    m = 70
    d.rectangle([m, m, W - m, H - m], fill=CREAM)
    d.rectangle([m + 14, m + 14, W - m - 14, H - m - 14], outline=RUST,
                width=2)
    d.text((m + 62, m + 62), "  ".join(KICK.upper()), font=body(27, 700),
           fill=RUST, anchor="la")
    y = m + 122
    for ln in _wrap(d, HEAD, display(94), W - 2 * m - 124):
        d.text((m + 62, y), ln, font=display(94), fill=MAROON, anchor="la")
        y += 108
    y += 14
    d.line([m + 62, y, W - m - 62, y], fill=(224, 198, 178), width=2)
    y += 46

    def bul(dd, x, yy):
        dd.text((x, yy), "—", font=body(32, 700), fill=RUST, anchor="la")
    _two_col(d, ITEMS, m + 62, y, W - 2 * m - 124, 74, body(38, 700),
             body(29, 300), RUST, INK, bul)

    div = warm.field(PEACH, blobs=False)
    dd = ImageDraw.Draw(div)
    dd.rectangle([m, m, W - m, H - m], outline=MAROON, width=3)
    dd.text((W / 2, 400), "  ".join(DIV_LABEL.upper()), font=body(32, 700),
            fill=PANEL, anchor="mm")
    yy = 470
    for ln in DIV_BIG.split("\n"):
        dd.text((W / 2, yy), ln, font=display(104), fill=MAROON, anchor="ma")
        yy += 122
    dd.text((W / 2, H - 150), DIV_N, font=display(64), fill=PANEL,
            anchor="mm")
    return im, div


# ------------------------------------------------------------------ style F
def style_f():
    """Ink: the near-black warm ground the two live HTML models already use,
    so the deck and the models are one object rather than two."""
    im = Image.new("RGB", (W, H), INKY)
    d = ImageDraw.Draw(im, "RGBA")
    d.ellipse([1420, -180, 2320, 520], fill=(255, 255, 255, 10))
    d.text((116, 116), "  ".join(KICK.upper()), font=body(28, 700),
           fill=(230, 130, 80), anchor="la")
    y = 176
    for ln in _wrap(d, HEAD, display(100), W - 232):
        d.text((116, y), ln, font=display(100), fill=BONE, anchor="la")
        y += 114
    y += 46
    # content on raised cards, the way the models do it
    cols = 2
    per = (len(ITEMS) + 1) // 2
    col = (W - 232 - 60) / 2
    room = H - y - 116
    hh = int(min(150, (room - 2 * 22) / per))
    for c in range(cols):
        cx = 116 + c * (col + 60)
        cy = y
        for t, line in ITEMS[c * per:(c + 1) * per]:
            d.rounded_rectangle([cx, cy, cx + col, cy + hh], 20,
                                fill=(48, 32, 24))
            d.rounded_rectangle([cx, cy, cx + 7, cy + hh], 20,
                                fill=(230, 130, 80))
            d.text((cx + 34, cy + int(hh * 0.2)), t, font=body(34, 700),
                   fill=(255, 190, 149), anchor="la")
            ly = cy + int(hh * 0.5)
            for ln in _wrap(d, line, body(27, 300), col - 68):
                d.text((cx + 34, ly), ln, font=body(27, 300), fill=(226, 210, 198),
                       anchor="la")
                ly += 36
            cy += hh + 22

    div = Image.new("RGB", (W, H), INKY)
    dd = ImageDraw.Draw(div)
    dd.text((116, 236), "  ".join(DIV_LABEL.upper()), font=body(30, 700),
            fill=(230, 130, 80), anchor="ls")
    dd.line([116, 264, 300, 264], fill=(230, 130, 80), width=4)
    yy = 340
    for ln in DIV_BIG.split("\n"):
        dd.text((116, yy), ln, font=display(120), fill=BONE, anchor="la")
        yy += 138
    dd.text((W - 116, H - 96), DIV_N, font=display(420), fill=(56, 38, 28),
            anchor="rs")
    return im, div


STYLES = [("A", "As built", style_a),
          ("B", "Editorial", style_b),
          ("C", "Panel", style_c),
          ("D", "Split", style_d),
          ("E", "Framed", style_e),
          ("F", "Ink", style_f)]


def sheet():
    """One image: six styles, a divider and a content slide each."""
    tw = 760
    th = int(tw * 1080 / 1920)
    pad = 26
    label = 46
    cols = 2
    rows = 3
    sw = tw * 2 + pad
    sh = th + label
    out = Image.new("RGB", (cols * (sw + pad) + pad,
                            rows * (sh + pad) + pad), (26, 18, 14))
    d = ImageDraw.Draw(out)
    for i, (letter, name, fn) in enumerate(STYLES):
        content, div = fn()
        content.save(os.path.join(OUT, "style_%s_content.png" % letter))
        div.save(os.path.join(OUT, "style_%s_divider.png" % letter))
        cx = pad + (i % cols) * (sw + pad)
        cy = pad + (i // cols) * (sh + pad)
        d.text((cx, cy + 6), "%s  ·  %s" % (letter, name),
               font=body(30, 700), fill=(255, 190, 149), anchor="la")
        out.paste(div.resize((tw, th), Image.LANCZOS), (cx, cy + label))
        out.paste(content.resize((tw, th), Image.LANCZOS),
                  (cx + tw + pad, cy + label))
    out.save(os.path.join(OUT, "style_choices.png"))
    print("style_choices.png  %dx%d" % out.size)


if __name__ == "__main__":
    sheet()
