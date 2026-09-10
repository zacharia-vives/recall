"""Slide layouts in the film's own theme.

The deck has to look like the advertisement, so it is drawn with the same
module the advertisement is drawn with rather than with a second set of
colours that only nearly match. Everything here sits on top of warm.py:
the peach ground with its flat blobs, the cream cards, Prata for display
and Poppins for everything else.

Slides are rendered as 1920x1080 images and placed full bleed in the pptx.
That is deliberate: Prata and Poppins are not installed on this machine, so
a pptx full of text boxes would fall back to Calibri on the projector and
the theme would be gone. Drawing the type means what is seen here is what
is seen in the room.
"""

import os
import sys

AD = r"C:\Users\zpsja\AppData\Local\Temp\recall-ad"
if AD not in sys.path:
    sys.path.insert(0, AD)

from PIL import Image, ImageDraw            # noqa: E402
import warm                                  # noqa: E402

W, H = warm.W, warm.H
PEACH, CREAM, PANEL = warm.PEACH, warm.CREAM, warm.PANEL
RUST, MAROON, INK = warm.RUST, warm.MAROON, warm.INK

MARGIN = 116
OUT = os.path.dirname(os.path.abspath(__file__))

display = warm.display
body = warm.body
card = warm.card

_slides = []


def wrap(d, text, fnt, width):
    """Greedy wrap. Respects an explicit newline as a hard break."""
    lines = []
    for para in text.split("\n"):
        if not para.strip():
            lines.append("")
            continue
        cur = ""
        for word in para.split():
            probe = (cur + " " + word).strip()
            if d.textlength(probe, font=fnt) <= width or not cur:
                cur = probe
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    return lines


def _bold_runs(text):
    """Split on **markers** into (piece, is_bold) runs, so a bullet can lead
    with the two words that matter without needing two draw calls at the
    call site."""
    runs = []
    for i, piece in enumerate(text.split("**")):
        if piece:
            runs.append((piece, i % 2 == 1))
    return runs


def para(d, xy, text, fnt, fill, width, leading=1.42, anchor="la",
         bold=None):
    """A wrapped paragraph. Returns the y it finished at.

    Understands **bold** inline when a bold face is given, which the plain
    bullet lists use to lead with the words that carry the point."""
    x, y = xy
    step = int(fnt.size * leading)

    if bold is None or "**" not in text:
        for line in wrap(d, text, fnt, width):
            if line:
                d.text((x, y), line, font=fnt, fill=fill, anchor=anchor)
            y += step
        return y

    # Tokenise the whole string once, carrying the bold flag per character,
    # so a marker that closes before a comma does not open a gap in front of
    # it. Splitting each run separately did exactly that: "loud**," came out
    # as "loud ,".
    flags = []
    is_b = False
    i = 0
    while i < len(text):
        if text[i:i + 2] == "**":
            is_b = not is_b
            i += 2
            continue
        flags.append((text[i], is_b))
        i += 1
    words, cur, cur_b = [], "", False
    for ch, b in flags:
        if ch.isspace():
            if cur:
                words.append((cur, cur_b))
            cur, cur_b = "", False
        else:
            if not cur:
                cur_b = b
            cur += ch
    if cur:
        words.append((cur, cur_b))
    cx, line = x, []
    for w, is_b in words:
        f = bold if is_b else fnt
        adv = d.textlength(w + " ", font=f)
        if cx + adv > x + width and line:
            for ww, wb, wx in line:
                d.text((wx, y), ww, font=bold if wb else fnt, fill=fill,
                       anchor="la")
            y += step
            cx, line = x, []
        line.append((w, is_b, cx))
        cx += adv
    for ww, wb, wx in line:
        d.text((wx, y), ww, font=bold if wb else fnt, fill=fill, anchor="la")
    return y + step


def ground(blobs=True):
    return warm.field(PEACH, blobs=blobs)


def kicker(im, text, y=MARGIN, colour=None):
    """The small tracked label above a headline. Letter-spaced by hand,
    because PIL has no tracking and a run-together label looks cheap."""
    d = ImageDraw.Draw(im)
    fnt = body(28, 700)
    spaced = "  ".join(text.upper())
    d.text((MARGIN, y), spaced, font=fnt, fill=colour or PANEL, anchor="la")
    d.rounded_rectangle([MARGIN, y + 46, MARGIN + 64, y + 52], 3,
                        fill=colour or PANEL)
    return y + 74


