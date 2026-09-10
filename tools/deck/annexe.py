"""The annexe: the slides you only show if a professor asks for them.

Order is roughly the order the questions come in. Every figure here is the
one in the repository or in Notion, not a rounded-up version of it.
"""

import layout as L
from PIL import ImageDraw

W, H = L.W, L.H

# ------------------------------------------------------------------ testing
L.points("a_testplan", "annexe  ·  testing", "The test plan", [
    ("Five levels, kept apart", "A check run once is not a standing suite."),
    ("407 checks, nine suites", "All passing at v49."),
    ("Two full A-to-Z passes", "Tuesday at v17, Wednesday at v38."),
    ("Entry and exit criteria", "One version everywhere. All suites green."),
    ("31 defects: 30 fixed, 1 open", "The open one is a test, not the app."),
    ("Not tested", "The device pass. Nobody over seventy."),
], columns=2, head_size=96,
   note="The plan, the runs and the register are in Notion.")

L.points("a_defects", "annexe  ·  testing",
         "The defects worth talking about", [
    ("Withdrawal was a note nothing read",
     "The family kept access after she said stop."),
    ("The API internals were public",
     "Postgres grants execute to PUBLIC by default."),
    ("The family app was never translated",
     "Every static check passed while it was broken."),
    ("A promise the interface did not keep",
     "Her app had no list of what the family did."),
    ("The pattern behind five of them",
     "Two halves each correct alone. Found by people, not suites."),
    ("The conclusion that did not survive",
     "‘Defects open: none’ meant our tests passed."),
], columns=2, head_size=92)

# ----------------------------------------------------------------- security
L.points("a_security", "annexe  ·  security", "How the data is actually held",
         [
    ("Policies, not application checks", "A client can be edited. A policy cannot."),
    ("One gate, written once", "Keeper always. Helper while consent stands."),
    ("Definer functions for one column", "RLS cannot restrict columns."),
    ("Her identity has no password", "Anonymous sign-in, plus a device code."),
    ("The partner API: three rules", "One household. Write only. Consent gated."),
    ("Signed links, never public URLs", "A photograph lasts an hour."),
], columns=2, head_size=96)

# ------------------------------------------------------------- architecture
L.points("a_arch", "annexe  ·  architecture", "How it is built, and why", [
    ("No framework, no build step", "Modules, a service worker, IndexedDB."),
    ("Local first", "Her phone, then the household."),
    ("One version across every file", "Or a page mixes two releases."),
    ("Recognition and speech on device", "WebAssembly, and a 60 MB voice."),
    ("Supabase for the shared half", "Postgres and storage, in Frankfurt."),
    ("26 looks from one generator", "Contrast checked before the CSS exists."),
], columns=2, head_size=96)

# ------------------------------------------------------------ accessibility
L.points("a_a11y", "annexe  ·  accessibility", "Accessibility, measured", [
    ("Zero Axe violations", "Every screen of both apps, WCAG 2.2 AA."),
    ("Contrast has a number", "4.5:1. Checked in all 26 looks."),
    ("Nothing small, nothing narrow", "Nothing under 22px. Targets 48 up."),
    ("The app asks its own questions", "A browser box cannot be read aloud."),
    ("The honest gap", "Seven newer screens unchecked. Axe is a floor."),
], columns=2, head_size=96)

# ---------------------------------------------------------- unit economics
L.points("a_costs", "annexe  ·  the numbers", "What it costs to run", [
    ("Three cents a household a month", "And it falls as households grow."),
    ("Identity changes the shape of that",
     "itsme is 20 to 60 cents a user. Twenty times our servers."),
    ("Year one, lean: 45,000", "Service 15,600. Marketing 21,500."),
    ("Year two on: 120,000", "One salary at 72,000 gross."),
    ("Three things to argue with",
     "The break-even price, the revenue target, the marketing payback."),
], columns=2, head_size=96)

# ------------------------------------------------------------- competitors
L.points("a_compet", "annexe  ·  the market", "Who else is in this space", [
    ("The free giants", "Seeing AI, Lookout, Magnifier. None of them file."),
    ("Reminder and calendar apps", "All need somebody to type."),
    ("Medical alert products", "Falls, not memory. A different buyer."),
    ("Family-sharing apps", "Built for the family, not for her."),
    ("The one sentence",
     "A magnifier is a free tool. One that files is a product."),
    ("The real threat", "A platform absorbing it at OS level."),
], columns=2, head_size=96)

# ---------------------------------------------------------------- the docs
L.points("a_docs", "annexe  ·  the documents", "Where everything is written",
         [
    "**docs/analysis.md** — 75 numbered requirements",
    "**docs/test-plan.md** — the 383-line browser script",
    "**docs/dpia.md** — the Article 35 assessment",
    "**docs/api.md** — the partner API",
    "**db/schema.sql** — every table and policy",
    "**db/patch-005** — the keeper's bin",
    "**db/patch-006** — withdrawal, enforced",
    "**Notion** — four hubs, three databases",
    "**The repository** — github.com/zacharia-vives/recall",
    "**Both apps, live** — zacharia-vives.github.io/recall",
], columns=2, head_size=96,
   note="The long tables live in the repository, next to the code.")
