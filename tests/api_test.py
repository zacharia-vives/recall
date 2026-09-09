"""The partner API, against the live database.

    python tests/api_test.py

This is the surface a care organisation's software would call, so it is tested
the way an attacker would read it rather than the way a demo would: what a key
can do, what it cannot reach, and what happens when the household stops
sharing. Everything it makes, it deletes again.

Three rules the API is built on, and each one has checks here:

  1. A key reaches exactly one household.
  2. Everything a partner does lands in the activity log the keeper reads.
  3. A household that has withdrawn consent cannot be written to by anybody,
     including software that was invited in earlier.
"""

import json
import sys
import urllib.error
import urllib.request

URL = "https://xoczuvvxengzkcxybfbx.supabase.co"
ANON = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6In"
        "hvY3p1dnZ4ZW5nemtjeHliZmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NDM5ODcs"
        "ImV4cCI6MjEwNDQxOTk4N30.nJP2cRyzwP7YunkTremJc6ioYauadBpYk0ptkgwCmpo")

results = []


def check(name, ok, detail=""):
    results.append(("PASS" if ok else "FAIL") + "  " + name +
                   (("   " + str(detail)[:120]) if detail else ""))
    return ok


def call(method, path, token=None, body=None, prefer=None):
    req = urllib.request.Request(URL + path, method=method)
    req.add_header("apikey", ANON)
    req.add_header("Authorization", "Bearer " + (token or ANON))
    if prefer:
        req.add_header("Prefer", prefer)
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data, timeout=30) as response:
            text = response.read().decode("utf-8", "replace")
            return response.status, (json.loads(text) if text.strip().startswith(("{", "[", '"')) else text)
    except urllib.error.HTTPError as err:
        text = err.read().decode("utf-8", "replace")
        return err.code, (json.loads(text) if text.strip().startswith(("{", "[", '"')) else text)


def rpc(name, body, token=None):
    return call("POST", "/rest/v1/rpc/" + name, token, body)


def says(out, phrase):
    return phrase.lower() in json.dumps(out).lower()


# ------------------------------------------------------- a household to work in
status, body = call("POST", "/auth/v1/signup", body={})
helper = body["access_token"]
helper_id = body["user"]["id"]
status, household = rpc("create_household",
                        {"household_name": "API test, delete me", "helper_name": "Marie"},
                        helper)
check("a household to test in", status == 200, household)

# She has to have agreed before a partner may write anything, so link a phone
# and record the consent exactly as the app does.
status, out = call("POST", "/rest/v1/device_links", helper, {
    "code": "APITST", "household_id": household, "created_by": helper_id,
    "display_name": "her phone", "expires_at": "2030-01-01T00:00:00Z"})
status, body = call("POST", "/auth/v1/signup", body={})
keeper = body["access_token"]
status, claimed = rpc("claim_keeper_device", {"link_code": "APITST"}, keeper)
check("her phone is linked", status == 200 and claimed == household, claimed)

status, consent = call("POST", "/rest/v1/consents", keeper,
                       {"household_id": household, "notice_version": "2026-09-08/nl"},
                       prefer="return=representation")
check("she has agreed to sharing", status in (200, 201), consent if status >= 400 else "")
consent_id = consent[0]["id"] if status in (200, 201) else None

# ------------------------------------------------------------------ making keys
status, made = rpc("api_create_key",
                   {"household": household, "label": "Home care scheduling",
                    "scopes": ["read", "write"]}, helper)
check("a helper can make a key for their own household", status == 200, made if status >= 400 else "")
write_key = made[0]["secret"] if status == 200 else ""
check("the key is shown once and looks like a key",
      write_key.startswith("rk_") and len(write_key) > 60, write_key[:14] + "...")

status, read_only = rpc("api_create_key",
                        {"household": household, "label": "Read only", "scopes": ["read"]}, helper)
read_key = read_only[0]["secret"] if status == 200 else ""
check("a read only key can be made too", status == 200 and read_key.startswith("rk_"))

