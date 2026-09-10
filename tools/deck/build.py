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
            ["A woman in her seventies, living alone, with mild memory loss. "
             "She still reads her own post, still goes to her own "
             "appointments, and does not want to be managed.",
             "And her daughter, who works, who cannot ring every day, and who "
             "currently finds out about the hospital letter a week too late."],
            foot="Two people, opposite needs. That is why there are two "
                 "interfaces.")

L.points("what", "what", "What Recall is", [
    ("A store of cards, not a notes app",
     "Every letter, person, place and appointment becomes a card: a title, a "
     "date, who it is about, where it is, and what Recall should say out "
     "loud about it."),
    ("A camera that files",
     "She points the phone at a letter to magnify it. Recall reads it on the "
     "device, and the card is the by-product of something she was going to "
     "do anyway."),
    ("A voice that reads it back",
     "A neural voice that runs on the phone itself, in Dutch, French or "
     "English, with the phone's own voice as the only fallback."),
    ("A second interface for the family",
     "The daughter signs in on a laptop, adds cards, sets reminders and "
     "follows up. She never sees where her mother is or when she opened the "
     "app."),
], note="Live, both interfaces: zacharia-vives.github.io/recall")

L.statement("why", "why",
            "A manual is the one\nkind of help this\ngroup cannot use.",
            ["Every reminder app needs somebody to type. The person who "
             "forgets is exactly the person who will not.",
             "So the filing has to be a side effect of a thing she already "
             "wants to do: making small print big enough to read.",
             "And nothing is filed silently. The reading is shown large, read "
             "aloud, and the date is confirmed by hand every time."],
            foot="A magnifier is a free tool. A magnifier that files is a "
                 "product.")

L.points("how", "how", "How it works", [
    ("Point, magnify, read",
     "The camera magnifies live. The text is recognised on the device, and "
     "any national number is stripped out before anything is stored."),
    ("Confirm, and it is a card",
     "Recall proposes a title, a date, a place and the people on it. She "
     "confirms the date by hand, and the card lands in Today."),
    ("Her phone first, the household second",
     "Cards are written to her own phone, then to the household if she has "
     "said yes. The app works with no account and no wifi."),
    ("The family adds, she hears",
     "Anything the daughter adds arrives at the next sync and is read out "
     "loud. Anything the daughter does appears in a list in her app, in her "
     "own language."),
], note="No framework, no build step, no login for her. A six-letter code "
        "links the phone once.")

# ----------------------------------------------------------------- 3. team
TEAM = [
    ("Zacharia Janssen", "Project manager  ·  Developer  ·  Business support",
     "Runs the board and the standups, builds with Luke, assists on the "
     "budget, presents the demo and the roadmap."),
    ("Julia Chauchard", "Sales and marketing  ·  SWOT",
     "Owns the SWOT, the positioning, the competitor scan and the "
     "advertising campaign."),
    ("Luke Byrne", "Developer  ·  Every test",
     "The consent screen, the accessibility pass, and every test on a real "
     "phone. Zacharia writes the fixes, Luke proves them."),
    ("Mattiece Denduyver", "Business model  ·  Budget",
     "The whole business model canvas, the cost model, the pricing and the "
     "revenue. Presents the business half."),
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
           "Working rule agreed on Tuesday: every test task goes to Luke, "
           "never to anyone else.",
           font=L.body(27, 500), fill=L.MAROON, anchor="ls")
    return L.save(im, "team")


team()

# ------------------------------------------------------------- 4. business
L.section("sec_biz", "02", "the business",
          "Who pays,\nwhat it costs,\nand where the\nmoney comes from",
          "Mattiece on the model and the numbers, Julia on the market.")

