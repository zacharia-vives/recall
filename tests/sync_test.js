/* The bin, marked done, missed, and the checklist.

   Four things that were reported as not working, and what each turned out to
   be:

   The bin. The card screen's delete button removed the card from the phone
   and never touched the row, so the next sync downloaded it straight back.
   Wiring it to the existing bin call would not have helped either, because
   the only update policy on records is "helpers change records", so the
   keeper's update is refused by the database. It needed a patch.

   Marked done. The tick on the phone was never sent anywhere, and the
   download skipped any reminder it already had, so a tick in the browser was
   never picked up. Neither direction worked.

   Missed. Not a separate bug. The keeper rolled due_at forward when something
   was ticked and the family side never did, so one row meant two different
   things and the two sides disagreed about which occurrence was being asked
   about. Both now use the same maths.

   The checklist. The x took an item off on one tap with nothing asked, and
   the read button was labelled "read the list" while reading only what was
   left. R3.4, R5.7.
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let pass = 0;
let fail = 0;

function check(what, ok, detail) {
  if (ok) pass += 1;
  else fail += 1;
  console.log((ok ? "PASS  " : "FAIL  ") + what +
    (detail ? "   " + String(detail).slice(0, 120) : ""));
  return ok;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const app = read("js/app.js");
const store = read("js/store.js");
const cloudSrc = read("js/cloud.js");
const page = read("index.html");
const dict = read("js/i18n.js");
const schema = read("db/schema.sql");
const patch = read("db/patch-005-keeper-bin.sql");

/* ------------------------------------------------------------- the bin */