# Nobody else can make one for this household.
status, body = call("POST", "/auth/v1/signup", body={})
stranger = body["access_token"]
status, refused = rpc("api_create_key", {"household": household, "label": "mine now"}, stranger)
check("a stranger cannot make a key for somebody else's household",
      status >= 400 and says(refused, "only a helper"), refused)

status, refused = rpc("api_create_key", {"household": household, "label": "anon"})
check("an anonymous caller cannot make a key at all", status >= 400, refused)

status, refused = rpc("api_create_key",
                      {"household": household, "label": "too much", "scopes": ["read", "admin"]}, helper)
check("a key cannot ask for a scope that does not exist",
      status >= 400 and says(refused, "read and write"), refused)

# ------------------------------------------------------- nothing stores the key
status, rows = call("GET", "/rest/v1/api_keys?select=label,key_prefix,key_hash,scopes", helper)
check("the family can see which keys exist", status == 200 and len(rows) == 2, rows)
if status == 200 and rows:
    check("no row holds the key itself, only its hash",
          all(not (r.get("key_hash") or "").startswith("rk_") for r in rows),
          rows[0].get("key_hash", "")[:16] + "...")
    check("the prefix is kept so a key can be told apart",
          all((r.get("key_prefix") or "").startswith("rk_") for r in rows))

status, rows = call("GET", "/rest/v1/api_keys?select=id", stranger)
check("a stranger sees no keys at all", status == 200 and rows == [], rows)

# ----------------------------------------------------------------- using a key
status, ping = rpc("api_ping", {"secret": write_key})
check("a key can prove itself", status == 200 and ping.get("ok") is True, ping)
check("the ping names the household and the scopes",
      ping.get("household") == "API test, delete me" and ping.get("can_write") is True, ping)

status, refused = rpc("api_ping", {"secret": "rk_" + ("0" * 64)})
check("an invented key is refused", status >= 400 and says(refused, "not known"), refused)

status, card = rpc("api_add_card", {
    "secret": write_key, "title": "Kinesitherapie, dinsdag", "kind": "letter",
    "happens_at": "2026-09-15T09:30:00Z", "place": "AZ Groeninge, Kortrijk",
    "people": ["kinesist Devos"], "spoken_text": "Kinesitherapie op dinsdag om half tien.",
    "phone": "056 63 30 00"})
check("a write key can add a card", status == 200 and card.get("ok") is True, card)
card_id = card.get("card") if status == 200 else None

status, refused = rpc("api_add_card", {"secret": read_key, "title": "should not appear"})
check("a read only key cannot add a card",
      status >= 400 and says(refused, "may not write"), refused)

status, refused = rpc("api_add_card", {"secret": write_key, "title": "   "})
check("a card still needs a title", status >= 400 and says(refused, "needs a title"), refused)

status, refused = rpc("api_add_card", {"secret": write_key, "title": "x", "kind": "invoice"})
check("a kind the app does not know is refused", status >= 400 and says(refused, "kind must be"), refused)

status, rem = rpc("api_set_reminder", {
    "secret": write_key, "card": card_id, "due_at": "2026-09-14T18:00:00Z",
    "repeat": "none", "kind": "call", "spoken_text": "Bel de kinesist."})
check("a reminder can be set, including a call", status == 200 and rem.get("ok") is True, rem)
reminder_id = rem.get("reminder") if status == 200 else None

status, refused = rpc("api_set_reminder", {
    "secret": write_key, "card": "00000000-0000-0000-0000-000000000000",
    "due_at": "2026-09-14T18:00:00Z"})
check("a reminder cannot be hung on a card that is not in this household",
      status >= 400 and says(refused, "no such card"), refused)

status, coming = rpc("api_upcoming", {"secret": read_key, "days": 30})
check("a read key can see what is coming", status == 200 and coming.get("ok") is True)
titles = [one["title"] for one in (coming.get("upcoming") or [])]
check("and the card it just made is in there", "Kinesitherapie, dinsdag" in titles, titles)
if coming.get("upcoming"):
    first = coming["upcoming"][0]
    check("what comes back is titles and times, never the contents of a letter",
          set(first.keys()) == {"reminder", "card", "title", "due_at", "repeat", "kind", "done"},
          sorted(first.keys()))

