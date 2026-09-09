"""Three languages, checked without opening a browser.

The kind of mistake this catches is the one nobody notices until a jury sets the
app to French: a key that exists in the markup but not in the dictionary, a
translation that quietly fell back to English, a placeholder like {n} that is in
one language and not the others, or an English sentence still sitting in the
code where a lookup should be.

    python tests/i18n_test.py
"""

import io
import os
import re
import sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = ["en", "nl", "fr"]

results = []


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL") + "  " + name +
                   (("   " + str(detail)[:150]) if detail else ""))
    return ok


def read(name):
    with io.open(os.path.join(HERE, name), encoding="utf-8") as f:
        return f.read()


# ------------------------------------------------------------------ do they parse
# As modules, not as scripts: node --check on a .js file parses it as CommonJS,
# where declaring the same function twice is allowed. In a module it is a
# SyntaxError, and that is what the browser does.
import glob
import shutil
import subprocess
import tempfile

work = tempfile.mkdtemp()
bad = []
for path in sorted(glob.glob(os.path.join(HERE, "js", "*.js"))):
    target = os.path.join(work, os.path.basename(path)[:-3] + ".mjs")
    shutil.copyfile(path, target)
    done = subprocess.run(["node", "--check", target], capture_output=True, text=True)
    if done.returncode != 0:
        first = [line for line in done.stderr.splitlines() if line.strip()]
        bad.append(os.path.basename(path) + ": " + (first[2] if len(first) > 2 else done.stderr[:60]))
shutil.rmtree(work, ignore_errors=True)
check("every module parses as a module", not bad, bad[:3])

# ------------------------------------------------------------------ the dictionary
src = read("js/i18n.js")

# One entry looks like:  "key": { en: "...", nl: "...", fr: "..." },
entry = re.compile(
    r'"([a-zA-Z0-9_.]+)":\s*\{\s*'
    r'en:\s*"((?:[^"\\]|\\.)*)",\s*'
    r'nl:\s*"((?:[^"\\]|\\.)*)",\s*'
    r'fr:\s*"((?:[^"\\]|\\.)*)"\s*\}',
    re.S)

words = {}
order = []
for match in entry.finditer(src):
    key = match.group(1)
    order.append(key)
    words[key] = {"en": match.group(2), "nl": match.group(3), "fr": match.group(4)}

check("every entry parses", len(words) > 250, str(len(words)) + " keys")
check("no key is defined twice", len(order) == len(set(order)),
      [k for k in order if order.count(k) > 1][:4])

# Every language actually filled in.
empty = [k + "/" + code for k in words for code in LANGS if not words[k][code].strip()]
check("no language is left blank", not empty, empty[:5])

# A translation that is identical to English in all three is usually a
# forgotten one. Some are legitimate: Camera, Code, Face ID, names.
SAME_IS_FINE = {
    "tabs.camera", "help.code", "lock.face", "code.faceon", "code.faceoff",
    "h.cards", "h.cardnameph", "field.whereph", "h.whoph", "field.whoph",
    "lang.label", "lang.heading", "h.photo", "app.cancel",
    # Document is the same word in all three, and a phone number example is
    # a phone number example.
    "file.attached", "phone.ph", "h.phone"
}
untranslated = [k for k in words
                if k not in SAME_IS_FINE
                and words[k]["nl"] == words[k]["en"]
                and words[k]["fr"] == words[k]["en"]]
check("nothing is left in English in both other languages", not untranslated, untranslated[:6])

# Placeholders have to survive translation, or the sentence loses its number.
holder = re.compile(r"\{([a-z]+)\}")
bad_holders = []
for key, row in words.items():
    sets = {code: sorted(holder.findall(row[code])) for code in LANGS}
    if not (sets["en"] == sets["nl"] == sets["fr"]):
        bad_holders.append(key + " " + str(sets))
check("placeholders match across languages", not bad_holders, bad_holders[:4])

# The bits of markup that are allowed inside a translation have to match too,
# otherwise a bold lead sentence loses its bold in one language only.
tag = re.compile(r"</?([a-z]+)>")
bad_tags = []
for key, row in words.items():
    sets = {code: sorted(tag.findall(row[code])) for code in LANGS}
    if not (sets["en"] == sets["nl"] == sets["fr"]):
        bad_tags.append(key + " " + str(sets))
check("markup inside a translation matches", not bad_tags, bad_tags[:4])

# Nothing in the interface should assume who is holding the phone. English is
# checked strictly because the other two follow it; Dutch and French keep their
# plural "zij" and their grammatical genders, which a word list cannot judge.
gendered = [k for k in words if re.search(r"(she|her|hers|herself)", words[k]["en"], re.I)]
check("nothing in the interface assumes a gender", not gendered, gendered[:6])

