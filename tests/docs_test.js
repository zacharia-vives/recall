// Reading a document, checked without a browser. Run with:
//     node tests/docs_test.js
//
// The interesting half is the unzip. A .docx is a zip archive, browsers do not
// ship an unzip, and js/docs.js walks the zip directory by hand and inflates
// with DecompressionStream. That is the riskiest code in the feature, so this
// builds a real .docx here with node's own zlib and checks the words come back
// out of it. If the zip walking is wrong, this fails rather than a jury
// finding out.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.dirname(__dirname);

// Load docs.js as a module would see it, minus the export keywords.
const source = fs.readFileSync(path.join(root, "js", "docs.js"), "utf8")
  .replace(/export (async function|function|const)/g, "$1");
const docs = new Function(
  "window",
  source + "; return { readWords, shapeOf, itemsFromText, listFromText, looksLikeList, canBeReadAloud, ACCEPTS };"
)({ console: { info: () => {} } });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: detail === undefined ? "" : String(detail) });
}

/* ------------------------------------------------- building a real docx */

function zipOf(entries) {
  // One local header plus data per entry, then a central directory, then the
  // end record. Deliberately the same layout js/docs.js expects to read.
  const locals = [];
  const central = [];
  let at = 0;

  entries.forEach((entry) => {
    const name = Buffer.from(entry.name, "utf8");
    const raw = Buffer.from(entry.body, "utf8");
    const compressed = entry.store ? raw : zlib.deflateRawSync(raw);
    const method = entry.store ? 0 : 8;
    const crc = zlib.crc32 ? zlib.crc32(raw) : 0;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    const dir = Buffer.alloc(46);
    dir.writeUInt32LE(0x02014b50, 0);
    dir.writeUInt16LE(20, 4);
    dir.writeUInt16LE(20, 6);
    dir.writeUInt16LE(0, 8);
    dir.writeUInt16LE(method, 10);
    dir.writeUInt32LE(crc, 16);
    dir.writeUInt32LE(compressed.length, 20);
    dir.writeUInt32LE(raw.length, 24);
    dir.writeUInt16LE(name.length, 28);
    dir.writeUInt32LE(at, 42);

    locals.push(local, name, compressed);
    central.push(dir, name);
    at += local.length + name.length + compressed.length;
  });

  const body = Buffer.concat(locals);
  const directory = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(body.length, 16);

  return Buffer.concat([body, directory, end]);
}

// What the app is handed by a file input, near enough for this.
function asFile(name, type, buffer) {
  return {
    name: name,
    type: type,
    size: buffer.length,
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length),
    text: async () => buffer.toString("utf8")
  };
}

const LETTER =
  '<?xml version="1.0"?><w:document xmlns:w="x"><w:body>' +
  "<w:p><w:r><w:t>AZ Groeninge, Kortrijk</w:t></w:r></w:p>" +
  "<w:p><w:r><w:t>Uw afspraak bij de cardioloog is op 14/10/2026 om 10:30.</w:t></w:r></w:p>" +
  "<w:p><w:r><w:t>Breng uw identiteitskaart mee &amp; kom tijdig.</w:t></w:r></w:p>" +
  "</w:body></w:document>";

