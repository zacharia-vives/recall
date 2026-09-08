// OCR and date reading.
// Requirement P2: this runs on the device. A hospital letter never leaves the
// phone, so we load Tesseract in the page and never call a cloud service.
// Requirement P3: the national number and IBANs are removed before we keep the
// text anywhere.

const TESSERACT_URL = "https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.0/tesseract.min.js";

let loading = null;

function loadLibrary() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = TESSERACT_URL;
    tag.onload = () => resolve(window.Tesseract);
    tag.onerror = () => reject(new Error("Tesseract could not load"));
    document.head.appendChild(tag);
  });
  return loading;
}

// P3. The rijksregisternummer is 11 digits, usually written 41.03.17-286.55.
// We do not need it for anything, so we never store it.
export function redact(text) {
  let out = text;
  out = out.replace(/\b\d{2}[.\-\s]?\d{2}[.\-\s]?\d{2}[-\s]?\d{3}[.\-\s]?\d{2}\b/g, "[national number removed]");
  out = out.replace(/\b[A-Z]{2}\d{2}[\sA-Z0-9]{8,26}\b/g, "[account number removed]");
  return out;
}

export async function readText(blob, onProgress) {
  const Tesseract = await loadLibrary();
  const result = await Tesseract.recognize(blob, "nld+eng", {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text") {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });
  const raw = result.data.text || "";
  return redact(raw.replace(/\s+\n/g, "\n").trim());
}

const MONTHS = {
  januari: 0, februari: 1, maart: 2, april: 3, mei: 4, juni: 5,
  juli: 6, augustus: 7, september: 8, oktober: 9, november: 10, december: 11,
  jan: 0, feb: 1, mrt: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, okt: 9, nov: 10, dec: 11
};

function findTime(text) {
  const m = text.match(/\b(\d{1,2})[:.u]\s?(\d{2})?\b/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = m[2] ? parseInt(m[2], 10) : 0;
  if (hour > 23 || minute > 59) return null;
  return { hour: hour, minute: minute };
}

// Looks for "14 maart 2026" and for "14/03/2026" or "14-03-2026".
// Returns a Date or null. Requirement S1: we never save this without showing it
// to the user first.
export function findDate(text) {
  const lower = text.toLowerCase();
  const time = findTime(lower);

  const written = lower.match(/\b(\d{1,2})\s+([a-z]{3,9})\.?\s+(\d{4})\b/);
  if (written && MONTHS[written[2]] !== undefined) {
    const d = new Date(
      parseInt(written[3], 10),
      MONTHS[written[2]],
      parseInt(written[1], 10),
      time ? time.hour : 9,
      time ? time.minute : 0
    );
    if (!isNaN(d.getTime())) return d;
  }

  const numeric = lower.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
  if (numeric) {
    let year = parseInt(numeric[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(
      year,
      parseInt(numeric[2], 10) - 1,
      parseInt(numeric[1], 10),
      time ? time.hour : 9,
      time ? time.minute : 0
    );
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

// Which voice should read this text back? A Belgian letter is usually Dutch even
// though our interface is English, and reading Dutch with an English voice is
// unpleasant to listen to. This is deliberately crude and good enough.
export function guessLang(text) {
  const words = text.toLowerCase().split(/[^a-z]+/);
  const dutchHints = ["de", "het", "een", "uw", "van", "niet", "met", "voor", "bij", "wij"];
  let hits = 0;
  for (const w of words) {
    if (dutchHints.includes(w)) hits += 1;
  }
  return hits >= 3 ? "nl-BE" : "en-GB";
}

// The first line that looks like a title, used to prefill the name of the card.
export function guessTitle(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 4);
  if (lines.length === 0) return "";
  return lines[0].slice(0, 60);
}
