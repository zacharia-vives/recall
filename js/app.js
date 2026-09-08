// Recall - main script. Four screens, switched on the hash, so the app works
// from a plain static host with no server and no build step.

import * as store from "./store.js";
import * as speech from "./speech.js";
import * as camera from "./camera.js";
import * as ocr from "./ocr.js";

const KINDS = {
  letter: { label: "Letter", badge: "L" },
  person: { label: "Person", badge: "P" },
  place: { label: "Place", badge: "●" }
};

const screens = {
  today: document.getElementById("screen-today"),
  records: document.getElementById("screen-records"),
  record: document.getElementById("screen-record"),
  capture: document.getElementById("screen-capture"),
  new: document.getElementById("screen-new")
};

const video = document.getElementById("video");
const toast = document.getElementById("toast");

let records = [];
let pendingPhoto = null; // the blob we just took, waiting to be saved
let pendingText = "";    // the text we read off it, also waiting

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

function renderToday() {
  const dateEl = document.getElementById("today-date");
  dateEl.textContent = new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long"
  });

  const due = records.filter(isDueSoon);
  const list = document.getElementById("today-list");

  if (due.length === 0) {
    list.innerHTML =
      '<p class="empty">Nothing is due today or tomorrow.<br>' +
      "Point the camera at a letter to add something.</p>";
    return;
  }
  list.innerHTML = due.map((r) => cardHtml(r, "due")).join("");
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

  const rows = [
    ["Kind", (KINDS[record.kind] || KINDS.letter).label],
    ["Who", (record.people || []).join(", ")],
    ["Where", record.place],
    ["When", readableDate(record.happensAt)],
    ["Tags", (record.tags || []).join(", ")],
    ["Reminder", record.remind === "day-before" ? "the day before"
      : record.remind === "daily" ? "every day"
      : record.remind === "twice" ? "twice a day" : "none"]
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
  renderToday();
}

/* the capture and save flow */

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

    if (text) speech.speak(text.slice(0, 400), ocr.guessLang(text));
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
  records = await store.allRecords();
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

  document.addEventListener("click", (event) => {
    const card = event.target.closest("[data-open]");
    if (card) go("#/record/" + card.dataset.open);
  });

  document.getElementById("search").addEventListener("input", (e) => renderRecords(e.target.value));

  document.getElementById("zoom").addEventListener("input", (e) => {
    camera.setZoom(video, Number(e.target.value));
  });

  document.getElementById("btn-shoot").addEventListener("click", async () => {
    const blob = await camera.capture(video);
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

  const help = document.getElementById("help");
  document.getElementById("btn-help").addEventListener("click", () => help.showModal());
  document.getElementById("help-close").addEventListener("click", () => help.close());
}

async function init() {
  wire();
  records = await store.seedIfEmpty();
  await route();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {
      // no offline mode, the app still works
    });
  }
}

init();