async function run() {
  /* --------------------------------------------------- what kind of thing */
  check("a docx is a document", docs.shapeOf({ name: "brief.docx", type: "" }) === "document");
  check("a pdf is a pdf", docs.shapeOf({ name: "x.pdf", type: "application/pdf" }) === "pdf");
  check("a txt is text", docs.shapeOf({ name: "x.txt", type: "text/plain" }) === "text");
  check("a jpeg is an image", docs.shapeOf({ name: "x.jpg", type: "image/jpeg" }) === "image");
  check("a docx can be read out loud", docs.canBeReadAloud({ name: "a.docx", type: "" }));
  check("a pdf cannot, and we say so rather than pretend",
    !docs.canBeReadAloud({ name: "a.pdf", type: "application/pdf" }));
  check("the file picker offers docx and pdf",
    docs.ACCEPTS.includes(".docx") && docs.ACCEPTS.includes(".pdf"));

  /* --------------------------------------------------- a compressed docx */
  const deflated = zipOf([
    { name: "[Content_Types].xml", body: "<Types/>" },
    { name: "word/document.xml", body: LETTER }
  ]);
  const words = await docs.readWords(asFile("brief.docx", "", deflated));
  check("the words come out of a deflated docx", words.includes("cardioloog"), words.slice(0, 60));
  check("each paragraph is its own line", words.split("\n").length >= 3, JSON.stringify(words.slice(0, 40)));
  check("the xml markup is gone", !words.includes("<w:"), words.slice(0, 40));
  check("an escaped ampersand comes back as one", words.includes("&"), words.slice(-40));
  check("the date survives for the speech shaping to find", words.includes("14/10/2026"));

  /* --------------------------------------------------- a stored docx */
  const stored = zipOf([
    { name: "word/document.xml", body: LETTER, store: true }
  ]);
  const words2 = await docs.readWords(asFile("stored.docx", "", stored));
  check("the words come out of an uncompressed docx too", words2.includes("Kortrijk"), words2.slice(0, 40));

  /* --------------------------------------------------- an odt */
  const odt = zipOf([
    { name: "content.xml", body: '<office><text:p>Boodschappen</text:p><text:p>brood</text:p></office>' }
  ]);
  const words3 = await docs.readWords(asFile("lijst.odt", "", odt));
  check("an odt is read as well", words3.includes("Boodschappen") && words3.includes("brood"), words3);

  /* --------------------------------------------------- rubbish in, nothing out */
  const junk = await docs.readWords(asFile("broken.docx", "", Buffer.from("not a zip at all")));
  check("a file that is not really a docx gives nothing and does not throw", junk === "", junk);

  const plain = await docs.readWords(asFile("note.txt", "text/plain", Buffer.from("  brood\n  melk  ")));
  check("a text file is read as it is", plain === "brood\n  melk", JSON.stringify(plain));

  /* --------------------------------------------------- checklists */
  const photographed = "Mee te nemen\n- identiteitskaart\n- medicatielijst\n[x] verwijsbrief\n1) pyjama";
  const made = docs.listFromText(photographed);
  check("the heading becomes the name of the card", made.title === "Mee te nemen", made.title);
  check("every item is found", made.items.length === 4, made.items.length);
  check("a box already ticked stays ticked",
    made.items.filter((one) => one.done).length === 1,
    JSON.stringify(made.items.map((one) => one.done)));
  check("the markers themselves are stripped",
    made.items.every((one) => !/^[-*\[\d]/.test(one.text)),
    JSON.stringify(made.items.map((one) => one.text)));

  check("a list with no markers is still a list",
    docs.looksLikeList("brood\nmelk\nkaas\nappels"));
  check("a letter is not mistaken for a list",
    !docs.looksLikeList("Geachte mevrouw, uw afspraak bij de cardioloog is op 14 oktober " +
      "om tien uur. Gelieve uw identiteitskaart mee te brengen naar de wachtzaal van de dienst."));
  check("two lines are not enough to call something a list",
    !docs.looksLikeList("brood\nmelk"));
  check("a line of dashes is not an item",
    docs.itemsFromText("brood\n------\nmelk").length === 2);

  /* --------------------------------------------------- print */
  results.forEach((row) => {
    console.log((row.ok ? "PASS  " : "FAIL  ") + row.name.padEnd(56) +
      (row.ok || !row.detail ? "" : "   " + row.detail));
  });
  const failed = results.filter((row) => !row.ok).length;
  console.log("\n" + (results.length - failed) + " passed, " + failed + " failed");
  process.exit(failed ? 1 : 0);
}

run().catch((err) => {
  console.log("FAIL  the test itself broke: " + (err && err.message ? err.message : err));
  process.exit(1);
});
