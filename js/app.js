// Recall - main script. Four screens, switched on the hash, so the app works
// from a plain static host with no server and no build step.

import * as store from "./store.js?v=17";
import * as speech from "./speech.js?v=17";
import * as camera from "./camera.js?v=17";
import * as ocr from "./ocr.js?v=17";
import { isConfigured } from "./config.js?v=17";
import * as install from "./install.js?v=17";
import * as lock from "./lock.js?v=17";

const HOUSEHOLD_KEY = "recall.householdId";

const KINDS = {
  letter: { label: "Letter", badge: "L" },
  person: { label: "Person", badge: "P" },
  place: { label: "Place", badge: "●" }
};

const screens = {
  stuck: document.getElementById("screen-stuck"),
  welcome: document.getElementById("screen-welcome"),
  today: document.getElementById("screen-today"),
  records: document.getElementById("screen-records"),
  record: document.getElementById("screen-record"),
  capture: document.getElementById("screen-capture"),
  new: document.getElementById("screen-new")
};

const video = document.getElementById("video");
const toast = document.getElementById("toast");

let records = [];
let reminders = [];
let pendingPhoto = null; // the blob we just took, waiting to be saved
let pendingText = "";    // the text we read off it, also waiting

const WELCOME_KEY = "recall.welcomed";

/* helpers */

function esc(text) {
  return String(text === undefined || text === null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function say(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function readableDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }) + " at " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function isDueSoon(record) {
  if (!record.happensAt) return false;
  const when = new Date(record.happensAt).getTime();
  const now = Date.now();
  return when > now - 12 * 3600 * 1000 && when < now + 48 * 3600 * 1000;
}

function sentenceFor(record) {
  if (record.spokenText) return record.spokenText;
  const parts = [record.title];
  if (record.happensAt) parts.push(readableDate(record.happensAt));
  if (record.place) parts.push(record.place);
  return parts.filter(Boolean).join(". ") + ".";
}

/* rendering */

function cardHtml(record, extraClass) {
  const kind = KINDS[record.kind] || KINDS.letter;
  const bits = [];
  if (record.happensAt) bits.push(readableDate(record.happensAt));
  if (record.place) bits.push(record.place);
  if (bits.length === 0 && record.people && record.people.length) bits.push(record.people.join(", "));

  return (
    '<button class="card ' + (extraClass || "") + '" data-open="' + esc(record.id) + '">' +
      '<span class="thumb" data-thumb="' + esc(record.id) + '">' + kind.badge + "</span>" +
      "<span>" +
        '<span class="title">' + esc(record.title) + "</span>" +
        '<span class="meta">' + esc(bits.join(" · ")) + "</span>" +
      "</span>" +
    "</button>"
  );
}

async function paintThumbs(container) {
  const spots = container.querySelectorAll("[data-thumb]");
  for (const spot of spots) {
    const record = records.find((r) => r.id === spot.dataset.thumb);
    if (!record || !record.hasPhoto) continue;
    const url = await store.photoUrl(record.id);
    if (url) spot.innerHTML = '<img src="' + url + '" alt="">';
  }
}

// R3.2. The today screen is reminders first, because that is what the keeper
// opens the app for, and every row carries its own two buttons.
function todayItemHtml(reminder, record) {
  const kind = KINDS[record.kind] || KINDS.letter;
  const status = store.reminderStatus(reminder);
  const spoken = reminder.spokenText || record.spokenText || record.title;

  return '<div class="today-item ' + (status === "missed" ? "missed" : "") + '">' +
    '<button class="today-main" data-open="' + esc(record.id) + '">' +
      '<span class="thumb" data-thumb="' + esc(record.id) + '">' + kind.badge + "</span>" +
      "<span>" +
        '<span class="title">' + esc(record.title) + "</span>" +
        '<span class="meta">' + esc(readableDate(reminder.dueAt)) + "</span>" +
        (status === "missed" ? '<span class="status">this one has passed</span>' : "") +
      "</span>" +
    "</button>" +
    '<div class="today-acts">' +
      '<button class="big" type="button" data-say="' + esc(spoken) + '">Read it out loud</button>' +
      '<button class="big ghost" type="button" data-done="' + esc(reminder.id) + '">Mark done</button>' +
    "</div>" +
  "</div>";
}

async function renderToday() {
  const dateEl = document.getElementById("today-date");
  dateEl.textContent = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long"
  });

  const list = document.getElementById("today-list");
  const due = await store.dueSoon();

  const rows = [];
  const covered = {};
  due.forEach((reminder) => {
    const record = records.find((r) => r.id === reminder.recordId);
    if (!record) return;
    covered[record.id] = true;
    rows.push(todayItemHtml(reminder, record));
  });

  // Appointments that are coming up but that nobody set a reminder for still
  // belong here, otherwise the screen lies.
  records.filter((r) => isDueSoon(r) && !covered[r.id]).forEach((r) => {
    rows.push(cardHtml(r, "due"));
  });

  if (rows.length === 0) {
    list.innerHTML =
      '<p class="empty">Nothing is due today or tomorrow.<br>' +
      "Point the camera at a letter to add something.</p>";
    return;
  }
  list.innerHTML = rows.join("");
  paintThumbs(list);
}

