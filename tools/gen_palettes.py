"""Twenty four skins for Recall, each with its own layout, and all verified.

The earlier passes varied paint and left the structure alone, so eighteen
skins came out looking like eighteen recolours of one screen. What actually
changes how a screen reads is its idiom: whether there is a thumbnail, whether
a row is a card or a line, where the time sits, how a state is shown, how much
air there is.

So a skin here is four things: a palette, a face, a shape, and a layout. This
verifies every palette and emits the data block for the page, because
transcribing twenty four of these by hand is how a wrong hex reaches a jury.
"""

import json
import re


def lum(hexv):
    h = hexv.lstrip("#")
    parts = [int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)]
    out = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in parts]
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def ratio(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def pal(paper, card, ink, body, mid, rule, orange, orangeDark, orangeSoft, onSoft, ok, onAccent):
    return dict(paper=paper, card=card, ink=ink, body=body, mid=mid, rule=rule,
                orange=orange, orangeDark=orangeDark, orangeSoft=orangeSoft,
                onSoft=onSoft, ok=ok, onAccent=onAccent)


P = {
 # ---------------------------------------------------------------- light
 "warm":   pal("#FFF7F0","#FFFFFF","#231710","#3A2A1E","#6E5546","#E7D8CA","#F0692B","#C4501B","#FFE7D3","#A8400F","#2F6B4F","#FFFFFF"),
 "sand":   pal("#F5F0E6","#FFFDF8","#2A2418","#403829","#6B6250","#DED5C2","#B8651A","#8F4E12","#F6E6CF","#7A4310","#2E6249","#FFFFFF"),
 "sky":    pal("#EFF4F8","#FFFFFF","#17222B","#2B3A46","#5A6975","#D2DDE6","#0F6FA8","#0A5480","#DCEBF6","#0A5075","#276A4C","#FFFFFF"),
 "cream":  pal("#FAF6EE","#FFFFFF","#1A1712","#2E2820","#5E564A","#E3DCCF","#8A3B12","#67290A","#F2E4D6","#6B2C0B","#2B5F44","#FFFFFF"),
 "mint":   pal("#F4F7F3","#FFFFFF","#1C241E","#2F3A31","#5B6A5E","#D8E2DA","#0E7A5F","#0A5B47","#D8EFE6","#0A5340","#2C5F8A","#FFFFFF"),
 "lilac":  pal("#F5F4F9","#FFFFFF","#1F1B27","#332D3D","#615A70","#DCD8E6","#5B3FA8","#432E80","#E7E1F6","#452F82","#2B6150","#FFFFFF"),
 "rust":   pal("#FBF3EC","#FFFFFF","#241512","#3A211C","#6D544C","#E8D7CC","#A63A18","#7E2A10","#FAE0D2","#8A2F12","#2F6046","#FFFFFF"),
 "teal":   pal("#EFF6F6","#FFFFFF","#12211F","#243836","#516967","#CFE1E0","#0B6668","#084B4D","#D5EBEB","#084A4C","#2D5F8C","#FFFFFF"),
 "butter": pal("#FDF8E3","#FFFEF6","#211E10","#332E19","#635B3C","#E6DEBE","#8A5A0A","#6A4406","#F7EBC6","#6B4506","#2C5E42","#FFFFFF"),
 "stone":  pal("#F2F2F0","#FFFFFF","#1B1B1A","#2E2E2C","#5C5C58","#DADAD6","#4A4A46","#2E2E2B","#E4E4DF","#3A3A36","#2C6046","#FFFFFF"),
 # ----------------------------------------------------------------- dark
 "night":  pal("#14120F","#211D19","#F6F1EA","#E4DCD2","#ADA195","#3A342D","#FF8A4C","#E0703A","#3A2617","#FFC59A","#63C48F","#1A1206"),
 "ambern": pal("#17130C","#241D13","#FBEED8","#EADDC2","#B4A489","#3D3324","#FFB454","#D9903A","#3B2C15","#FFD79A","#9CC46A","#1C1204"),
 "plum":   pal("#15111A","#221C2B","#F3EDF8","#E0D7E8","#A99BB6","#372E44","#FF8FA0","#D96C7E","#3A2230","#FFC0CC","#6FC79C","#1A0A11"),
 "slate":  pal("#111619","#1B2226","#EDF3F6","#DAE3E8","#9EAEB7","#2E383E","#5FBFE8","#3D9BC4","#16323E","#A5DBF2","#61C58D","#04161E"),
 "lamp":   pal("#1B1613","#26201B","#F2E8DC","#DFD2C2","#AC9D8B","#40372E","#E8A867","#C4864A","#3A2C1E","#F0CFA3","#8FC48A","#1A1206"),
 "block":  pal("#0D0D0F","#17171A","#FAFAFC","#E8E8EC","#A0A0A8","#2C2C32","#7BD64A","#5FAE37","#1B2415","#A8E884","#59C7E0","#0A1004"),
 "forest": pal("#0E1512","#18211D","#EAF3EE","#D6E3DA","#9AAFA2","#2A3630","#8FD9A8","#65B682","#152A20","#B4E6C4","#7FC6E0","#06140C"),
 "navy":   pal("#0B1020","#151B2E","#EEF1FA","#DAE0EE","#98A2BC","#28304A","#8FB4F0","#6690CC","#182346","#B6CDF7","#6FCBA0","#050B18"),
 # ------------------------------------------------------------ low vision
 "slight": pal("#FFFFFF","#FFFFFF","#000000","#000000","#3B3B3B","#767676","#A3300B","#7A2208","#FFE2D2","#7A2208","#1E5C3C","#FFFFFF"),
 "sdark":  pal("#000000","#0C0C0C","#FFFFFF","#FFFFFF","#CFCFCF","#8A8A8A","#FFA061","#E07E3C","#2B1A0C","#FFC79B","#7FD8A4","#000000"),
 # ------------------------------------------------- sober, no hue at all
 # The accent in every other palette is a colour. Here it is the ink, so
 # a button is a black block on white or a white block on black. That is
 # what makes these two read as restrained rather than as recolours.
 "soberw": pal("#FFFFFF","#FFFFFF","#111111","#242424","#565656","#DDDDDD","#1C1C1C","#000000","#EFEFEF","#1C1C1C","#1B5636","#FFFFFF"),
 "soberd": pal("#0D0D0D","#161616","#F6F6F6","#E3E3E3","#A6A6A6","#343434","#EDEDED","#C8C8C8","#232323","#F1F1F1","#7FD8A4","#0D0D0D"),
 "amberb": pal("#000000","#0B0A06","#FFD24A","#FFC833","#D9A621","#7A5E0F","#FFD24A","#D9A621","#241B04","#FFD24A","#B7E06A","#000000"),
 "blue":   pal("#FFFBF6","#FFFFFF","#1B1A16","#2F2C25","#5F5A4E","#E4DDD1","#15599C","#0E3F72","#DEEAF6","#0E3F72","#2C6048","#FFFFFF"),
 "ivory":  pal("#FBF9F4","#FFFFFF","#111111","#1C1C1C","#454545","#8C8C8C","#8F2E00","#6B2200","#FFE0CC","#6B2200","#1B5636","#FFFFFF"),
 # pale yellow ground: long recommended for glare and for reading strain
 "pale":   pal("#FFFBE0","#FFFEF2","#141208","#201C0D","#4A452B","#D9D2A8","#8A4A00","#663700","#FBEFC0","#663800","#245736","#FFFFFF"),
 "yonavy": pal("#0A1024","#111834","#FFE45C","#FFDE45","#D6B93A","#3A4472","#FFE45C","#D6B93A","#1E2650","#FFE45C","#8FE0A8","#0A1024"),
 "sepia":  pal("#F4ECDD","#FDF8EF","#22190D","#352814","#665741","#DDD0B8","#8A4B10","#68370A","#F3E2C7","#6B390B","#2D5E40","#FFFFFF"),
}

FONTS = {
 "system":  ('"Segoe UI", system-ui, -apple-system, Arial, sans-serif', "The phone's own", "No download, native everywhere.", 0, 0),
 "atkinson":('"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif', "Atkinson Hyperlegible", "Cut by the Braille Institute to separate letters that blur.", 1, 0),
 "lexend":  ('"Lexend", "Segoe UI", system-ui, sans-serif', "Lexend", "Drawn to lower visual stress while reading.", 1, 0),
 "public":  ('"Public Sans", "Segoe UI", system-ui, sans-serif', "Public Sans", "Built for government forms: plain and wide.", 1, 0),
 "literata":('"Literata", Georgia, serif', "Literata", "A reading serif. Post arrives set in a serif.", 1, 1),
 "nunito":  ('"Nunito", "Segoe UI", system-ui, sans-serif', "Nunito", "Rounded and soft, a little less crisp.", 1, 0),
 "archivo": ('"Archivo", "Arial Narrow", system-ui, sans-serif', "Archivo", "Squared and sturdy, holds up at a distance.", 1, 0),
 "verdana": ('Verdana, Geneva, "DejaVu Sans", sans-serif', "Verdana", "Recommended by low vision guidance for 25 years, and free.", 0, 0),
 "georgia": ('Georgia, "Times New Roman", serif', "Georgia", "A serif already on every device, tall x-height.", 0, 1),
 "oswald":  ('"Oswald", "Arial Narrow", sans-serif', "Oswald", "Condensed and loud. Fits more words at a big size.", 1, 0),
 "mono":    ('"Roboto Mono", ui-monospace, Consolas, monospace', "Roboto Mono", "Every character the same width, so times and codes line up.", 1, 0),
 "bitter":  ('"Bitter", Georgia, serif', "Bitter", "A slab serif: heavy, sturdy, and very legible at size.", 1, 1),
}

# The layouts. This is the part that was missing.
LAYOUTS = {
 "cards":  ("Cards", "A thumbnail, a title, a line under it. What the app does now."),
 "plain":  ("Plain list", "No cards and no thumbnails. Hairline rules and text, like a printed page."),
 "stripe": ("Stripe", "A coloured bar down the left of each row instead of a border."),
 "ticket": ("Ticket", "Dashed edges and a monospace time, like an appointment slip."),
 "gutter": ("Time gutter", "The time in a column of its own on the left, then the entry."),
 "notice": ("Notice", "A shouted label above each entry. Impossible to skim past."),
 "one":    ("One thing", "The next thing only, filling the screen, with one enormous button."),
 "tiles":  ("Tiles", "Two big squares side by side, a letter and a word each."),
}

# name, group, palette, font, layout, radius, edge, base, tag, who
SKINS = [
 # ----------------------------------------------------- Cards, what it does now
 ("Warm paper","daylight","warm","system","cards",12,1,22,"shipping now",
  "What is live today. Warm, calm, and the tightest of the set."),
 ("Sand","daylight","sand","atkinson","cards",8,2,22,"least glare",
  "Low glare paper with the hyperlegible face. The safest daylight pick."),
 ("Night","night","night","system","cards",12,1,22,"the plain dark",
  "The straightforward dark, warm enough to keep the app's character."),

 # ------------------------------------------------------------- Plain list
 ("Broadsheet","daylight","cream","literata","plain",0,1,22,"quietest",
  "No cards at all. A serif and hairline rules, so it reads like a page rather than an interface."),
 ("Lamp","night","lamp","literata","plain",0,1,22,"a dark serif",
  "Warm sepia, a serif, no cards. Like a lamp on old paper, and very calm."),
 ("Large serif","lowvision","sepia","georgia","plain",0,2,26,"26px, no download",
  "A size up in a serif the phone already has. Some readers do measurably better with serifs."),

 # ----------------------------------------------------------------- Stripe
 ("Blue accent","lowvision","blue","public","stripe",8,0,22,"colour blindness",
  "Orange swapped for blue, carried as a bar. Recall signals coming in orange and done in green, the one pair red green blindness confuses."),
 ("Amber night","night","ambern","atkinson","stripe",8,0,22,"no blue light",
  "Almost no blue, and a warm bar per row. For the hour before sleep."),
 ("Forest","night","forest","nunito","stripe",20,0,22,"gentlest",
  "Rounded and green on near black. Soft where most dark themes are hard."),

 # ----------------------------------------------------------------- Ticket
 ("Appointment slip","daylight","butter","mono","ticket",2,1,22,"clerical",
  "Dashed edges and monospace times. Looks like the slip the hospital actually hands her."),
 ("Night slip","night","slate","mono","ticket",2,1,22,"dark clerical",
  "The same slip after dark. Every time lines up, because every character is the same width."),
 ("Pale gold","lowvision","pale","bitter","ticket",0,2,22,"least glare, high contrast",
  "A pale yellow ground, long recommended for glare and reading strain, with a slab serif on it."),

 # ------------------------------------------------------------ Time gutter
 ("Day plan","daylight","mint","lexend","gutter",10,0,22,"clearest order",
  "Times in their own left column, so the shape of the day is visible before a word is read."),
 ("Departures","night","navy","oswald","gutter",2,1,22,"condensed",
  "Condensed type on navy with a time column. Fits long Dutch words at a big size."),
 ("Strong dark","lowvision","sdark","verdana","gutter",0,3,22,"AAA, no download",
  "White on black with the times in a gutter, in a face already on the phone."),

 # ----------------------------------------------------------------- Notice
 ("Terracotta","daylight","rust","archivo","notice",6,2,22,"hardest to skim past",
  "A shouted label over every entry. Nothing here can be glanced at and forgotten."),
 ("Block","night","block","archivo","notice",0,3,22,"loudest",
  "Squared, three pixel edges, one cold green. The most confident of the set."),
 ("Amber on black","lowvision","amberb","atkinson","notice",0,3,22,"low vision standard",
  "The pairing low vision readers ask for by name, with the labels shouted."),

 # -------------------------------------------------------------- One thing
 ("Calm","daylight","lilac","lexend","one",14,0,22,"least reading stress",
  "One thing on the screen at a time, in the face drawn to make reading cost less effort."),
 ("Plum","night","plum","lexend","one",18,0,22,"softest dark",
  "The next thing only, on a violet ground with no hard edges anywhere."),
 ("The next thing","lowvision","ivory","lexend","one",4,3,26,"26px, one at a time",
  "One card filling the screen and one enormous button. Everything else is a tap away."),

 # ------------------------------------------------------------------ Tiles
 ("Two tiles","daylight","teal","archivo","tiles",6,2,22,"fewest choices",
  "Two enormous squares. For somebody who finds a list of any length too much."),
 ("Strong light","lowvision","slight","atkinson","tiles",0,3,22,"AAA, squared",
  "Black on white as two squared tiles. Hand this to somebody with cataracts."),
 ("Quiet stone","daylight","stone","public","tiles",4,1,22,"no colour at all",
  "Almost no hue anywhere, as two plain tiles. Nothing competes with the words."),
 ("Sober white","daylight","soberw","public","plain",0,1,22,"the plainest one",
  "White, near black, one grey rule. No hue and no rounded corners anywhere."),
 ("Sober dark","night","soberd","public","plain",0,1,22,"the plainest one, at night",
  "The same restraint inverted for a dark room. No hue, square corners, nothing else."),
]

CHECKS = [
 ("text","body","paper",4.5,"Running text on the page"),
 ("title","ink","card",4.5,"A card title"),
 ("2nd","mid","card",4.5,"The secondary line, dates and hints"),
 ("btn","onAccent","orange",3.0,"The button label, 24px bold, so large text"),
 ("tint","onSoft","orangeSoft",4.5,"Text on a tinted chip or panel"),
 ("done","ok","card",4.5,"Done, in green"),
]

HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")
bad = 0

for k, t in P.items():
    for tok, val in t.items():
        if not HEX.match(val):
            print("  !! palette " + k + " " + tok + " = " + repr(val))
            bad += 1

used_pal, used_font, used_lay = set(), set(), set()
for row in SKINS:
    name, group, p, f, lay = row[0], row[1], row[2], row[3], row[4]
    used_pal.add(p); used_font.add(f); used_lay.add(lay)
    if p not in P:
        print("  !! " + name + ": no palette " + p); bad += 1; continue
    if f not in FONTS:
        print("  !! " + name + ": no font " + f); bad += 1; continue
    if lay not in LAYOUTS:
        print("  !! " + name + ": no layout " + lay); bad += 1; continue
    t = P[p]
    tight = (99.0, "", 0.0)
    for label, fg, bg, need, _ in CHECKS:
        r = ratio(t[fg], t[bg])
        if r < need:
            print("  !! %-16s %-6s %.2f needs %.1f" % (name, label, r, need)); bad += 1
        if r / need < tight[0]:
            tight = (r / need, label, r, need)
    print("%-18s %-8s %-22s %-11s %2dpx r%-2d e%d  tightest %.2f:1 (%s)"
          % (name, p, FONTS[f][1], LAYOUTS[lay][0], row[7], row[5], row[6],
             tight[2], tight[1]))

print("")
print("skins %d, palettes used %d of %d, faces %d of %d, layouts %d of %d"
      % (len(SKINS), len(used_pal), len(P), len(used_font), len(FONTS),
         len(used_lay), len(LAYOUTS)))
print("failures: " + str(bad))

# ------------------------------------------------------------- emit for the page
if not bad:
    out = []
    for name, group, p, f, lay, radius, edge, base, tag, who in SKINS:
        key = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        out.append(dict(key=key, name=name, group=group, pal=p, font=f, layout=lay,
                        radius=radius, edge=edge, base=base, tag=tag, who=who))
    blob = {
        "palettes": P,
        "fonts": {k: dict(stack=v[0], name=v[1], why=v[2], dl=v[3], serif=v[4])
                  for k, v in FONTS.items()},
        "layouts": {k: dict(name=v[0], why=v[1]) for k, v in LAYOUTS.items()},
        "skins": out,
    }
    with open("skins.json", "w", encoding="utf-8") as fh:
        json.dump(blob, fh, indent=1, ensure_ascii=False)
    print("wrote skins.json")
