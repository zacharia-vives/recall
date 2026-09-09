# Recall - analysis and requirements

Version 1, 8 September 2026. This document is the source of truth for what we
build. If the code and this document disagree, one of them is wrong and we talk
about it.

The formatted version, with the full tables, is at
<https://claude.ai/code/artifact/85430cce-66a3-45f6-b883-f49c5792106d>

**Companion document.** After the pitch we added a second interface for the
caretaker. The household model, the roles, the permissions, the line between
helping and watching, and requirements R5, R6, P15 to P19 and S7 to S8 live in
*Two interfaces, one household*:
<https://claude.ai/code/artifact/a6b6aec6-b408-4d5a-9fe3-858225129e9e>

## 1. Scope

The professor cut the original idea down to one module: **the card store, with
the camera folded into it as the way things get in.** Everything else sits on a
roadmap for the end presentation.

In one sentence: *a card store for the ordinary things a forgetful person loses
track of, filled by pointing a camera at them, and read back out loud.*

Explicitly **not** building: step counting, rewards, memory walks, family posting
cards in, WhatsApp or Instagram, face recognition, medical claims, or signing in
with itsme.

## 2. Users

| Role | Who | What that means for the interface |
| --- | --- | --- |
| The keeper | 70 to 90, mild forgetting, poor near vision | Cannot read 7 point, hands shake, will not keep folders, will not remember a password |
| The helper | An adult child, usually a daughter in her forties or fifties | Installs it, sets it up, and is the one who would pay |

## 3. Functional requirements

MoSCoW. Must is the demo and does not slip.

### R1 Cards

| ID | Requirement | Priority |
| --- | --- | --- |
| R1.1 | Create a card with a photo, a name and a kind | Must |
| R1.2 | Exactly six fields: media, who, where, when, tags, reminder | Must |
| R1.3 | List of cards, newest first, large cards with the photo | Must |
| R1.4 | Open one card, every field at 22px or larger | Must |
| R1.5 | Read a card out loud in one tap | Must |
| R1.6 | Edit and delete a card | Should |
| R1.7 | Search across names, people and tags | Should |
| R1.8 | Ask a question out loud and hear the answer | Could |
| R1.9 | Free text of any length | Won't |

### R2 Camera

| ID | Requirement | Priority |
| --- | --- | --- |
| R2.1 | Live camera with a magnifier, 1x to 4x | Must |
| R2.2 | Take a photo and keep it on the card | Must |
| R2.3 | Read the text it found out loud | Must |
| R2.4 | Find the date in the text and offer it | Must |
| R2.5 | File in one step, no form to fill in | Must |
| R2.6 | Choose an existing photo instead of the camera | Should |
| R2.7 | Torch and tap to focus | Could |
| R2.8 | Recognise a face and name the person | Won't |

### R3 Reminders

| ID | Requirement | Priority |
| --- | --- | --- |
| R3.1 | A reminder belongs to a card, it never stands alone | Must |
| R3.2 | Today screen: what is coming, large, read out loud on tap | Must |
| R3.3 | Repeating: every day, twice a day, every week | Should |
| R3.4 | Mark as done, and show that it was done | Should |
| R3.5 | A notification while the app is closed. Not built, and not claimed anywhere in the app, because web push needs a scheduled job on a server | Could |
| R3.6 | Reminders by text message or phone call | Won't |

### R4 Accounts and sync

| ID | Requirement | Priority |
| --- | --- | --- |
| R4.1 | Works completely without an account, data on the device | Must |
| R4.2 | Optional sign-in with an emailed link, no password | Should |
| R4.3 | A signed-in user sees only their own cards | Should |
| R4.4 | Delete a card permanently, photo included | Should |
| R4.5 | Export everything as photos plus a JSON file | Could |
| R4.6 | Shared household accounts | Could |
| R4.7 | itsme or FranceConnect | Won't |

### R5 The family interface

The keeper is not the person who knows what matters, so the family gets a
screen of its own over the same store.

