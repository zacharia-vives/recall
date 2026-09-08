# Recall

**Live: <https://zacharia-vives.github.io/recall/>**

Recall keeps what you would hate to lose.

A web app for older people who can no longer read their own paperwork and who
lose the thread of the day. You point the camera at a letter, Recall makes the
print bigger, reads the letter out loud, and files it as a card with a date and
a reminder.

Recall is not a medical device.

## Two interfaces, one household

| Who | Where | What they do |
| --- | --- | --- |
| The keeper | `index.html` | Never logs in. Today, camera, cards, read out loud. |
| The helper | `helper.html` | Signs in with an emailed link. Adds cards, sets reminders, follows up. |

A record belongs to a household, not to a person. People belong to a household
with a role, either keeper or helper, and every rule about who may read or
change what is enforced in Postgres, never in the browser. The design is written
out in <https://claude.ai/code/artifact/a6b6aec6-b408-4d5a-9fe3-858225129e9e>

## What it already does

- Cards with a photo, who, where, when and a reminder
- Reminders that wait on the Today screen and are read out loud when she
  opens the app. Recall does not ring a closed phone. Web push needs
  something on a server to send it, so it sits on the roadmap
- A camera with a slider that makes the print up to four times bigger
- Reads a card out loud with the voice built into the phone
- Reads the text of a letter on the device itself and pulls the date out of it
- Works with no account and no internet, everything stays on the phone
- Installs on the home screen of an Android phone
- A three step wizard on the family side that moves Recall to another
  phone, shows which phones are linked and removes the old one
- An optional code of four or six numbers before Recall opens, with Face
  ID or a fingerprint on top where the phone has them. Family can always
  unlock the phone again with a fresh phone code, so nobody is locked out

## Testing

`docs/test-plan.md` is the plan and the results: every screen of both apps, the
whole intake path, the household and phone flows, the lock, the offline shell,
an Axe pass with no violations left, and `tests/rls_test.py` at twenty five of
twenty five against the live database.

```
python tests/rls_test.py
```

## Releasing

One version number covers every file the browser can cache, so a phone can
never run a new page against older modules:

```
python tools/bump.py        # what everything is on now
python tools/bump.py 20     # set it everywhere, then commit and push
```

## Running it locally

There is no build step. You only need a web server, because the camera and the
service worker do not work from `file://`.

    python -m http.server 8080

Then open <http://localhost:8080>.

## Layout

    index.html                the keeper app, five screens
    helper.html               the family app
    css/style.css             styling, nothing readable below 22px
    css/helper.css            the family app, at normal density
    js/app.js                 routing and screens, keeper side
    js/helper.js              the family app
    js/store.js               storage in IndexedDB, on the device
    js/cloud.js               everything that talks to Supabase
    js/config.js              the project url and anon key go here
    js/camera.js              camera and the magnifier
    js/ocr.js                 reading text, finding the date, redacting numbers
    js/speech.js              reading out loud
    sw.js                     working offline
    db/schema.sql             the database, households, roles and policies
    tests/rls_test.py         the security test, run it after any schema change
    docs/analysis.md          the full analysis and the requirements
    docs/state-of-play.pdf    where the project stands, seven pages

## Rules for this project

1. **Nothing readable below 22px** and every button at least 56px high. Our user
   cannot read 7 point, which is the entire reason the app exists.
2. **Everything stays on the device by default.** Nothing goes to a server until
   someone signs in and explicitly chooses to.
3. **The text of a letter is read on the device**, never by an outside service. A
   letter from a hospital is health data.
4. **The national number and account numbers are stripped** before we store any
   text. See `redact()` in `js/ocr.js`.
5. **Never file silently.** Whatever we read off a letter is shown and confirmed
   first.
6. **Never summarise.** We read out what is written, we do not rewrite it.
7. **No framework and no build step.** What is in the repo is what is online.

## Connecting the database

The keeper app needs none of this: with `js/config.js` empty it stores
everything on the phone and loads no cloud code at all. The family app needs a
database, and this is the whole setup.

1. Make a Supabase project in the **Frankfurt (eu-central-1)** region.
2. Run `db/schema.sql` once in the SQL editor.
3. Authentication, Providers: switch on **anonymous sign-ins**. Only the keeper
   phone uses it, so that it can have an identity without an email.
4. Authentication, URL configuration: site url
   `https://zacharia-vives.github.io/recall/` and redirect
   `https://zacharia-vives.github.io/recall/helper.html`.
5. Storage: check the `photos` bucket says private.
6. Put the project url and the **anon** key in `js/config.js`. That key is meant
   to be public. The `service_role` key is not, and this project never uses it.

Then the family app works: sign in, create a household, and use "Link her phone"
to turn any phone into the keeper phone with a six letter code.

## The security test

`tests/rls_test.py` opens two separate anonymous sessions against the live
project and checks twenty three things: that one household cannot see another,
that a stranger cannot write into it or read its photos, that the keeper can add
a card but not edit one, that a link code works once and only once, and that
deleting a household takes everything with it. It cleans up after itself.

    python tests/rls_test.py

Run it after every change to `db/schema.sql`. It needs no secrets, only the
public anon key that is already in `js/config.js`.

## Language

The interface is English. Two things stay deliberately Dutch-aware, because the
letters our users photograph are Belgian: the OCR runs with `nld+eng`, and
`guessLang()` in `js/ocr.js` picks a Dutch voice when the text it read looks
Dutch. A Dutch interface is on the list for later.

## Where we are

| Step | What | Status |
| --- | --- | --- |
| 0 | Skeleton online, icon, offline shell | done |
| 1 | Cards locally: create, list, read out loud, delete | done |
| 2 | Camera with a magnifier and taking a photo | done |
| 3 | Reading text and recognising the date | first version |
| 4 | Reminders, today screen, marking as done | to do |
| 5 | Supabase: sign in with an emailed link, sync | to do |
| 6 | Accessibility pass and testing with a real user | to do |
