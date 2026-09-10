"""The end presentation, slide by slide.

Running order as asked: the seventeen second advertisement, who and what and
why and how, the team, the business with the money and the funding and the
campaign and the SWOT, the features with screenshots, the demo film, GDPR,
Notion, the roadmap, the learning platform, and the thirty second film to
close. Then an annexe for the questions the professors will ask.

Every slide is drawn in the advertisement's own palette by layout.py, so the
deck and the films are the same object.
"""

import layout as L
import charts
from PIL import Image, ImageDraw

W, H = L.W, L.H

# ---------------------------------------------------------------- 1. the ad
L.video_card("v_ad", "we open with this",
             "Seventeen seconds", "The advertisement, as it will run",
             "0:17  ·  plays on click")

L.title("title", "Never forget\nwhat matters",
        "A memory store for people who cannot keep one, "
        "with a camera that does the filing.",
        "VIVES Kortrijk  ·  Friday 11 September 2026  ·  "
        "Zacharia, Julia, Luke, Mattiece")

# -------------------------------------------------- 2. who, what, why, how
L.section("sec_intro", "01", "the product",
          "Who it is for,\nand what it does",
          "Four questions, in the order anybody actually asks them.")

L.statement("who", "for who",
            "The person who\nforgets, and the\ndaughter who does not.",
            ["Seventies. Lives alone. Reads her own post. "
             "Does not want managing.",
             "Her daughter works, and hears about the hospital letter "
             "a week late."],
            foot="Opposite needs. Hence two interfaces.")

L.points("what", "what", "What Recall is", [
    ("Cards, not notes", "Letters, people, places, appointments."),
    ("A camera that files", "Magnify a letter. The card is the by-product."),
    ("It reads back", "A neural voice on the phone. NL, FR, EN."),
    ("A second interface", "The family, on a laptop."),
], note="Live: zacharia-vives.github.io/recall", columns=2, head_size=104)

L.statement("why", "why",
            "A manual is the one\nkind of help this\ngroup cannot use.",
            ["Every reminder app needs typing. She is the one who will not.",
             "So filing is a side effect of making print big enough to read."],
            foot="A magnifier is a free tool. A magnifier that files "
                 "is a product.")

L.points("how", "how", "How it works", [
    ("Point and magnify", "Read on the device. The national number goes."),
    ("Confirm the date", "By hand. Nothing is filed silently."),
    ("Her phone first", "Then the household, if she said yes."),
    ("The family adds", "She hears it, and sees what they did."),
], note="No login for her. Six letters link the phone, once.",
   columns=2, head_size=104)

# ----------------------------------------------------------------- 3. team
TEAM = [
    ("Zacharia Janssen", "Project manager  ·  Developer",
     "The board, the build, the demo, the roadmap."),
    ("Julia Chauchard", "Sales and marketing",
     "The SWOT, the positioning, the campaign."),
    ("Luke Byrne", "Developer  ·  Every test",
     "Proves every fix on a real phone."),
    ("Mattiece Denduyver", "Business model  ·  Budget",
     "The canvas, the costs, the pricing, the revenue."),
]


def team():
    im = L.ground()
    y = L.kicker(im, "the team")
    y = L.headline(im, "Four of us", y, size=98)
    y += 26
    d = ImageDraw.Draw(im)
    cw = (W - L.MARGIN * 2 - 3 * 28) / 4.0
    top = y
    tall = H - top - L.MARGIN - 40
    for i, (name, role, what) in enumerate(TEAM):
        x = L.MARGIN + i * (cw + 28)
        L.card(im, [x, top, x + cw, top + tall], radius=32)
        # A badge with the initial, in the deck's own circular style.
        cx, cy, r = x + cw / 2, top + 96, 54
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=L.PANEL)
        d.text((cx, cy + 2), name[0], font=L.body(52, 700), fill=L.CREAM,
               anchor="mm")
        first, last = name.split(" ", 1)
        d.text((cx, cy + r + 52), first, font=L.body(36, 700), fill=L.RUST,
               anchor="mm")
        d.text((cx, cy + r + 96), last, font=L.body(36, 700), fill=L.RUST,
               anchor="mm")
        yy = cy + r + 138
        for part in role.split("  ·  "):
            d.text((cx, yy), part, font=L.body(23, 500), fill=L.PANEL,
                   anchor="ma")
            yy += 32
        L.para(d, (x + 34, yy + 18), what, L.body(24, 300), L.INK, cw - 68,
               leading=1.42)
    d.text((L.MARGIN, H - 74),
           "Agreed on Tuesday: every test task goes to Luke.",
           font=L.body(29, 500), fill=L.MAROON, anchor="ls")
    return L.save(im, "team")