| ID | Requirement | Priority |
| --- | --- | --- |
| R5.1 | Sign in with an emailed link, never a password | Must |
| R5.2 | See every card in the household, newest first | Must |
| R5.3 | Add a card by typing, with a photo from the phone | Must |
| R5.4 | Set and change a reminder, including a repeat | Must |
| R5.5 | Follow up with three values and no more: coming, done, missed | Must |
| R5.6 | Write the sentence Recall says out loud | Must |
| R5.7 | Move a card to the bin and restore it within thirty days, never destroy it outright | Should |
| R5.8 | Invite a second family member | Should |
| R5.9 | Read the same activity log the keeper reads | Should |
| R5.10 | Watch what the keeper does: when they opened the app, how long they looked | Won't |
| R5.11 | A photo taken on her phone reaches the family with the card, and a photo the family adds reaches her phone | Must |

### R6 Household, roles and device linking

| ID | Requirement | Priority |
| --- | --- | --- |
| R6.1 | A card belongs to a household, never to one person | Must |
| R6.2 | Two roles and no more: keeper and helper | Must |
| R6.3 | Link the keeper phone once, with a six letter code or the square that carries it, and never ask that phone to log in again | Must |
| R6.4 | Every rule about who may read or change what is enforced in the database, never in the browser | Must |
| R6.5 | Invite a second helper with a link that expires | Should |
| R6.6 | Claiming a link code can never change a role that already exists | Should |
| R6.7 | More than one keeper in one household | Could |
| R6.8 | A keeper with a password of their own | Won't |

### R7 Her phone, and the lock on it

Phones break, get lost and get replaced, and the person holding this one cannot
set up a new one alone. Moving Recall is therefore a job for the family app, in
steps, with the old phone still working until somebody deliberately removes it.

| ID | Requirement | Priority |
| --- | --- | --- |
| R7.1 | Family can move Recall to another phone in three steps, without losing a card | Should |
| R7.2 | Family can see which phones are linked, when each was linked, and remove one | Should |
| R7.3 | An optional code of four or six numbers before Recall opens | Should |
| R7.4 | Face ID or a fingerprint instead of the numbers, where the phone offers it | Could |
| R7.5 | A phone nobody can get into is opened again with a fresh phone code from the family app, which also takes the numbers off | Must, if R7.3 is used |
| R7.6 | The lock never comes on by itself: no timer, and never while she is reading | Must, if R7.3 is used |
| R7.7 | Encrypting the cards on the phone with the code | Won't, this version |

Two things worth being plain about. The lock is a lock on the screen, not
encryption: the cards sit in IndexedDB and anybody with the phone, a cable and
patience can read them. It stops a curious visitor, a grandchild and a stranger
who picks the phone up in a waiting room, which is the risk that actually
happens here. And Face ID means the phone asks the person to prove they own the
phone; there is no server checking the answer, because Recall has no server of
its own. It is one step better than the numbers, never the only way in, and the
numbers always stay as the fallback.

The code itself is never stored. What is stored is a random salt and the result
of a hundred and fifty thousand PBKDF2 rounds over the code, so four numbers
cannot simply be read out of the phone.

### R8 When the phone itself goes wrong

Found while testing on 8 September: on one browser every attempt to open the
local store hung with no error and no blocked event, because the store itself
was wedged. Nothing in the app can repair that, and an empty Today screen looks
exactly like lost cards, so the app has to say what happened and offer a way
out.

| ID | Requirement | Priority |
| --- | --- | --- |
| R8.1 | If the local store will not open, say so on its own screen, never with a toast over an empty Today | Must |
| R8.2 | Offer both ways out: try again after closing other tabs, and start fresh on this phone | Must |
| R8.3 | Say plainly what starting fresh costs: family cards come back, cards that were only ever kept here do not | Must |
| R8.6 | The failure screens say device, not phone: they are the ones that can come up on a family member's computer | Should |
| R8.4 | Recover the cards of an unlinked phone whose store is wedged | Won't, and this is the argument for linking |
| R8.5 | Recall asks its own questions, never a browser confirm box: the browser's box is in the browser's language, at the browser's type size, cannot be read out loud, and blocks the whole page while it is up | Must |

## 4. Non-functional requirements