L.points("model", "the model", "Two customers, deliberately both", [
    ("Families, 4.99 to 14.99 a month",
     "One parent at 4.99, both at 6.99, up to five at 14.99. This is the "
     "model that gets us users, and the only tier sellable today is 4.99, "
     "because the other two need multiple keepers per household."),
    ("Care organisations, 2 a resident a month",
     "Minimum a hundred residents, so a floor of 200 a month, plus the "
     "partner API. This is the model with the revenue in it, and the sales "
     "cycle is six to eighteen months."),
    ("Why both, and not one",
     "The family model gets scale and proves the product. The organisation "
     "model pays for the salary. They need each other: no care organisation "
     "buys software with no users."),
    ("What a care organisation is actually buying",
     "The removal of retyping. Their scheduling software already knows "
     "tomorrow's visit; the partner API puts it on her phone with nobody "
     "typing it twice."),
], note="Mattiece chose both, balanced, rather than leading with one.",
   columns=2, head_size=88)

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
         "Instagram and Facebook for the posts; YouTube and Spotify for the "
         "video and audio adverts."),
        ("Aimed at 18 to 50, on purpose",
         "Not at the person who will use Recall, but at the son or daughter "
         "who sets the phone up for them."),
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
           "A QR code on every advert, so the app is one scan away from "
           "wherever somebody sees it: a magazine, a waiting room, a "
           "television spot or a feed.",
           L.body(29, 300), L.MAROON, col, leading=1.36)
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

L.points("swot_build", "the market", "What the build adds to the four boxes",
         [
    ("Strength: the letter never leaves the phone",
     "Text recognition and the voice both run on the device. No competitor "
     "using cloud recognition can say that, and it is provable on stage."),
    ("Strength: no account, no wifi",
     "The keeper app works offline. The demo cannot be broken by the room."),
    ("Strength: proven, not claimed",
     "407 automated checks, and zero accessibility violations on every "
     "screen that existed on Wednesday."),
    ("Weakness: no notification while closed",
     "Reminders are shown when the app is open. Web push needs a server we "
     "do not run. It is on the roadmap and we say so."),
    ("Weakness: nobody over seventy has used it yet",
     "Booked and not yet done. The only test that can tell us whether any "
     "of this works."),
    ("Threat: the free giants",
     "Seeing AI, Lookout, Apple Magnifier, Be My Eyes. The answer is one "
     "line: a magnifier is a free tool, a magnifier that files is a "
     "product."),
], columns=2, head_size=82,
   note="Julia's boxes are written from the idea. These come from what got "
        "built, and they are the differentiators.")

# ------------------------------------------------------------- 5. features
L.section("sec_feat", "03", "the features",
          "Everything that\nis actually built",
          "All of it live, at v49, in three languages.")

L.points("features", "the features", "What is in it today", [
    "**Camera and magnifier** with live zoom, and reading on the device",
    "**Cards** for letters, people, places and checklists",
    "**Read out loud**, with a neural voice on the phone",
    "**Reminders**: once, daily, twice daily, weekly, with missed and done",
    "**Call reminders** that dial the number on the card",
    "**Checklists**, including built out of a photograph",
    "**Documents** on a card: text, Word and pdf, read on the device",
    "**Press to enlarge**, for words and for photographs",
    "**The way there**: Apple Maps, Google Maps or Waze from any address",
    "**Three languages**, and everything that follows them",
    "**26 looks**, every one checked for contrast by role",
    "**A lock**, with a family rescue code",
    "**Works offline**, installable to the home screen",
    "**The family app**: cards, reminders, follow up, the bin, the history",
    "**A six-letter code** to link her phone, with no login for her",
    "**A partner API** so a care organisation's software can file a card",
    "**A copy of everything** in one press, for Article 20",
    "**What Recall knows about you**, counted, in the help screen",
], columns=2, head_size=88)

L.gallery("shots_keeper", "screenshots", "Her side: point, read, keep",
          ["scr_camera.png", "scr_today.png", "scr_reminder.png"],
          ["The camera, magnifying live, with what it read underneath",
           "Today: what is happening, read out loud",
           "A reminder, and what it is asking about"],
          note="Nothing is filed silently: the reading is always shown, and "
               "the date is always confirmed.")