team()

# ------------------------------------------------------------- 4. business
L.section("sec_biz", "02", "the business",
          "Who pays,\nwhat it costs,\nand where the\nmoney comes from",
          "Mattiece on the model and the numbers, Julia on the market.")

L.points("model", "the model", "Two customers, both", [
    ("Families", "4.99 to 14.99 a month. Only 4.99 sells today."),
    ("Care organisations", "2 a resident, minimum a hundred. Plus the API."),
    ("Why both", "One gets users. The other pays the salary."),
    ("What they buy", "The end of retyping."),
], note="Balanced, rather than leading with one.", columns=2, head_size=96)

charts.money()
charts.funding()

# Page one of Julia's campaign deck, as delivered: only the body text was
# darkened, and the page is supersampled so the type is crisp.
L.full("campaign1", "ad_touched_p1.png")


def campaign2():
    """The social half, recomposed in the deck's own grid.

    Julia's page had the four logos in a block and the copy as one run of
    text. Same content, same images, laid out on the deck's columns so it
    reads from the back of a room.
    """
    im = L.ground()
    y = L.kicker(im, "the campaign")
    d = ImageDraw.Draw(im)
    fnt = L.display(84)
    yy = y
    for line in L.wrap(d, "And the people who install it for them", fnt, 980):
        d.text((L.MARGIN, yy), line, font=fnt, fill=L.MAROON, anchor="la")
        yy += 98
    yy += 18

    top = yy
    col = 900
    L.card(im, [L.MARGIN, top, L.MARGIN + col, top + 330], radius=34)
    for i, (t, line) in enumerate([
        ("Posts, and video adverts",
         "Instagram and Facebook. YouTube and Spotify."),
        ("Aimed at 18 to 50",
         "Not at her. At whoever sets her phone up."),
    ]):
        by = top + 62 + i * 148
        d.rounded_rectangle([L.MARGIN + 44, by + 10, L.MARGIN + 57, by + 38],
                            6, fill=L.PANEL)
        d.text((L.MARGIN + 78, by), t, font=L.body(36, 700), fill=L.RUST,
               anchor="la")
        L.para(d, (L.MARGIN + 78, by + 52), line, L.body(28, 300), L.INK,
               col - 122, leading=1.34)

    # The right column, fitted to the room that is actually left rather than
    # laid out and hoped for: the photograph ran off the bottom of the slide.
    gx = L.MARGIN + col + 56
    gw = W - L.MARGIN - gx
    gtop = top
    gbot = H - L.MARGIN
    row_h = 168 + 34                    # tile plus its label
    ph_room = (gbot - gtop) - row_h - 34

    # Julia's photograph, at the top of the column, fitted to that room.
    ph = Image.open("p_photo.png").convert("RGB")
    sc = min(gw / ph.width, ph_room / ph.height)
    ph = ph.resize((int(ph.width * sc), int(ph.height * sc)), Image.LANCZOS)
    px = int(gx + (gw - ph.width) / 2)
    py = int(gtop)
    d.rounded_rectangle([px + 8, py + 10, px + ph.width + 8,
                         py + ph.height + 10], 20, fill=(190, 110, 70, 70))
    im.paste(ph, (px, py))

    # The four platforms in one even row underneath. Named from the files as
    # they actually are: the extraction order was not the reading order.
    tiles = [("p_logo_ig.png", "Instagram"), ("p_logo_fb.png", "Facebook"),
             ("p_logo_yt.png", "YouTube"), ("p_logo_sp.png", "Spotify")]
    gap = 22
    side = int((gw - gap * 3) / 4)
    ty = gbot - row_h
    for i, (path, label) in enumerate(tiles):
        cx = gx + i * (side + gap)
        L.card(im, [cx, ty, cx + side, ty + side], radius=24, shadow=False)
        inset = int(side * 0.18)
        logo = Image.open(path).convert("RGB").resize(
            (side - inset * 2, side - inset * 2), Image.LANCZOS)
        im.paste(logo, (int(cx + inset), int(ty + inset)))
        d.text((cx + side / 2, ty + side + 12), label,
               font=L.body(21, 500), fill=L.INK, anchor="ma")

    L.para(d, (L.MARGIN, top + 372),
           "A QR code on every advert. One scan from wherever it is seen.",
           L.body(31, 300), L.MAROON, col, leading=1.36)
    return L.save(im, "campaign2")