| ID | Requirement |
| --- | --- |
| N1 | Never text below 22px, buttons at least 56px high |
| N2 | Contrast at least 4.5:1 for text |
| N3 | Everything reachable by keyboard, focus always visible |
| N4 | WCAG 2.2 AA as the target, because the European Accessibility Act applies here |
| N5 | No timeouts, no motion that cannot be turned off |
| N6 | First screen usable in under 3 seconds on an old Android |
| N7 | Works offline for reading and for the today screen |
| N8 | Installable on the home screen with the Recall icon |
| N9 | Cards and photos are private to their owner |
| N10 | Interface in English. Dutch and French come later, so interface text stays out of the logic |
| N11 | The camera screen fits the device it is running on, so it never has to be scrolled while she is holding the phone up to a letter |
| N12 | Every file the browser can cache is asked for with the same version on it, so a phone can never run a new page against modules from an older release |
| N13 | The voice is the best one that speaks on the device itself. A voice that sends the text away to be read is refused, by name and by the localService flag, however much better it sounds |
| L1 | Dutch, French and English across both apps, one key with its three translations side by side | Must |
| L2 | Everything that follows the language follows it: the voice, dates, month names, how a time is read out, and which language data the letter reader downloads | Must |
| L3 | The consent notice exists in three languages, and the recorded consent says which one was read, because article 7 asks which words were agreed to | Must |
| L4 | The language of a letter is guessed separately from the language of the interface, because a French letter in a Dutch household is still French | Should |
| L5 | A link can carry the language, and it sets the choice on arrival rather than overriding it, so the picker still works afterwards | Should |
| L6 | The English text stays in the markup as the fallback, so a page read before the module runs still says something sensible | Must |
| P20 | What Recall knows about you, counted, in the help screen: article 15 in a form she can use without writing anybody a letter | Must |
| P21 | A copy of everything in one press, cards, reminders and photos: article 20, in the product rather than in a promise | Must |
| P22 | A privacy notice in all three languages, built around care, security, respect and transparency, each one a claim with a mechanism behind it | Must |
| N16 | A neural voice that runs on the device, for Dutch, English and French, is the voice Recall reads with. The phone's own voice is the fallback and nothing else: not fetched yet, switched off, no WebAssembly, nowhere to keep the model, or the model throws, all end with the phone reading the same words | Must |
| N16.1 | The voice fetches itself, because a better voice nobody finds in a settings screen is not a better voice. It never costs anybody their data plan: sixty megabytes goes only over a connection that can carry it and where the browser has not been asked to save data, and otherwise it waits and says it is waiting | Must |
| N16.2 | The voice follows the language of the words, not the language of the screen. A French letter in a Dutch household is read by the French voice or by the phone, never by the Dutch neural voice, which is L4 applied to the new path | Must |
| N18 | The look is hers to choose: twenty four skins, each a palette, a typeface, a shape and a layout. Every one is measured against the 4.5:1 rule by role before it is offered, so there is nothing in the list she can pick that makes her own app unreadable | Should |
| N18.1 | The floor holds in every skin. Nothing below 22px, buttons at least 56px, and state never carried by colour alone. Two skins raise the base to 26px; none lowers it | Must |
| N18.2 | A skin cannot break the app. An unknown stored name, storage that throws, a face that will not load: each lands on the skin that ships, which is the default in style.css and needs no stylesheet of its own | Must |
| N18.3 | The faces are served from the app itself, not from Google. Asking a font host for type on every reading would hand a third party the address of a woman with mild memory loss, which is the same objection that ruled out cloud reading and cloud speech | Must |
| R2.8 | A button is never shorter than its own label. flex-basis 0 shares width in a row and makes the base height zero in a column, so a short screen shrank the buttons under their text and the label sat outside its own colour. Found on a photograph from a real phone | Must |
| R2.9 | A long word wraps rather than pushing past the edge of the screen. Dutch and French words are longer than the English these boxes were sized against, and a narrow column makes it worse | Must |
| R4.7 | The three ways in are one pill floating above the bottom edge rather than a bar welded to it, so it sits on the paper of whichever skin is on and keeps clear of the phone's own gesture bar. The current one is a filled lozenge with a heavier frame, never colour alone | Should |
| N18.4 | One layout shows the next card only, and it is the only one that changes what is on the screen rather than how it looks. It therefore always says how many it is holding back, and one press shows them. An app for somebody who forgets must never quietly drop a reminder | Must |
| N16.3 | Where the neural voice is reading, the warning that the phone has no voice for this language is hidden, because it would be both untrue and alarming | Should |
| N17 | Dutch gets a Belgian voice, not a Netherlands one. The keeper we are building for is Flemish and nl_BE exists, so settling for nl_NL would be a choice rather than a limitation | Should |
| P23 | The list of what the family has done is readable in her own app, in her own language, because the notice she hears out loud promises exactly that. Actions are looked up in the dictionary, never shown as the English they were stored in | Must |
| R2.7 | Choose a photo opens the gallery and not the camera. The two buttons do different things and the file input must not carry a capture hint | Must |
| R6.4 | A reminder counts as missed an hour after it was due, not twelve, because a morning appointment reading as coming all day defeats the follow up screen | Must |
| F14 | Any card with an address offers the way there: one big button for the map app the phone actually has, with the other two smaller behind it. Ordinary https links, so the app opens when it is installed and the website when it is not | Should |
| R4.6 | The three kinds are switches on Everything, all on to begin with, and the state is shown by a tick and a frame rather than by colour alone | Should |
| A1 | A care organisation's software can put a card in one household and set a reminder on it, with a key that reaches that household and no other. Forty clients means forty keys | Must, for the licence half of the business plan |
| A2 | Everything a partner's software does is written into the same activity log the keeper reads, as a connected system, at the time it happened | Must |
| A3 | Withdrawal of consent blocks every write through the API, not only in our own app. Reading what is already there still works | Must |
| A4 | The API cannot read a card's contents, its photos or its documents. Titles, times and done or not, and nothing else | Must |
| A5 | A key is shown once. What is stored is its hash plus the first eleven characters, so a leaked database leaks no working key, and any helper can revoke it | Must |
| N15 | Where the device has no voice for the language of a letter, say so and say where to install one, rather than reading Dutch with an English accent and leaving family to wonder |
| N14 | Text is shaped into speech before it is spoken: dates as words, times as times, abbreviations expanded, redaction markers read as a sentence, one utterance per sentence so there is a breath between them. Nothing is added and nothing is left out, which is S2 |

