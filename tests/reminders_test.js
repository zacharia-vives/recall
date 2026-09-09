// Is a reminder coming, missed, or done? Run with:  node tests/reminders_test.js
//
// This has its own test file because it is the question the family app exists
// to answer, and because it was wrong in a way nobody would notice by looking
// at it: the family side had no idea a reminder could repeat, so anything
// marked done once was reported as done for ever and could never turn up under
// Missed again. Her side worked it out per period; the two disagreed silently.
//
// The rule is read straight out of js/cloud.js rather than copied here, so a
// change to the app that breaks the rule fails this.

const fs = require("fs");
const path = require("path");

const root = path.dirname(__dirname);
const source = fs.readFileSync(path.join(root, "js", "cloud.js"), "utf8");

const from = source.indexOf("export function periodMs");
const to = source.indexOf("/* ---------------------------------------------------------------- activity */");
if (from < 0 || to < 0) {
  console.log("FAIL  could not find the reminder rule in js/cloud.js");
  process.exit(1);
}
const rule = source.slice(from, to).replace(/export function/g, "function");
const { reminderStatus, currentDue, periodMs } =
  new Function(rule + "; return { reminderStatus, currentDue, periodMs };")();

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const now = Date.now();
const at = (offset) => new Date(now + offset).toISOString();

const cases = [
  // a one off
  ["due in two hours", { due_at: at(2 * HOUR), repeat: "none", done_at: null }, "coming"],
  ["due twenty minutes ago, inside the grace", { due_at: at(-20 * MINUTE), repeat: "none", done_at: null }, "coming"],
  ["due three hours ago, nobody did it", { due_at: at(-3 * HOUR), repeat: "none", done_at: null }, "missed"],
  ["due three hours ago, marked done", { due_at: at(-3 * HOUR), repeat: "none", done_at: at(-2 * HOUR) }, "done"],

  // the one that was broken: something that comes back every day
  ["daily, set three weeks ago, done yesterday",
   { due_at: at(-21 * DAY - 3 * HOUR), repeat: "daily", done_at: at(-DAY) }, "missed"],
  ["daily, done ten minutes ago",
   { due_at: at(-21 * DAY - 3 * HOUR), repeat: "daily", done_at: at(-10 * MINUTE) }, "done"],
  ["daily, never done, today's time has passed",
   { due_at: at(-21 * DAY - 3 * HOUR), repeat: "daily", done_at: null }, "missed"],
  // Never done at all, so yesterday's time went by without anybody doing it.
  // That is missed, even though today's time is still three hours off.
  ["daily, never done, and yesterday's time went by",
   { due_at: at(-21 * DAY + 3 * HOUR), repeat: "daily", done_at: null }, "missed"],

  // twice a day and weekly use the same rule
  // The next one came due half an hour ago, which is inside the grace, so it
  // is coming rather than missed. The one done seven hours ago was the one
  // before it.
  ["twice daily, the next one came due half an hour ago",
   { due_at: at(-7 * DAY - 30 * MINUTE), repeat: "twice_daily", done_at: at(-7 * HOUR) }, "coming"],
  ["weekly, done two days ago", { due_at: at(-30 * DAY), repeat: "weekly", done_at: at(-2 * DAY) }, "done"],
  ["weekly, done nine days ago", { due_at: at(-30 * DAY), repeat: "weekly", done_at: at(-9 * DAY) }, "missed"]
];

const results = [];
cases.forEach(([name, reminder, want]) => {
  const got = reminderStatus(reminder);
  results.push({ name, want, got, ok: got === want });
});

// The period table has to match the one on her side, or the two halves of the
// app disagree about when the next time is. Her function is lifted out and run
// rather than pattern matched, so this compares behaviour and not spelling.
const storeSource = fs.readFileSync(path.join(root, "js", "store.js"), "utf8");
const herFrom = storeSource.indexOf("export function periodMs");
const herTo = storeSource.indexOf("}", storeSource.indexOf("return 0;", herFrom)) + 1;

if (herFrom < 0 || herTo <= herFrom) {
  results.push({ name: "the keeper's period table could be read", want: "found", got: "not found", ok: false });
} else {
  const herRule = storeSource.slice(herFrom, herTo).replace("export function", "function");
  const herPeriod = new Function(herRule + "; return periodMs;")();
  ["none", "daily", "twice_daily", "weekly"].forEach((repeat) => {
    const mine = periodMs(repeat);
    const hers = herPeriod(repeat);
    results.push({
      name: "the period for " + repeat + " matches the keeper's side",
      want: String(mine), got: String(hers), ok: mine === hers
    });
  });
}

results.forEach((row) => {
  console.log((row.ok ? "PASS  " : "FAIL  ") + row.name.padEnd(50) +
    (row.ok ? "" : "   want=" + row.want + " got=" + row.got));
});
const failed = results.filter((row) => !row.ok).length;
console.log("\n" + (results.length - failed) + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);
