import * as i18n from "./i18n.js?v=38";

// Store: everything is kept on the device in IndexedDB.
// Requirement P1: local only by default, nothing leaves the phone unless a
// helper links it to a household. js/cloud.js does that half, and it is never
// loaded unless js/config.js is filled in.

const DB_NAME = "recall";
// 3 added the files store, for a card that holds a document. F1.
const DB_VERSION = 3;

// Bump this when the example cards change. Anyone who already used the app then
// loses the old examples and gets the new ones, while their own cards are left
// alone.
// 4: the example cards were hardcoded English, so a Dutch phone opened on
// "Cardiology, check-up". Bumped so the phones that already have the English
// ones replace them. The examples keep the language they were made in, which
// is the same rule as a real card: switching the interface to French does not
// rewrite a Dutch letter.
const SEED_VERSION = 4;
const SEED_KEY = "recall.seedVersion";

let db = null;

function open() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    // If another tab still holds an older version of the database, the upgrade
    // is blocked and this request would otherwise wait for ever without an
    // error. Fail loudly instead, so the app can say something useful.
    req.onblocked = () => {
      const err = new Error(i18n.t("store.othertab"));
      err.stuck = true;
      reject(err);
    };
    // Seen on a real browser: every open on this database name hangs with no
    // error and no blocked event, because the store itself is wedged. Nothing
    // in here can repair that, so fail in a way the app can offer a way out of.
    window.setTimeout(() => {
      if (!db) {
        const err = new Error(i18n.t("store.wontopen"));
        err.stuck = true;
        reject(err);
      }
    }, 8000);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("records")) {
        const s = d.createObjectStore("records", { keyPath: "id" });
        s.createIndex("createdAt", "createdAt");
      }
      if (!d.objectStoreNames.contains("photos")) {
        d.createObjectStore("photos", { keyPath: "id" });
      }
      // A card can hold one document as well as one photo. Kept in its own
      // store for the same reason photos are: a card is read constantly and
      // a file is read rarely, and nobody wants to drag a docx through every
      // list render. F1.
      if (!d.objectStoreNames.contains("files")) {
        d.createObjectStore("files", { keyPath: "id" });
      }
      if (!d.objectStoreNames.contains("reminders")) {
        const r = d.createObjectStore("reminders", { keyPath: "id" });
        r.createIndex("recordId", "recordId");
        r.createIndex("dueAt", "dueAt");
      }
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

// R8.2. The last way out. Cards that came from the family are in the household
// and come straight back; cards that only ever lived on this device are gone,
// which is why the screen that calls this says so in those words.
export function startFresh() {
  db = null;
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error || new Error("The store would not go."));
    req.onblocked = () => reject(new Error(i18n.t("store.closetabs")));
    // Seen for real: the browser itself was still holding the old store open,
    // and no tab of ours could make it let go. Closing the browser completely
    // and opening it again is the thing that actually works, so say that.
    window.setTimeout(() => reject(new Error(
      "The store would not go. Close every Recall tab, then close the browser "
      + "completely and open it again. Your family cards are safe."
    )), 8000);
  });
}

function tx(storeName, mode) {
  return open().then((d) => d.transaction(storeName, mode).objectStore(storeName));
}

function ask(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "r" + Date.now() + Math.floor(Math.random() * 1000);
}

/* ----------------------------------------------------------------- records */

export async function allRecords() {
  const store = await tx("records", "readonly");
  const rows = await ask(store.getAll());
  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return rows;
}

export async function getRecord(id) {
  const store = await tx("records", "readonly");
  return ask(store.get(id));
}

export async function saveRecord(record) {
  const store = await tx("records", "readwrite");
  await ask(store.put(record));
  return record;
}

export async function deleteRecord(id) {
  const store = await tx("records", "readwrite");
  await ask(store.delete(id));
  // Requirement P8: the photo, the document and the reminders go too, not
  // only the row. A card that is deleted leaves nothing behind.
  const photos = await tx("photos", "readwrite");
  await ask(photos.delete(id));
  const files = await tx("files", "readwrite");
  await ask(files.delete(id));
  const rems = await remindersFor(id);
  for (const r of rems) await deleteReminder(r.id);
}

/* ------------------------------------------------------------------ photos */

export async function savePhoto(id, blob) {
  const store = await tx("photos", "readwrite");
  await ask(store.put({ id: id, blob: blob }));
}

export async function hasPhotoStored(id) {
  const store = await tx("photos", "readonly");
  const row = await ask(store.get(id));
  return Boolean(row);
}

// The export needs the picture itself rather than a link to it, because a
// blob url dies with the page and a copy of your things should not. P21.
export async function saveFile(id, blob, name, type) {
  const store = await tx("files", "readwrite");
  await ask(store.put({ id: id, blob: blob, name: name || "", type: type || "" }));
}

export async function fileRow(id) {
  const store = await tx("files", "readonly");
  const row = await ask(store.get(id));
  return row || null;
}

export async function hasFileStored(id) {
  const row = await fileRow(id);
  return Boolean(row);
}

export async function deleteFile(id) {
  const store = await tx("files", "readwrite");
  await ask(store.delete(id));
}

export async function photoBlob(id) {
  const store = await tx("photos", "readonly");
  const row = await ask(store.get(id));
  return row ? row.blob : null;
}

export async function photoUrl(id) {
  const store = await tx("photos", "readonly");
  const row = await ask(store.get(id));
  if (!row) return null;
  return URL.createObjectURL(row.blob);
}

/* --------------------------------------------------------------- reminders */