## 5. Data protection

The full assessment, including every EU instrument this touches and where the
project stands against each, is `docs/dpia.md`. What follows is the part that
shapes the code.

People do not put holiday snaps in here. They put **hospital letters, bank
statements, insurance policies and identity cards** in, because those are exactly
the papers they cannot read and are afraid to lose. That makes this a processing
of special categories of personal data about a vulnerable person.

| Category | Example | Consequence |
| --- | --- | --- |
| Health data | Letter from cardiology, medication schedule | Article 9, explicit consent needed |
| National number | Printed on nearly every official Belgian letter | Needs its own legal ground, so we do not store it |
| Financial data | Bank statement, pension slip | Not article 9, but high harm if it leaks |
| Data about others | The doctor, the daughter, a grandchild | People who never agreed to anything |
| Biometric data | Only if face matching is ever switched on | Article 9, which is why it is not in v1 |

The household exemption in article 2(2)(c) covers the user, not us. The moment
those documents sit in our Supabase project, **we** are the controller.

### Consent where capacity may be reduced

- A tap is not consent. The first screen is short, in plain language, at 22px,
  and **the app reads it out loud**. A privacy notice you cannot read is not
  transparency under article 12.
- There is a path for consent together with the helper. Where someone is under
  legal protection, that person consents instead.
- Withdrawing must be as easy as giving: one button, same size.
- **Local is the default.** With no account nothing leaves the phone, so there is
  no processing at all. That is article 25, and it is also our best demo.

### P requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| P1 | Local by default, uploading only after signing in and choosing to | Must |
| P2 | Text recognition runs on the device, never at an outside service | Must |
| P3 | Strip the national number and IBANs before storing any text | Must |
| P4 | A consent screen that is read out loud, before anything uploads | Must |
| P15 | A real no: refusing keeps the app working, and the household link is removed so there is nothing to share with | Must |
| P16 | Withdrawal as easy as giving, in the help screen, and it says plainly that what family already has stays with them | Must |
| P17 | The recorded consent names the version of the notice that was actually read, so the wording and the record cannot drift apart | Must |
| P18 | No card leaves the device before the answer, so the question comes before the first sync and not after it | Must |
| P5 | Photos in a private bucket, reachable only by short-lived signed links | Must |
| P6 | Row level security on every table, checked in the database | Must |
| P7 | No service key and no secrets in the repo, only the anon key | Must |
| P8 | Delete means gone: the row, its reminders and its photo | Must |
| P9 | Delete my account and everything in it, from inside the app | Should |
| P10 | Export everything | Should |
| P11 | EU region only, and a data processing agreement with Supabase | Should |
| P12 | Visible access: if a helper can see the cards, the screen of the keeper says so, by name | Should |
| P13 | No analytics, no trackers, no third-party fonts in the app | Should |
| P14 | An optional lock on the app, a PIN or the device biometric | Could |