campaign2()


def campaign3():
    """The two pieces of creative, on equal cards with captions."""
    im = L.ground()
    y = L.kicker(im, "the campaign")
    y = L.headline(im, "What the advert looks like", y, size=88)
    y += 22
    d = ImageDraw.Draw(im)

    shots = [("p_mock_post.png", "The Instagram post",
              "Organic, in the feed, from the Recall account"),
             ("p_mock_poster.png", "The poster",
              "Pharmacies, surgeries and magazines, with the QR code")]
    room = H - y - L.MARGIN - 96
    slot = (W - L.MARGIN * 2) / 2.0
    for i, (path, title, cap) in enumerate(shots):
        pic = Image.open(path).convert("RGB")
        scale = min((slot - 260) / pic.width, room / pic.height)
        pic = pic.resize((int(pic.width * scale), int(pic.height * scale)),
                         Image.LANCZOS)
        cx = L.MARGIN + slot * i + slot / 2
        px = int(cx - pic.width / 2)
        py = int(y + (room - pic.height) / 2)
        pad = 26
        L.card(im, [px - pad, py - pad, px + pic.width + pad,
                    py + pic.height + pad], radius=30)
        im.paste(pic, (px, py))
        d.text((cx, y + room + 34), title, font=L.body(36, 700), fill=L.RUST,
               anchor="ma")
        d.text((cx, y + room + 80), cap, font=L.body(26, 300), fill=L.INK,
               anchor="ma")
    return L.save(im, "campaign3")


campaign3()


def swot():
    """Julia's graphic, on the deck's ground. Her four boxes untouched."""
    im = L.ground()
    y = L.kicker(im, "the market")
    d = ImageDraw.Draw(im)
    head = L.display(96)
    d.text((L.MARGIN, y), "SWOT", font=head, fill=L.MAROON, anchor="la")
    # Measured, not guessed: the strapline sits after the word, whatever the
    # word measures at.
    d.text((L.MARGIN + d.textlength("SWOT", font=head) + 40, y + 66),
           "Julia's analysis, as delivered",
           font=L.body(30, 300), fill=L.INK, anchor="lm")
    pic = Image.open("swot_themed.png").convert("RGB")
    top = y + 128
    room = H - top - 40
    scale = room / float(pic.height)
    pic = pic.resize((int(pic.width * scale), int(pic.height * scale)),
                     Image.LANCZOS)
    px = int((W - pic.width) / 2)
    d.rounded_rectangle([px + 10, top + 12, px + pic.width + 10,
                         top + pic.height + 12], 26, fill=(190, 110, 70, 70))
    im.paste(pic, (px, top))
    return L.save(im, "swot")


swot()