L.gallery("shots_more", "screenshots", "Checklists, documents, the way there",
          ["scr_checklist.png", "scr_maps.png", "scr_voice.png"],
          ["A checklist, from a photograph",
           "Apple, Google or Waze, from the card",
           "The neural voice, on the device"],
          note="The voice is 60 MB, downloaded once, and the phone's own "
               "voice is the only fallback.")

L.art("shots_helper", "screenshots", "The family's side, on a laptop",
      "scr_helper_list.png", side="right", head_size=76, items=[
    ("Cards, reminders, follow up",
     "Add a card, set a reminder, tick one off, put one in the bin for "
     "thirty days."),
    ("A document, added from here",
     "Read in this browser; only the words travel to her phone."),
    ("And what it will not show",
     "No location, no usage times, no read receipts. Helping is not "
     "watching, and the interface is built to that line."),
])

L.gallery("shots_link", "screenshots", "Linking her phone, and consent",
          ["scr_linkcode.png", "scr_consent.png", "scr_knows.png"],
          ["Six letters, good for fifteen minutes",
           "Consent, read out loud, in her language",
           "What Recall knows about you, counted"],
          note="She never sees a login screen. The phone gets an identity "
               "with no password.")

# ------------------------------------------------------------- 6. the demo
L.video_card("v_demo", "the demo",
             "Both sides,\nend to end", "A real walkthrough, not an advert",
             "1:22  ·  plays on click")

# ----------------------------------------------------------------- 7. GDPR
L.section("sec_gdpr", "04", "gdpr",
          "Her post, her\nphone, her\ndecision",
          "The part of this project with the least room to be vague.")

L.points("gdpr_where", "gdpr", "Where the data actually is", [
    ("On her own phone, first",
     "Cards are written to the phone's own store before anything else. The "
     "app works with no account and no network, and if she never shares, "
     "nothing ever leaves the device."),
    ("The shared copy: Frankfurt, Germany",
     "Supabase, region eu-central-1, Frankfurt. Inside the EU, with no "
     "transfer to a third country for the database, so no standard "
     "contractual clauses are needed for it."),
    ("Encrypted in transit and at rest on the server",
     "TLS on every request, and the managed database is encrypted at rest. "
     "On the phone the cards sit in the browser's own store behind an "
     "optional code and Face ID, which is a lock on the screen and we say "
     "so rather than overclaiming."),
    ("The reading and the voice never leave the device",
     "No cloud text recognition and no cloud voice, ever. Both would mean "
     "posting her hospital letter to somebody else's server."),
], note="Supabase project xoczuvvxengzkcxybfbx  ·  eu-central-1  ·  Frankfurt",
   columns=2, head_size=84)

L.points("gdpr_consent", "gdpr", "Consent, and taking it back", [
    ("Article 9: this is health data",
     "A letter from a cardiology department is a special category of "
     "personal data, so the basis has to be explicit consent, not "
     "legitimate interest."),
    ("Asked out loud, before any cards",
     "The notice is read aloud in her language on the phone being linked, "
     "and what is recorded is the version of the words she heard, "
     "2026-09-08/nl, and the language she heard them in."),
    ("Caregiver co-consent, and the line under it",
     "The family sets the household up, but the consent is hers and is "
     "recorded against her phone. A helper cannot consent on her behalf, "
     "and a helper cannot delete a card outright."),
    ("Article 7(3): withdrawal stops the processing",
     "One press on the help screen she already knows. Enforced in Postgres, "
     "not in the app: has_consent() is read by ten policies covering cards, "
     "reminders, the log and the photographs."),
    ("Nothing is deleted when she withdraws",
     "The consent row is marked, never removed, because an audit has to see "
     "that it happened. Her cards stay on her phone, which is where they "
     "belong."),
    ("And it can be given again",
     "From the same screen. As easy to give back as it was to take away."),
], columns=2, head_size=84)