export async function allReminders() {
  const store = await tx("reminders", "readonly");
  const rows = await ask(store.getAll());
  rows.sort((a, b) => (a.dueAt > b.dueAt ? 1 : -1));
  return rows;
}

export async function remindersFor(recordId) {
  const rows = await allReminders();
  return rows.filter((r) => r.recordId === recordId);
}

export async function saveReminder(reminder) {
  const store = await tx("reminders", "readwrite");
  await ask(store.put(reminder));
  return reminder;
}

export async function deleteReminder(id) {
  const store = await tx("reminders", "readwrite");
  await ask(store.delete(id));
}

// One row per record with a repeat on it, instead of a new row for every
// occurrence. Requirement R3.3.
export function periodMs(repeat) {
  if (repeat === "daily") return 24 * 3600 * 1000;
  if (repeat === "twice_daily") return 12 * 3600 * 1000;
  if (repeat === "weekly") return 7 * 24 * 3600 * 1000;
  return 0;
}

// R3.4. Marking done is the answer to "did I take it?", so a repeating reminder
// moves on to its next time instead of disappearing.
export async function markReminderDone(id) {
  const store = await tx("reminders", "readwrite");
  const reminder = await ask(store.get(id));
  if (!reminder) return null;

  reminder.lastDoneAt = new Date().toISOString();
  const step = periodMs(reminder.repeat);
  if (step > 0) {
    let next = new Date(reminder.dueAt).getTime();
    const now = Date.now();
    while (next <= now) next += step;
    reminder.dueAt = new Date(next).toISOString();
  }
  await ask(store.put(reminder));
  return reminder;
}

// Three values and no more, the same three the family side sees (P17).
// Long enough for a clock that is off by a few minutes, and for somebody who
// is at the appointment while it is happening. Short enough that a morning
// appointment shows as missed the same afternoon rather than the next day.
const GRACE_MS = 60 * 60 * 1000;

export function reminderStatus(reminder) {
  const due = new Date(reminder.dueAt).getTime();
  const now = Date.now();
  const step = periodMs(reminder.repeat);

  if (reminder.lastDoneAt) {
    const done = new Date(reminder.lastDoneAt).getTime();
    if (step === 0) return "done";
    if (now - done < step) return "done";
  }
  if (due < now - GRACE_MS) return "missed";
  return "coming";
}

// What the today screen shows: due in the next two days, plus anything overdue
// that was never marked done.
export async function dueSoon() {
  const rows = await allReminders();
  const horizon = Date.now() + 48 * 3600 * 1000;
  return rows.filter((r) => {
    const status = reminderStatus(r);
    if (status === "missed") return true;
    if (status === "done") return false;
    return new Date(r.dueAt).getTime() <= horizon;
  });
}

/* -------------------------------------------------------------- the seeds */

// A few example cards on first run, so the app is never an empty screen.
export async function seedIfEmpty() {
  let rows = await allRecords();

  let seeded = null;
  try {
    seeded = window.localStorage.getItem(SEED_KEY);
  } catch (err) {
    seeded = null;
  }

  if (seeded === String(SEED_VERSION)) return rows;

  // Old examples go, whatever language they were in. Cards the user made
  // themselves are never touched.
  for (const r of rows) {
    if (r.example) await deleteRecord(r.id);
  }
  rows = await allRecords();

  try {
    window.localStorage.setItem(SEED_KEY, String(SEED_VERSION));
  } catch (err) {
    // private mode, no problem, the examples just come back next time
  }

  if (rows.length > 0) return rows;

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  tomorrow.setHours(10, 0, 0, 0);
  const tonight = new Date(now.getTime() + 3 * 3600 * 1000);

  const letterId = newId();
  const personId = newId();
  const placeId = newId();

  const examples = [
    {
      id: letterId,
      kind: "letter",
      title: i18n.t("seed.lettertitle"),
      people: [i18n.t("seed.letterdoctor"), i18n.t("seed.letterdaughter")],
      place: "AZ Groeninge, Kortrijk",
      happensAt: tomorrow.toISOString(),
      tags: ["appointment", "heart"],
      spokenText: i18n.t("seed.letterspoken"),
      ocrText: "",
      hasPhoto: false,
      createdAt: new Date(now.getTime() - 3600 * 1000).toISOString(),
      example: true
    },
    {
      id: personId,
      kind: "person",
      title: i18n.t("seed.persontitle"),
      people: ["Marie"],
      place: "Gent",
      happensAt: "",
      tags: ["family"],
      spokenText: i18n.t("seed.personspoken"),
      ocrText: "",
      hasPhoto: false,
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      example: true
    },
    {
      id: placeId,
      kind: "place",
      title: i18n.t("seed.placetitle"),
      people: ["Jan", "Marie"],
      place: i18n.t("seed.placewhere"),
      happensAt: "",
      tags: ["1963"],
      spokenText: i18n.t("seed.placespoken"),
      ocrText: "",
      hasPhoto: false,
      createdAt: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
      example: true
    }
  ];

  for (const r of examples) await saveRecord(r);

  // One appointment reminder and one repeating one, so the today screen shows
  // both shapes from the first minute.
  await saveReminder({
    id: newId(),
    recordId: letterId,
    dueAt: new Date(tomorrow.getTime() - 24 * 3600 * 1000).toISOString(),
    repeat: "none",
    spokenText: "Your appointment with the cardiologist is tomorrow at ten.",
    lastDoneAt: null,
    example: true
  });
  await saveReminder({
    id: newId(),
    recordId: personId,
    dueAt: tonight.toISOString(),
    repeat: "daily",
    spokenText: "Marie calls around seven in the evening.",
    lastDoneAt: null,
    example: true
  });

  return allRecords();
}
