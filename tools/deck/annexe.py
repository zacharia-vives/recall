"""The annexe: the slides you only show if a professor asks for them.

Order is roughly the order the questions come in. Every figure here is the
one in the repository or in Notion, not a rounded-up version of it.
"""

import layout as L
from PIL import ImageDraw

W, H = L.W, L.H

# ------------------------------------------------------------------ testing
L.points("a_testplan", "annexe  ·  testing", "The test plan", [
    ("Five levels, kept apart on purpose",
     "Standing suites on every change; scripted browser passes A to Z; the "
     "database and security suites; the accessibility pass; and the device "
     "and human pass. A browser check run once is not a suite that runs on "
     "every commit, and an earlier report added the two together, which "
     "flattered us."),
    ("407 automated checks, nine suites, all passing at v49",
     "Skins 85, languages 81, the voice 66, the partner API 43, sync 32, "
     "screens 31, consent 30, documents 24, reminders 15."),
    ("Two full A-to-Z browser passes",
     "Tuesday 8 September at v17 to v20, about 140 checks. Wednesday 9 "
     "September at v26 to v38, 211 standing plus about 136 driven by hand."),
    ("Entry and exit criteria",
     "Entry: committed, one version set across every cacheable file by "
     "bump.py, and any database patch applied to Frankfurt with its own "
     "closing check printing who may run what. Exit: all suites green and "
     "every defect either fixed and re-run or in the register with an "
     "owner."),
    ("31 defects found, 30 fixed, 1 open",
     "The open one is a test, not the product: rls_test.py cannot run "
     "because a previous run left its fixed link code in the database and "
     "the suite is not idempotent."),
    ("What is not tested, said plainly",
     "The device pass, and one person over seventy using it unaided. "
     "Neither has happened. Both are named in the plan rather than left "
     "blank."),
], columns=2, head_size=84,
   note="The full plan, the nine runs and the register are in Notion; the "
        "383-line browser script is in the repository as docs/test-plan.md.")

L.points("a_defects", "annexe  ·  testing",
         "The defects worth talking about", [
    ("Withdrawing consent was a note in a table",
     "Nothing read the column, so the family kept full access after she "
     "said stop. Now enforced by ten Postgres policies. **Critical.**"),
    ("The API's internals were open to the public key",
     "Postgres grants execute on a new function to PUBLIC by default and "
     "our revokes never named it. A stranger knowing a household id could "
     "write into the log she is asked to trust. Found by probing from "
     "outside after the patch, which is the only thing that would have "
     "shown it. **Critical.**"),
    ("The family app was never translated at all",
     "Every attribute in place, every translation present, and nothing "
     "applied the dictionary. Every static check passed while it was "
     "broken. **Critical.**"),
    ("The app promised a transparency it did not provide",
     "The spoken notice says the family's actions are written where she can "
     "read them. They were, in the database and in the family app, and her "
     "own app had no such list. Found by going through each claim in the "
     "notice and asking which code answered it. **Critical.**"),
    ("The pattern behind five of them",
     "The markup and the dictionary each looked correct on their own, and "
     "nothing checked them against each other, or against the promises the "
     "app makes out loud. Every one was found by a person using the app, "
     "not by a suite."),
    ("And the conclusion that did not survive the night",
     "‘Defects open: none’ on Tuesday evening was true of "
     "what had been tested. Wednesday found twelve more. A clean pass means "
     "the tests we wrote passed, not that the app is correct."),
], columns=2, head_size=84)

# ----------------------------------------------------------------- security
L.points("a_security", "annexe  ·  security", "How the data is actually held",
         [
    ("Row level security, not application checks",
     "Every table has policies. A client can be edited; a Postgres policy "
     "cannot. Two live accounts prove one household cannot reach another's "
     "cards, photographs, reminders or log."),
    ("One gate, written once",
     "may_see_cards(household) is: the keeper always, or a helper while her "
     "consent stands. Ten policies call it. A policy that re-derives that "
     "rule is a policy that gets it subtly wrong."),
    ("Definer functions for single-column writes",
     "Row level security cannot restrict columns, so letting the keeper "
     "update her own cards would let her rewrite anything in the household. "
     "bin_record() sets deleted_at and nothing else."),
    ("The keeper's identity has no password",
     "Anonymous sign-in plus a six-letter device code made by the family, "
     "good for fifteen minutes, single use. She still gets a real identity, "
     "which is what makes row level security mean anything."),
    ("The partner API: three rules",
     "One key reaches one household. A key may write, never read. Consent "
     "gates it exactly as it gates a person."),
    ("Signed links, never public URLs",
     "A photograph is reached through a link that works for an hour."),
], columns=2, head_size=84)