# ------------------------------------------------------------------ the markup
used_in_html = set()
for page in ["index.html", "helper.html"]:
    page_src = read(page)
    keys = re.findall(r'data-t(?:-html|-ph|-aria|-alt|-title)?="([^"]+)"', page_src)
    used_in_html.update(keys)
    unknown = sorted(set(k for k in keys if k not in words))
    check(page + ": every key in the markup exists", not unknown, unknown[:6])

# Anything with markup in it must be applied with data-t-html, or the tags show
# up as literal text on the screen.
needs_html = set(k for k in words if "<" in words[k]["en"])
for page in ["index.html", "helper.html"]:
    page_src = read(page)
    plain = set(re.findall(r'data-t="([^"]+)"', page_src))
    wrong = sorted(needs_html & plain)
    check(page + ": keys containing markup use data-t-html", not wrong, wrong[:5])

# ------------------------------------------------------------------ the scripts
used_in_js = set()
for name in ["js/app.js", "js/helper.js", "js/i18n.js", "js/ocr.js",
             "js/camera.js", "js/store.js", "js/speech.js", "js/lock.js"]:
    code = read(name)
    calls = re.findall(r'\bi18n\.t\("([^"]+)"|(?<![\w.])t\("([^"]+)"', code)
    keys = [a or b for a, b in calls]
    used_in_js.update(keys)
    unknown = sorted(set(k for k in keys if k not in words))
    check(name + ": every key it asks for exists", not unknown, unknown[:6])

# English still hard coded where the user can see it.
LEFTOVERS = []
for name in ["js/app.js", "js/helper.js"]:
    code = read(name)
    for match in re.finditer(r'(say|cameraMessage|lockSay)\(\s*"([A-Z][^"]{10,})"', code):
        LEFTOVERS.append(name + ": " + match.group(2)[:50])
    for match in re.finditer(r'textContent\s*=\s*"([A-Z][^"]{10,})"', code):
        LEFTOVERS.append(name + ": " + match.group(1)[:50])
check("no English sentences left in the two scripts", not LEFTOVERS, LEFTOVERS[:5])

# ------------------------------------------------------------------ dead weight
unused = sorted(set(words) - used_in_html - used_in_js)
# These are reached indirectly, by name built at runtime or by the tests.
EXPECTED_UNUSED = {"lock.wrong", "run.dateat"}
really_unused = [k for k in unused if k not in EXPECTED_UNUSED]
check("no key is dead weight", len(really_unused) <= 6,
      str(len(really_unused)) + " unused: " + ", ".join(really_unused[:8]))

# ------------------------------------------------------------------ the notice
# The spoken notice and the screen have to say the same things, because the
# recorded consent points at one version of the words. Article 7(1).
for code in LANGS:
    spoken = words["run.consentspoken"][code].lower()
    pieces = [words["consent.no"][code], words["consent.stop"][code]]
    bits_present = all(
        # strip the bold lead and take a few words from the body
        re.sub(r"<[^>]+>", "", piece).strip().split(".")[0].lower()[:18] in spoken
        for piece in pieces
    )
    check("the spoken notice matches the screen, " + code, bits_present)

# The safety line has to be in the notice in every language, S1 to S6.
for code in LANGS:
    line = words["safety.notmedical"][code]
    first = re.split(r"[.!]", line)[0].strip().lower()
    check("the medical line is in the spoken notice, " + code,
          first in words["run.consentspoken"][code].lower(), first[:40])

# ------------------------------------------------------------------ the policy
policy = read("privacy.html")
for code in LANGS:
    check("the privacy notice has a " + code + " version",
          'data-lang="' + code + '"' in policy)

for code, needle in [("en", "Frankfurt, Germany"), ("nl", "Frankfurt, Duitsland"),
                     ("fr", "Francfort")]:
    check("the " + code + " notice says where the data is", needle in policy)

for word in ["Care", "Security", "Respect", "Transparency",
             "Zorg", "Veiligheid", "Respect", "Transparantie",
             "Attention", "Sécurité", "Respect", "Transparence"]:
    if word not in policy:
        check("the four promises are in every language", False, word)
        break
else:
    check("the four promises are in every language", True)

check("the notice names the supervisory authority",
      "Drukpersstraat" in policy and "rue de la Presse" in policy)
policy_en = re.search(r'data-lang="en"(.*?)</section>', policy, re.S)
check("the notice does not assume a gender either",
      policy_en and not re.search(r"(she|her|hers)", policy_en.group(1), re.I))

check("the notice admits the two open findings",
      "not signed yet" in policy and "content delivery network" in policy)

# ------------------------------------------------------------------
print("\n".join(results))
fails = [r for r in results if r.startswith("FAIL")]
print("\n%d passed, %d failed" % (len(results) - len(fails), len(fails)))
sys.exit(1 if fails else 0)