### Paperwork

A DPIA (article 35 applies twice here: article 9 data and vulnerable people), a
record of processing (article 30), a privacy notice in plain language, a breach
procedure with the 72 hours to the Belgian data protection authority
(article 33), and a list of sub-processors: Supabase and GitHub, and that is all
of it.

## 6. Safety

The other half of "legal documents" is not privacy, it is being wrong. If Recall
shows the wrong date or the wrong dose to someone who now trusts the app more
than their own memory, we have done real harm.

| ID | Requirement | Priority |
| --- | --- | --- |
| S1 | Never file silently, every date is shown beside the photo and confirmed | Must |
| S2 | Read out what is written, never summarise or rewrite it | Must |
| S3 | No advice, no dosing logic, no interpretation | Must |
| S4 | "Recall is not a medical device" on the first screen and in the about screen | Must |
| S5 | Never the only copy, the app says to keep the paper letter | Should |
| S6 | No emergency features and nothing that looks like monitoring | Must |

## 7. What this stack can and cannot do

| Capability | Possible? | How, or why not |
| --- | --- | --- |
| Camera and magnifier | Yes | getUserMedia, and Pages gives us https |
| Reading out loud | Yes | Web Speech API, free and offline on most devices |
| Reading text on the device | Yes | Tesseract.js, the Dutch model is about 15 MB |
| Voice commands | Partly | Chrome and Safari yes, Firefox no |
| Storing photos | Yes | Supabase Storage 1 GB free, IndexedDB locally |
| Seeing only your own data | Yes | Row level security in Postgres |
| Signing in without a password | Yes | Supabase magic link |
| Face ID or a fingerprint as a screen lock | Yes | WebAuthn platform authenticator, checked by the phone itself |
| Encrypting the cards at rest on the phone | Partly | The code could derive a key, but she must never be locked out of her own memory, so version one keeps a screen lock only |
| A notification while the app is closed | Partly | Web Push, but something has to send it: a scheduled Supabase function |
| Scheduling a notification locally | No | Notification Triggers does not exist in browsers |
| Counting steps in the background | No | Needs Health Connect or HealthKit, so a native app |
| Reading WhatsApp | No | There is no API for private messages |

## 8. Architecture

A static PWA on GitHub Pages with no build step. Supabase for the database,
sign-in and photos, called straight from the browser. Everything that computes
happens in the browser or in the database.

Two rules keep it simple:

1. The app works **with no account and no network**. The same four functions in
   `js/store.js` write to IndexedDB or to Supabase.
2. **No secrets in the client.** The anon key is meant to be public, everything
   that matters lives in the policies of the database.

## 9. Build order

| Step | What | Hours |
| --- | --- | --- |
| 0 | Skeleton online: repo, Pages, icon, offline | 4 |
| 1 | Cards locally, R1.1 to R1.5 | 10 |
| 2 | Camera, R2.1, R2.2, R2.5. The demo is complete after this | 10 |
| 3 | Text and dates, R2.3, R2.4 | 12 |
| 4 | Reminders, R3.1 to R3.4 | 8 |
| 5a | Supabase in Frankfurt, schema v2, RLS, magic link, households | 8 |
| 5b | The helper interface: cards, add, edit, reminders, follow-up | 14 |
| 5c | Device linking, and syncing keeper cards into the household | 8 |
| 5d | Activity log, who has access, consent record | 6 |
| 6 | Accessibility pass and testing with a real user | 8 |

## 10. Definition of done

- Live on a public https url, installable on Android with the Recall icon.
- Every Must is finished and can be shown in two minutes, offline.
- Axe reports zero violations, Lighthouse accessibility 100, every button 56px or
  more.
- Two accounts prove they cannot see each other cards.
- No secret in the repo other than the public anon key.
- The redaction test passes: a letter carrying an 11-digit national number
  results in no stored national number.
- One real person over seventy has used it unaided, and whatever went wrong is
  written down.
