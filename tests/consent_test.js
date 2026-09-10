/* Consent, and what taking it back actually does.

   The bug was a legal one rather than a broken button. withdrawConsent
   stamped withdrawn_at on the consent row and wrote a line in the activity
   log, and nothing read that column. is_helper() is true for anybody with a
   helper membership, so after a withdrawal the family could still read every
   card, every reminder, every letter Recall had read aloud and every
   photograph. The withdrawal was a note in a table.

   Article 7(3): as easy to take back as to give, and taking it back stops the
   processing. So the rule lives in the database next to the data, the family
   app shows a page that says so, and it can be given again.

   These tests cannot reach Postgres, so they check the patch says what it has
   to say and that both apps ask the right question. P19, R5.7.
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

// Line endings are normalised on the way in. Git checks these files out with
// CRLF on Windows, so a regex written against a newline stopped matching the
// moment the working tree was normalised, and two checks failed for a reason
// that had nothing to do with the code they were testing.
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

const gate = read("db/patch-006-consent-gate.sql");
const app = read("js/app.js");
const helper = read("js/helper.js");
const helperPage = read("helper.html");
const page = read("index.html");
const dict = read("js/i18n.js");

/* ------------------------------------------------------ the rule itself */

check("there is one function that says whether consent stands",
  /create or replace function public\.has_consent\(hh uuid\)/.test(gate));

check("and it reads the newest consent row, not just any row",
  /order by c\.given_at desc\s*\n\s*limit 1/.test(gate));

check("a household that was never asked counts as no",
  /coalesce\(\([\s\S]{0,300}\), false\)/.test(gate));

check("the keeper is told apart from the helper",
  /create or replace function public\.is_keeper\(hh uuid\)/.test(gate) &&
  /m\.role = 'keeper'/.test(gate));

check("the gate is written once, so a later policy cannot get it wrong",
  /create or replace function public\.may_see_cards\(hh uuid\)/.test(gate) &&
  /public\.is_keeper\(hh\)\s*\n\s*or \(public\.is_helper\(hh\) and public\.has_consent\(hh\)\)/.test(gate));

check("the keeper still reaches her own cards whatever she answered",
  /select public\.is_keeper\(hh\)/.test(gate));

/* -------------------------------------------- everything of hers is gated */

const gated = ["records", "reminders"];
gated.forEach((table) => {
  const at = gate.indexOf("on public." + table + ";");
  check("the " + table + " table is gated on consent",
    at >= 0 && /may_see_cards|has_consent/.test(
      gate.slice(gate.indexOf("-- ", at), gate.indexOf("-- ", at) + 1400)));
});

check("the photographs and documents are gated too, not just the cards",
  /create policy "household photos readable" on storage\.objects[\s\S]{0,200}may_see_cards/.test(gate) &&
  /create policy "household photos writable" on storage\.objects[\s\S]{0,220}may_see_cards/.test(gate));

check("a helper cannot change a card once consent is gone",
  /create policy "helpers change records"[\s\S]{0,220}has_consent\(household_id\)/.test(gate));

check("nor add a reminder",
  /create policy "helpers set reminders"[\s\S]{0,200}has_consent\(household_id\)/.test(gate));

/* --------------------------------------- but the withdrawal stays provable */

check("the keeper keeps reading the log, because it is the evidence",
  /create policy "members read the activity log"[\s\S]{0,140}is_member\(household_id\)/.test(gate));

check("and the row that records the stopping is not blocked by the stopping",
  /action in \('unlinked', 'linked'\)/.test(gate));

/* ----------------------------------------------- it is all or nothing */

check("the patch runs in a transaction, so a failure cannot strand a policy",
  /^\s*begin;/m.test(gate) && /commit;\s*$/.test(gate.trim()));

check("every dropped policy is created again in the same script",
  (() => {
    const dropped = (gate.match(/drop policy if exists "([^"]+)"/g) || [])
      .map((x) => x.match(/"([^"]+)"/)[1]);
    const made = (gate.match(/create policy "([^"]+)"/g) || [])
      .map((x) => x.match(/"([^"]+)"/)[1]);
    return dropped.length > 0 && dropped.every((d) => made.indexOf(d) >= 0);
  })(), (gate.match(/drop policy if exists/g) || []).length + " dropped, " +
  (gate.match(/create policy/g) || []).length + " created");