L.points("swot_build", "the market", "What the build adds", [
    ("+ The letter never leaves the phone",
     "No competitor using cloud recognition can say that."),
    ("+ No account, no wifi", "The room cannot break the demo."),
    ("+ Proven, not claimed", "407 checks. Zero Axe violations."),
    ("− No notification while closed", "Needs a server we do not run."),
    ("− Nobody over seventy has used it", "Booked. Not done."),
    ("! The free giants", "None of them file."),
], columns=2, head_size=92,
   note="Julia's boxes come from the idea. These come from the build.")

# ------------------------------------------------------------- 5. features
L.section("sec_feat", "03", "the features",
          "Everything that\nis actually built",
          "All of it live, at v49, in three languages.")

L.points("features", "the features", "What is in it today", [
    "**Camera and magnifier**, reading on the device",
    "**Cards**: letters, people, places, checklists",
    "**Read out loud**, neural voice on the phone",
    "**Reminders**, with repeats, missed and done",
    "**Call reminders** that dial",
    "**Checklists**, even from a photograph",
    "**Documents**: text, Word, pdf",
    "**Press to enlarge**",
    "**The way there**: Apple, Google or Waze",
    "**Three languages**",
    "**26 looks**, contrast checked in every one",
    "**A lock**, with a family rescue code",
    "**Works offline**",
    "**The family app**, on a laptop",
    "**Six letters** link her phone",
    "**A partner API**",
    "**A copy of everything**, one press",
    "**What Recall knows**, counted",
], columns=2, head_size=92)

L.gallery("shots_keeper", "screenshots", "Her side: point, read, keep",
          ["scr_camera.png", "scr_today.png", "scr_reminder.png"],
          ["The camera, magnifying live",
           "Today, read out loud",
           "A reminder"],
          note="Nothing is filed silently.")

L.gallery("shots_more", "screenshots", "Checklists, documents, the way there",
          ["scr_checklist.png", "scr_maps.png", "scr_voice.png"],
          ["A checklist, from a photograph",
           "The way there",
           "The voice, on the device"],
          note="60 MB, downloaded once. The phone's own voice is the only "
               "fallback.")

L.art("shots_helper", "screenshots", "The family's side",
      "scr_helper_list.png", side="right", head_size=88, items=[
    ("Cards, reminders, the bin", "Add, tick off, bin for thirty days."),
    ("Documents from here", "Only the words travel."),
    ("And what it will not show",
     "No location. No usage times. No read receipts."),
])

L.gallery("shots_link", "screenshots", "Linking her phone, and consent",
          ["scr_linkcode.png", "scr_consent.png", "scr_knows.png"],
          ["Six letters, fifteen minutes",
           "Consent, read out loud",
           "What Recall knows, counted"],
          note="She never sees a login screen.")

def themes():
    """Six of the twenty six, side by side, same screen in each."""
    im = L.ground()
    y = L.kicker(im, "the looks")
    y = L.headline(im, "One screen, twenty six looks", y, size=88)
    y += 18
    d = ImageDraw.Draw(im)

    picks = [("thm_warm-paper.png", "Warm paper", "daylight"),
             ("thm_calm.png", "Calm", "daylight"),
             ("thm_sober-white.png", "Sober white", "daylight"),
             ("thm_amber-night.png", "Amber night", "night"),
             ("thm_sober-dark.png", "Sober dark", "night"),
             ("thm_large-serif.png", "Large serif", "low vision")]

    note = ("A palette, a typeface, a shape and a layout, generated together "
            "with the contrast checked by role before the CSS exists. "
            "A look cannot ship below 4.5:1.")
    nf = L.body(29, 300)
    nlines = L.wrap(d, note, nf, W - L.MARGIN * 2)
    band = 74
    room = H - y - L.MARGIN - band - len(nlines) * 40

    slot = (W - L.MARGIN * 2) / 6.0
    for i, (path, name, group) in enumerate(picks):
        pic = Image.open(path).convert("RGB")
        sc = min((slot - 30) / pic.width, room / pic.height)
        pic = pic.resize((int(pic.width * sc), int(pic.height * sc)),
                         Image.LANCZOS)
        cx = L.MARGIN + slot * i + slot / 2
        px, py = int(cx - pic.width / 2), int(y + (room - pic.height) / 2)
        d.rounded_rectangle([px + 8, py + 10, px + pic.width + 8,
                             py + pic.height + 10], 20,
                            fill=(190, 110, 70, 70))
        im.paste(pic, (px, py))
        d.text((cx, y + room + 22), name, font=L.body(28, 700), fill=L.RUST,
               anchor="ma")
        d.text((cx, y + room + 56), group, font=L.body(23, 300), fill=L.INK,
               anchor="ma")

    ny = y + room + band + 6
    for line in nlines:
        d.text((L.MARGIN, ny), line, font=nf, fill=L.MAROON, anchor="la")
        ny += 40
    return L.save(im, "themes")