function renderRecords(filter) {
  const list = document.getElementById("records-list");
  const needle = (filter || "").trim().toLowerCase();
  const rows = needle
    ? records.filter((r) =>
        (r.title + " " + (r.people || []).join(" ") + " " + (r.tags || []).join(" ") + " " + (r.place || ""))
          .toLowerCase()
          .includes(needle))
    : records;

  if (rows.length === 0) {
    list.innerHTML = '<p class="empty">Nothing found.</p>';
    return;
  }
  list.innerHTML = rows.map((r) => cardHtml(r)).join("");
  paintThumbs(list);
}

async function renderRecord(id) {
  const record = records.find((r) => r.id === id);
  const box = document.getElementById("record-detail");
  if (!record) {
    box.innerHTML = '<p class="empty">This card does not exist any more.</p>';
    return;
  }
  document.getElementById("record-title").textContent = record.title;

  const mine = reminders.filter((r) => r.recordId === record.id);
  const reminder = mine.length ? mine[0] : null;
  const repeatWords = {
    none: "once", daily: "every day",
    twice_daily: "twice a day", weekly: "every week"
  };

  const rows = [
    ["Kind", (KINDS[record.kind] || KINDS.letter).label],
    ["Who", (record.people || []).join(", ")],
    ["Where", record.place],
    ["When", readableDate(record.happensAt)],
    ["Tags", (record.tags || []).join(", ")],
    ["Reminder", reminder
      ? readableDate(reminder.dueAt) + ", " + (repeatWords[reminder.repeat] || "once")
      : ""],
    ["Last done", reminder && reminder.lastDoneAt ? readableDate(reminder.lastDoneAt) : ""]
  ].filter((row) => row[1]);

  box.innerHTML =
    (record.hasPhoto ? '<img class="detail-photo" id="detail-photo" alt="Photo on this card">' : "") +
    '<div class="fields">' +
      rows.map((row) =>
        '<div class="row"><span class="k">' + esc(row[0]) + '</span><span class="v">' + esc(row[1]) + "</span></div>"
      ).join("") +
    "</div>" +
    '<div class="actions">' +
      '<button class="big" type="button" id="btn-say">Read it out loud</button>' +
      (reminder && store.reminderStatus(reminder) !== "done"
        ? '<button class="big ghost" type="button" data-done="' + esc(reminder.id) +
          '">Mark done</button>'
        : "") +
      '<button class="big danger" type="button" id="btn-del">Delete this card</button>' +
    "</div>" +
    '<p class="disclaimer">Recall is not a medical device. Keep the paper letter, ' +
    "and always follow what your doctor or pharmacist tells you.</p>";

  if (record.hasPhoto) {
    const url = await store.photoUrl(record.id);
    if (url) document.getElementById("detail-photo").src = url;
  }

  document.getElementById("btn-say").addEventListener("click", () => {
    if (speech.speaking()) {
      speech.stop();
      return;
    }
    if (!speech.speak(sentenceFor(record))) say("This browser cannot read out loud.");
  });

  document.getElementById("btn-del").addEventListener("click", async () => {
    const sure = await ask(
      "This card and its photo will be deleted. Are you sure?",
      "Yes, delete it"
    );
    if (!sure) return;
    await store.deleteRecord(record.id);
    records = await store.allRecords();
    say("The card is deleted.");
    go("#/records");
  });
}

/* first run */

function welcomed() {
  try {
    return window.localStorage.getItem(WELCOME_KEY) === "yes";
  } catch (err) {
    return true;
  }
}

const WELCOME_SPOKEN =
  "This is Recall. Recall keeps the things you would hate to lose. " +
  "Point the camera at a letter. Recall makes the print bigger and reads it out loud, " +
  "and then it keeps it for you. Everything stays on this phone until someone in your " +
  "family links it. Recall is not a medical device. Keep your papers, and always follow " +
  "what your doctor or pharmacist tells you.";