# ------------------------------------------------------------- architecture
L.points("a_arch", "annexe  ·  architecture", "How it is built, and why", [
    ("No framework and no build step",
     "Plain ES modules, a service worker, IndexedDB. It has to work on a "
     "five-year-old phone with bad wifi, and there is no build to break at "
     "nine on Friday morning."),
    ("Local first on her phone",
     "Cards are written to the phone's own store, then pushed. That is why "
     "the app works with no account and no network, and why the demo cannot "
     "be broken by the room."),
    ("One version number across every cacheable file",
     "A page could otherwise run this release's app.js beside modules from "
     "the release before. bump.py sets it everywhere; it is at v49."),
    ("Recognition and speech on the device",
     "Tesseract in WebAssembly for the reading, a 60 MB neural voice "
     "downloaded once and cached. Both chosen so no letter is ever sent "
     "anywhere."),
    ("Supabase for the shared half",
     "Postgres, PostgREST, storage and auth, in Frankfurt. The free tier, "
     "which is also why the project pauses when idle and has to be woken."),
    ("26 looks from one generator",
     "A palette, a typeface, a shape and a layout, generated into CSS with "
     "the contrast checked by role before it is emitted, so a new look "
     "cannot ship below 4.5:1."),
], columns=2, head_size=84)

# ------------------------------------------------------------ accessibility
L.points("a_a11y", "annexe  ·  accessibility", "Accessibility, measured", [
    ("Zero Axe violations",
     "WCAG 2.0 A and AA, 2.1 A and AA, 2.2 AA, on Today, Everything, the "
     "camera screen, the help screen, the lock screen and the question box, "
     "and on both family screens."),
    ("Contrast is a requirement with a number",
     "4.5:1 for text and 3:1 for large text, checked in all 26 looks by the "
     "generator rather than by eye. Three real failures were found and "
     "fixed on the way: a tab at 3.9:1, white on bright orange at 3.1:1, "
     "and a summary at 4.39:1."),
    ("Nothing small, nothing narrow",
     "Nothing below 22 pixels, touch targets at least 48 and mostly 56. The "
     "European Accessibility Act effectively demands this, which is also "
     "the opportunity in the SWOT."),
    ("Questions are asked in the app, not by the browser",
     "A browser confirm box comes in the browser's language, at the "
     "browser's size, cannot be read aloud and blocks the page. Both apps "
     "ask their own questions and the keeper app speaks them."),
    ("The honest gap",
     "The seven screens added since Wednesday have not been re-checked; it "
     "is a named 45-minute job. And Axe on a laptop is a floor, not a "
     "substitute for a screen reader on a real phone."),
], columns=2, head_size=84)

# ---------------------------------------------------------- unit economics
L.points("a_costs", "annexe  ·  the numbers", "What it costs to run", [
    ("About three cents per household per month",
     "At a thousand households, worked through household by household: "
     "database rows, the photographs in storage, and the bandwidth. The "
     "cost per household falls as households are added."),
    ("Which is why identity changes the shape of the cost base",
     "itsme is priced per authentication, roughly 10 to 30 cents. A helper "
     "signing in twice a month is 20 to 60 cents per user per month: ten to "
     "twenty times our entire infrastructure cost. The moment state-grade "
     "identity ships, the unit economics stop being about servers."),
    ("Year one, lean, 45,000",
     "Running the service 15,600, marketing 21,500, legal and compliance "
     "4,000, administration 2,400, three second-hand test devices 1,500."),
    ("Year two onward, 120,000",
     "One full-time person at 72,000 gross, the service at 19,200, "
     "marketing 21,500, administration 5,300, contingency 2,000."),
    ("The three things handed back to argue with",
     "The break-even figure uses a price that needs a roadmap feature; the "
     "year one revenue target is three times what the ramp gives; and "
     "marketing at 21,500 against 4,716 of first-year revenue has a payback "
     "longer than a year."),
], columns=2, head_size=84)

# ------------------------------------------------------------- competitors
L.points("a_compet", "annexe  ·  the market", "Who else is in this space", [
    ("The free giants",
     "Microsoft Seeing AI, Google Lookout, Apple Magnifier, Be My Eyes. "
     "They magnify and they read. None of them files, and none of them has "
     "a second interface for the family."),
    ("The reminder and calendar apps",
     "They all need somebody to type, which is the exact thing our user "
     "will not do."),
    ("The medical alert products",
     "Built around falls and emergencies, not memory. A different problem "
     "and a different buyer."),
    ("The family-sharing apps",
     "Built for the family, with the older person as the subject rather "
     "than the user. That is the line we deliberately do not cross."),
    ("The one sentence",
     "A magnifier is a free tool. A magnifier that files is a product."),
    ("And the real threat",
     "That a platform absorbs the feature at operating system level. The "
     "defence is the household model and the family interface, which is "
     "product rather than feature."),
], columns=2, head_size=84)

# ---------------------------------------------------------------- the docs
L.points("a_docs", "annexe  ·  the documents", "Where everything is written",
         [
    "**docs/analysis.md** — scope, users, 75 numbered requirements, GDPR, feasibility",
    "**docs/test-plan.md** — the 383-line browser script, A to Z, with what was seen for each line",
    "**docs/dpia.md** — the Article 35 assessment",
    "**docs/api.md** — the partner API, its three rules and its limits",
    "**db/schema.sql** — every table and every policy",
    "**db/patch-005-keeper-bin.sql** — the keeper's own bin, as definer functions",
    "**db/patch-006-consent-gate.sql** — withdrawal made enforceable, ten policies",
    "**Notion** — four hubs, three databases, the test plan and the process models",
    "**The repository** — github.com/zacharia-vives/recall, public, no build step",
    "**Both apps, live** — zacharia-vives.github.io/recall",
], columns=2, head_size=84,
   note="The long tables are in the repository rather than in Notion, "
        "because the free plan caps a multi-member workspace at a thousand "
        "blocks.")
