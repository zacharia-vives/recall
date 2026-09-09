# Recall - test plan and results

Run on 8 September 2026 against the live app and the live database in Frankfurt.

**Who tested what.** Luke Byrne tested on real phones: the camera, the zoom and
the reading of a real letter on paper, which is the one thing no browser on a
laptop can honestly prove. Zacharia Janssen ran the plan below in the browser
and against the database: every screen of both apps, the whole intake path, the
household and phone flows, the lock, the offline shell, the accessibility pass
and the security suite.

Nothing here is a claim about code that was only read. Every line marked pass
was watched happening, and the detail column says what was seen.

## How it was run

| Surface | Why |
| --- | --- |
| The live site, `zacharia-vives.github.io/recall` | It is what the jury sees on Friday |
| A local copy of the same commit | The keeper app writes to the phone's own store, and in this browser the store for the live address is damaged, see the note below |
| The live database in Frankfurt | Household isolation and sync cannot be tested against anything else |
| `tests/rls_test.py` | Twenty five checks with two separate accounts, run from the command line |
| Axe 4.10 against WCAG 2.0 A and AA, 2.1 A and AA, 2.2 AA | The accessibility promise is graded, so it needs a number and not an opinion |

**One honest limitation.** In the browser this pass was run from, the site data
for the live address is damaged: every attempt to open the local store there
hangs with no error, and by the end of the session the page itself stopped
responding. That is a fault in this browser profile, not in the app: the same
commit, served locally, runs perfectly, the live files were checked byte by
byte, and Luke's phone opens the live app without trouble. Clearing the site
data for that address in the browser settings fixes it in three clicks, and the
recovery screen from finding 1 covers the version of this that a phone can
actually have, where the store fails but the rest of the browser is well.

Test data was created in the live project and removed afterwards.
`db/tidy-test-data.sql` clears the last of it: two households made by anonymous
test sessions, which cannot be deleted from inside the app because an anonymous
account cannot be signed into twice.

## A. The store, and the first time she opens it

| # | What was checked | Result |
| --- | --- | --- |
| A1 | The store opens and seeds the example cards | pass, three cards |
| A2 | Seeding also creates the reminders that hang on them | pass, two reminders |
| A3 | Every example card is marked as an example, so it is never pushed to a household | pass |
| A4 | The recovery screen exists for a store that will not open | pass |
| A5 | The recovery button has something to call | pass, `startFresh` |
| A6 | First run shows the welcome screen | pass |
| A7 | Start goes to Today and is remembered next time | pass |
| A8 | The welcome screen says Recall is not a medical device | pass |
| A9 | Read this out loud really speaks | pass, the browser reported speaking |

## B. Today

| # | What was checked | Result |
| --- | --- | --- |
| B1 | Today lists what is coming, largest first | pass |
| B2 | Every item carries its own buttons | pass |
| B3 | Mark done takes the item off the list | pass, two items became one |
| B4 | Marking done is written to the store, not just to the screen | pass |
| B5 | The date is spelled out in words | pass, "Tuesday 8 September" |

## C. Everything, and search

| # | What was checked | Result |
| --- | --- | --- |
| C1 | The list shows every card | pass |
| C2 | Search finds every card that mentions a name, not only the card named after them | pass, two cards for "marie" |
| C3 | Search also looks in the place | pass |
| C4 | No hits says so instead of showing an empty screen | pass |

## D. One card

| # | What was checked | Result |
| --- | --- | --- |
| D1 | A card opens on its own screen | pass |
| D2 | The six fields are there | pass |
| D3 | The medical line is on the card as well as the first screen | pass |
| D4 | The card can be read out loud | pass |

## E. Deleting a card, and how Recall asks

| # | What was checked | Result |
| --- | --- | --- |
| E1 | Deleting asks in the app, not in a browser box | pass, see finding 2 |
| E2 | The question says what will happen | pass |
| E3 | The yes button says what it does, not "OK" | pass, "Yes, delete it" |
| E4 | Answering no keeps the card | pass |
| E5 | Answering yes deletes it and goes back to the list | pass |

## F. The camera screen fits the phone

| # | What was checked | Result |
| --- | --- | --- |
| F1 | The screen is sized from the device, not from a guess | pass, 708px measured |
| F2 | Nothing on it needs scrolling | pass, page height equals window height |
| F3 | The picture takes the room the controls leave | pass, 604 by 415 |
| F4 | The back button is out of the way, the tab bar already has Today | pass |
| F5 | Read out loud keeps the full width, the two photo buttons share a row | pass, 604 against 297 |
| F6 | It measures again when the phone is turned | pass |

## G. The zoom decides what is read