function finishWelcome() {
  try {
    window.localStorage.setItem(WELCOME_KEY, "yes");
  } catch (err) {
    // nothing to do, they will see it again next time
  }
  speech.stop();
  go("#/today");
}

/* the household this phone belongs to, if a helper ever linked it */

function linkedHousehold() {
  try {
    return window.localStorage.getItem(HOUSEHOLD_KEY);
  } catch (err) {
    return null;
  }
}

// Requirement P12: the keeper reads the names of everyone who can see the cards,
// on their own screen, in their own size. Never a count, never hidden away.
async function showWhoHasAccess() {
  const line = document.getElementById("access-line");
  const id = linkedHousehold();
  if (!isConfigured() || !id) {
    line.hidden = true;
    return;
  }
  try {
    const cloud = await import("./cloud.js?v=17");
    const people = await cloud.members(id);
    const helpers = people.filter((m) => m.role === "helper").map((m) => m.display_name || "family");
    if (helpers.length === 0) {
      line.hidden = true;
      return;
    }
    const names = helpers.length === 1
      ? helpers[0]
      : helpers.slice(0, -1).join(", ") + " and " + helpers[helpers.length - 1];
    line.textContent = names + " can see your cards.";
    line.hidden = false;
  } catch (err) {
    line.hidden = true;
  }
}

// R8.5. Recall's own question box. It reads the question out loud as well,
// because the person answering it may not be able to read it.
function ask(question, yesLabel) {
  const box = document.getElementById("ask");
  document.getElementById("ask-text").textContent = question;
  const yes = document.getElementById("ask-yes");
  const no = document.getElementById("ask-no");
  yes.textContent = yesLabel || "Yes";

  speech.speak(question);

  return new Promise((resolve) => {
    const finish = (answer) => {
      speech.stop();
      yes.removeEventListener("click", onYes);
      no.removeEventListener("click", onNo);
      box.removeEventListener("cancel", onNo);
      box.close();
      resolve(answer);
    };
    const onYes = () => finish(true);
    const onNo = () => finish(false);
    yes.addEventListener("click", onYes);
    no.addEventListener("click", onNo);
    box.addEventListener("cancel", onNo);
    box.showModal();
  });
}

/* the lock, R7.3 and R7.4 */

let typed = "";

// Locking happens when the app is opened, and when family asks for it. It
// deliberately does not happen on a timer: she may put the phone down in the
// middle of reading a letter and pick it up again, and a phone that locks
// itself while she reads is a phone she stops using.
function showLock() {
  typed = "";
  document.body.classList.add("is-locked");
  const box = document.getElementById("lockscreen");
  box.hidden = false;
  document.getElementById("btn-face").hidden = !lock.faceReady();
  drawDots();
  speech.stop();
  camera.stop(video);
}

function hideLock() {
  typed = "";
  document.body.classList.remove("is-locked");
  document.getElementById("lockscreen").hidden = true;
  document.getElementById("rescue-msg").hidden = true;
}

function drawDots() {
  const want = lock.codeLength() || 4;
  let out = "";
  for (let i = 0; i < want; i += 1) out += i < typed.length ? "\u25CF" : "\u25CB";
  document.getElementById("lock-dots").textContent = out;
}

function lockSay(text) {
  document.getElementById("lock-say").textContent = text;
}

async function pressKey(key) {
  if (key === "back") {
    typed = typed.slice(0, -1);
    drawDots();
    return;
  }
  if (key === "clear") {
    typed = "";
    drawDots();
    lockSay("Type your numbers.");
    return;
  }

  if (typed.length >= lock.codeLength()) return;
  typed += key;
  drawDots();

  if (typed.length < lock.codeLength()) return;

  const ok = await lock.checkCode(typed);
  if (ok) {
    hideLock();
    lockSay("Type your numbers.");
    return;
  }
  typed = "";
  drawDots();
  lockSay("That is not it. Try again, or ask your family.");
}

async function unlockWithFace() {
  try {
    const ok = await lock.checkFace();
    if (ok) hideLock();
    else lockSay("That did not work. Type your numbers instead.");
  } catch (err) {
    lockSay("Face ID did not work. Type your numbers instead.");
  }
}