status, done = rpc("api_mark_done", {"secret": write_key, "reminder": reminder_id})
check("a reminder can be marked done", status == 200 and done.get("ok") is True, done)

# --------------------------------------------------- rule two: she can see it all
status, log = call("GET", "/rest/v1/activity?select=actor_name,action,detail&order=at.desc&limit=8", keeper)
entries = json.dumps(log)
check("everything the partner did is in the log she reads",
      "a connected system" in entries, entries[:120])
check("the log names the card the partner added", "Kinesitherapie" in entries)
check("and that a key was made in the first place", "api key was made" in entries)

# ------------------------------------------- rule one: one key, one household
status, other = call("POST", "/auth/v1/signup", body={})
other_helper = other["access_token"]
status, other_house = rpc("create_household",
                          {"household_name": "Somebody else, delete me", "helper_name": "Tom"},
                          other_helper)
status, refused = rpc("api_add_card", {"secret": write_key, "title": "reaching next door"})
before = len(json.dumps(refused))
status2, theirs = call("GET", "/rest/v1/records?select=title&household_id=eq." + other_house, other_helper)
check("a key cannot put anything in a different household",
      status2 == 200 and all("reaching next door" != r["title"] for r in theirs), theirs)

status, coming = rpc("api_upcoming", {"secret": write_key, "days": 60})
check("and cannot see a different household's reminders either",
      all("Somebody else" not in json.dumps(one) for one in (coming.get("upcoming") or [])))

# ------------------------------------- rule three: stopping sharing stops all
if consent_id:
    status, out = call("PATCH", "/rest/v1/consents?id=eq." + consent_id, keeper,
                       {"withdrawn_at": "2026-09-09T12:00:00Z"})
    check("she withdraws her consent", status in (200, 204), out)

    status, refused = rpc("api_add_card", {"secret": write_key, "title": "after she said stop"})
    check("a partner cannot write once she has stopped sharing",
          status >= 400 and says(refused, "stopped"), refused)

    status, still = rpc("api_upcoming", {"secret": read_key, "days": 30})
    check("reading is still allowed, because what is there is already there",
          status == 200 and still.get("ok") is True, still)

# --------------------------------------------------------- revoking a key
status, out = call("PATCH", "/rest/v1/api_keys?household_id=eq." + household, helper,
                   {"revoked_at": "2026-09-09T12:00:00Z"})
check("a helper can revoke the keys", status in (200, 204), out)
status, refused = rpc("api_ping", {"secret": write_key})
check("a revoked key stops working immediately",
      status >= 400 and says(refused, "revoked"), refused)

# ------------------------------------------------- the internals stay internal
for name, body in [("api_household", {"secret": "x", "needs": "read"}),
                   ("api_new_secret", {}),
                   ("api_hash", {"secret": "x"}),
                   ("log_api_use", {"household": household, "action": "added",
                                    "record": None, "detail": "written by a stranger"})]:
    status, out = rpc(name, body)
    check("the internal " + name + " is not reachable from outside",
          status in (401, 403, 404) or says(out, "PGRST202") or says(out, "permission denied"),
          str(status) + " " + json.dumps(out)[:70])

# ------------------------------------------------------------------- tidy up
status, gone = call("DELETE", "/rest/v1/households?id=eq." + household, helper)
check("the test household is deleted", status in (200, 204), gone)
status, gone = call("DELETE", "/rest/v1/households?id=eq." + other_house, other_helper)
check("and so is the second one", status in (200, 204), gone)
status, left = call("GET", "/rest/v1/api_keys?select=id", helper)
check("its keys went with it", status == 200 and left == [], left)

print("\n".join(results))
failed = [r for r in results if r.startswith("FAIL")]
print("\n%d passed, %d failed" % (len(results) - len(failed), len(failed)))
sys.exit(1 if failed else 0)
