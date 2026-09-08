// Store: everything is kept on the device in IndexedDB.
// Requirement P1: local only by default, nothing leaves the phone unless the
// user signs in later. The Supabase adapter comes in step 5 and gets the same
// four functions, so nothing above this file has to change.

const DB_NAME = "recall";
const DB_VERSION = 1;

let db = null;

function open() {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("records")) {
        const s = d.createObjectStore("records", { keyPath: "id" });
        s.createIndex("createdAt", "createdAt");
      }
      if (!d.objectStoreNames.contains("photos")) {
        d.createObjectStore("photos", { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      db = req.result;
      resolve(db);
    };
    req.onerror = () => reject(req.error);
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
  // Requirement P8: the photo goes too, not only the row.
  const photos = await tx("photos", "readwrite");
  await ask(photos.delete(id));
}

export async function savePhoto(id, blob) {
  const store = await tx("photos", "readwrite");
  await ask(store.put({ id: id, blob: blob }));
}

export async function photoUrl(id) {
  const store = await tx("photos", "readonly");
  const row = await ask(store.get(id));
  if (!row) return null;
  return URL.createObjectURL(row.blob);
}

// A few example cards on first run, so the app is never an empty screen.
export async function seedIfEmpty() {
  const rows = await allRecords();
  if (rows.length > 0) return rows;

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  tomorrow.setHours(10, 0, 0, 0);

  const examples = [
    {
      id: newId(),
      kind: "letter",
      title: "Cardiology, check-up",
      people: ["doctor Vermeulen", "Marie (daughter)"],
      place: "AZ Groeninge, Kortrijk",
      happensAt: tomorrow.toISOString(),
      tags: ["appointment", "heart"],
      remind: "day-before",
      spokenText: "Your appointment with the cardiologist is tomorrow at ten, at AZ Groeninge.",
      ocrText: "",
      hasPhoto: false,
      createdAt: new Date(now.getTime() - 3600 * 1000).toISOString(),
      example: true
    },
    {
      id: newId(),
      kind: "person",
      title: "Marie, your daughter",
      people: ["Marie"],
      place: "Gent",
      happensAt: "",
      tags: ["family"],
      remind: "",
      spokenText: "This is Marie, your daughter. She called on Tuesday evening.",
      ocrText: "",
      hasPhoto: false,
      createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      example: true
    },
    {
      id: newId(),
      kind: "place",
      title: "The bench at Sint-Anna",
      people: ["Jan", "Marie"],
      place: "Sint-Anna park",
      happensAt: "",
      tags: ["1963"],
      remind: "",
      spokenText: "The bench at Sint-Anna, where you and Jan sat in 1963.",
      ocrText: "",
      hasPhoto: false,
      createdAt: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
      example: true
    }
  ];

  for (const r of examples) {
    await saveRecord(r);
  }
  return allRecords();
}