def headline(im, text, y, size=110, fill=None, width=None):
    d = ImageDraw.Draw(im)
    fnt = display(size)
    return para(d, (MARGIN, y), text, fnt, fill or MAROON,
                width or (W - MARGIN * 2), leading=1.14)


def rule(im, y, wide=200, colour=None):
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([MARGIN, y, MARGIN + wide, y + 8], 4,
                        fill=colour or PANEL)
    return y + 8


def save(im, name):
    path = os.path.join(OUT, "s_%s.png" % name)
    im.save(path)
    _slides.append(path)
    return path


# ------------------------------------------------------------------ layouts

def title(name, big, sub=None, tag=None):
    """The opener and the closer: wordmark, one big line, one small one."""
    im = ground()
    d = ImageDraw.Draw(im)
    warm.wordmark(im, W / 2, 300, size=132, colour=CREAM)
    fnt = display(132)
    y = 470
    for line in wrap(d, big, fnt, W - 300):
        d.text((W / 2, y), line, font=fnt, fill=MAROON, anchor="mm")
        y += 152
    if sub:
        y += 10
        para(d, (W / 2, y), sub, body(42, 300), MAROON, 1200,
             leading=1.4, anchor="ma")
    if tag:
        d.text((W / 2, H - 120), tag, font=body(30, 500), fill=PANEL,
               anchor="mm")
    return save(im, name)


def section(name, number, label, big, sub=None):
    """A divider, on the deep panel colour with cream type."""
    im = Image.new("RGB", (W, H), PANEL)
    d = ImageDraw.Draw(im, "RGBA")
    # The same flat shapes as the peach ground, a shade lighter.
    for x, y0, w, h in ((-200, 560, 820, 560), (1500, -160, 860, 700)):
        d.ellipse([x, y0, x + w, y0 + h], fill=(255, 255, 255, 18))

    d.text((W - MARGIN, H - 96), number, font=display(420),
           fill=(224, 118, 66), anchor="rs")
    d.text((MARGIN, 236), "  ".join(label.upper()), font=body(30, 700),
           fill=(255, 206, 172), anchor="ls")
    d.rounded_rectangle([MARGIN, 262, MARGIN + 72, 268], 3,
                        fill=(255, 206, 172))
    fnt = display(116)
    y = 340
    for line in wrap(d, big, fnt, W - MARGIN * 2 - 300):
        d.text((MARGIN, y), line, font=fnt, fill=CREAM, anchor="la")
        y += 134
    if sub:
        para(d, (MARGIN, y + 30), sub, body(36, 300), (255, 222, 198), 1180)
    return save(im, name)


def _points_height(d, items, columns, note, scale=1.0):
    """How tall the list actually is, so the card can be drawn around it."""
    cols = 2 if columns == 2 else 1
    inner = (W - MARGIN * 2 - 62 * 2 - (60 if cols == 2 else 0)) / cols
    per = (len(items) + cols - 1) // cols
    tallest = 0
    for c in range(cols):
        h = 0
        for item in items[c * per:(c + 1) * per]:
            if isinstance(item, tuple):
                t, line = item
                tf = body(int(44 * scale), 700)
                h += len(wrap(d, t, tf, inner - 34)) * int(44 * scale * 1.18)
                h += int(12 * scale)
                h += len(wrap(d, line, body(int(32 * scale), 300),
                              inner - 34)) * int(32 * scale * 1.34)
                h += int(26 * scale)
            else:
                plain = item.replace("**", "")
                h += len(wrap(d, plain, body(int(36 * scale), 300),
                              inner - 34)) * int(36 * scale * 1.36)
                h += int(22 * scale)
        tallest = max(tallest, h)
    return tallest