// R7.5. There has to be a way back in that does not depend on her memory. A
// fresh phone code from the family app both unlocks the phone and takes the
// numbers off it, and only family can make one of those.
async function rescueWithCode(event) {
  event.preventDefault();
  const msg = document.getElementById("rescue-msg");
  const code = document.getElementById("rescue-code").value.trim();
  msg.hidden = false;
  msg.textContent = "Checking the code.";

  if (!isConfigured()) {
    msg.textContent = "This phone is not linked to a family, so there is no code to check.";
    return;
  }

  try {
    const cloud = await import("./cloud.js?v=17");
    const id = await cloud.claimDeviceLink(code);
    window.localStorage.setItem(HOUSEHOLD_KEY, id);
    lock.clearLock();
    hideLock();
    say("The phone is unlocked and the code is off. Set a new one in the help screen.");
    await showWhoHasAccess();
    await syncHousehold({ loud: true });
  } catch (err) {
    msg.textContent = "That code did not work: " + (err.message || err);
  }
}

/* the family side of the lock, in the help screen */

async function drawLockSettings() {
  const state = document.getElementById("lock-state");
  const faceOn = document.getElementById("btn-face-on");
  const faceOff = document.getElementById("btn-face-off");
  const lockNow = document.getElementById("btn-lock-now");
  const lockOff = document.getElementById("btn-lock-off");

  const on = lock.locked();
  const canFace = await lock.faceAvailable();

  state.textContent = on
    ? "This phone asks for " + lock.codeLength() + " numbers when Recall is opened" +
      (lock.faceReady() ? ", and Face ID works as well." : ".")
    : "This phone asks for nothing. Recall opens straight away.";

  faceOn.hidden = !(on && canFace && !lock.faceReady());
  faceOff.hidden = !(on && lock.faceReady());
  lockNow.hidden = !on;
  lockOff.hidden = !on;
}

async function saveCode(event) {
  event.preventDefault();
  const msg = document.getElementById("lock-msg");
  const one = document.getElementById("new-code");
  const two = document.getElementById("new-code-2");
  msg.hidden = false;

  if (one.value !== two.value) {
    msg.textContent = "The two do not match.";
    return;
  }
  try {
    await lock.setCode(one.value);
    one.value = "";
    two.value = "";
    msg.textContent = "Done. Recall will ask for those numbers next time it opens.";
    await drawLockSettings();
  } catch (err) {
    msg.textContent = err.message || String(err);
  }
}

/* add to home screen, N8 */

const INSTALL_KEY = "recall.installAsked";

function askedAboutInstall() {
  try {
    return window.localStorage.getItem(INSTALL_KEY) === "yes";
  } catch (err) {
    return true;
  }
}

function rememberInstallAsked() {
  try {
    window.localStorage.setItem(INSTALL_KEY, "yes");
  } catch (err) {
    // nothing to do
  }
}

// Shown on the today screen, and pushed harder right after linking, because
// that is the one moment somebody competent is holding the phone.
function showInstallOffer(force) {
  const box = document.getElementById("install-box");
  const text = document.getElementById("install-text");
  const button = document.getElementById("btn-install");
  if (!install.worthAsking() || (askedAboutInstall() && !force)) {
    box.hidden = true;
    return;
  }

  if (install.canPrompt()) {
    text.textContent = "Keep Recall on your home screen, so it is one tap away.";
    button.hidden = false;
  } else {
    // iPhone, where there is no prompt to offer, only instructions.
    text.textContent = "Keep Recall on the home screen. " + install.iphoneSteps();
    button.hidden = true;
  }
  box.hidden = false;
}

// R6.3. The helper does this once, on this phone, with a code from their own.
async function linkThisPhone(event) {
  event.preventDefault();
  const code = document.getElementById("link-code").value.trim();
  const msg = document.getElementById("link-msg");
  msg.hidden = false;
  msg.textContent = "One moment.";
  try {
    const cloud = await import("./cloud.js?v=17");
    const id = await cloud.claimDeviceLink(code);
    window.localStorage.setItem(HOUSEHOLD_KEY, id);
    msg.textContent = "This phone is linked. Fetching the family cards.";
    await showWhoHasAccess();
    await syncHousehold({ loud: true });
    msg.textContent = "This phone is linked. Family can add cards now.";
    showInstallOffer(true);
  } catch (err) {
    msg.textContent = "That code did not work: " + (err.message || err);
  }
}

/* syncing with the household, once a helper has linked this phone (step 5c) */

