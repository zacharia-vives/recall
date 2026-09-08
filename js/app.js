// Recall - main script. Four screens, switched on the hash, so the app works
// from a plain static host with no server and no build step.

import * as store from "./store.js";
import * as speech from "./speech.js";
import * as camera from "./camera.js";
import * as ocr from "./ocr.js";
import { isConfigured } from "./config.js";

const HOUSEHOLD_KEY = "recall.householdId";

const KINDS = {
  letter: { label: "Letter", badge: "L" },
  person: { label: "Person", badge: "P" },
  place: { label: "Place", badge: "●" }
};

const screens = {
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
    if (!window.confirm("This card and its photo will be deleted. Continue?")) return;
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
    const cloud = await import("./cloud.js");
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

// R6.3. The helper does this once, on this phone, with a code from their own.
async function linkThisPhone(event) {
  event.preventDefault();
  const code = document.getElementById("link-code").value.trim();
  const msg = document.getElementById("link-msg");
  msg.hidden = false;
  msg.textContent = "One moment.";
  try {
    const cloud = await import("./cloud.js");
    const id = await cloud.claimDeviceLink(code);
    window.localStorage.setItem(HOUSEHOLD_KEY, id);
    msg.textContent = "This phone is linked. Fetching the family cards.";
    await showWhoHasAccess();
    await syncHousehold({ loud: true });
    msg.textContent = "This phone is linked. Family can add cards now.";
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
    cloud = await import("./cloud.js");
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
      await cloud.pushRecord(id, record);
      if (record.hasPhoto) {
        const url = await store.photoUrl(record.id);
        if (url) {
          const blob = await fetch(url).then((r) => r.blob());
          const path = await cloud.uploadPhoto(id, record.id, blob);
          await cloud.updateRecord(id, record.id, { photo_path: path }, "the photo was added");
        }
      }
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

function show(name) {
  Object.keys(screens).forEach((key) => {
    screens[key].hidden = key !== name;
  });
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
  const found = document.getElementById("ocr-found");
  const textBox = document.getElementById("ocr-text");
  found.hidden = true;
  textBox.textContent = "";
  state.hidden = false;
  state.textContent = "Recall is reading the letter. The first time takes a moment.";

  try {
    const text = await ocr.readText(blob, (percent) => {
      state.textContent = "Recall is reading the letter. " + percent + " per cent.";
    });
    const found = ocr.findDate(text);
    const title = ocr.guessTitle(text);

    if (title) document.getElementById("f-title").value = title;
    if (found) {
      const local = new Date(found.getTime() - found.getTimezoneOffset() * 60000);
      document.getElementById("f-when").value = local.toISOString().slice(0, 16);
    }

    pendingText = text;
    state.textContent = found
      ? "Recall read: " + readableDate(found.toISOString()) + ". Is that right?"
      : "Recall found no date. Fill one in yourself if you need it.";

    // S1: never file silently. What was read is on the screen, and it can be
    // heard again as often as they like.
    if (text) {
      textBox.textContent = text;
      found.hidden = false;
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

  const help = document.getElementById("help");
  document.getElementById("btn-help").addEventListener("click", () => help.showModal());
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

async function init() {
  wire();

  try {
    records = await store.seedIfEmpty();
    reminders = await store.allReminders();
  } catch (err) {
    // Storage refused to open. Say so rather than showing an empty screen that
    // looks like lost cards.
    records = [];
    reminders = [];
    say(err.message || "The storage on this phone did not open.");
  }

  await route();
  showWhoHasAccess();
  syncHousehold();

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