def points(name, kick, head, items, note=None, columns=1, head_size=96):
    """A cream card with a list on it. items are (title, line) or plain
    strings. Two columns when there are more than five."""
    im = ground()
    y = kicker(im, kick)
    y = headline(im, head, y, size=head_size)
    y += 24
    top = y
    if note:
        probe0 = ImageDraw.Draw(Image.new("RGB", (10, 10)))
        note_lines = len(wrap(probe0, note, body(28, 500), W - MARGIN * 2))
    else:
        note_lines = 0
    limit = H - MARGIN - (30 + note_lines * 38 if note else 0)

    # Measure first, then draw the card to fit. A card sized to the slide
    # rather than to its contents leaves a pool of empty cream under three
    # bullets, which reads as a slide somebody did not finish.
    pad = 62
    probe = ImageDraw.Draw(Image.new("RGB", (10, 10)))
    # Shrink to fit rather than run off the slide. A list that does not fit
    # at full size is still better read small than clipped, and a clipped
    # slide is the one thing that cannot be rescued from the stage.
    scale = 1.0
    for attempt in range(14):
        need = _points_height(probe, items, columns, note, scale) + pad * 2
        if top + need <= limit:
            break
        scale -= 0.05
    box_bottom = min(limit, top + max(240, need))
    warm.card(im, [MARGIN, top, W - MARGIN, box_bottom], radius=42)
    d = ImageDraw.Draw(im)

    cols = 2 if columns == 2 else 1
    inner = (W - MARGIN * 2 - pad * 2 - (60 if cols == 2 else 0)) / cols
    per = (len(items) + cols - 1) // cols
    for c in range(cols):
        x = MARGIN + pad + c * (inner + 60)
        yy = top + pad
        for item in items[c * per:(c + 1) * per]:
            if isinstance(item, tuple):
                t, line = item
                d.rounded_rectangle([x, yy + 12, x + 13, yy + 40], 6,
                                    fill=PANEL)
                # The title wraps like everything else. It did not, so a
                # long one ("What a care organisation is actually buying")
                # ran straight out of the column and off the card.
                tf = body(int(44 * scale), 700)
                yy = para(d, (x + 34, yy), t, tf, RUST, inner - 34,
                          leading=1.18)
                yy = para(d, (x + 34, yy + int(12 * scale)), line,
                          body(int(32 * scale), 300), INK,
                          inner - 34, leading=1.34)
                yy += int(26 * scale)
            else:
                d.rounded_rectangle([x, yy + 12, x + 13, yy + 40], 6,
                                    fill=PANEL)
                yy = para(d, (x + 34, yy), item, body(int(36 * scale), 300),
                          INK, inner - 34, leading=1.36,
                          bold=body(int(36 * scale), 700))
                yy += int(22 * scale)
    if note:
        # Wrapped, and measured from the card rather than from a fixed
        # baseline. As one unwrapped line it ran off the right edge.
        nf = body(28, 500)
        lines = wrap(d, note, nf, W - MARGIN * 2)
        ny = max(box_bottom + 30, H - MARGIN - 24 - (len(lines) - 1) * 38)
        for ln in lines:
            d.text((MARGIN, ny), ln, font=nf, fill=MAROON, anchor="la")
            ny += 38
    return save(im, name)


def statement(name, kick, big, lines=(), foot=None):
    """One claim, large, with a few supporting lines. For the WHY slides."""
    im = ground()
    y = kicker(im, kick)
    d = ImageDraw.Draw(im)
    fnt = display(104)
    for line in wrap(d, big, fnt, W - MARGIN * 2 - 60):
        d.text((MARGIN, y), line, font=fnt, fill=MAROON, anchor="la")
        y += 122
    y += 30
    for line in lines:
        y = para(d, (MARGIN, y), line, body(40, 300), INK, W - MARGIN * 2 - 240,
                 leading=1.4)
        y += 26
    if foot:
        # Below the body, or at the foot of the slide, whichever is lower.
        # A fixed baseline put it straight through the last line.
        fy = max(y + 24, H - MARGIN - 46)
        d.rounded_rectangle([MARGIN, fy - 6, MARGIN + 96, fy + 2], 4,
                            fill=PANEL)
        para(d, (MARGIN, fy + 22), foot, body(30, 500), PANEL,
             W - MARGIN * 2 - 240, leading=1.34)
    return save(im, name)