| # | What was checked | Result |
| --- | --- | --- |
| G1 | A capture comes back at a sensible size and never upscales more than twice | pass |
| G2 | The crop is geometrically exact | pass: a patch that fills 3.9% of the frame fills 15.6% at 2x and 62.5% at 4x, and the measurements were 4, 16 and 62 |
| G3 | Halfway zoom crops halfway | pass |

## H. Reading a letter, on the device

A letter was drawn with a hospital name, an appointment date, a Belgian
national number and an account number, then read the way a photographed letter
is read.

| # | What was checked | Result |
| --- | --- | --- |
| H1 | The reader runs at all, in the page, with no cloud service | pass |
| H2 | It reads the words | pass, "AZ Groeninge, Kortrijk / Cardiology department / Appointment on 14/10/2026 at 10:30" |
| H3 | It reports progress rather than sitting silent | pass, up to 100 per cent |
| H4 | It finds the date and the time | pass, 14 October 2026 at 10:30 |
| H5 | The national number never reaches the stored text | pass, "Patient number [national number removed]" |
| H6 | The account number never reaches the stored text | pass, "Please pay to [account number removed]" |
| H7 | The lines carrying those numbers were read, so it is the numbers that were taken out and not the lines | pass |
| H8 | A phone number and the date survive the stripping | pass |
| H9 | The language guess is one there is a voice for | pass |

## K. The whole intake path

| # | What was checked | Result |
| --- | --- | --- |
| K1 | Choosing a photo goes to the keeping screen | pass |
| K2 | The photo is on screen while it is being read | pass |
| K3 | It says it is working | pass |
| K4 | The box with what Recall read opens | pass, and this was finding 4 |
| K5 | The stripped numbers are visible as stripped | pass |
| K6 | The date it found is offered in the when field | pass, 2026-10-14T10:30 |
| K7 | The line breaks survive | pass, five lines, and this was finding 3 |
| K8 | It asks whether the date is right rather than assuming | pass |
| K9 | It reads the letter out loud without being asked | pass |
| K10 | Keep it saves the card | pass |
| K11 | The card keeps the photo | pass |
| K12 | The card keeps the stripped text | pass |
| K13 | A reminder is made for the date | pass |
| K14 | It lands on a screen she can read | pass |
| K15 | A letter with no date still shows what was read | pass, and this was the second half of finding 4 |
| K16 | And it says there was no date instead of claiming it could not read | pass |

## L. Offline

| # | What was checked | Result |
| --- | --- | --- |
| L1 | The cache is under a versioned name | pass, `recall-v19` |
| L2 | Both pages are in it | pass, nineteen entries |
| L3 | The scripts and styles are in it | pass |
| L4 | The icons are in it, so the home screen icon survives | pass |
| L5 | A cached script really answers from the cache | pass |
| L6 | The worker is active and is never itself served from cache | pass |

## M. The home screen

| # | What was checked | Result |
| --- | --- | --- |
| M1 | The app knows whether the browser will let it ask | pass |
| M2 | It knows when it is already installed and then says nothing | pass |
| M3 | It has words for iPhone, where there is no prompt to offer | pass |

## N and U. The lock

| # | What was checked | Result |
| --- | --- | --- |
| N1 | The lock settings sit in the help screen where family looks | pass |
| N2 | Family can put four numbers on the phone | pass |
| N3 | The numbers themselves are never stored | pass, only a salt and the stretched result |
| N4 | Lock the phone now locks it | pass |
| N5 | The cards and the tab bar are out of reach while it is locked | pass |
| N6 | The wrong numbers do not open it | pass |
| N7 | The right numbers do | pass |
| N8 | Face ID is offered only where the phone has it | pass |
| U1 | Six numbers work as well as four, and five are refused | pass |
| U2 | The lock screen shows the right number of dots | pass |
| U3 | Family has a way in on the lock screen itself | pass |
| U4 | A fresh phone code unlocks the phone, typed in lower case | pass |
| U5 | And it takes the numbers off, so family can set new ones | pass |
| U6 | The phone is still in the same household afterwards | pass |
| U7 | Nothing on the phone was lost by the rescue | pass |

Face ID itself is on Luke's list: it needs a phone with a face on it.

## O. The family app