async function syncHousehold(options) {
  const id = linkedHousehold();
  if (!isConfigured() || !id) return false;

  const loud = Boolean(options && options.loud);
  let changed = false;
  let problem = null;

  let cloud;
  try {
    cloud = await import("./cloud.js?v=17");
  } catch (err) {
    if (loud) say("Could not reach the family cards.");
    return false;
  }

  // Down first. This is the half the user notices, so it must never be blocked
  // by a problem with something sitting on this phone.
  let remote = null;
  try {
    remote = await cloud.listRecords(id, false);
    for (const row of remote) {
      if (records.some((r) => r.id === row.id)) continue;
      try {
        await store.saveRecord({
          id: row.id,
          kind: row.kind,
          title: row.title,
          people: row.people || [],
          place: row.place || "",
          happensAt: row.happens_at || "",
          tags: row.tags || [],
          spokenText: row.spoken_text || "",
          ocrText: row.ocr_text || "",
          hasPhoto: Boolean(row.photo_path),
          photoPath: row.photo_path || "",
          createdAt: row.created_at,
          cloudAt: new Date().toISOString()
        });
        changed = true;
      } catch (err) {
        problem = err;
        continue;
      }
      // A photo that will not download must not cost us the card itself.
      if (row.photo_path) {
        try {
          const link = await cloud.photoLink(row.photo_path);
          if (link) {
            const blob = await fetch(link).then((r) => r.blob());
            await store.savePhoto(row.id, blob);
          }
        } catch (err) {
          problem = err;
        }
      }
    }
  } catch (err) {
    problem = err;
  }

  // The download only ever added. A card the family moved to the bin stayed on
  // the phone for ever, which is the opposite of what the bin is for. Only do
  // this when the list actually arrived, otherwise a dropped connection would
  // look like everything was deleted.
  if (remote) {
    const stillThere = {};
    remote.forEach((row) => {
      stillThere[row.id] = true;
    });
    for (const local of records) {
      if (!local.cloudAt || local.example) continue;
      if (stillThere[local.id]) continue;
      try {
        await store.deleteRecord(local.id);
        changed = true;
      } catch (err) {
        problem = err;
      }
    }
  }

  try {
    const remoteReminders = await cloud.listReminders(id);
    for (const row of remoteReminders) {
      if (reminders.some((r) => r.id === row.id)) continue;
      try {
        await store.saveReminder({
          id: row.id,
          recordId: row.record_id,
          dueAt: row.due_at,
          repeat: row.repeat,
          spokenText: row.spoken_text || "",
          lastDoneAt: row.done_at || null
        });
        changed = true;
      } catch (err) {
        problem = err;
      }
    }
  } catch (err) {
    problem = err;
  }

  // Up second, one card at a time, and never the example cards: they are ours,
  // not the household's, and nobody wants three fake cards in the family app.
  for (const record of records) {
    if (record.cloudAt || record.example) continue;
    try {
      // The photo goes up first, so its path can travel with the card itself.
      // The old order uploaded the picture and then tried to attach it with an
      // update, which the database refuses from a keeper phone, so the family
      // got the card and the picture stayed on the phone.
      if (record.hasPhoto && !record.photoPath) {
        const url = await store.photoUrl(record.id);
        if (url) {
          const blob = await fetch(url).then((r) => r.blob());
          record.photoPath = await cloud.uploadPhoto(id, record.id, blob);
        }
      }
      await cloud.pushRecord(id, record);
      record.cloudAt = new Date().toISOString();
      await store.saveRecord(record);
      changed = true;
    } catch (err) {
      problem = err;
    }
  }

  records = await store.allRecords();
  reminders = await store.allReminders();

  // The old version fetched the cards and then never redrew the screen, so
  // they only appeared the next time the app was opened.
  const hash = location.hash || "#/today";
  const busyScreen = hash === "#/capture" || hash === "#/new";
  if (changed && !busyScreen) await route();

  if (problem) {
    window.console.error("Recall sync problem:", problem);
    if (loud) say("Something did not sync: " + (problem.message || problem));
  } else if (loud) {
    say(changed ? "Up to date, new cards arrived." : "Up to date, nothing new.");
  }
  return changed;
}

/* screens */

// N11. The camera screen is sized to the device instead of to a guess, so the
// picture is as big as this phone allows and nothing falls below the fold.
function fitCameraScreen() {
  const screen = screens.capture;
  if (!screen || screen.hidden) return;

  const bar = document.querySelector(".topbar");
  const tabs = document.querySelector(".tabs");
  const main = document.getElementById("main");
  const box = window.getComputedStyle(main);
  const padding = parseFloat(box.paddingTop) || 0;

  // visualViewport is the honest number on a phone, where the address bar
  // slides in and out and innerHeight lies about it.
  const tall = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const left = tall - bar.offsetHeight - tabs.offsetHeight - padding - 12;

  screen.style.setProperty("--fit", Math.max(240, Math.round(left)) + "px");
}