L.points("gdpr_less", "gdpr", "What we chose not to collect", [
    ("No location. Ever.",
     "Not the phone's, not the card's, not a history of either."),
    ("No usage times",
     "We do not record when she opened the app, or whether she did."),
    ("No read receipts",
     "A reminder has three states: coming, done, missed. None of them is "
     "‘she saw it’. That is the difference between helping and "
     "watching."),
    ("The national number is stripped before storage",
     "A Belgian national number and an account number are taken out of the "
     "recognised text before the card is written. The lines are kept; only "
     "the numbers go."),
    ("Per-card deletion, and a bin rather than a trapdoor",
     "A helper can only put a card in a bin for thirty days. Deleting a "
     "card takes its photograph, its document and its reminders with it."),
    ("Face matching, if it ever ships, runs on the device",
     "On the roadmap and not built, precisely because Article 9 biometric "
     "data needs the consent design before the code."),
], columns=2, head_size=84)

L.points("gdpr_rights", "gdpr", "The rights, answered by the product", [
    ("Article 15, access",
     "‘What Recall knows about you’ in the help screen: the "
     "counts, where it is kept, and whether anything is shared."),
    ("Article 20, portability",
     "A copy of everything in one press: every card, reminder, checklist "
     "item, phone number and the text of every photograph, in one file."),
    ("Article 30 and the log",
     "Everything the family does is written down where she can read it, in "
     "her own language. The notice promises that out loud, so it has to be "
     "true."),
    ("Article 35, the DPIA",
     "Written, and it names three things that are not finished rather than "
     "claiming everything is."),
    ("The supervisory authority is named in the notice",
     "The Belgian Data Protection Authority, in all three languages, with "
     "the right to complain stated."),
    ("Honest gaps, said before we are asked",
     "Encryption of the cards on the phone with a key of her own is not "
     "done, because if she forgets the key her memory is gone for good and "
     "that needs a family-held recovery key first. The library and the voice "
     "model are still fetched from a public CDN. And no processor agreement "
     "is signed yet, because there is no company yet."),
], columns=2, head_size=84)

# ---------------------------------------------------------------- 8. Notion
L.section("sec_notion", "05", "how we worked",
          "Notion, and\nwhat is on it",
          "Thirteen working hours, four people, one workspace.")

L.points("notion_what", "notion", "What is on it", [
    ("Four hubs, not a pile of pages",
     "Build, Business, Privacy and the law, Delivery. Each with an index "
     "that says what every page under it answers."),
    ("Three databases, and they are the live state",
     "The Sprint board with every task by owner and session, the Daily log "
     "with one entry per working session, and a Gantt at phase level."),
    ("The test plan, as one controlling document",
     "Scope, five test levels, the environment, entry and exit criteria, "
     "nine runs with dates and versions, a 31-defect register, and "
     "traceability to the numbered requirements."),
    ("The process models",
     "Seven processes drawn and worked through: intake, reminders, linking a "
     "phone, consent, the family's work, the partner API, and the one gate "
     "they all pass through."),
    ("The business, in full",
     "The canvas, the business plan, the revenue model, the year one and "
     "year three numbers, the funding calls, the positioning and the SWOT."),
    ("Privacy and the law",
     "The DPIA, what we store and where, and the wording boundary on AI and "
     "the voice, so all four of us say it the same way."),
], columns=2, head_size=84)

L.points("notion_how", "notion", "How we actually use it", [
    ("Kanban during the session",
     "The Sprint board is the only thing anybody touches while working. "
     "Tasks move between Not started, In progress and Done as the work "
     "lands, not at the end of the week."),
    ("The Daily log at the end of it",
     "One entry per working session, always the same four headings: what we "
     "did, decisions, blockers, next. It is the blog, and it is the raw "
     "material for the report."),
    ("The Gantt when somebody asks about Friday",
     "Phase level, nineteen bars. It answers one question: are we still on "
     "time."),
    ("Decisions are written down when taken",
     "Fourteen of them, dated, with who took them. Including the two that "
     "were superseded, which are kept rather than edited away."),
    ("It is not a one-off setup",
     "It was kept up to date every working day, unprompted. A workspace "
     "written the night before is a document; one written as you go is a "
     "record."),
    ("What it cost us",
     "The free plan caps a multi-member workspace at a thousand blocks, so "
     "the 75 numbered requirements and the 383-line test script live in the "
     "repository instead, next to the code they describe."),
], columns=2, head_size=84)