| # | What was checked | Result |
| --- | --- | --- |
| O1 | It asks for a sign in when nobody is signed in | pass |
| O2 | Signed in with no household, it asks for one | pass |
| O3 | Three quick presses still make one household | pass |
| O4 | It opens straight into the household next time | pass |
| O5 | Follow up is the first thing family sees | pass |
| O6 | Add a card opens the form | pass |
| O7 | The card is saved to the household | pass |
| O8 | The sentence Recall should say is kept with it | pass |
| O9 | The photo goes up with it | pass |
| O10 | The reminder comes with the card, with its repeat | pass |
| O11 | Every card has an edit button | pass |
| O12 | An edit is saved | pass |
| O13 | Binning asks in the page, not in a browser box | pass |
| O14 | Cancel keeps the card | pass |
| O15 | Yes moves it to the bin and does not destroy it | pass |
| O16 | The bin offers a way back | pass |
| O17 | Restore brings the card back | pass |
| O18 | Follow up has three values and no more | pass |
| O19 | People and phones are two separate lists | pass |
| O20 | A helper is shown as a helper | pass |
| O21 | An invitation can be created | pass |
| O22 | Everything family did is in the log she can read | pass, seven entries |
| O23 | The log says what happened in words | pass, "tom@example.be was invited" |
| O24 | Sign out really ends the session | pass |

## Q. Moving Recall to another phone

| # | What was checked | Result |
| --- | --- | --- |
| Q1 | The wizard opens on what will happen | pass |
| Q2 | It says nothing is copied and nothing is lost | pass |
| Q3 | Step two shows six letters | pass |
| Q4 | And the square | pass |
| Q5 | The square carries a link with the code in it | pass |
| Q6 | It waits for her phone rather than leaving you guessing | pass |
| Q7 | You can stop waiting and the code still works | pass |
| Q8 | A second phone is announced by name when it links | pass, tested earlier the same day |
| Q9 | Only the older phones are offered for removal, never the new one | pass |
| Q10 | Removing a phone lands in the log she can read | pass |

## S. Linking and sync

| # | What was checked | Result |
| --- | --- | --- |
| S1 | Landing from the square takes the code out of the address bar | pass |
| S2 | The phone is linked to the household | pass |
| S3 | The phone gets an identity of its own with no password | pass |
| S4 | It joins as the keeper and the family stays the helper | pass |
| S5 | The card the family made is on the phone | pass |
| S6 | The example cards do not go up to the household | pass |
| S7 | The phone says who can see the cards, by name | pass, "Marie can see your cards." |
| S8 | The phone has a way to look for family changes | pass |
| S9 | A card the family binned disappears from the phone | pass |
| S10 | The phone's own cards are left alone by that sync | pass |

## V, W, X and Y. Photos, both directions

| # | What was checked | Result |
| --- | --- | --- |
| X1 | The page runs the modules of the release it says it is | pass, and this was finding 6 |
| X2 | A card taken on her phone keeps its photo locally | pass |
| X3 | It goes up with the path of its photo, so the family sees the picture | pass, and this was finding 5 |
| X4 | The phone remembers the path too | pass |
| Y1 | A second phone gets the card | pass |
| Y2 | Marked as having a photo | pass |
| Y3 | The picture itself is downloaded, so it works with no wifi | pass |
| Y4 | And she sees it when she opens the card | pass, 500px wide on screen |

## Z. The consent screen, and taking it back

Added the same evening, so tested the same evening. Twenty two checks, all
passing, against the live database.

| # | What was checked | Result |
| --- | --- | --- |
| Z1 | Linking shows the consent screen, not the cards | pass |
| Z2 | Nothing has been fetched or sent before she answers | pass, no family card on the phone yet |
| Z3 | It says where the cards would be kept | pass, a computer in Germany |
| Z4 | It says letters from a doctor need a clear yes | pass |
| Z5 | It says she can refuse and keep the app | pass |
| Z6 | It says she can stop later | pass |
| Z7 | It carries the medical line | pass |
| Z8 | Both answers are offered as buttons, equally | pass |
| Z9 | Yes fetches the family cards | pass |
| Z10 | The consent is recorded somewhere provable | pass, in the activity log until patch 002 is applied, in the consents table after |
| Z11 | The record names the version of the words that were read | pass, 2026-09-08 |
| Z12 | It is remembered locally so she is not asked twice | pass |
| Z13 | The app carries on to a screen she can read | pass |
| Z14 | The help screen offers a way to stop sharing | pass |
| Z15 | It asks first, in the app, not in a browser box | pass |
| Z16 | And says what it costs before she agrees | pass, what family has stays with them |
| Z17 | Stopping removes the link, so nothing new is shared | pass |
| Z18 | The local note is cleared with it | pass |
| Z19 | Her own cards are all still there afterwards | pass, four cards |
| Z20 | The message says what happened in plain words | pass |
| Z21 | A no removes the link too, so a no is a real no | pass |
| Z22 | And the app carries on working on its own | pass |