themes()


# ------------------------------------------------------------- 6. the demo
L.video_card("v_demo", "the demo",
             "Both sides,\nend to end", "A real walkthrough, not an advert",
             "1:22  ·  plays on click")

# ----------------------------------------------------------------- 7. GDPR
L.section("sec_gdpr", "04", "gdpr",
          "Her post, her\nphone, her\ndecision",
          "The part of this project with the least room to be vague.")

L.points("gdpr_where", "gdpr", "Where the data is", [
    ("Her phone, first", "No account, no network needed."),
    ("The shared copy: Frankfurt", "Supabase, eu-central-1. EU only."),
    ("Encrypted", "TLS in transit. At rest on the server."),
    ("Read on the device", "No cloud OCR. No cloud voice. Ever."),
], note="eu-central-1  ·  Frankfurt, Germany", columns=2, head_size=100)

L.points("gdpr_consent", "gdpr", "Consent, and taking it back", [
    ("Article 9: health data", "So explicit consent, not legitimate interest."),
    ("Asked out loud", "In her language. The version she heard is recorded."),
    ("The family cannot consent for her", "It is recorded against her phone."),
    ("Article 7(3): withdrawal stops it",
     "Enforced by ten Postgres policies, not by the app."),
    ("Nothing is deleted", "The row is marked. The cards stay on her phone."),
    ("And it can be given again", "From the same screen."),
], columns=2, head_size=92)

L.points("gdpr_less", "gdpr", "What we chose not to collect", [
    ("No location", "Ever. Not hers, not the card's."),
    ("No usage times", "Not when she opened it, or whether."),
    ("No read receipts", "Coming, done, missed. Never ‘she saw it’."),
    ("The national number is stripped", "Before anything is stored."),
    ("A bin, not a trapdoor", "Thirty days. Then everything on the card."),
    ("Face matching would run on the device", "Roadmap, and consent first."),
], columns=2, head_size=92)

L.points("gdpr_rights", "gdpr", "The rights, in the product", [
    ("Article 15, access", "‘What Recall knows about you’, counted."),
    ("Article 20, portability", "Everything, in one file, one press."),
    ("Article 30, the log", "What the family did, in her language."),
    ("Article 35, the DPIA", "Written. It names what is unfinished."),
    ("The authority is named", "The Belgian DPA, in all three languages."),
    ("Three honest gaps",
     "No key of her own yet. The library is on a CDN. No processor "
     "agreement, because no company."),
], columns=2, head_size=96)

# ---------------------------------------------------------------- 8. Notion
L.section("sec_notion", "05", "how we worked",
          "Notion, and\nwhat is on it",
          "Thirteen working hours, four people, one workspace.")

def _shot(path, bottom_trim=96):
    """A capture, trimmed to the part worth showing.

    Notion centres its content in a wide empty page, so a full-width capture
    scaled into a slide is unreadable. This keeps the content column and the
    top bar and throws away the dead margins, which roughly doubles the size
    the type ends up at. The cookie banner goes too."""
    im = Image.open(path).convert("RGB")
    return im.crop((300, 0, 1360, im.height - bottom_trim))


