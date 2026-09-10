"""End to end check against the live Recall project.

Two separate anonymous sessions. One creates a household, a card and a photo.
The other must see nothing of it, until it claims a device link and becomes the
keeper of that household. Everything is cleaned up at the end.
"""

import json
import random
import string
import urllib.error
import urllib.request

URL = "https://xoczuvvxengzkcxybfbx.supabase.co"
ANON = ("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6In"
        "hvY3p1dnZ4ZW5nemtjeHliZmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NDM5ODcs"
        "ImV4cCI6MjEwNDQxOTk4N30.nJP2cRyzwP7YunkTremJc6ioYauadBpYk0ptkgwCmpo")

# A fresh pair of link codes every run.
#
# These used to be the literals TESTAB and TESTCD. device_links.code is
# unique, so the moment a run did not reach its own cleanup the next run died
# on a duplicate key before reaching a single check, and the whole suite
# looked broken when nothing about the security it tests had changed. Random
# codes mean a leftover row can never block a run again.
def fresh_code():
    return "T" + "".join(random.choice(string.ascii_uppercase)
                         for _ in range(5))


CODE_A = fresh_code()
CODE_B = fresh_code()

passed = []
failed = []


def call(method, path, token=None, body=None, raw=None, ctype="application/json", prefer=None):
    req = urllib.request.Request(URL + path, method=method)
    req.add_header("apikey", ANON)
    req.add_header("Authorization", "Bearer " + (token or ANON))
    if prefer:
        req.add_header("Prefer", prefer)
    data = None
    if raw is not None:
        data = raw
        req.add_header("Content-Type", ctype)
    elif body is not None:
        data = json.dumps(body).encode()
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, data, timeout=30) as r:
            text = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(text) if text.strip().startswith(("{", "[", '"')) else text)
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", "replace")
        return e.code, (json.loads(text) if text.strip().startswith(("{", "[", '"')) else text)


def check(name, ok, detail=""):
    (passed if ok else failed).append(name)
    print(("PASS  " if ok else "FAIL  ") + name + ("   " + str(detail)[:110] if detail else ""))


def anon_session(label):
    status, body = call("POST", "/auth/v1/signup", body={})
    token = body.get("access_token") if isinstance(body, dict) else None
    uid = body.get("user", {}).get("id") if isinstance(body, dict) else None
    check("anonymous session for " + label, bool(token and uid), status)
    return token, uid


print("=== sessions ===")
a_token, a_uid = anon_session("A, the helper")
b_token, b_uid = anon_session("B, a stranger")

print("\n=== A builds a household ===")
status, hh = call("POST", "/rest/v1/rpc/create_household", a_token,
                  {"household_name": "Test household", "helper_name": "Tester A"})
check("A creates a household", status == 200 and isinstance(hh, str), hh)

status, mine = call("GET", "/rest/v1/memberships?select=role,display_name,household_id", a_token)
check("A is a helper in it", status == 200 and len(mine) == 1 and mine[0]["role"] == "helper", mine)

# What the family app does next, and the reason this suite now has to do it
# too. Since patch 006 the consent gate governs writes as well as reads, so a
# household with no consent row is one where a helper cannot add anything.
# helper.js records a consent row the moment a household is created, so this
# mirrors the app rather than testing a state the app never produces.
#
# It also puts the finding in front of anybody reading this file: the row is
# written by the FAMILY, before the keeper has been asked anything. See
# db/patch-007-consent-authorship.sql for the fix and the argument.
status, out = call("POST", "/rest/v1/consents", a_token,
                   {"household_id": hh, "notice_version": "2026-09-08/en",
                    "explained_by": a_uid})
check("a consent row exists, as the family app writes one", status in (200, 201), out)

status, rec = call("POST", "/rest/v1/records", a_token,
                   {"household_id": hh, "created_by": a_uid, "kind": "letter",
                    "title": "A private card", "spoken_text": "This is private."},
                   prefer="return=representation")
rec_id = rec[0]["id"] if status in (200, 201) and isinstance(rec, list) and rec else None
check("A adds a card", bool(rec_id), rec if not rec_id else rec_id)

status, rows = call("GET", "/rest/v1/records?select=id,title", a_token)
check("A sees exactly one card", status == 200 and len(rows) == 1, rows)

status, out = call("POST", "/storage/v1/object/photos/%s/%s.jpg" % (hh, rec_id), a_token,
                   raw=b"not really a jpeg, but it is bytes", ctype="image/jpeg")
check("A uploads a photo into its own folder", status in (200, 201), out)

