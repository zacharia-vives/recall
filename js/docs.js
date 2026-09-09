// Reading a document, on the device. Requirement F3.
//
// A letter often arrives as an attachment rather than on paper, and asking
// somebody to photograph a screen is a poor answer. So a card can hold a file,
// and Recall gets the words out of it so it can be read out loud like anything
// else.
//
// A .docx and a .odt are both zip archives with one xml file inside that holds
// the text. Browsers do not ship an unzip, but they do ship an inflater:
// DecompressionStream("deflate-raw") is exactly the algorithm a zip uses. So
// the zip directory is walked by hand here, which is about eighty lines, and
// no library is loaded and nothing is uploaded. That matters more than usual
// for this app: the whole promise is that a hospital letter is read on the
// phone and never sent anywhere to be read.

const TEXT_TYPES = /^(text\/|application\/json|application\/xml)/;
const TEXT_NAMES = /\.(txt|md|markdown|csv|tsv|log|json|xml|ics|vcf|rtf)$/i;
const ZIP_NAMES = /\.(docx|odt|pptx|xlsx)$/i;
const PDF_NAMES = /\.pdf$/i;

export function looksLikeText(file) {
  return TEXT_TYPES.test(file.type || "") || TEXT_NAMES.test(file.name || "");
}

export function looksLikeZipDoc(file) {
  return ZIP_NAMES.test(file.name || "") ||
    /officedocument|opendocument/.test(file.type || "");
}

export function looksLikePdf(file) {
  return PDF_NAMES.test(file.name || "") || (file.type || "") === "application/pdf";
}

// What kind of thing is this, in one word, for deciding how to show it.
export function shapeOf(file) {
  if (!file) return "none";
  if ((file.type || "").startsWith("image/")) return "image";
  if (looksLikePdf(file)) return "pdf";
  if (looksLikeText(file)) return "text";
  if (looksLikeZipDoc(file)) return "document";
  return "other";
}

/* ------------------------------------------------------------ zip, by hand */

function findEndOfDirectory(view) {
  // The end record is at the tail, after a comment that is almost always
  // empty, so walk backwards a little rather than scanning the whole file.
  const start = Math.max(0, view.byteLength - 66000);
  for (let at = view.byteLength - 22; at >= start; at -= 1) {
    if (view.getUint32(at, true) === 0x06054b50) return at;
  }
  return -1;
}

function readName(bytes, at, length) {
  return new TextDecoder("utf-8").decode(new Uint8Array(bytes, at, length));
}

// Every file in the archive, with where its bytes begin.
function listEntries(buffer) {
  const view = new DataView(buffer);
  const end = findEndOfDirectory(view);
  if (end < 0) return [];

  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries = [];

  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(at, true) !== 0x02014b50) break;
    const nameLength = view.getUint16(at + 28, true);
    const extraLength = view.getUint16(at + 30, true);
    const commentLength = view.getUint16(at + 32, true);
    entries.push({
      name: readName(buffer, at + 46, nameLength),
      method: view.getUint16(at + 10, true),
      compressedSize: view.getUint32(at + 20, true),
      headerAt: view.getUint32(at + 42, true)
    });
    at += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Response(stream).arrayBuffer();
}

async function readFromZip(buffer, wanted) {
  const entries = listEntries(buffer);
  const entry = entries.find((one) => wanted.includes(one.name));
  if (!entry) return "";

  const view = new DataView(buffer);
  if (view.getUint32(entry.headerAt, true) !== 0x04034b50) return "";
  const nameLength = view.getUint16(entry.headerAt + 26, true);
  const extraLength = view.getUint16(entry.headerAt + 28, true);
  const from = entry.headerAt + 30 + nameLength + extraLength;
  const raw = buffer.slice(from, from + entry.compressedSize);

  // 0 is stored as it is, 8 is deflate. Anything else is rare enough that
  // saying so beats guessing.
  if (entry.method === 0) return new TextDecoder("utf-8").decode(raw);
  if (entry.method !== 8) return "";
  const out = await inflate(raw);
  return new TextDecoder("utf-8").decode(out);
}

/* ------------------------------------------------------- xml to plain words */

function unescapeXml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&");
}

