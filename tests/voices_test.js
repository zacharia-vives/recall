/* The better voice, and above all its fallback.

       node tests/voices_test.js

   The whole feature is allowed to fail. What is not allowed is failing
   silently, or failing in a way that stops Recall reading a card out loud.
   These checks run without a browser by standing in for the parts a browser
   provides, which means they can run on every change rather than only when
   somebody has sixty megabytes and the patience to download them.

   What only a real device can answer is whether the voice actually sounds
   better, and how long it takes on the demo phone. That is tests/voice.html,
   for Luke's Thursday pass. */

const results = [];

function check(name, ok, detail) {
  results.push((ok ? "PASS" : "FAIL") + "  " + name +
    (detail ? "   " + String(detail).slice(0, 120) : ""));
  return ok;
}

/* ------------------------------------------------- a browser, roughly speaking */

// Enough of one to load the module: what it looks at is localStorage,
// WebAssembly, Worker and the origin private file system.
function fakeBrowser(options) {
  const settings = options || {};
  const store = {};
  const win = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    navigator: {
      userAgent: "node",
      storage: settings.noOpfs ? {} : { getDirectory: () => Promise.resolve({}) }
    }
  };
  global.window = win;
  global.WebAssembly = settings.noWasm ? undefined : { compile: () => {} };
  global.Worker = settings.noWorker ? undefined : function () {};
  return win;
}

async function load() {
  // Imported fresh each time so the module's own state does not leak between
  // checks, which is what made an earlier version of this file pass by luck.
  const url = "../js/voices.js?t=" + Math.random();
  return import(url);
}

/* --------------------------------------------------------------------- checks */

async function run() {
  // ---- the switch
  fakeBrowser();
  let voices = await load();

  check("off unless somebody turns it on", voices.wanted() === false);
  voices.setWanted(true);
  check("turning it on is remembered", voices.wanted() === true);
  voices.setWanted(false);
  check("turning it off is remembered", voices.wanted() === false);

  // ---- which voice for which language
  check("Dutch gets a Belgian voice, not a Netherlands one",
    voices.voiceFor("nl").id.indexOf("nl_BE") === 0, voices.voiceFor("nl").id);
  check("English gets one", voices.voiceFor("en").id.indexOf("en_") === 0);
  check("French gets one", voices.voiceFor("fr").id.indexOf("fr_") === 0);
  check("a language we do not offer gets nothing rather than a wrong voice",
    voices.voiceFor("de") === null);
  check("every voice says how big it is, because that number goes on the button",
    Object.keys(voices.VOICES).every((k) => voices.VOICES[k].mb > 0));
  check("all three are named for a person to read",
    Object.keys(voices.VOICES).every((k) => voices.VOICES[k].label.length > 3));

  // ---- can this browser do it at all
  check("a browser with everything can", voices.possible() === true);

  fakeBrowser({ noWasm: true });
  voices = await load();
  check("no WebAssembly means no", voices.possible() === false);

  fakeBrowser({ noWorker: true });
  voices = await load();
  check("no workers means no", voices.possible() === false);

  // Without the origin private file system the model cannot be kept, so every
  // reading would download sixty megabytes again. That is a no.
  fakeBrowser({ noOpfs: true });
  voices = await load();
  check("no place to keep the model means no", voices.possible() === false);
  check("and nothing is reported as downloaded", (await voices.downloaded()).length === 0);
  check("and it makes no audio", (await voices.makeAudio("hallo", "nl")) === null);

  // ---- the fallback, which is the point
  fakeBrowser();
  voices = await load();

  check("switched off, no audio is made even though the browser could",
    (await voices.makeAudio("hallo", "nl")) === null);

  voices.setWanted(true);
  check("switched on but nothing downloaded, still no audio and no download started",
    (await voices.makeAudio("hallo", "nl")) === null);
  check("empty text is refused before anything is loaded",
    (await voices.makeAudio("   ", "nl")) === null);
  check("a language with no voice makes no audio",
    (await voices.makeAudio("guten tag", "de")) === null);

  // A browser where storage throws, which is a real state: private windows and
  // phones with site data switched off.
  fakeBrowser();
  global.window.localStorage.getItem = () => { throw new Error("no storage"); };
  voices = await load();
  check("storage that throws reads as off rather than crashing", voices.wanted() === false);
  global.window.localStorage.setItem = () => { throw new Error("no storage"); };
  let threw = false;
  try {
    voices.setWanted(true);
  } catch (err) {
    threw = true;
  }
  check("and setting it does not throw either", threw === false);

  // ---- speech.js has to have a fallback path at all
  const fs = await import("fs");
  const url = await import("url");
  const path = await import("path");
  const here = path.dirname(url.fileURLToPath(import.meta.url));
  const speech = fs.readFileSync(path.join(here, "..", "js", "speech.js"), "utf8");

  check("speech.js has a read() that tries the better voice first",
    /export async function read\(/.test(speech));
  check("and it ends by calling the ordinary speak() when that does not work",
    /return speak\(text, lang, options\);/.test(speech));
  check("the better voice is wrapped in a try, so a broken module falls through",
    /try \{[\s\S]{0,400}voices\.js[\s\S]{0,400}\} catch/.test(speech));
  check("stop() stops the neural audio as well as the queue",
    /export function stop\(\) \{\s*stopWav\(\);/.test(speech));
  check("speaking() counts the neural audio too, or the stop button lies",
    /export function speaking\(\)[\s\S]{0,120}playing/.test(speech));
  check("nothing is downloaded during a reading",
    !/fetchVoice|lib\.download/.test(
      (await fs.promises.readFile(path.join(here, "..", "js", "voices.js"), "utf8"))
        .split("export async function makeAudio")[1] || ""));

  const app = fs.readFileSync(path.join(here, "..", "js", "app.js"), "utf8");
  check("the app never calls plain speak() where a card is read out loud",
    !/speech\.speak\(/.test(app));
  check("the voice sample still uses the phone's own voices on purpose",
    /speech\.sample\(/.test(app));
  check("a slow voice says one moment first", /readAloud/.test(app) &&
    /run\.onemoment/.test(app));

  const sw = fs.readFileSync(path.join(here, "..", "sw.js"), "utf8");
  check("the service worker does not try to cache the voice files",
    /voiceFiles/.test(sw) && /huggingface/.test(sw));
  check("voices.js is in the offline shell", /voices\.js/.test(sw));

  for (const page of ["index.html", "helper.html"]) {
    const html = fs.readFileSync(path.join(here, "..", page), "utf8");
    check(page + " resolves the runtime the library imports by name",
      /type="importmap"/.test(html) && /onnxruntime-web\/wasm/.test(html));
    const mapAt = html.indexOf("importmap");
    const modAt = html.indexOf('<script type="module"');
    check(page + ": the import map comes before the first module, or it is ignored",
      mapAt > 0 && mapAt < modAt, "map at " + mapAt + ", module at " + modAt);
  }

  console.log(results.join("\n"));
  const failed = results.filter((r) => r.indexOf("FAIL") === 0);
  console.log("\n" + (results.length - failed.length) + " passed, " + failed.length + " failed");
  process.exit(failed.length ? 1 : 0);
}

run().catch((err) => {
  console.log(results.join("\n"));
  console.log("\nthe suite itself broke: " + err.message);
  process.exit(1);
});