status, signed = call("POST", "/storage/v1/object/sign/photos/%s/%s.jpg" % (hh, rec_id),
                      a_token, {"expiresIn": 600})
check("A gets a signed link for it", status == 200 and "signedURL" in str(signed), signed)

print("\n=== B must see nothing ===")
status, rows = call("GET", "/rest/v1/records?select=id,title", b_token)
check("B sees no cards at all", status == 200 and rows == [], rows)

status, rows = call("GET", "/rest/v1/households?select=id,name", b_token)
check("B sees no households", status == 200 and rows == [], rows)

status, rows = call("GET", "/rest/v1/activity?select=id,detail", b_token)
check("B sees no activity log", status == 200 and rows == [], rows)

status, out = call("POST", "/rest/v1/records", b_token,
                   {"household_id": hh, "created_by": b_uid, "kind": "letter", "title": "intrusion"})
check("B cannot write into the household", status == 403 or (isinstance(out, dict) and out.get("code") == "42501"), out)

status, out = call("GET", "/storage/v1/object/photos/%s/%s.jpg" % (hh, rec_id), b_token)
check("B cannot read the photo", status in (400, 403, 404), out)

status, out = call("POST", "/rest/v1/rpc/claim_keeper_device", b_token, {"link_code": "ZZZZZZ"})
check("B cannot claim a made up code", status >= 400, out)

print("\n=== the keeper phone linking flow ===")
status, out = call("POST", "/rest/v1/device_links", a_token,
                   {"code": CODE_A, "household_id": hh, "created_by": a_uid,
                    "display_name": "the keeper",
                    "expires_at": "2030-01-01T00:00:00Z"})
check("A makes a link code", status in (200, 201), out)

status, claimed = call("POST", "/rest/v1/rpc/claim_keeper_device", b_token, {"link_code": CODE_A.lower()})
check("B claims it, case insensitively", status == 200 and claimed == hh, claimed)

status, rows = call("GET", "/rest/v1/records?select=id,title", b_token)
check("B now sees the card, as the keeper", status == 200 and len(rows) == 1, rows)

status, rows = call("GET", "/rest/v1/memberships?select=role", b_token)
roles = sorted(r["role"] for r in rows) if status == 200 else []
check("B is the keeper, A is the helper", roles == ["helper", "keeper"], roles)

status, out = call("POST", "/rest/v1/records", b_token,
                   {"household_id": hh, "created_by": b_uid, "kind": "letter", "title": "from the phone"},
                   prefer="return=representation")
check("the keeper can add a card", status in (200, 201), out if status >= 400 else "ok")

status, out = call("PATCH", "/rest/v1/records?id=eq." + str(rec_id), b_token, {"title": "keeper edit"})
status2, after = call("GET", "/rest/v1/records?select=title&id=eq." + str(rec_id), a_token)
unchanged = status2 == 200 and after and after[0]["title"] == "A private card"
check("the keeper cannot edit a card", unchanged, after)

status, out = call("POST", "/rest/v1/rpc/claim_keeper_device", b_token, {"link_code": CODE_A.lower()})
check("a used code cannot be claimed twice", status >= 400, out)

print("\n=== a helper must not be demoted by claiming a code ===")
status, out = call("POST", "/rest/v1/device_links", a_token,
                   {"code": CODE_B, "household_id": hh, "created_by": a_uid,
                    "display_name": "a second phone",
                    "expires_at": "2030-01-01T00:00:00Z"})
check("A makes a second code", status in (200, 201), out)

# The bug Luke found: claiming a code in a browser that was already signed in
# as family turned that family member into the keeper, so they lost the family
# app. Fixed in db/patch-001-roles.sql, which still has to be run by hand, so
# until it is run this is the one check that fails.
call("POST", "/rest/v1/rpc/claim_keeper_device", a_token, {"link_code": CODE_B.lower()})
status, rows = call("GET", "/rest/v1/memberships?select=role&user_id=eq." + str(a_uid), a_token)
role = rows[0]["role"] if status == 200 and rows else "?"
check("A is still the helper afterwards", role == "helper", role)

print("\n=== clean up ===")
call("DELETE", "/storage/v1/object/photos/%s/%s.jpg" % (hh, rec_id), a_token)
status, out = call("DELETE", "/rest/v1/households?id=eq." + hh, a_token)
check("A deletes the household again", status in (200, 204), out)
status, rows = call("GET", "/rest/v1/records?select=id", a_token)
check("everything cascaded away", status == 200 and rows == [], rows)

print("\n%d passed, %d failed" % (len(passed), len(failed)))
if failed:
    print("failed:", ", ".join(failed))
