// Recall - main script. Four screens, switched on the hash, so the app works
// from a plain static host with no server and no build step.

import * as store from "./store.js?v=38";
import * as speech from "./speech.js?v=38";
import * as camera from "./camera.js?v=38";
import * as ocr from "./ocr.js?v=38";
import { isConfigured, NOTICE_VERSION } from "./config.js?v=38";
import * as install from "./install.js?v=38";
import * as lock from "./lock.js?v=38";
import * as i18n from "./i18n.js?v=38";
import * as docs from "./docs.js?v=38";

// Short, because it is used on nearly every line that says something.
const t = i18n.t;

const HOUSEHOLD_KEY = "recall.householdId";

const KINDS = {
  letter: { key: "kind.letter", badge: "L" },
  person: { key: "kind.person", badge: "P" },
  place: { key: "kind.place", badge: "●" },
  list: { key: "kind.list", badge: "☑" }
};

function kindLabel(kind) {
  return t((KINDS[kind] || KINDS.letter).key);
}

const screens = {
  stuck: document.getElementById("screen-stuck"),
  consent: document.getElementById("screen-consent"),
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
  const tag = i18n.spokenLang();
  return d.toLocaleDateString(tag, {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }) + " " + t("run.dateat") + " " +
    d.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" });
}

function isDueSoon(record) {
  if (!record.happensAt) return false;
  const when = new Date(record.happensAt).getTime();
  const now = Date.now();
  return when > now - 12 * 3600 * 1000 && when < now + 48 * 3600 * 1000;
}

function sentenceFor(record) {
  if (record.spokenText) return record.spokenText;
  // A checklist reads as what is still to do, which is the question somebody
  // holding a list is actually asking. F9.
  if (record.kind === "list") return listSentence(record);
  const parts = [record.title];
  if (record.happensAt) parts.push(readableDate(record.happensAt));
  if (record.place) parts.push(record.place);
  return parts.filter(Boolean).join(". ") + ".";
}

// The words of the letter itself, wherever they came from: a photograph that
// was read, or a document that was attached. Read in the language of the text
// rather than the language of the app.
function longTextOf(record) {
  return record.fileText || record.ocrText || "";
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
  let spoken = reminder.spokenText || record.spokenText || record.title;
  if (reminder.kind === "call") {
    const who = (record.people && record.people.length) ? record.people[0] : record.title;
    spoken = t("remind.timetocall", { who: who });
  }

  return '<div class="today-item ' + (status === "missed" ? "missed" : "") + '">' +
    '<button class="today-main" data-open="' + esc(record.id) + '">' +
      '<span class="thumb" data-thumb="' + esc(record.id) + '">' + kind.badge + "</span>" +
      "<span>" +
        '<span class="title">' + esc(record.title) + "</span>" +
        '<span class="meta">' + esc(readableDate(reminder.dueAt)) + "</span>" +
        (status === "missed" ? '<span class="status">' + t("run.passed") + "</span>" : "") +
      "</span>" +
    "</button>" +
    '<div class="today-acts">' +
      // A call reminder puts the call first: it is the thing being asked for,
      // and a number somebody has to remember is not much of a reminder. F11.
      (reminder.kind === "call" ? callButtonHtml(record, { short: true }) : "") +
      '<button class="big" type="button" data-say="' + esc(spoken) + '">' + t("record.read") + "</button>" +
      '<button class="big ghost" type="button" data-done="' + esc(reminder.id) + '">' + t("run.markdone") + "</button>" +
    "</div>" +
  "</div>";
}