check("the keeper's delete goes through the household, not straight to the phone",
  /async function binCard\(/.test(app) &&
  /cloud\.binAsMember\(/.test(app));

check("and it only forgets the card locally once that worked",
  (() => {
    const at = app.indexOf("async function binCard(");
    const body = app.slice(at, app.indexOf("\n}", at));
    const bin = body.indexOf("binAsMember");
    const del = body.lastIndexOf("deleteRecord");
    return bin >= 0 && del > bin;
  })(), "bin before delete");

check("a card that is not shared with anybody is still just removed",
  /if \(!isConfigured\(\) \|\| !id\) \{[\s\S]{0,160}deleteRecord/.test(app));

check("the delete button tells her when it could not be removed",
  /run\.deletefailed/.test(app) && /"run\.deletefailed"/.test(dict));

check("the client calls the database function rather than updating the row",
  /rpc\("bin_record"/.test(cloudSrc) && /rpc\("restore_record"/.test(cloudSrc));

/* --------------------------------------------- the bin needs the database */

check("the records update policy is still helpers only, so a patch was needed",
  /create policy "helpers change records"[\s\S]{0,140}is_helper/.test(schema));

check("the patch adds both functions as security definers",
  /create or replace function public\.bin_record\(p_record uuid\)/.test(patch) &&
  /create or replace function public\.restore_record\(p_record uuid\)/.test(patch) &&
  (patch.match(/security definer/g) || []).length === 2);

check("they check the caller is in the household before changing anything",
  (patch.match(/if not public\.is_member\(v_household\) then/g) || []).length === 2);

check("they touch deleted_at and nothing else",
  (() => {
    const updates = patch.match(/update public\.records\n\s*set ([^\n]+)/g) || [];
    return updates.length === 2 &&
      updates.every((u) => /set deleted_at =/.test(u) && !/,/.test(u));
  })(), (patch.match(/update public\.records/g) || []).length + " updates");

// Patch 004's lesson: Postgres grants execute to PUBLIC on a new function.
check("execute is revoked from public and anon before being granted",
  /revoke execute on function public\.bin_record\(uuid\) from public, anon/.test(patch) &&
  /revoke execute on function public\.restore_record\(uuid\) from public, anon/.test(patch));

// The mistake this test exists to stop: the patch first wrote an action name
// the activity table's check constraint does not allow, and a column that
// does not exist. Both would have thrown at runtime, not at review.
check("every action the patch writes is one the activity constraint allows",
  (() => {
    const allowed = (schema.match(/action\s+text not null check \(action in\s*\(([^)]+)\)/) || [])[1];
    if (!allowed) return false;
    const names = (allowed.match(/'([a-z_]+)'/g) || []).map((x) => x.replace(/'/g, ""));
    const written = (patch.match(/values \(v_household, auth\.uid\(\), '([a-z_]+)'/g) || [])
      .map((x) => x.match(/'([a-z_]+)'/)[1]);
    return written.length > 0 && written.every((w) => names.indexOf(w) >= 0);
  })(), (patch.match(/values \(v_household, auth\.uid\(\), '([a-z_]+)'/g) || []).length +
  " actions checked against the constraint");

check("and the columns it writes to activity are the ones the table has",
  (() => {
    const at = schema.indexOf("create table if not exists public.activity");
    const cols = schema.slice(at, schema.indexOf(");", at));
    const used = (patch.match(/insert into public\.activity \(([^)]+)\)/g) || [])
      .flatMap((x) => x.replace(/[\s\S]*\(/, "").split(",")
        .map((c) => c.replace(/[^a-z_]/g, "")))
      .filter(Boolean);
    return used.length > 0 && used.every((c) => new RegExp("\\n  " + c + "\\s").test(cols));
  })(), "actor_id not actor");

/* --------------------------------------------------- marked done, in both */

check("the keeper's tick is sent to the household",
  /async function pushDone\(/.test(app) && /cloud\.markDone\(/.test(app));

check("the mark done handler calls it",
  /markReminderDone\(doneIt\.dataset\.done\)[\s\S]{0,400}pushDone\(doneIt\.dataset\.done\)/.test(app));

check("the download no longer skips a reminder it already has",
  !/if \(reminders\.some\(\(r\) => r\.id === row\.id\)\) continue;/.test(app));

check("it takes the row when the done stamp or the time has changed",
  /const mine = reminders\.find\(\(r\) => r\.id === row\.id\);/.test(app) &&
  /mine\.lastDoneAt \|\| null\) === \(row\.done_at \|\| null\)/.test(app));

/* ------------------------------------------------------ missed, one model */

check("the keeper no longer moves the due time when something is ticked",
  !/reminder\.dueAt = new Date\(next\)\.toISOString\(\);/.test(store));

check("the keeper works out which occurrence is being asked about",
  /export function currentDue\(reminder\)/.test(store));

check("and does it with the same maths as the family side",
  (() => {
    const grab = (src) => {
      const at = src.indexOf("export function currentDue(reminder)");
      return at < 0 ? null : src.slice(at, src.indexOf("\n}", at))
        .replace(/\s+/g, " ").replace(/reminder\.dueAt|reminder\.due_at/g, "DUE");
    };
    const a = grab(store);
    const b = grab(cloudSrc);
    return a && b && a === b;
  })(), "identical after normalising the field name");

check("both sides call something done only for the occurrence it is asking about",
  /if \(done >= asking\) return "done";/.test(store) &&
  /if \(done >= asking\) return "done";/.test(cloudSrc));

check("what today shows is based on that occurrence too",
  /return currentDue\(r\) <= horizon;/.test(store));

/* The second order break. Nothing moves dueAt any more, so anywhere that
   showed it to her had to start asking which occurrence is current, or a
   daily reminder would have displayed the morning it was first set for. */

check("today shows the occurrence being asked about, not the stored time",
  /clockTime\(new Date\(store\.currentDue\(reminder\)\)/.test(app) &&
  /readableDate\(new Date\(store\.currentDue\(reminder\)\)/.test(app));

check("no screen prints the raw stored time for a reminder any more",
  !/readableDate\(reminder\.dueAt\)/.test(app) &&
  !/clockTime\(reminder\.dueAt\)/.test(app));

check("and reminders sort by that occurrence too",
  /currentDue\(a\) - currentDue\(b\)/.test(store));

/* ------------------------------------------------------------- checklist */

check("the list can be read out in full",
  /function wholeListSentence\(record\)/.test(app));

check("and what is still to do can be asked for on its own",
  /id="btn-say-left"/.test(app) && /"list\.readleft"/.test(dict));

check("the leftover button only appears when something is left",
  /\(record\.items \|\| \[\]\)\.some\(\(one\) => !one\.done\)[\s\S]{0,120}btn-say-left/.test(app));

check("the read button now reads the whole list, which is what it says",
  /record\.kind === "list"\s*\?\s*wholeListSentence\(record\)/.test(app));

check("pressing the cross asks before taking an item off",
  /t\("list\.removeask", \{ item:/.test(app) &&
  /"list\.removeask"/.test(dict) && /"list\.removeyes"/.test(dict));

check("and it asks before it changes the list, not after",
  (() => {
    const at = app.indexOf("drop.addEventListener");
    const body = app.slice(at, app.indexOf("saveRecord", at));
    return body.indexOf("list.removeask") >= 0 &&
      body.indexOf("list.removeask") < body.indexOf("items.splice");
  })(), "confirm precedes the splice");

check("the question names the item, so she knows which one she is losing",
  /list\.removeask[\s\S]{0,80}item: items\[at\]\.text/.test(app));

const langs = ["en", "nl", "fr"];
check("every new phrase is in all three languages",
  ["list.readleft", "list.itemdone", "list.removeask", "list.removeyes",
   "run.deletefailed"].every((key) => {
    const at = dict.indexOf('"' + key + '"');
    if (at < 0) return false;
    // Not indexOf("}"): a phrase with a {placeholder} in it closes a
    // brace before the entry does, which cut the block off before nl and
    // fr and failed a translation that was actually there. An entry ends
    // where the next one begins.
    const next = dict.indexOf("\n  \"", at + 1);
    const block = dict.slice(at, next < 0 ? dict.length : next);
    return langs.every((l) => block.indexOf(l + ': "') >= 0);
  }), "including the ones with a {placeholder}");

console.log("");
console.log(pass + " passed, " + fail + " failed");
process.exitCode = fail ? 1 : 0;