function wordsFromXml(xml) {
  let out = xml;
  // A paragraph or a row ends a line. Everything else is markup around words.
  out = out.replace(/<w:tab[^>]*\/>/g, "\t");
  out = out.replace(/<w:br[^>]*\/>/g, "\n");
  out = out.replace(/<\/w:p>/g, "\n");
  out = out.replace(/<text:tab[^>]*\/>/g, "\t");
  out = out.replace(/<text:line-break[^>]*\/>/g, "\n");
  out = out.replace(/<\/text:(p|h)>/g, "\n");
  out = out.replace(/<\/a:p>/g, "\n");
  out = out.replace(/<[^>]+>/g, "");
  out = unescapeXml(out);
  out = out.replace(/\r/g, "");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

/* --------------------------------------------------------------- the reader */

// Everything this can read, in the words the app uses.
export const ACCEPTS =
  ".txt,.md,.csv,.tsv,.log,.json,.xml,.rtf,.docx,.odt,.pdf," +
  "text/plain,text/csv,application/pdf," +
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
  "application/vnd.oasis.opendocument.text";

// The words in a file, or an empty string when they cannot be had. Never
// throws for a file it simply cannot read: a document that will not open is
// still worth keeping, and the card says so.
export async function readWords(file) {
  const shape = shapeOf(file);
  try {
    if (shape === "text") {
      const text = await file.text();
      // An rtf is text with a lot of control words in it. Strip the obvious
      // ones rather than pretending it is plain.
      if (/\.rtf$/i.test(file.name || "")) {
        return text
          .replace(/\\'([0-9a-f]{2})/gi, (m, hex) => String.fromCharCode(parseInt(hex, 16)))
          .replace(/\\par[d]?\b/g, "\n")
          .replace(/\{\\\*[^{}]*\}/g, "")
          .replace(/\\[a-z]+-?\d* ?/gi, "")
          .replace(/[{}]/g, "")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }
      return text.trim();
    }

    if (shape === "document") {
      const buffer = await file.arrayBuffer();
      const xml = await readFromZip(buffer, [
        "word/document.xml",   // docx
        "content.xml"          // odt
      ]);
      return wordsFromXml(xml);
    }
  } catch (err) {
    // A file that cannot be unpacked is not an error worth shouting about.
    window.console.info("Recall: could not read the words out of this file.", err);
  }
  return "";
}

// A pdf shows itself: every browser can draw one. Getting the words out needs
// a library we have decided not to load, so the card says plainly that it can
// be looked at but not read out loud, which is better than pretending.
export function canBeReadAloud(file) {
  const shape = shapeOf(file);
  return shape === "text" || shape === "document";
}

/* ------------------------------------------------------------- a checklist */

// Turning what was read into items. This runs on a photographed list as well
// as on a document, so it has to cope with bullets, dashes, numbers, tick
// boxes drawn by hand, and the odd line that is really a heading.
export function itemsFromText(text) {
  const lines = String(text || "").split("\n");
  const items = [];

  lines.forEach((raw) => {
    let line = raw.trim();
    if (!line) return;

    // Strip whatever was used to mark the line as an item.
    const marked = /^([-*•·▢□☐■☑✓✔x]|\[\s*[xX]?\s*\]|\(\s*[xX]?\s*\)|\d{1,2}[.)])\s+/.exec(line);
    const already = /^(\[\s*[xX]\s*\]|\(\s*[xX]\s*\)|[☑✔✓■])/.test(line);
    if (marked) line = line.slice(marked[0].length).trim();

    // A line with no marker and no other marked lines around it is still
    // probably an item on a photographed list, so keep it, but drop the
    // obvious page furniture.
    if (!line || line.length < 2) return;
    if (/^[-=_.·•\s]+$/.test(line)) return;
    if (line.length > 120) return;

    items.push({ text: line.slice(0, 120), done: already });
  });

  return items;
}

// A photographed list usually has its own heading at the top, with no marker
// in front of it because it is not an item. Take it as the name of the card
// instead of the first thing to tick off.
export function listFromText(text) {
  const lines = String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  const isMarked = (line) =>
    /^([-*•·▢□☐■☑✓✔]|\[\s*[xX]?\s*\]|\(\s*[xX]?\s*\)|\d{1,2}[.)])\s+/.test(line);

  let title = "";
  let rest = lines;
  const markedLater = lines.slice(1).filter(isMarked).length;
  if (lines.length > 2 && !isMarked(lines[0]) && markedLater >= 2) {
    title = lines[0].slice(0, 60);
    rest = lines.slice(1);
  }
  return { title: title, items: itemsFromText(rest.join("\n")) };
}

// Does this read like a list rather than a letter? Used to offer turning a
// photo into a checklist instead of asking every time.
export function looksLikeList(text) {
  const lines = String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 3) return false;
  const marked = lines.filter((l) =>
    /^([-*•·▢□☐■☑✓✔]|\[\s*[xX]?\s*\]|\d{1,2}[.)])\s+/.test(l)).length;
  const shortOnes = lines.filter((l) => l.length <= 60).length;
  // Either most lines carry a marker, or they are all short and there are
  // several of them, which is what a handwritten list looks like once read.
  return marked >= Math.max(2, lines.length * 0.4) ||
    (lines.length >= 4 && shortOnes >= lines.length * 0.8);
}