def art(name, kick, head, image, caption=None, side="right", items=(),
        head_size=88):
    """Half text, half picture. The picture is fitted, never stretched."""
    im = ground()
    y = kicker(im, kick)
    d = ImageDraw.Draw(im)
    col = 880
    tx = MARGIN if side == "right" else W - MARGIN - col
    ix = W - MARGIN - 820 if side == "right" else MARGIN

    fnt = display(head_size)
    yy = y
    for line in wrap(d, head, fnt, col):
        d.text((tx, yy), line, font=fnt, fill=MAROON, anchor="la")
        yy += int(head_size * 1.16)
    yy += 20
    for item in items:
        if isinstance(item, tuple):
            t, line = item
            d.text((tx, yy), t, font=body(34, 700), fill=RUST, anchor="la")
            yy = para(d, (tx, yy + 46), line, body(28, 300), INK, col,
                      leading=1.34)
            yy += 24
        else:
            d.rounded_rectangle([tx, yy + 11, tx + 12, yy + 37], 6, fill=PANEL)
            yy = para(d, (tx + 32, yy), item, body(31, 300), INK, col - 32,
                      leading=1.36)
            yy += 20

    pic = Image.open(image).convert("RGB")
    room = (820, H - y - MARGIN)
    scale = min(room[0] / pic.width, room[1] / pic.height)
    pic = pic.resize((int(pic.width * scale), int(pic.height * scale)),
                     Image.LANCZOS)
    px = ix + (820 - pic.width) // 2
    py = y + (room[1] - pic.height) // 2
    d.rounded_rectangle([px + 10, py + 12, px + pic.width + 10,
                         py + pic.height + 12], 26, fill=(190, 110, 70, 70))
    im.paste(pic, (px, py))
    if caption:
        d.text((px + pic.width / 2, py + pic.height + 34), caption,
               font=body(26, 500), fill=MAROON, anchor="ma")
    return save(im, name)


def full(name, image):
    """A ready-made slide used as it is."""
    pic = Image.open(image).convert("RGB")
    if pic.size != (W, H):
        pic = pic.resize((W, H), Image.LANCZOS)
    return save(pic, name)


def gallery(name, kick, head, shots, captions=(), note=None):
    """Three or four device shots in a row, on the peach ground."""
    im = ground()
    y = kicker(im, kick)
    y = headline(im, head, y, size=88)
    y += 18
    d = ImageDraw.Draw(im)
    n = len(shots)
    slot = (W - MARGIN * 2) / n

    # Reserve the caption band and the note band before sizing the pictures,
    # rather than after. Doing it after is how three captions and a note all
    # ended up drawn on the same baseline on top of each other.
    cap_font = body(27, 500)
    cap_lines = 0
    for i in range(n):
        if i < len(captions) and captions[i]:
            cap_lines = max(cap_lines, len(wrap(d, captions[i], cap_font,
                                                slot - 60)))
    cap_band = cap_lines * int(cap_font.size * 1.3) + (18 if cap_lines else 0)
    note_band = 0
    if note:
        note_band = len(wrap(d, note, body(27, 300), W - MARGIN * 2)) * 36 + 18
    room = H - y - MARGIN - cap_band - note_band

    for i, shot in enumerate(shots):
        pic = shot if isinstance(shot, Image.Image) else Image.open(shot)
        pic = pic.convert("RGB")
        scale = min((slot - 52) / pic.width, room / pic.height)
        pic = pic.resize((max(1, int(pic.width * scale)),
                          max(1, int(pic.height * scale))), Image.LANCZOS)
        cx = MARGIN + slot * i + slot / 2
        px = int(cx - pic.width / 2)
        py = int(y + (room - pic.height) / 2)
        d.rounded_rectangle([px + 10, py + 12, px + pic.width + 10,
                             py + pic.height + 12], 24, fill=(190, 110, 70, 70))
        im.paste(pic, (px, py))
        if i < len(captions) and captions[i]:
            cy = y + room + 16
            for line in wrap(d, captions[i], cap_font, slot - 60):
                d.text((cx, cy), line, font=cap_font, fill=MAROON,
                       anchor="ma")
                cy += int(cap_font.size * 1.3)
    if note:
        para(d, (MARGIN, y + room + cap_band + 14), note, body(27, 300), INK,
             W - MARGIN * 2, leading=1.32)
    return save(im, name)


def video_card(name, kick, head, sub, seconds):
    """The still that sits behind an embedded film, so a slide that has not
    started playing yet still reads as a slide."""
    im = ground()
    d = ImageDraw.Draw(im)
    kicker(im, kick, y=MARGIN)
    fnt = display(120)
    y = 400
    for line in wrap(d, head, fnt, W - 400):
        d.text((W / 2, y), line, font=fnt, fill=MAROON, anchor="mm")
        y += 140
    d.text((W / 2, y + 20), sub, font=body(38, 300), fill=INK, anchor="mm")
    r = 76
    cy = y + 180
    d.ellipse([W / 2 - r, cy - r, W / 2 + r, cy + r], fill=PANEL)
    d.polygon([(W / 2 - 22, cy - 34), (W / 2 - 22, cy + 34),
               (W / 2 + 34, cy)], fill=CREAM)
    d.text((W / 2, cy + r + 46), seconds, font=body(28, 700), fill=PANEL,
           anchor="mm")
    return save(im, name)


def slides():
    return list(_slides)