function show(name) {
  Object.keys(screens).forEach((key) => {
    screens[key].hidden = key !== name;
  });
  document.body.classList.toggle("on-camera", name === "capture");
  if (name === "capture") fitCameraScreen();
  document.querySelectorAll(".tab").forEach((tab) => {
    if (tab.dataset.tab === name) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  if (name !== "capture") camera.stop(video);
  speech.stop();
  window.scrollTo(0, 0);
}

function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

async function route() {
  const hash = location.hash || "#/today";

  if (!welcomed()) {
    show("welcome");
    return;
  }

  if (hash.startsWith("#/record/")) {
    show("record");
    await renderRecord(hash.replace("#/record/", ""));
    return;
  }
  if (hash === "#/records") {
    show("records");
    renderRecords(document.getElementById("search").value);
    return;
  }
  if (hash === "#/capture") {
    show("capture");
    const msg = document.getElementById("camera-msg");
    const zoom = document.getElementById("zoom");
    const ok = await camera.start(video, (text) => {
      msg.textContent = text;
      msg.hidden = text === "";
    });
    if (ok) camera.setZoom(video, Number(zoom.value));
    return;
  }
  if (hash === "#/new") {
    if (!pendingPhoto) {
      go("#/capture");
      return;
    }
    show("new");
    return;
  }
  show("today");
  await renderToday();
}

/* the capture and save flow */

// What the user can see right now: the slider value, and the shape of the box
// the video is displayed in.
function viewNow() {
  const zoom = Number(document.getElementById("zoom").value) || 100;
  const wrap = document.querySelector(".camera-wrap");
  const rect = wrap ? wrap.getBoundingClientRect() : null;
  const shape = rect && rect.height ? rect.width / rect.height : 0;
  return { zoom: zoom, shape: shape };
}

function cameraMessage(text) {
  const msg = document.getElementById("camera-msg");
  msg.textContent = text;
  msg.hidden = text === "";
}

// R2.3. Point, hear it, and do not keep anything unless you want to. This is
// the whole of module one, and it never leaves the camera screen.
async function readTheFrame() {
  if (speech.speaking()) {
    speech.stop();
    cameraMessage("");
    return;
  }

  const view = viewNow();
  const blob = await camera.capture(video, view.zoom, view.shape);
  if (!blob) {
    say("The camera is not ready yet.");
    return;
  }

  cameraMessage("Recall is reading what you see. The first time takes a moment.");
  try {
    const text = await ocr.readText(blob, (percent) => {
      cameraMessage("Recall is reading what you see. " + percent + " per cent.");
    });
    if (!text) {
      cameraMessage("No words found. Hold the phone still, a little further away.");
      return;
    }
    speech.speak(text.slice(0, 600), ocr.guessLang(text));
    cameraMessage("Reading it out loud. Press again to stop.");
  } catch (err) {
    cameraMessage("Recall could not read this. Try the photo instead.");
  }
}

async function usePhoto(blob) {
  pendingPhoto = blob;
  pendingText = "";
  const shot = document.getElementById("shot");
  shot.src = URL.createObjectURL(blob);

  document.getElementById("f-title").value = "";
  document.getElementById("f-people").value = "";
  document.getElementById("f-place").value = "";
  document.getElementById("f-when").value = "";

  go("#/new");

  // OCR runs after the screen is up, so the user is never left waiting on a
  // blank page. Requirement S1: whatever we read is only ever a suggestion.
  const state = document.getElementById("ocr-state");
  // Not "found": the date below is called that, and a second const with the
  // same name inside the try quietly took this element's place. The box then
  // never appeared, and on a letter with no date in it the app said it could
  // not read the letter at all.
  const foundBox = document.getElementById("ocr-found");
  const textBox = document.getElementById("ocr-text");
  foundBox.hidden = true;
  textBox.textContent = "";
  state.hidden = false;
  state.textContent = "Recall is reading the letter. The first time takes a moment.";

  try {
    const text = await ocr.readText(blob, (percent) => {
      state.textContent = "Recall is reading the letter. " + percent + " per cent.";
    });
    const when = ocr.findDate(text);
    const title = ocr.guessTitle(text);

    if (title) document.getElementById("f-title").value = title;
    if (when) {
      const local = new Date(when.getTime() - when.getTimezoneOffset() * 60000);
      document.getElementById("f-when").value = local.toISOString().slice(0, 16);
    }

    pendingText = text;
    state.textContent = when
      ? "Recall read: " + readableDate(when.toISOString()) + ". Is that right?"
      : "Recall found no date. Fill one in yourself if you need it.";

    // S1: never file silently. What was read is on the screen, and it can be
    // heard again as often as they like.
    if (text) {
      textBox.textContent = text;
      foundBox.hidden = false;
      speech.speak(text.slice(0, 600), ocr.guessLang(text));
    }
  } catch (err) {
    state.textContent = "Recall could not read the text. You can still keep the card.";
  }
}

async function saveNew(event) {
  event.preventDefault();
  const form = event.target;
  const title = document.getElementById("f-title").value.trim();
  if (!title) {
    say("Give the card a name first.");
    document.getElementById("f-title").focus();
    return;
  }

  const id = store.newId();
  const when = document.getElementById("f-when").value;
  const record = {
    id: id,
    kind: form.kind.value,
    title: title,
    people: document.getElementById("f-people").value.split(",").map((s) => s.trim()).filter(Boolean),
    place: document.getElementById("f-place").value.trim(),
    happensAt: when ? new Date(when).toISOString() : "",
    tags: [],
    remind: document.getElementById("f-remind").value,
    spokenText: "",
    ocrText: pendingText,
    hasPhoto: Boolean(pendingPhoto),
    createdAt: new Date().toISOString()
  };

  if (pendingPhoto) await store.savePhoto(id, pendingPhoto);
  await store.saveRecord(record);

  // R3.1. A reminder never stands alone, it hangs on the card it belongs to.
  const choice = document.getElementById("f-remind").value;
  if (choice) {
    const base = record.happensAt ? new Date(record.happensAt).getTime() : Date.now() + 3600 * 1000;
    let dueAt = base;
    let repeat = "none";
    if (choice === "day-before") dueAt = base - 24 * 3600 * 1000;
    if (choice === "daily") repeat = "daily";
    if (choice === "twice") repeat = "twice_daily";
    if (dueAt < Date.now()) dueAt = Date.now() + 3600 * 1000;

    await store.saveReminder({
      id: store.newId(),
      recordId: id,
      dueAt: new Date(dueAt).toISOString(),
      repeat: repeat,
      spokenText: record.spokenText || record.title,
      lastDoneAt: null
    });
  }

  records = await store.allRecords();
  reminders = await store.allReminders();
  syncHousehold();
  pendingPhoto = null;
  say("Kept.");
  go("#/record/" + id);
}

/* wiring */

function wire() {
  window.addEventListener("hashchange", route);

  document.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => go(btn.dataset.go));
  });

  document.addEventListener("click", async (event) => {
    const target = event.target;

    const sayIt = target.closest("[data-say]");
    if (sayIt) {
      if (speech.speaking()) speech.stop();
      else if (!speech.speak(sayIt.dataset.say)) say("This browser cannot read out loud.");
      return;
    }

    const doneIt = target.closest("[data-done]");
    if (doneIt) {
      await store.markReminderDone(doneIt.dataset.done);
      reminders = await store.allReminders();
      say("Marked done.");
      await route();
      return;
    }

    const card = target.closest("[data-open]");
    if (card) go("#/record/" + card.dataset.open);
  });

  document.getElementById("search").addEventListener("input", (e) => renderRecords(e.target.value));

  document.getElementById("zoom").addEventListener("input", (e) => {
    camera.setZoom(video, Number(e.target.value));
  });

  document.getElementById("btn-read").addEventListener("click", readTheFrame);

  document.getElementById("btn-read-again").addEventListener("click", () => {
    const text = document.getElementById("ocr-text").textContent;
    if (speech.speaking()) {
      speech.stop();
      return;
    }
    if (!speech.speak(text, ocr.guessLang(text))) say("This browser cannot read out loud.");
  });

  document.getElementById("btn-shoot").addEventListener("click", async () => {
    const view = viewNow();
    const blob = await camera.capture(video, view.zoom, view.shape);
    if (!blob) {
      say("The camera is not ready yet.");
      return;
    }
    await usePhoto(blob);
  });

  const file = document.getElementById("file");
  document.getElementById("btn-pick").addEventListener("click", () => file.click());
  file.addEventListener("change", async () => {
    if (file.files && file.files[0]) await usePhoto(file.files[0]);
    file.value = "";
  });

  document.getElementById("new-form").addEventListener("submit", saveNew);

  document.getElementById("btn-welcome-read").addEventListener("click", () => {
    if (speech.speaking()) speech.stop();
    else speech.speak(WELCOME_SPOKEN);
  });
  document.getElementById("btn-welcome-start").addEventListener("click", finishWelcome);

  // Rotating the phone, or the address bar sliding away, both change how much
  // room the camera has.
  window.addEventListener("resize", fitCameraScreen);
  window.addEventListener("orientationchange", fitCameraScreen);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fitCameraScreen);
  }

  document.getElementById("btn-install").addEventListener("click", async () => {
    rememberInstallAsked();
    const outcome = await install.prompt();
    document.getElementById("install-box").hidden = true;
    if (outcome === "accepted") say("Recall is on your home screen.");
  });
  document.getElementById("btn-install-no").addEventListener("click", () => {
    rememberInstallAsked();
    document.getElementById("install-box").hidden = true;
  });

  document.querySelectorAll(".key").forEach((key) => {
    key.addEventListener("click", () => pressKey(key.dataset.key));
  });
  document.getElementById("btn-face").addEventListener("click", unlockWithFace);
  document.getElementById("form-rescue").addEventListener("submit", rescueWithCode);

  document.getElementById("form-setcode").addEventListener("submit", saveCode);
  document.getElementById("btn-lock-off").addEventListener("click", async () => {
    lock.clearLock();
    document.getElementById("lock-msg").hidden = false;
    document.getElementById("lock-msg").textContent = "The code is off.";
    await drawLockSettings();
  });
  document.getElementById("btn-lock-now").addEventListener("click", () => {
    document.getElementById("help").close();
    showLock();
  });
  document.getElementById("btn-face-on").addEventListener("click", async () => {
    const msg = document.getElementById("lock-msg");
    msg.hidden = false;
    msg.textContent = "Ask her to look at the phone.";
    try {
      await lock.addFace("her phone");
      msg.textContent = "Face ID works on this phone now. The numbers still work too.";
    } catch (err) {
      msg.textContent = "Face ID was not set up: " + (err.message || err);
    }
    await drawLockSettings();
  });
  document.getElementById("btn-face-off").addEventListener("click", async () => {
    lock.removeFace();
    document.getElementById("lock-msg").hidden = false;
    document.getElementById("lock-msg").textContent = "Face ID is off. The numbers still work.";
    await drawLockSettings();
  });

  document.getElementById("btn-stuck-retry").addEventListener("click", () => {
    window.location.reload();
  });
  document.getElementById("btn-stuck-fresh").addEventListener("click", async () => {
    const msg = document.getElementById("stuck-msg");
    msg.hidden = false;
    msg.textContent = "Clearing the store on this phone.";
    try {
      await store.startFresh();
      window.location.reload();
    } catch (err) {
      msg.textContent = err.message || String(err);
    }
  });

  const help = document.getElementById("help");
  document.getElementById("btn-help").addEventListener("click", async () => {
    await drawLockSettings();
    help.showModal();
  });
  document.getElementById("help-close").addEventListener("click", () => help.close());

  if (isConfigured()) {
    document.getElementById("link-wrap").hidden = false;
    document.getElementById("form-link").addEventListener("submit", linkThisPhone);
    document.getElementById("btn-refresh").hidden = false;
    document.getElementById("btn-refresh").addEventListener("click", async () => {
      say("Looking for new cards.");
      await syncHousehold({ loud: true });
    });
  }
}