async function renderToday() {
  const dateEl = document.getElementById("today-date");
  dateEl.textContent = new Date().toLocaleDateString(i18n.spokenLang(), {
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
      '<p class="empty">' + t("run.nothingdue") + "<br>" + t("run.today.empty") + "</p>";
    return;
  }
  list.innerHTML = rows.join("");
  paintThumbs(list);
}

// Which of the three kinds are switched on. All three to begin with, because
// the screen is called Everything.
const showing = { letter: true, person: true, place: true, list: true };

function renderRecords(filter) {
  const list = document.getElementById("records-list");
  const needle = (filter || "").trim().toLowerCase();
  const kept = records.filter((r) => showing[r.kind] !== false);
  const rows = needle
    ? kept.filter((r) =>
        (r.title + " " + (r.people || []).join(" ") + " " + (r.tags || []).join(" ") + " " + (r.place || ""))
          .toLowerCase()
          .includes(needle))
    : kept;

  if (rows.length === 0) {
    const nothingOn = !showing.letter && !showing.person && !showing.place && !showing.list;
    list.innerHTML = '<p class="empty">' +
      (nothingOn ? t("filter.noneon") : needle ? t("records.nohits") : t("records.none")) +
      "</p>";
    return;
  }
  list.innerHTML = rows.map((r) => cardHtml(r)).join("");
  paintThumbs(list);
}

async function renderRecord(id) {
  const record = records.find((r) => r.id === id);
  const box = document.getElementById("record-detail");
  if (!record) {
    box.innerHTML = '<p class="empty">' + t("run.cardgone") + "</p>";
    return;
  }
  document.getElementById("record-title").textContent = record.title;

  const mine = reminders.filter((r) => r.recordId === record.id);
  const reminder = mine.length ? mine[0] : null;
  const repeatWords = {
    none: t("rep.once"), daily: t("rep.daily"),
    twice_daily: t("rep.twice"), weekly: t("rep.weekly")
  };

  const rows = [
    [t("run.kind"), kindLabel(record.kind)],
    [t("field.who"), (record.people || []).join(", ")],
    [t("field.where"), record.place],
    [t("field.when"), readableDate(record.happensAt)],
    [t("run.tags"), (record.tags || []).join(", ")],
    [t("run.reminder"), reminder
      ? readableDate(reminder.dueAt) + ", " + (repeatWords[reminder.repeat] || t("rep.once"))
      : ""],
    [t("run.lastdone"), reminder && reminder.lastDoneAt ? readableDate(reminder.lastDoneAt) : ""]
  ].filter((row) => row[1]);

  const words = longTextOf(record);
  const wantsCall = mine.some((one) => one.kind === "call");
  const canCall = Boolean(dialable(record.phone));

  box.innerHTML =
    (wantsCall && !canCall ? '<p class="warn-line">' + t("phone.nonumber") + "</p>" : "") +
    // F5. A photo is a button, because the first thing anybody wants to do
    // with a photograph of a letter is see it bigger.
    (record.hasPhoto
      ? '<button class="photo-button" type="button" id="detail-photo-btn">' +
        '<img class="detail-photo" id="detail-photo" alt="' + esc(t("run.photoalt")) + '">' +
        '<span class="photo-hint">' + t("big.open") + "</span></button>"
      : "") +
    (record.kind === "list" ? checklistHtml(record) : "") +
    '<div id="file-here"></div>' +
    '<div class="fields">' +
      rows.map((row) =>
        '<div class="row"><span class="k">' + esc(row[0]) + '</span><span class="v">' + esc(row[1]) + "</span></div>"
      ).join("") +
    "</div>" +
    '<div class="actions">' +
      callButtonHtml(record) +
      '<button class="big" type="button" id="btn-say">' +
        (record.kind === "list" ? t("list.readaloud") : t("record.read")) + "</button>" +
      (words
        ? '<button class="big ghost" type="button" id="btn-say-long">' + t("file.read") + "</button>"
        : "") +
      (reminder && store.reminderStatus(reminder) !== "done"
        ? '<button class="big ghost" type="button" data-done="' + esc(reminder.id) +
          '">' + t("run.markdone") + "</button>"
        : "") +
      '<button class="big danger" type="button" id="btn-del">' + t("run.deletecard") + "</button>" +
    "</div>" +
    mapsHtml(record) +
    '<p class="disclaimer">' + t("run.carddisclaimer") + "</p>";

  if (record.hasPhoto) {
    const url = await store.photoUrl(record.id);
    if (url) {
      document.getElementById("detail-photo").src = url;
      document.getElementById("detail-photo-btn").addEventListener("click", () => {
        showBig({ image: url, alt: t("run.photoalt") });
      });
    }
  }

  // The document, if this card has one. F2.
  if (record.hasFile) {
    const row = await store.fileRow(record.id);
    const here = document.getElementById("file-here");
    if (row && here) {
      const shape = (row.type || "").startsWith("application/pdf") ||
        /\.pdf$/i.test(row.name || "") ? "pdf" : "";
      const url = URL.createObjectURL(row.blob);
      here.innerHTML = filePreviewHtml(row.name || t("file.attached"),
        shape || (record.fileText ? "text" : "other"), record.fileText, url) +
        '<p><a class="link" href="' + esc(url) + '" download="' + esc(row.name || "document") +
        '">' + t("file.open") + "</a></p>";
      const wordsButton = here.querySelector("[data-big-words]");
      if (wordsButton) {
        wordsButton.addEventListener("click", () => showBig({ words: record.fileText }));
      }
    }
  }

  // Reading the letter itself, in the language the letter is in. F4.
  const longButton = document.getElementById("btn-say-long");
  if (longButton) {
    longButton.addEventListener("click", () => {
      if (speech.speaking()) {
        speech.stop();
        return;
      }
      speech.read(words, ocr.guessLang(words));
    });
  }

  // Ticking things off. F7.
  if (record.kind === "list") {
    box.querySelectorAll("[data-drop]").forEach((drop) => {
      drop.addEventListener("click", async () => {
        const at = Number(drop.dataset.drop);
        const items = (record.items || []).slice();
        items.splice(at, 1);
        record.items = items;
        await store.saveRecord(record);
        records = await store.allRecords();
        await renderRecord(record.id);
      });
    });

    box.querySelectorAll("[data-tick]").forEach((tick) => {
      tick.addEventListener("click", async () => {
        const at = Number(tick.dataset.tick);
        const items = (record.items || []).slice();
        if (!items[at]) return;
        items[at] = { text: items[at].text, done: !items[at].done };
        record.items = items;
        await store.saveRecord(record);
        records = await store.allRecords();
        await renderRecord(record.id);
      });
    });

    const adder = document.getElementById("add-item");
    if (adder) {
      adder.addEventListener("submit", async (event) => {
        event.preventDefault();
        const field = document.getElementById("new-item");
        const text = field.value.trim();
        if (!text) return;
        record.items = (record.items || []).concat([{ text: text.slice(0, 120), done: false }]);
        await store.saveRecord(record);
        records = await store.allRecords();
        await renderRecord(record.id);
      });
    }
  }

  document.getElementById("btn-say").addEventListener("click", async () => {
    if (speech.speaking()) {
      speech.stop();
      return;
    }
    if (!(await readAloud(sentenceFor(record), i18n.spokenLang()))) say(t("run.nospeech"));
  });

  document.getElementById("btn-del").addEventListener("click", async () => {
    const sure = await ask(t("run.deleteask"), t("run.deleteyes"));
    if (!sure) return;
    await store.deleteRecord(record.id);
    records = await store.allRecords();
    say(t("run.deleted"));
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

// Spoken, in her language. The words are the same as the screen.
function welcomeSpoken() {
  return t("run.welcomespoken") + " " + t("welcome.p3") + " " + t("safety.notmedical");
}


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
    const cloud = await import("./cloud.js?v=38");
    const people = await cloud.members(id);
    const helpers = people
      .filter((m) => m.role === "helper")
      .map((m) => m.display_name || t("run.afamilymember"));
    if (helpers.length === 0) {
      line.hidden = true;
      return;
    }
    const names = helpers.length === 1
      ? helpers[0]
      : helpers.slice(0, -1).join(", ") + " " + t("run.and") + " " + helpers[helpers.length - 1];
    // One name or several changes the verb in Dutch and French, so the two
    // sentences are separate keys rather than one with a plural glued on.
    line.textContent = helpers.length === 1
      ? t("run.canseeone", { who: names })
      : t("run.canseemany", { who: names });
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

  speech.read(question, i18n.spokenLang());

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

/* the voice, N13. Family picks it, she lives with it */

async function drawVoices() {
  const pick = document.getElementById("voice-pick");
  const msg = document.getElementById("voice-msg");
  // Both languages, because her letters are Dutch and the app speaks English.
  const dutch = speech.voicesFor("nl");
  const english = speech.voicesFor("en");
  const all = dutch.concat(english.filter((v) => !dutch.some((d) => d.name === v.name)));

  if (!all.length) {
    pick.innerHTML = '<option value="">this phone has only one voice</option>';
    msg.hidden = false;
    msg.textContent = t("voice.only");
    return;
  }

  const current = speech.pickVoice(i18n.spokenLang());
  pick.innerHTML = all.map((v) =>
    '<option value="' + esc(v.name) + '"' +
    (current && current.name === v.name ? " selected" : "") + ">" +
    esc(v.name + "  (" + v.lang + ")") + "</option>"
  ).join("");

  // If the device has no voice for the language she reads in, the text is read
  // with a foreign accent, which sounds broken and is not obvious why. N15.
  //
  // Unless the neural voice is doing the reading, in which case there is
  // nothing wrong and saying "your phone has no Dutch voice, install one"
  // would be alarming and untrue. That warning is about the fallback, so it
  // only belongs here when the fallback is what she is hearing.
  const mine = speech.voicesFor(i18n.lang());
  let neuralCovers = false;
  try {
    const voices = await import("./voices.js?v=38");
    neuralCovers = voices.wanted() && (await voices.isReady(i18n.lang()));
  } catch (err) {
    neuralCovers = false;
  }
  if (!mine.length && !neuralCovers) {
    msg.hidden = false;
    msg.textContent = t("voice.missing");
  } else {
    msg.hidden = true;
  }
}

/* getting there, F14 */

// Whichever map app the phone actually has, first. All three are ordinary
// https links rather than the app's own scheme, because a universal link opens
// the app when it is installed and the website when it is not, and never
// leaves her looking at an error page.
function mapLinks(place) {
  const where = encodeURIComponent(place);
  const apple = { key: "maps.apple", url: "https://maps.apple.com/?q=" + where };
  const google = {
    key: "maps.google",
    url: "https://www.google.com/maps/search/?api=1&query=" + where
  };
  const waze = { key: "maps.waze", url: "https://waze.com/ul?q=" + where + "&navigate=yes" };

  // An iPhone has Apple Maps whether anybody asked for it or not, so that goes
  // first there and Google first everywhere else. Waze is never first: it is
  // for whoever already uses it.
  const apple_first = /iPhone|iPad|iPod/.test(window.navigator.userAgent || "") ||
    (/Macintosh/.test(window.navigator.userAgent || "") && window.navigator.maxTouchPoints > 1);
  return apple_first ? [apple, google, waze] : [google, apple, waze];
}

// One big button that does the obvious thing, and the other two smaller for
// somebody who prefers them. Three equal buttons would be three decisions.
function mapsHtml(record) {
  if (!record.place || !record.place.trim()) return "";
  const links = mapLinks(record.place.trim());
  const first = links[0];
  const rest = links.slice(1);

  return '<div class="maps">' +
    '<a class="big map" href="' + esc(first.url) + '" target="_blank" rel="noopener">' +
      esc(t("maps.show")) + " (" + esc(t(first.key)) + ")" +
    "</a>" +
    '<div class="maps-others">' +
      rest.map((one) =>
        '<a class="big ghost map" href="' + esc(one.url) + '" target="_blank" rel="noopener">' +
        esc(t(one.key)) + "</a>"
      ).join("") +
    "</div>" +
    '<p class="hint-line">' + t("maps.hint") + "</p>" +
  "</div>";
}

/* looking at something closely, F5 */

const bigBox = document.getElementById("big");

// A photo at the size of the screen, or the words of a document at a size
// somebody with failing near vision can actually read. Both go through here so
// there is one way to close it and one place that gets the type size right.
function showBig(what) {
  const body = document.getElementById("big-body");
  if (what.image) {
    body.innerHTML = '<img src="' + esc(what.image) + '" alt="' + esc(what.alt || "") + '">';
  } else {
    body.innerHTML = '<div class="big-words">' + esc(what.words || "").replace(/\n/g, "<br>") + "</div>";
  }
  bigBox.showModal();
}

/* a document on a card, F1 to F4 */

let pendingFile = null;       // the File the helper just chose
let pendingFileText = "";     // the words Recall got out of it
let pendingItems = [];        // a checklist, if this card is one

const BIGGEST_FILE = 10 * 1024 * 1024;

function fileUrlFor(row) {
  return URL.createObjectURL(row.blob);
}

// What a document looks like on the screen: the words if there are any, the
// pdf itself if the browser can draw it, and always something to press.
function filePreviewHtml(name, shape, words, url) {
  const parts = ['<div class="doc-card">'];
  parts.push('<p class="doc-name">' + esc(name) + "</p>");

  if (shape === "pdf" && url) {
    parts.push('<iframe class="doc-pdf" src="' + esc(url) + '" title="' + esc(name) + '"></iframe>');
    parts.push('<p class="hint-line">' + t("file.pdfnote") + "</p>");
  } else if (words) {
    parts.push('<button class="doc-words" type="button" data-big-words="1">' +
      esc(words.slice(0, 900)) + (words.length > 900 ? " ..." : "") + "</button>");
    parts.push('<p class="hint-line">' + t("big.hint") + "</p>");
  } else {
    parts.push('<p class="hint-line">' + t("file.cannotread") + "</p>");
  }
  parts.push("</div>");
  return parts.join("");
}

async function chooseFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const box = document.getElementById("file-preview");

  if (file.size > BIGGEST_FILE) {
    say(t("file.toobig"));
    event.target.value = "";
    return;
  }

  pendingFile = file;
  box.hidden = false;
  box.innerHTML = '<p class="hint-line">' + t("file.reading") + "</p>";

  pendingFileText = await docs.readWords(file);
  const shape = docs.shapeOf(file);
  const url = shape === "pdf" ? URL.createObjectURL(file) : "";
  box.innerHTML = filePreviewHtml(file.name, shape, pendingFileText, url) +
    '<div class="lock-actions">' +
      (docs.canBeReadAloud(file) && pendingFileText
        ? '<button class="big ghost" type="button" id="btn-file-say">' + t("record.read") + "</button>"
        : "") +
      '<button class="big ghost" type="button" id="btn-file-off">' + t("file.remove") + "</button>" +
    "</div>";

  const sayIt = document.getElementById("btn-file-say");
  if (sayIt) {
    sayIt.addEventListener("click", () => {
      if (speech.speaking()) {
        speech.stop();
        return;
      }
      speech.read(pendingFileText, ocr.guessLang(pendingFileText));
    });
  }
  document.getElementById("btn-file-off").addEventListener("click", () => {
    pendingFile = null;
    pendingFileText = "";
    document.getElementById("file-doc").value = "";
    box.hidden = true;
    box.innerHTML = "";
  });

  // A document that reads like a list is probably a list.
  if (pendingFileText && docs.looksLikeList(pendingFileText)) offerChecklist(pendingFileText);
}

/* checklists, F6 to F9 */

// Offered rather than done: Recall guessing wrong and silently turning a letter
// into a list would be worse than asking once.
async function offerChecklist(text) {
  const yes = await ask(t("list.lookslike"), t("list.yesmake"));
  if (!yes) return;
  makeChecklistFrom(text);
}

function makeChecklistFrom(text) {
  const made = docs.listFromText(text);
  if (!made.items.length) return;
  pendingItems = made.items;

  const title = document.getElementById("f-title");
  if (made.title && !title.value.trim()) title.value = made.title;

  const kind = document.querySelector('input[name="kind"][value="list"]');
  if (kind) {
    kind.checked = true;
    showItemsField();
  }
  document.getElementById("f-items").value = pendingItems.map((one) => one.text).join("\n");
  say(t("list.madefromphoto"));
}

function showItemsField() {
  const picked = document.querySelector('input[name="kind"]:checked');
  const isList = picked && picked.value === "list";
  document.getElementById("items-field").hidden = !isList;
}

function itemsFromForm() {
  const raw = document.getElementById("f-items").value;
  const lines = raw.split("\n").map((one) => one.trim()).filter(Boolean);
  // Keep the done flags for lines that were already there, so editing the
  // text of a list does not untick everything.
  return lines.map((line) => {
    const had = pendingItems.find((one) => one.text === line);
    return { text: line.slice(0, 120), done: had ? had.done : false };
  });
}

function listProgressHtml(items) {
  const done = items.filter((one) => one.done).length;
  if (!items.length) return '<p class="hint-line">' + t("list.empty") + "</p>";
  return '<p class="list-progress">' +
    (done === items.length ? t("list.alldone")
      : t("list.progress", { done: done, total: items.length })) +
    "</p>";
}

function checklistHtml(record) {
  const items = record.items || [];
  return listProgressHtml(items) +
    '<ul class="checklist">' +
    items.map((one, at) =>
      "<li>" +
        '<button class="tickbox" type="button" data-tick="' + at + '"' +
        ' aria-pressed="' + (one.done ? "true" : "false") + '">' +
          '<span class="mark" aria-hidden="true">' + (one.done ? "\u2713" : "") + "</span>" +
          "<span class=\"what\">" + esc(one.text) + "</span>" +
        "</button>" +
        '<button class="drop-item" type="button" data-drop="' + at + '"' +
        ' aria-label="' + esc(t("list.remove")) + '">&times;</button>' +
      "</li>"
    ).join("") +
    "</ul>" +
    '<form class="add-item" id="add-item">' +
      '<label class="field"><span class="label">' + t("list.additem") + "</span>" +
      '<input id="new-item" autocomplete="off"></label>' +
      '<button class="big ghost" type="submit">' + t("list.add") + "</button>" +
    "</form>";
}

// What the list sounds like: what is still to do, because that is the question
// somebody holding a list is actually asking.
function listSentence(record) {
  const items = record.items || [];
  const left = items.filter((one) => !one.done);
  if (!items.length) return record.title;
  if (!left.length) return record.title + ". " + t("list.alldone");
  return record.title + ". " + t("list.stillto") + " " +
    left.map((one) => one.text).join(", ") + ".";
}

/* calling somebody, F10 to F13 */

// Belgian numbers are written half a dozen ways. Keep the digits, keep a
// leading plus, and let the phone deal with the rest.
function dialable(phone) {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  if (cleaned.replace(/\D/g, "").length < 6) return "";
  return cleaned;
}

function callButtonHtml(record, options) {
  const number = dialable(record.phone);
  if (!number) return "";
  const who = (record.people && record.people.length) ? record.people[0] : record.title;
  // On a card there is room for the name. In a row on the today screen, next
  // to two other buttons, there is not.
  const label = (options && options.short) ? t("phone.callnow") : t("phone.call", { who: who });
  return '<a class="big call" href="tel:' + esc(number) + '">' + esc(label) + "</a>";
}

/* the language, L1 to L6 */

function drawLanguages() {
  const pick = document.getElementById("lang-pick");
  if (!pick) return;
  const now = i18n.lang();
  pick.innerHTML = i18n.LANGUAGES.map((one) =>
    '<option value="' + one.code + '"' + (one.code === now ? " selected" : "") + ">" +
    esc(one.label) + "</option>"
  ).join("");
}

// Everything drawn from a script has to be drawn again, because only the
// markup carrying data-t is refreshed by the module itself.
async function redrawEverything() {
  drawLanguages();
  await drawVoices();
  // A different language needs a different voice, so ask for that one too.
  getVoiceQuietly();
  await drawLockSettings();
  await drawSharingState();
  await drawKnows();
  await drawSeen();
  await drawBetterVoice();
  await route();
  await showWhoHasAccess();
}

/* the better voice, N16

   Everything here is about one decision: sixty megabytes, once, on wifi. So
   the screen says the number before anything is downloaded, shows a real bar
   while it happens, and says plainly which voice is being used at any moment.
   A phone that cannot do it at all says so and keeps working. */

/* Reading out loud, with a word while she waits.

   The neural voice takes a few seconds to make a sentence, and a few seconds
   of silence after pressing a big button that says "read it out loud" reads as
   broken. So if that voice is in use, say so first. With the phone's own voice
   there is nothing to wait for and nothing is said. */
async function readAloud(text, lang) {
  let slow = false;
  try {
    const voices = await import("./voices.js?v=38");
    // Asked about the language of the words, the same one speech will use, so
    // the message does not appear for a letter that is about to be read by the
    // phone's own voice anyway.
    const code = voices.codeFor(lang || i18n.spokenLang());
    slow = voices.wanted() && Boolean(code) && (await voices.isReady(code));
  } catch (err) {
    slow = false;
  }
  if (slow) say(t("run.onemoment"));
  return speech.read(text, lang);
}

async function drawBetterVoice() {
  const onBtn = document.getElementById("better-on");
  if (!onBtn) return;

  const voices = await import("./voices.js?v=38");
  const hint = document.getElementById("better-hint");
  const getBtn = document.getElementById("better-get");
  const tryBtn = document.getElementById("better-try");
  const removeBtn = document.getElementById("better-remove");
  const msg = document.getElementById("better-msg");
  const voice = voices.voiceFor(i18n.lang());

  hint.textContent = t("better.hint", { mb: voice ? voice.mb : 60 });

  // A browser that cannot run it is told once, and the controls go away
  // rather than sitting there failing.
  if (!voices.possible() || !voice) {
    onBtn.hidden = true;
    getBtn.hidden = true;
    tryBtn.hidden = true;
    removeBtn.hidden = true;
    msg.hidden = false;
    msg.textContent = t("better.cannot");
    return;
  }

  const on = voices.wanted();
  onBtn.hidden = false;
  onBtn.setAttribute("aria-pressed", on ? "true" : "false");

  const ready = await voices.isReady(i18n.lang());
  const fetchingNow = voices.busy() === i18n.lang();
  // A connection that cannot carry sixty megabytes is why the voice has not
  // arrived on its own, and saying so is the difference between "broken" and
  // "waiting for wifi".
  const willCarry = voices.connectionWillCarryIt();
  getBtn.hidden = ready || fetchingNow;
  getBtn.textContent = t("better.get", { mb: voice.mb });
  tryBtn.hidden = !ready;
  removeBtn.hidden = !ready;
  document.getElementById("better-bar").hidden = !fetchingNow;

  // Every state gets its own sentence, because the only thing worse than a
  // voice that has not arrived is not being told why. Somebody wondering why
  // it still sounds the same has to be able to read the answer here.
  msg.hidden = false;
  if (ready && on) msg.textContent = t("better.ready");
  else if (ready) msg.textContent = t("better.readyoff");
  else if (!on) msg.textContent = t("better.switchedoff");
  else if (fetchingNow) msg.textContent = t("better.getting", { pct: 0 });
  else if (!willCarry) msg.textContent = t("better.waiting", { mb: voice.mb });
  else msg.textContent = t("better.notyet");
}

async function getBetterVoice() {
  const voices = await import("./voices.js?v=38");
  const getBtn = document.getElementById("better-get");
  const bar = document.getElementById("better-bar");
  const fill = bar.querySelector("i");
  const msg = document.getElementById("better-msg");

  getBtn.disabled = true;
  bar.hidden = false;
  fill.style.width = "0";
  msg.hidden = false;
  msg.textContent = t("better.getting", { pct: 0 });

  try {
    await voices.fetchVoice(i18n.lang(), (pct) => {
      fill.style.width = pct + "%";
      msg.textContent = t("better.getting", { pct: pct });
    });
    // Downloading it is also choosing it: nobody waits for sixty megabytes
    // and then wants the old voice.
    voices.setWanted(true);
    bar.hidden = true;
    await drawBetterVoice();
  } catch (err) {
    bar.hidden = true;
    msg.hidden = false;
    msg.textContent = t("better.failed");
  } finally {
    getBtn.disabled = false;
  }
}

/* what Recall knows about you, P20 and P21. Article 15 and article 20, in a
   form she can use without writing anybody a letter. */

async function drawKnows() {
  const list = document.getElementById("knows-list");
  const where = document.getElementById("knows-where");
  if (!list) return;

  let photos = 0;
  for (const record of records) {
    if (record.hasPhoto) photos += 1;
  }
  // Words Recall has read, wherever they came from: a photograph it read or
  // a document that was attached. Counting only the photographs said none
  // had been read when a docx had.
  const read = records.filter((r) =>
    (r.ocrText && r.ocrText.length) || (r.fileText && r.fileText.length)).length;

  const counted = [
    [t("knows.cards"), records.length],
    [t("knows.photos"), photos],
    [t("knows.reminders"), reminders.length],
    [t("knows.readtext"), read]
  ];
  list.innerHTML = counted.map((row) =>
    "<li><span>" + esc(row[0]) + "</span><b>" + row[1] + "</b></li>"
  ).join("");

  where.textContent = linkedHousehold() ? t("knows.whereon") : t("knows.whereoff");
}

/* P23. What the family has done, in her own app and her own language.

   The spoken notice tells her that everything the family does is written down
   where she can read it. That was true of the database and of the family app,
   and false of the only interface she ever opens. The rows are written in
   English by whatever wrote them, so nothing here shows the stored sentence:
   the action is looked up in the dictionary and the name is the only part
   that comes from the row. */
const SEEN_KNOWN = [
  "added", "edited", "deleted", "restored", "reminder_set",
  "marked_done", "invited", "removed", "linked", "unlinked"
];

async function drawSeen() {
  const list = document.getElementById("seen-list");
  const msg = document.getElementById("seen-msg");
  if (!list || !msg) return;

  list.innerHTML = "";
  msg.hidden = true;
  msg.textContent = "";

  const household = linkedHousehold();
  if (!household) {
    msg.hidden = false;
    msg.textContent = t("seen.notshared");
    return;
  }

  let rows = [];
  try {
    // Loaded here rather than at the top, the way every other cloud call in
    // this app does it, so a phone that is only ever used offline never
    // downloads the library at all.
    const cloud = await import("./cloud.js?v=38");
    rows = await cloud.listActivity(household, 40);
  } catch (err) {
    // Offline, or the request failed. Say which, rather than showing an empty
    // list that reads as "your family has done nothing".
    msg.hidden = false;
    msg.textContent = t("seen.offline");
    return;
  }

  if (!rows.length) {
    msg.hidden = false;
    msg.textContent = t("seen.none");
    return;
  }

  list.innerHTML = rows.map((row) => {
    // A row written by a partner's software has no account behind it, so it
    // says so in her language rather than showing the English it was stored
    // with.
    const who = row.actor_name === "a connected system"
      ? t("seen.system")
      : (row.actor_name || t("seen.someone"));
    const known = SEEN_KNOWN.indexOf(row.action) >= 0;
    const said = known ? t("seen." + row.action, { who: who }) : who;
    return "<li><span>" + esc(said) + "</span>" +
      '<span class="s">' + esc(readableDate(row.at)) + "</span></li>";
  }).join("");
}

// Article 20. One file, everything in it, readable by a person and by a
// machine. The photos travel as text so the file stands on its own.
async function exportEverything() {
  const msg = document.getElementById("export-msg");
  msg.hidden = false;
  msg.textContent = t("run.onemoment");

  const photos = {};
  for (const record of records) {
    if (!record.hasPhoto) continue;
    const blob = await store.photoBlob(record.id);
    if (!blob) continue;
    photos[record.id] = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  const bundle = {
    what: "Everything Recall keeps about you",
    made: new Date().toISOString(),
    language: i18n.lang(),
    sharedWithFamily: Boolean(linkedHousehold()),
    cards: records,
    reminders: reminders,
    photos: photos
  };

  const file = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "recall-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);

  msg.textContent = t("knows.exported");
}

/* consent, P4 and P19 */

const CONSENT_KEY = "recall.consent";

// The same words as the screen, in the order they are read. Whenever either
// changes, NOTICE_VERSION in config.js changes with it, so a recorded consent
// always points at the text that was actually read out.
function noticeSpoken() {
  return t("run.consentspoken");
}


// The notice exists in three languages, so the record says which one was read.
function noticeVersion() {
  return NOTICE_VERSION + "/" + i18n.lang();
}

function consentRemembered() {
  try {
    const seen = window.localStorage.getItem(CONSENT_KEY) || "";
    return seen.split("/")[0] === NOTICE_VERSION;
  } catch (err) {
    return false;
  }
}

function rememberConsent(value) {
  try {
    if (value) window.localStorage.setItem(CONSENT_KEY, noticeVersion());
    else window.localStorage.removeItem(CONSENT_KEY);
  } catch (err) {
    // nothing to do
  }
}

// True when this phone is linked to a household but nobody has said yes yet.
// The database is the record that counts; the local note is what makes this
// work with no network, which is most of the time in a kitchen.
async function consentNeeded() {
  if (!isConfigured() || !linkedHousehold()) return false;
  if (consentRemembered()) return false;
  try {
    const cloud = await import("./cloud.js?v=38");
    const latest = await cloud.latestConsent(linkedHousehold());
    if (latest && !latest.withdrawn_at) {
      rememberConsent(true);
      return false;
    }
    return true;
  } catch (err) {
    // Cannot ask, so do not assume a yes.
    return true;
  }
}

function readNotice() {
  if (speech.speaking()) {
    speech.stop();
    return;
  }
  speech.read(noticeSpoken(), i18n.spokenLang());
}

async function consentYes() {
  const msg = document.getElementById("consent-msg");
  speech.stop();
  msg.hidden = false;
  msg.textContent = t("consent.thanks");
  try {
    const cloud = await import("./cloud.js?v=38");
    const where = await cloud.recordConsent(linkedHousehold(), noticeVersion());
    window.console.info("Recall: consent recorded in the " + where + " table.");
    rememberConsent(true);
    await route();
    await showWhoHasAccess();
    await syncHousehold({ loud: true });
    showInstallOffer(true);
  } catch (err) {
    msg.textContent = t("consent.failed") + " " + (err.message || err);
  }
}

// A no is a real no: the link goes, so this phone has nothing to share with and
// nothing is sent. The family can offer again, which is one code away.
async function consentNo() {
  speech.stop();
  window.localStorage.removeItem(HOUSEHOLD_KEY);
  rememberConsent(false);
  say(t("consent.declined"));
  await route();
  await showWhoHasAccess();
}

// Article 7(3): as easy to take back as to give.
async function stopSharing() {
  const msg = document.getElementById("sharing-msg");
  const sure = await ask(t("share.stopask"), t("share.stopyes"));
  if (!sure) return;

  msg.hidden = false;
  msg.textContent = t("share.stopping");
  const id = linkedHousehold();
  try {
    const cloud = await import("./cloud.js?v=38");
    await cloud.withdrawConsent(id);
  } catch (err) {
    // Even if the note cannot be written, the sharing still stops here.
  }
  window.localStorage.removeItem(HOUSEHOLD_KEY);
  rememberConsent(false);
  msg.textContent = t("share.stopped");
  await drawSharingState();
  await route();
  await showWhoHasAccess();
}

async function drawSharingState() {
  const wrap = document.getElementById("sharing-wrap");
  const state = document.getElementById("sharing-state");
  const id = linkedHousehold();
  if (!isConfigured() || !id) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  state.textContent = t("share.on");
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
    lockSay(t("lock.say"));
    return;
  }

  if (typed.length >= lock.codeLength()) return;
  typed += key;
  drawDots();

  if (typed.length < lock.codeLength()) return;

  const ok = await lock.checkCode(typed);
  if (ok) {
    hideLock();
    lockSay(t("lock.say"));
    return;
  }
  typed = "";
  drawDots();
  lockSay(t("lock.wrong"));
}

async function unlockWithFace() {
  try {
    const ok = await lock.checkFace();
    if (ok) hideLock();
    else lockSay(t("run.facefailed"));
  } catch (err) {
    lockSay(t("run.facefailed"));
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
  msg.textContent = t("run.checkingcode");

  if (!isConfigured()) {
    msg.textContent = t("run.notlinked");
    return;
  }

  try {
    const cloud = await import("./cloud.js?v=38");
    const id = await cloud.claimDeviceLink(code);
    window.localStorage.setItem(HOUSEHOLD_KEY, id);
    lock.clearLock();
    hideLock();
    say(t("run.unlocked"));
    await showWhoHasAccess();
    await syncHousehold({ loud: true });
  } catch (err) {
    msg.textContent = t("run.badlockcode") + " " + (err.message || err);
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
    ? (lock.faceReady()
        ? t("run.lockasksface", { n: lock.codeLength() })
        : t("run.lockasks", { n: lock.codeLength() }))
    : t("run.locknothing");

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

  if (one.value.length !== 4 && one.value.length !== 6) {
    msg.textContent = t("run.codeshort");
    return;
  }
  if (one.value !== two.value) {
    msg.textContent = t("run.codenomatch");
    return;
  }
  try {
    await lock.setCode(one.value);
    one.value = "";
    two.value = "";
    msg.textContent = t("run.codeset");
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
    text.textContent = t("install.text");
    button.hidden = false;
  } else {
    // iPhone, where there is no prompt to offer, only instructions.
    text.textContent = t("run.iphonehint") + " " + install.iphoneSteps();
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
  msg.textContent = t("run.onemoment");
  try {
    const cloud = await import("./cloud.js?v=38");
    const id = await cloud.claimDeviceLink(code);
    window.localStorage.setItem(HOUSEHOLD_KEY, id);
    msg.textContent = t("run.linkedfetch");
    await showWhoHasAccess();
    await syncHousehold({ loud: true });
    msg.textContent = t("run.linkedok");
    showInstallOffer(true);
  } catch (err) {
    msg.textContent = t("run.badlockcode") + " " + (err.message || err);
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
    cloud = await import("./cloud.js?v=38");
  } catch (err) {
    if (loud) say(t("run.unreachable"));
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
          // Patch 003: the checklist, the number to ring, and the words out
          // of a document. The document itself stays where it is; what is
          // needed to read it out loud is the text.
          items: Array.isArray(row.items) ? row.items : [],
          phone: row.phone || "",
          fileName: row.file_name || "",
          fileType: row.file_type || "",
          fileText: row.file_text || "",
          filePath: row.file_path || "",
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
          kind: row.kind || "normal",
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
    if (loud) say(t("run.syncproblem") + " " + (problem.message || problem));
  } else if (loud) {
    say(changed ? t("run.syncnew") : t("run.syncsame"));
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
    say(t("run.cameranotready"));
    return;
  }

  cameraMessage(t("run.livereading"));
  try {
    const text = await ocr.readText(blob, (percent) => {
      cameraMessage(t("run.livepercent", { n: percent }));
    });
    if (!text) {
      cameraMessage(t("run.nowords"));
      return;
    }
    speech.read(text.slice(0, 600), ocr.guessLang(text));
    cameraMessage(t("run.readingaloud"));
  } catch (err) {
    cameraMessage(t("run.livefailed"));
  }
}

async function usePhoto(blob) {
  pendingPhoto = blob;
  pendingText = "";
  pendingFile = null;
  pendingFileText = "";
  pendingItems = [];
  document.getElementById("file-preview").hidden = true;
  document.getElementById("file-preview").innerHTML = "";
  document.getElementById("file-doc").value = "";
  document.getElementById("f-items").value = "";
  document.getElementById("f-phone").value = "";
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
  state.textContent = t("run.letterreading");

  try {
    const text = await ocr.readText(blob, (percent) => {
      state.textContent = t("run.letterpercent", { n: percent });
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
      ? t("run.datefound", { date: readableDate(when.toISOString()) })
      : t("run.nodate");

    // S1: never file silently. What was read is on the screen, and it can be
    // heard again as often as they like.
    if (text) {
      textBox.textContent = text;
      foundBox.hidden = false;
      speech.read(text.slice(0, 600), ocr.guessLang(text));

      const makeList = document.getElementById("btn-make-list");
      makeList.hidden = false;
      makeList.onclick = () => makeChecklistFrom(text);

      // If it reads like a list, ask rather than wait to be asked.
      if (docs.looksLikeList(text)) offerChecklist(text);
    }
  } catch (err) {
    state.textContent = t("run.letterfailed");
  }
}

async function saveNew(event) {
  event.preventDefault();
  const form = event.target;
  const title = document.getElementById("f-title").value.trim();
  if (!title) {
    say(t("new.needname"));
    document.getElementById("f-title").focus();
    return;
  }

  const typedPhone = document.getElementById("f-phone").value.trim();
  if (typedPhone && !dialable(typedPhone)) {
    say(t("phone.notanumber"));
    document.getElementById("f-phone").focus();
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
    // F1, F6, F10: a document, a checklist, and a number to ring.
    hasFile: Boolean(pendingFile),
    fileName: pendingFile ? pendingFile.name : "",
    fileType: pendingFile ? pendingFile.type : "",
    fileText: pendingFileText,
    items: form.kind.value === "list" ? itemsFromForm() : [],
    phone: document.getElementById("f-phone").value.trim(),
    createdAt: new Date().toISOString()
  };

  if (pendingPhoto) await store.savePhoto(id, pendingPhoto);
  if (pendingFile) {
    await store.saveFile(id, pendingFile, pendingFile.name, pendingFile.type);
  }
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

    const asks = document.getElementById("f-remind-kind").value;
    await store.saveReminder({
      id: store.newId(),
      recordId: id,
      dueAt: new Date(dueAt).toISOString(),
      repeat: repeat,
      kind: asks === "call" && dialable(record.phone) ? "call" : "normal",
      spokenText: record.spokenText || record.title,
      lastDoneAt: null
    });
  }

  records = await store.allRecords();
  reminders = await store.allReminders();
  syncHousehold();
  pendingPhoto = null;
  pendingFile = null;
  pendingFileText = "";
  pendingItems = [];
  say(t("new.kept"));
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
      else if (!(await readAloud(sayIt.dataset.say, i18n.spokenLang()))) say(t("run.nospeech"));
      return;
    }

    const doneIt = target.closest("[data-done]");
    if (doneIt) {
      await store.markReminderDone(doneIt.dataset.done);
      reminders = await store.allReminders();
      say(t("run.markeddone"));
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

  document.getElementById("btn-read-again").addEventListener("click", async () => {
    const text = document.getElementById("ocr-text").textContent;
    if (speech.speaking()) {
      speech.stop();
      return;
    }
    if (!(await readAloud(text, ocr.guessLang(text)))) say(t("run.nospeech"));
  });

  document.getElementById("btn-shoot").addEventListener("click", async () => {
    const view = viewNow();
    const blob = await camera.capture(video, view.zoom, view.shape);
    if (!blob) {
      say(t("run.cameranotready"));
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

  // A document on the card, F1.
  const docInput = document.getElementById("file-doc");
  docInput.setAttribute("accept", docs.ACCEPTS);
  document.getElementById("btn-file").addEventListener("click", () => docInput.click());
  docInput.addEventListener("change", chooseFile);

  // The things on a checklist are only asked for when the card is one, F6.
  document.querySelectorAll('input[name="kind"]').forEach((radio) => {
    radio.addEventListener("change", showItemsField);
  });

  // F5. One way in and one way out of looking at something closely.
  document.getElementById("big-close").addEventListener("click", () => bigBox.close());
  bigBox.addEventListener("click", (event) => {
    // Anywhere outside the picture closes it, which is what a photo viewer
    // does everywhere else and therefore what a thumb expects.
    if (event.target === bigBox) bigBox.close();
  });

  document.getElementById("btn-welcome-read").addEventListener("click", () => {
    if (speech.speaking()) speech.stop();
    else speech.read(welcomeSpoken(), i18n.spokenLang());
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
    if (outcome === "accepted") say(t("run.installed"));
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

  document.getElementById("voice-pick").addEventListener("change", (event) => {
    speech.chooseVoice(event.target.value);
    const msg = document.getElementById("voice-msg");
    msg.hidden = false;
    msg.textContent = t("voice.saved");
  });
  document.getElementById("btn-voice-try").addEventListener("click", () => {
    const name = document.getElementById("voice-pick").value;
    const nl = /nl|dutch|belg/i.test(name);
    speech.sample(name, nl ? "nl-BE" : "en-GB");
  });

  document.getElementById("lang-pick").addEventListener("change", async (event) => {
    i18n.setLang(event.target.value);
    say(t("lang.changed"));
    await redrawEverything();
    // The new language deserves a voice that speaks it.
    speech.chooseVoice("");
  });
  document.getElementById("better-on").addEventListener("click", async (event) => {
    const voices = await import("./voices.js?v=38");
    const now = event.currentTarget.getAttribute("aria-pressed") !== "true";
    voices.setWanted(now);
    speech.stop();
    await drawBetterVoice();
    // Switching it back on is also asking for it, so start fetching rather
    // than leaving somebody looking at a switch that changed nothing.
    if (now && !(await voices.isReady(i18n.lang()))) getVoiceQuietly();
  });

  document.getElementById("better-get").addEventListener("click", getBetterVoice);

  document.getElementById("better-try").addEventListener("click", () => {
    if (speech.speaking()) {
      speech.stop();
      return;
    }
    speech.read(t("better.sample"), i18n.spokenLang());
  });

  document.getElementById("better-remove").addEventListener("click", async () => {
    const voices = await import("./voices.js?v=38");
    speech.stop();
    await voices.remove(i18n.lang());
    voices.setWanted(false);
    await drawBetterVoice();
  });

  document.getElementById("btn-export").addEventListener("click", exportEverything);

  document.querySelectorAll("[data-filter]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const kind = chip.dataset.filter;
      showing[kind] = !showing[kind];
      chip.setAttribute("aria-pressed", showing[kind] ? "true" : "false");
      renderRecords(document.getElementById("search").value);
    });
  });

  document.getElementById("lang-pick").addEventListener("change", async (event) => {
    i18n.setLang(event.target.value);
    say(t("lang.changed"));
    await redrawEverything();
    // The new language deserves a voice that speaks it.
    speech.chooseVoice("");
  });
  document.getElementById("btn-export").addEventListener("click", exportEverything);

  document.getElementById("btn-consent-read").addEventListener("click", readNotice);
  document.getElementById("btn-consent-yes").addEventListener("click", consentYes);
  document.getElementById("btn-consent-no").addEventListener("click", consentNo);
  document.getElementById("btn-stop-sharing").addEventListener("click", stopSharing);

  document.getElementById("form-setcode").addEventListener("submit", saveCode);
  document.getElementById("btn-lock-off").addEventListener("click", async () => {
    lock.clearLock();
    document.getElementById("lock-msg").hidden = false;
    document.getElementById("lock-msg").textContent = t("run.codeoff");
    await drawLockSettings();
  });
  document.getElementById("btn-lock-now").addEventListener("click", () => {
    document.getElementById("help").close();
    showLock();
  });
  document.getElementById("btn-face-on").addEventListener("click", async () => {
    const msg = document.getElementById("lock-msg");
    msg.hidden = false;
    msg.textContent = t("run.facelook");
    try {
      await lock.addFace("her phone");
      msg.textContent = t("run.faceon");
    } catch (err) {
      msg.textContent = t("run.facefailed") + " " + (err.message || err);
    }
    await drawLockSettings();
  });
  document.getElementById("btn-face-off").addEventListener("click", async () => {
    lock.removeFace();
    document.getElementById("lock-msg").hidden = false;
    document.getElementById("lock-msg").textContent = t("run.faceoff");
    await drawLockSettings();
  });

  document.getElementById("btn-stuck-retry").addEventListener("click", async () => {
    const msg = document.getElementById("stuck-msg");
    msg.hidden = false;
    msg.textContent = t("run.onemoment");
    try {
      await store.allRecords();
      msg.textContent = t("stuck.opened");
      window.setTimeout(() => window.location.reload(), 900);
    } catch (err) {
      msg.textContent = t("stuck.closeall");
    }
  });
  document.getElementById("btn-stuck-fresh").addEventListener("click", async () => {
    const msg = document.getElementById("stuck-msg");
    if (!await ask(t("stuck.freshask"), t("stuck.fresh"))) return;
    msg.hidden = false;
    msg.textContent = t("run.clearing");
    try {
      await store.startFresh();
      window.location.reload();
    } catch (err) {
      // Even the reset can be blocked by another tab holding the store open.
      msg.textContent = t("stuck.closeall");
    }
  });

  const help = document.getElementById("help");
  document.getElementById("btn-help").addEventListener("click", async () => {
    await drawLockSettings();
    await drawSharingState();
    await drawVoices();
    drawLanguages();
    await drawKnows();
    await drawSeen();
    await drawBetterVoice();
    help.showModal();
  });
  document.getElementById("help-close").addEventListener("click", () => help.close());

  if (isConfigured()) {
    document.getElementById("link-wrap").hidden = false;
    document.getElementById("form-link").addEventListener("submit", linkThisPhone);
    document.getElementById("btn-refresh").hidden = false;
    document.getElementById("btn-refresh").addEventListener("click", async () => {
      say(t("run.looking"));
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
    const cloud = await import("./cloud.js?v=38");
    const id = await cloud.claimDeviceLink(code);
    window.localStorage.setItem(HOUSEHOLD_KEY, id);
    say(t("run.linkedfamily"));
    return true;
  } catch (err) {
    say(t("run.linkfailed") + " " + (err.message || err));
    return false;
  }
}

async function init() {
  // Before anything is drawn or read out, so nothing is ever shown in the
  // wrong language even for a moment.
  i18n.apply();

  wire();

  // Chrome and Safari hand over the voice list a moment after the page loads,
  // so anything asking which voices exist has to wait for this.
  if (speech.canSpeak() && window.speechSynthesis.addEventListener) {
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      const pick = document.getElementById("voice-pick");
      // Not awaited: this fires whenever the browser feels like it and
      // nothing here depends on the redraw having finished.
      if (pick && document.getElementById("help").open) drawVoices();
    });
  }

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
    say(err.message || t("run.storefailed"));
  }

  const linked = await claimFromLink();

  // P4. Nothing is sent anywhere until she has been asked, out loud, on this
  // phone. The sync below is the first thing that would send anything, so the
  // question comes before it and not after.
  if (await consentNeeded()) {
    show("consent");
    speech.read(noticeSpoken(), i18n.spokenLang());
    return;
  }

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

  // Last, and never awaited: the good voice fetches itself in the background
  // so it is simply there rather than waiting to be discovered in a settings
  // screen. Until it arrives, and if it never does, the phone's own voice
  // reads. Nothing here can stop the app working.
  getVoiceQuietly();
}

/* Fetch the voice without making a fuss about it.

   No progress bar on the Today screen: she did not ask for this and it must
   not look like something is happening to her phone. The help screen is where
   the progress is, for anybody who goes looking. If it fails, it fails
   quietly, because the app is already reading with the phone's own voice and
   there is nothing for her to do about it. */
async function getVoiceQuietly() {
  try {
    const voices = await import("./voices.js?v=38");
    const what = await voices.fetchIfSensible(i18n.lang(), () => {
      // The bar only exists while the help screen is open.
      const bar = document.getElementById("better-bar");
      if (bar && !document.getElementById("help").open) return;
      drawVoiceProgress();
    });
    if (what === "got" && document.getElementById("help").open) await drawBetterVoice();
  } catch (err) {
    // The module would not load. The phone's own voice is already in use.
  }
}

function drawVoiceProgress() {
  const bar = document.getElementById("better-bar");
  if (bar) bar.hidden = false;
}

init();