def _ink_head(im, kick, head, size=88):
    d = ImageDraw.Draw(im)
    d.text((L.MARGIN, L.MARGIN), "  ".join(kick.upper()),
           font=L.body(28, 700), fill=L.EMBER, anchor="la")
    d.rounded_rectangle([L.MARGIN, L.MARGIN + 46, L.MARGIN + 64,
                         L.MARGIN + 52], 3, fill=L.EMBER)
    y = L.MARGIN + 74
    hf = L.display(size)
    for line in L.wrap(d, head, hf, W - L.MARGIN * 2):
        d.text((L.MARGIN, y), line, font=hf, fill=L.BONE, anchor="la")
        y += int(size * 1.14)
    return y + 26


def _framed(im, d, pic, x, y, wide, tall):
    """Fit a capture into a box and give it a light keyline, so a dark
    screenshot on a dark ground still reads as a separate object."""
    sc = min(wide / pic.width, tall / pic.height)
    pic = pic.resize((int(pic.width * sc), int(pic.height * sc)),
                     Image.LANCZOS)
    px = int(x + (wide - pic.width) / 2)
    py = int(y)
    im.paste(pic, (px, py))
    d.rectangle([px, py, px + pic.width - 1, py + pic.height - 1],
                outline=(96, 70, 56), width=2)
    return px, py, pic.width, pic.height


def notion_what():
    """The workspace itself, and what is on it."""
    im = Image.new("RGB", (W, H), L.INKY)
    d = ImageDraw.Draw(im, "RGBA")
    d.ellipse([1420, -200, 2340, 540], fill=(255, 255, 255, 10))
    y = _ink_head(im, "notion", "The workspace")

    room_h = H - y - L.MARGIN - 52
    # One capture, large enough to actually read, rather than two that are
    # not. The hub page is the next slide's job if it is wanted.
    px, py, pw, ph = _framed(im, d, _shot("nt_home.png"), L.MARGIN, y,
                             900, room_h)
    d.text((px, py + ph + 18), "The Recall home page, live",
           font=L.body(23, 500), fill=L.MIST, anchor="la")

    cx = px + pw + 46
    cw = W - L.MARGIN - cx
    cy = y
    for t, line in (("Four hubs",
                     "Build. Business. Privacy and the law. Delivery."),
                    ("Three databases",
                     "Sprint board, Daily log, and a Gantt."),
                    ("The test plan",
                     "Nine runs, 407 checks, 31 defects, traceability."),
                    ("Seven process models",
                     "Intake, reminders, consent, the API, the gate.")):
        hh = 132
        d.rounded_rectangle([cx, cy, cx + cw, cy + hh], 18, fill=L.CARD_INK)
        d.rounded_rectangle([cx, cy, cx + 7, cy + hh], 18, fill=L.EMBER)
        d.text((cx + 28, cy + 28), t, font=L.body(32, 700), fill=L.SAND,
               anchor="la")
        L.para(d, (cx + 28, cy + 70), line, L.body(25, 300), L.MIST,
               cw - 56, leading=1.3)
        cy += hh + 18
    return L.save(im, "notion_what")


def notion_how_shots():
    """Kept for when the remaining pages can be captured."""
    im = Image.new("RGB", (W, H), L.INKY)
    d = ImageDraw.Draw(im, "RGBA")
    d.ellipse([1420, -200, 2340, 540], fill=(255, 255, 255, 10))
    y = _ink_head(im, "notion", "How we use it")

    shots = [("nt_sprint.png", "Sprint board",
              "Kanban, during the session"),
             ("nt_daily.png", "Daily log",
              "One entry at the end of each"),
             ("nt_testplan.png", "Test plan",
              "The controlling document")]
    band = 96
    room_h = H - y - L.MARGIN - band
    slot = (W - L.MARGIN * 2) / 3.0
    for i, (path, name, cap) in enumerate(shots):
        try:
            pic = _shot(path)
        except Exception:
            continue
        px, py, pw, ph = _framed(im, d, pic, L.MARGIN + slot * i, y,
                                 slot - 34, room_h)
        cxx = L.MARGIN + slot * i + (slot - 34) / 2
        d.text((cxx, y + room_h + 16), name, font=L.body(30, 700),
               fill=L.SAND, anchor="ma")
        d.text((cxx, y + room_h + 54), cap, font=L.body(23, 300),
               fill=L.MIST, anchor="ma")

    d.text((L.MARGIN, H - L.MARGIN - 10),
           "Kanban during the session. Daily log at the end of it. "
           "The Gantt when somebody asks whether Friday is still real.",
           font=L.body(27, 500), fill=L.EMBER, anchor="ls")
    return L.save(im, "notion_how")


