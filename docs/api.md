# Recall - the partner API

Version 1, 9 September 2026. Applied to the live database as
`db/patch-004-api.sql`. Tested by `tests/api_test.py`, 43 checks against the
real database.

## Why there is an API at all

The business plan sells a licence to care organisations. An organisation that
already runs a scheduling system is not going to retype appointments into a
family app by hand, and if we ask them to, they will not use it. So their
software has to be able to put a card in a household and set a reminder on it.

That is the whole ambition. It is not a general purpose API and it is not a way
to get data out of Recall.

## The three rules

Everything below follows from these, and each one has tests behind it.

**1. A key reaches exactly one household.** There is no key that can see
everything, because that is the key somebody eventually leaks. A care
organisation with forty clients holds forty keys.

**2. Everything a partner does lands in the activity log the keeper reads.**
Machines get no privacy she does not get. If their software adds a card, she
sees that a card was added, by "a connected system", at that time. She does not
have to take our word for what the integration did.

**3. A household that has withdrawn consent cannot be written to.** The consent
screen is not decoration and it is not only about our own app. Stopping sharing
stops everybody, including software that was invited in months earlier. Reading
what is already there still works, because it is already there.

## What is deliberately not in it

Photos. The documents on cards. Deleting anything. Reading a card's contents,
including `spoken_text` and any scanned letter.

A scheduling system needs to put appointments in and see what is coming. It has
no business reading her hospital letters, so it cannot. `api_upcoming` returns
titles, times and whether something is done, and nothing else. This is data
minimisation (GDPR Art 5(1)(c)) done by leaving the columns out of the query
rather than by promising not to look.

## Getting a key

Only a signed in helper of that household can make one, from the family app.
The function is not reachable without a session.

```
POST /rest/v1/rpc/api_create_key
{ "household": "<uuid>", "label": "Home care scheduling", "scopes": ["read", "write"] }
```

Returns the key once:

```json
[{ "secret": "rk_f481ae723eb...", "prefix": "rk_f481ae72", "id": "..." }]
```

**The key is shown once and never again.** What the database keeps is the
sha256 of it plus the first eleven characters, so a leaked database does not
leak working keys, and a key can still be recognised in a list. If a partner
loses theirs, they get a new one, they do not get the old one back.

`scopes` is `["read"]` or `["read", "write"]`. Anything else is refused.

Making a key writes a line in the activity log too, so the family can see that
an integration was invited in.

## Revoking a key

Any helper of the household can revoke, from the family app or directly:

```
PATCH /rest/v1/api_keys?id=eq.<uuid>
{ "revoked_at": "now()" }
```

It stops working on the next call. There is no grace period.

## Calling it

Base URL `https://xoczuvvxengzkcxybfbx.supabase.co/rest/v1/rpc/`. Every call is
a `POST` with a JSON body, the project's `apikey` header, and the key in the
`secret` argument. The key is the credential; there is no session, because a
partner's server has no session.

Errors come back as HTTP 400 with a plain sentence in `message`: "that key is
not known", "that key was revoked", "that key may not write", "this household
has not agreed to sharing, or has stopped".

### api_ping

Checks a key and says what it can do. A partner's setup screen should call this
first so a wrong key is caught at configuration time and not at six in the
morning when a reminder was supposed to go off.

```
{ "secret": "rk_..." }
-> { "ok": true, "household": "Familie Devos", "scopes": ["read","write"], "can_write": true }
```

### api_add_card

Needs `write`.

```
{ "secret": "rk_...",
  "title": "Kinesitherapie, dinsdag",
  "kind": "letter",
  "happens_at": "2026-09-15T09:30:00Z",
  "place": "AZ Groeninge, Kortrijk",
  "people": ["kinesist Devos"],
  "spoken_text": "Kinesitherapie op dinsdag om half tien.",
  "phone": "056 63 30 00" }
-> { "ok": true, "card": "<uuid>" }
```

`title` is required. `kind` is `person`, `letter`, `place` or `list`. Everything
else is optional.

Two fields are worth thinking about. `spoken_text` is what the app reads out
loud when she presses the card, so a partner should write it as a sentence a
person would say, not as a database row: "Kinesitherapie op dinsdag om half
tien", not "APPT KINE 15/09 09:30". And `place` is what the maps buttons search
for, so a real address gets her there and an internal room code does not.

### api_set_reminder

Needs `write`. Hangs a reminder on a card that is already in this household.

```
{ "secret": "rk_...", "card": "<uuid>",
  "due_at": "2026-09-14T18:00:00Z",
  "repeat": "none", "kind": "call",
  "spoken_text": "Bel de kinesist." }
-> { "ok": true, "reminder": "<uuid>" }
```

`repeat` is `none`, `daily`, `twice_daily` or `weekly`. `kind` is `normal` or
`call`; a call reminder shows a dial button in the app, using the phone number
on the card.

A card from a different household is refused, which is rule one being enforced
one level down rather than trusted.

### api_upcoming

Needs `read`. `days` is 1 to 60, default 7.

```
{ "secret": "rk_...", "days": 30 }
-> { "ok": true, "upcoming": [
     { "reminder": "<uuid>", "card": "<uuid>", "title": "Kinesitherapie, dinsdag",
       "due_at": "2026-09-14T18:00:00Z", "repeat": "none", "kind": "call",
       "done": false } ] }
```

Titles and times. Never the contents.

### api_mark_done

Needs `write`. For when the visit actually happened and their system knows it
before we do.

```
{ "secret": "rk_...", "reminder": "<uuid>" }
-> { "ok": true }
```

## Where it sits legally

A care organisation using this is a **processor** for the part of the data
their software puts in, and we are the processor for storing it. Art 28 needs a
written agreement before a real organisation gets a key, not after; the DPIA
records this and it is on the roadmap as a blocker for the first paying
customer, not a nice to have.

The consent gate in rule three is Art 7(3) taken seriously: withdrawal has to
be as easy as giving, and it has to actually stop the processing. A withdrawal
that stopped our app but left a partner's server writing would make the consent
screen a lie.

Nothing in the API can reach special category data (Art 9). Titles and times
can still say a lot, which is why the API is licensed to organisations under an
agreement and not open to anybody who signs up.

## What is not built yet

- No rate limiting. `calls` and `last_used_at` are counted per key, so we can
  see abuse, but nothing stops it automatically yet.
- No webhooks. A partner cannot be told that she marked something done; they
  have to poll `api_upcoming`.
- No sandbox household. A partner integrating against a real household is
  working with a real person's day, which is not where anybody should be
  testing.

All three are honest gaps rather than oversights, and they are listed here so a
partner reads them before they discover them.