The whole lifecycle is readable afterwards in the log the family and she both
see: a phone was linked, she agreed with notice version 2026-09-08, she stopped
sharing new cards.

## The run on Wednesday 9 September

Everything, after the language work, the privacy work and the four new
features. **129 automated checks, all passing.**

| Suite | Checks |
| --- | --- |
| Every module parses as a module, not as a script | 12 |
| `tests/i18n_test.py`, three languages | 40 |
| `tests/reminders_test.js`, coming, missed, done, with repeats | 15 |
| `tests/docs_test.js`, reading a document, builds a real docx to prove the unzip | 24 |
| `tests/rls_test.py`, one household cannot reach another | 25 |
| Patch 002 and 003 verified through the API on the live database | 13 |
| The real app driven in a real browser, real IndexedDB | 67 |

Four defects found, all fixed the same morning:

1. **The family app was never translated at all.** Every attribute in place,
   every translation present, and nothing applied the dictionary to the page.
   Every static check passed while it was broken, which is exactly why the
   browser run exists. The suite now checks that both scripts call apply.
2. **What Recall knows undercounted**: no letters read, while a card held a
   document whose words it had read.
3. **A message that counted the buttons for you**: press one of the three,
   when the checklist switch had made it four.
4. A stray probe file committed by accident.

And one finding that is not a defect: this laptop's Edge holds a wedged Recall
database for the live origin. Version 2 exists, a versionless open hangs, and
the delete hangs with no blocked event. That is the R8.1 condition, and the
reason the app cannot self-heal is that its own reset calls the delete that
hangs. The same code passes 67 of 67 on a clean origin.

## The accessibility pass

Axe 4.10, WCAG 2.0 A and AA, 2.1 A and AA, 2.2 AA.

| Screen | Violations |
| --- | --- |
| Keeper, Today | none, 24 checks passed |
| Keeper, Everything | none |
| Keeper, the camera screen | none |
| Keeper, the help screen | none |
| Keeper, the lock screen | none |
| Keeper, the question box | none |
| Family, follow up | none, 22 checks passed |
| Family, household | none |

Three real failures were found and fixed on the way to that, all against the
4.5:1 this project set itself in N2: the selected tab at 3.9:1, white on the
bright orange at 3.1:1 on the family buttons, and a summary at 4.39:1.

The real device pass, with a screen reader and an old Android over mobile data,
stays on Luke's list. Axe on a laptop is a floor, not a substitute.

## The security suite

`python tests/rls_test.py`, twenty five checks, all passing.

Two separate accounts, one household with a card and a photo, and then
everything the other account could try: read the cards, read the households,
read the log, write a row, download the photo, claim a code that does not
exist. Plus the whole linking flow, and the rule that a family member who
claims a link code must still be a helper afterwards, which is the bug found
this morning and fixed in `db/patch-001-roles.sql`.

## What this pass found

Seven things, all fixed the same day.

| # | What was wrong | Why it mattered |
| --- | --- | --- |
| 1 | On one browser the phone's own store would not open at all, and the app showed an empty Today screen with a toast over it | Empty looks exactly like lost cards, which is the worst thing this app can say to the person it is for. There is a screen for it now: what happened, close Recall elsewhere and try again, or start fresh on this phone, and it says plainly what starting fresh costs |
| 2 | Four things asked with a browser confirm box | That box comes in the browser's language, at the browser's type size, cannot be read out loud, and blocks the whole page. Both apps ask their own questions now, and the keeper one speaks the question |
| 3 | The stripped numbers ate the line break after them | The next sentence was glued onto the marker and read out loud as one run-on sentence |
| 4 | The box showing what Recall read never opened, and a letter with no date in it was reported as unreadable | Two bugs from one shadowed name. Showing what was read is the one promise this app makes about not filing silently, and it was quietly broken |
| 5 | A photo taken on her phone never reached the family | The push uploaded the picture and then tried to attach it with an update, which the database refuses from a keeper phone on purpose. The card arrived without its picture and the file sat orphaned in storage |
| 6 | A page could run this release's app.js next to modules from the release before | Only the entry scripts carried a version. Every module now carries the same one, `tools/bump.py` sets it everywhere, and this is what made finding 5 look unfixed at first |
| 7 | Three contrast failures against our own rule | The rule is N2, the app is for people who cannot read small print, and a promise we do not keep is worse than one we never made |

## What is deliberately not tested here

- The camera, the zoom and reading real paper: Luke, on phones, done.
- Face ID: needs a phone with a face on it. Luke.
- An old Android over mobile data, and a screen reader: Luke, Thursday.
- One person over seventy using it unaided: booked, and the only test that can
  tell us whether any of this works.