notion_what()

# The three pages we actually open, described rather than shown: Cloudflare
# put a bot check in front of the remaining captures and that is not
# something to work around. Drawn in ink so it sits with the capture above it.
L.points_ink("notion_how", "notion", "How we use it", [
    ("Kanban during the session", "Tasks move as the work lands."),
    ("Daily log at the end of it", "Did, decided, blocked, next."),
    ("The Gantt for one question", "Is Friday still real?"),
    ("Decisions, dated, when taken", "Fourteen. Including the two superseded."),
    ("Written as we went", "Not the night before."),
    ("What it cost", "A thousand-block cap, so long tables live in the repo."),
], columns=2, head_size=100)


# --------------------------------------------------------------- 9. roadmap
L.section("sec_road", "06", "what comes next",
          "The roadmap,\nall of it in\none place",
          "What was cut, what was always next, and what a jury asked for.")

L.points("roadmap", "the roadmap", "Everything that is next", [
    ("itsme, FranceConnect, and after that",
     "To prove who really signed a legal document. Belgium first, France "
     "next, then a country at a time."),
    ("Social media", "The people she saved, and what they post."),
    ("Web push", "Reminders while the app is closed."),
    ("Multiple keepers", "The 6.99 and 14.99 tiers need it."),
    ("Encryption at rest", "After a family-held recovery key."),
    ("Mobility, memory walks", "Needs a native shell."),
    ("Faces, on the device", "Article 9. Consent design first."),
    ("Self-hosting", "Closes the loudest DPIA finding."),
    ("One seam, every country",
     "All of them are OpenID Connect, so the app side is one function that "
     "exists already. The EU wallet, 2027, opens the rest."),
    ("The cut list", "Unlink, torch, asking out loud."),
], columns=2, head_size=92,
   note="No API exists to read a private WhatsApp inbox, so we will never "
        "promise one.")

L.points("learning", "the roadmap", "A course for each side", [
    ("A manual is the help she cannot use",
     "So the teaching goes inside the product."),
    ("Hers: bigger, simpler, unfailable",
     "One idea a screen. Any order. Reads itself aloud."),
    ("Every e-learning habit is wrong here",
     "A progress bar tells her she has forgotten."),
    ("The family's: eight lessons, in order",
     "Ending with how to ask for consent out loud."),
    ("Both in this repository", "Working, offline, three languages."),
    ("Why not now", "Her half needs a real older person to test it."),
], columns=2, head_size=96)

# ---------------------------------------------------------------- 10. close
L.video_card("v_close", "and to close",
             "Thirty seconds", "Everything it does, in one run",
             "0:33  ·  plays on click")

L.title("thanks", "Thank you",
        "Both interfaces are live and offline-capable right now. "
        "Scan, or open zacharia-vives.github.io/recall",
        "Questions  ·  and there is an annexe behind this slide")

# --------------------------------------------------------------- the annexe
L.section("sec_annexe", "A", "annexe",
          "The detail,\nif you ask for it",
          "Testing, security, architecture, accessibility, unit economics, "
          "competitors.")

if __name__ == "__main__":
    import annexe                                    # noqa: F401
    print("%d slides drawn" % len(L.slides()))
    for p in L.slides():
        print("  ", p.rsplit("\\", 1)[-1])