# --------------------------------------------------------------- 9. roadmap
L.section("sec_road", "06", "what comes next",
          "The roadmap,\nall of it in\none place",
          "What was cut, what was always next, and what a jury asked for.")

L.points("roadmap", "the roadmap", "Everything that is next", [
    ("itsme, to prove who actually signed",
     "For legal documents: a signature that verifies identity to the Belgian "
     "state's standard. All three of itsme, FranceConnect and the EU wallet "
     "are OpenID Connect, so the app side is one function that exists "
     "already. What is missing is a company and a contract."),
    ("Social media, and the people on her cards",
     "Connecting a saved person to the accounts she already has, so a card "
     "about her granddaughter can carry what her granddaughter posts. "
     "Integrations per platform, and one honest limit: no API exists to read "
     "a private WhatsApp inbox, so we will never promise one."),
    ("Notifications while the app is closed",
     "Web push plus a scheduled function. The only item in the whole "
     "project needing a server we do not run yet."),
    ("Multiple keepers in one household",
     "Small in code, and the 6.99 and 14.99 tiers depend on it, so it is "
     "first after Friday for a business reason rather than a technical one."),
    ("Encryption at rest, with a family-held recovery key first",
     "In that order, because the person using this phone is the person who "
     "forgets, and a key only she holds is a way to lose everything."),
    ("Mobility and memory walks",
     "Needs a native shell: a browser tab cannot count steps with the "
     "screen off."),
    ("Face cards that recognise a face",
     "Article 9 biometric data, matched on the device, and it needs the "
     "consent design before any code."),
    ("Self-hosting the recognition library and the voice model",
     "Cheap, and it closes the loudest open finding in the DPIA: no third "
     "country network would see her IP address."),
    ("The cut list, parked honestly",
     "Unlink this phone, torch and tap to focus, and asking a question out "
     "loud. The last one stopped being a time cut and became a design "
     "decision: it means listening, and a microphone in her room needs "
     "thinking about first."),
    ("FranceConnect, then the EU Digital Identity Wallet",
     "The same seam, a second country, then eIDAS 2.0 in 2027 when every "
     "member state must offer a wallet, which removes the gatekeeping that "
     "keeps small teams out today."),
], columns=2, head_size=82,
   note="Two things went the other way and were built although never planned: "
        "the partner API and the neural voice.")

L.points("learning", "the roadmap", "A learning platform, one for each side",
         [
    ("Why it is in the product and not in a manual",
     "Recall is for people with mild memory loss, and a manual is the one "
     "form of help that group cannot use. So the teaching has to be part of "
     "the thing being taught."),
    ("Her course: bigger, simpler, unfailable",
     "Larger type than the app's own, which is already large. One idea per "
     "screen. Six or seven cards, any order, repeatable for ever. Every "
     "screen reads itself aloud. No score, no quiz, no progress bar."),
    ("Why every e-learning convention is wrong here",
     "A progress bar tells somebody who forgets that she has forgotten. A "
     "quiz creates a way to fail at using her own memory aid. A sequence "
     "assumes she remembers where she stopped."),
    ("The family's course: eight lessons, in order",
     "What Recall is and is not, setting up the household, the first card, "
     "reminders, how to ask for consent out loud, what you can and cannot "
     "see, when something goes wrong, and handing over."),
    ("Fully working, in the same repository",
     "Two entry points on the same site, no new stack, three languages, in "
     "the offline shell. Not a slide deck and not somebody else's learning "
     "platform: a course about not sending her letters to a server cannot "
     "itself be hosted on another company's analytics."),
    ("Why it is roadmap and not now",
     "Eight lessons written well is more writing than the whole interface "
     "contains, and her half is worth nothing without a real older person "
     "to test it on. Doing it badly is worse than not doing it, because a "
     "confusing tutorial teaches somebody that the app is confusing."),
], columns=2, head_size=82)

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