check("the new functions are kept away from the anonymous key",
  (() => {
    const names = ["is_keeper", "has_consent", "may_see_cards"];
    return names.every((n) => new RegExp(
      "revoke execute on function public\\." + n +
      "\\(uuid\\) from public, anon").test(gate));
  })(), "three revokes");

/* ------------------------------------------------- the keeper's controls */

check("taking it back no longer throws the household link away",
  (() => {
    const at = app.indexOf("async function stopSharing(");
    const body = app.slice(at, app.indexOf("\n}", at));
    return at >= 0 && body.indexOf("removeItem(HOUSEHOLD_KEY)") < 0;
  })(), "the link stays, the consent moves");

check("and it says so if the household could not be told",
  /share\.stopfailed/.test(app) && /"share\.stopfailed"/.test(dict));

check("she can give it again",
  /async function resumeSharing\(/.test(app) &&
  /recordConsent\(id, noticeVersion\(\)\)/.test(app));

check("there is a button for it, hidden until it is the useful one",
  /id="btn-share-again"[^>]*hidden/.test(page) &&
  /btn-share-again[\s\S]{0,120}resumeSharing/.test(app));

check("the sharing state asks the household rather than trusting this phone",
  /latestConsent\(id\)[\s\S]{0,120}withdrawn_at/.test(app));

check("only one of the two buttons shows at a time",
  /stop\.hidden = !sharing/.test(app) && /again\.hidden = sharing/.test(app));

/* ------------------------------------------------- the family's empty page */

check("the family app has a page for it",
  /id="s-withdrawn"/.test(helperPage) && /withdrawn: document\.getElementById\("s-withdrawn"\)/.test(helper));

check("it checks consent before it loads anything",
  (() => {
    const at = helper.indexOf("async function refresh()");
    const body = helper.slice(at, helper.indexOf("\n}", at));
    const asked = body.indexOf("consentStands");
    const loaded = body.indexOf("listRecords");
    return at >= 0 && asked >= 0 && loaded > asked;
  })(), "asked before loaded");

check("and loads nothing at all when it has been taken back",
  (() => {
    const at = helper.indexOf("async function refresh()");
    const body = helper.slice(at, helper.indexOf("\n}", at));
    const guard = body.indexOf("showPane(\"withdrawn\")");
    return guard >= 0 && /cards = \[\];[\s\S]{0,80}showPane\("withdrawn"\)/.test(body);
  })(), "no cards, no reminders, no counts");

check("the page says nothing has been deleted, because nothing has",
  /"hw\.body"/.test(dict) && /deleted/.test(helperPage));

check("it does not tell the family she has no cards, which would be untrue",
  (() => {
    const at = helper.indexOf("async function refresh()");
    const body = helper.slice(at, helper.indexOf("\n}", at));
    return body.indexOf("return;") < body.indexOf("renderCards");
  })(), "renderCards is never reached");

check("the family can check again without signing out",
  /id="btn-w-recheck"/.test(helperPage) &&
  /btn-w-recheck[\s\S]{0,140}refresh\(\)/.test(helper));

check("a dropped connection does not lock the family out on its own",
  (() => {
    const at = helper.indexOf("async function consentStands()");
    const body = helper.slice(at, helper.indexOf("\n}", at));
    return /catch[\s\S]{0,200}return true;/.test(body);
  })(), "the database is what withholds the data, not the page");

/* ------------------------------------------------------------- the words */

check("every new phrase is in all three languages",
  ["share.off", "share.againbtn", "share.againask", "share.againyes",
   "share.starting", "share.again", "share.againfailed", "share.stopfailed",
   "hw.title", "hw.body", "hw.how", "hw.recheck"].every((key) => {
    const at = dict.indexOf('"' + key + '"');
    if (at < 0) return false;
    const next = dict.indexOf("\n  \"", at + 1);
    const block = dict.slice(at, next < 0 ? dict.length : next);
    return ["en", "nl", "fr"].every((l) => block.indexOf(l + ': "') >= 0);
  }), "twelve phrases");

console.log("");
console.log(pass + " passed, " + fail + " failed");
process.exitCode = fail ? 1 : 0;