// R6.3. Arriving from the square the family showed: same claim, no typing.
async function claimFromLink() {
  const code = new URLSearchParams(location.search).get("link");
  if (!code) return false;

  // Take it out of the address bar either way, so a shared link cannot be
  // claimed twice by accident.
  history.replaceState(null, "", location.pathname + location.hash);

  if (!isConfigured()) return false;

  try {
    const cloud = await import("./cloud.js?v=17");
    const id = await cloud.claimDeviceLink(code);
    window.localStorage.setItem(HOUSEHOLD_KEY, id);
    say("This phone is linked to the family.");
    return true;
  } catch (err) {
    say("That link did not work: " + (err.message || err));
    return false;
  }
}

async function init() {
  wire();

  // Before anything is drawn, so a locked phone never shows a card in passing.
  if (lock.locked()) showLock();

  try {
    records = await store.seedIfEmpty();
    reminders = await store.allReminders();
  } catch (err) {
    records = [];
    reminders = [];
    // A wedged store is not something a toast can help with: an empty Today
    // screen looks exactly like lost cards. Say what happened and offer the two
    // things that can be done about it. R8.1.
    if (err && err.stuck) {
      show("stuck");
      document.getElementById("stuck-msg").hidden = true;
      return;
    }
    say(err.message || "The store on this phone did not open.");
  }

  const linked = await claimFromLink();
  await route();
  showWhoHasAccess();
  await syncHousehold({ loud: linked });
  showInstallOffer(linked);

  if ("serviceWorker" in navigator) {
    // updateViaCache none plus an explicit update check, otherwise a browser can
    // sit on an old worker for a long time and keep serving the old app.
    navigator.serviceWorker
      .register("sw.js", { updateViaCache: "none" })
      .then((reg) => reg.update())
      .catch(() => {
        // no offline mode, the app still works
      });
  }
}

init();
