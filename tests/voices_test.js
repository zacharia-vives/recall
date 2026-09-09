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
      storage: settings.noOpfs ? {} : { getDirectory: () => Promise.resolve({}) },
      connection: settings.connection
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

  // On from the start. The phone's own voice is the fallback and nothing
  // else, so the good voice cannot be something you have to go and find.
  check("on from the start, with nothing stored", voices.wanted() === true);
  voices.setWanted(false);
  check("turning it off is remembered", voices.wanted() === false);
  voices.setWanted(true);
  check("turning it back on is remembered", voices.wanted() === true);

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

  // ---- the language of the words, not the language of the screen. L4.
  check("a Belgian French tag finds the French voice", voices.codeFor("fr-BE") === "fr");
  check("a Belgian Dutch tag finds the Dutch voice", voices.codeFor("nl-BE") === "nl");
  check("a British English tag finds the English voice", voices.codeFor("en-GB") === "en");
  check("a bare code works too", voices.codeFor("nl") === "nl");
  check("German finds nothing, so the phone reads it rather than the Dutch voice",
    voices.codeFor("de-DE") === "");
  check("so does nonsense", voices.codeFor("") === "" && voices.codeFor(null) === "");
  check("and the case does not matter", voices.codeFor("FR-be") === "fr");

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

  // Switched off really means off, so this has to switch it off first. Left as
  // it was, this check passed because nothing was downloaded rather than
  // because the switch was off, which is a check that proves nothing.
  voices.setWanted(false);
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
  // Storage that throws must not quietly switch the voice off: whether it can
  // be used is decided by possible() and by whether the model is there.
  check("storage that throws still reads as on", voices.wanted() === true);
  global.window.localStorage.setItem = () => { throw new Error("no storage"); };
  let threw = false;
  try {
    voices.setWanted(true);
  } catch (err) {
    threw = true;
  }
  check("and setting it does not throw either", threw === false);

  // ---- what a connection is allowed to cost somebody
  fakeBrowser();
  voices = await load();
  check("a browser that says nothing about the connection is treated as fine",
    voices.connectionWillCarryIt() === true);

  fakeBrowser({ connection: { saveData: true, effectiveType: "4g" } });
  voices = await load();
  check("data saving switched on means the voice waits",
    voices.connectionWillCarryIt() === false);
  check("and it does not fetch on its own",
    (await voices.fetchIfSensible("nl")) === "waiting");

  for (const slow of ["slow-2g", "2g", "3g"]) {
    fakeBrowser({ connection: { saveData: false, effectiveType: slow } });
    voices = await load();
    check("a " + slow + " connection means the voice waits",
      voices.connectionWillCarryIt() === false);
  }

  fakeBrowser({ connection: { saveData: false, effectiveType: "4g" } });
  voices = await load();
  check("a good connection will carry it", voices.connectionWillCarryIt() === true);

  // ---- fetching on its own says which of the outcomes it was
  fakeBrowser({ connection: { saveData: false, effectiveType: "4g" } });
  voices = await load();
  voices.setWanted(false);
  check("switched off, it does not fetch", (await voices.fetchIfSensible("nl")) === "off");
  voices.setWanted(true);
  check("a language with no voice is not fetched",
    (await voices.fetchIfSensible("de")) === "nolanguage");
  check("nothing is being fetched right now", voices.busy() === "");

  fakeBrowser({ noOpfs: true, connection: { saveData: false, effectiveType: "4g" } });
  voices = await load();
  check("a browser that cannot run it does not fetch sixty megabytes",
    (await voices.fetchIfSensible("nl")) === "cannot");

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
    /try \{[\s\S]{0,600}voices\.js[\s\S]{0,900}\} catch/.test(speech));
  check("stop() stops the neural audio as well as the queue",
    /export function stop\(\) \{\s*stopWav\(\);/.test(speech));
  check("speaking() counts the neural audio too, or the stop button lies",
    /export function speaking\(\)[\s\S]{0,120}playing/.test(speech));
  check("speech.js chooses the voice from the language of the words",
    /voices\.codeFor\(useLang\)/.test(speech));
  check("and does not use the neural voice when there is none for that language",
    /voices\.wanted\(\) && code/.test(speech));
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
  check("the waiting message asks about the language of the words, not the screen",
    /codeFor\(lang \|\| i18n\.spokenLang\(\)\)/.test(app));
  // N15 warns that the phone has no voice for this language. With the neural
  // voice reading, that warning would be untrue and alarming.
  check("the missing-voice warning is hidden when the neural voice is reading",
    /neuralCovers/.test(app) && /!mine\.length && !neuralCovers/.test(app));
  check("the app fetches the voice on its own rather than waiting to be found",
    /getVoiceQuietly\(\)/.test(app) && /fetchIfSensible/.test(app));
  // Called, never awaited: a sixty megabyte fetch must not sit between
  // somebody opening Recall and seeing their cards.
  check("and it is never awaited during start up, so it cannot delay the app",
    /[^t] getVoiceQuietly\(\);/.test(app) && !/await getVoiceQuietly/.test(app));

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
