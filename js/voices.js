/* Better voices, and a way back to the ordinary one.

   The voice a phone speaks with is the part of Recall that gets judged
   fastest. Android reads Dutch acceptably, a phone with no Dutch voice
   installed reads Dutch with an English accent, and that is worse than
   useless for somebody being told about a hospital appointment.

   So there is a second option: a neural voice that runs on the device. It is
   Piper, the models Rhasspy released under the MIT licence, run through the
   ONNX runtime compiled to WebAssembly. Nothing is sent anywhere, which is the
   whole reason it is allowed in: the cloud voices that sound best all post the
   text to a server, and the text here is somebody's hospital letter. That was
   refused in N13 and it stays refused.

   Three rules this module is built on.

     1. The device voice always works and is always the fallback. Anything that
        goes wrong here, at any stage, ends with speech coming out of the phone
        the way it does today. A better voice that fails silently is worse than
        a plain voice that works.
     2. Nothing is downloaded until somebody asks for it. A voice is 20 to 60
        MB. That is a deliberate choice made once on wifi, never a surprise on
        mobile data.
     3. A voice that has been downloaded is kept. The library stores it in the
        origin private file system, so the second time is instant and it works
        with no internet at all, which is the point for a phone in a kitchen.

   Dutch is the one that matters most here, because the keeper we are building
   for is Flemish. nl_BE is a real Piper voice, recorded in Belgium, so Dutch
   gets a proper voice rather than a fallback. */

import * as i18n from "./i18n.js?v=35";

// Resolved by the import map in the two pages: the library imports the ONNX
// runtime by bare name, which normally only a bundler can resolve, and its own
// default points at a runtime build that is missing the files it asks for.
const PIPER = "https://cdn.jsdelivr.net/npm/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-tts-web.js";
const ORT_DIST = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/";
const PHONEMES = "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/";

// One voice per language, chosen rather than offered: a list of a hundred and
// twenty four voices is not a decision anybody in this app should be asked to
// make. Dutch is Belgian on purpose. The megabytes are the real download size,
// checked against the library's own manifest, because that number belongs on
// the button.
export const VOICES = {
  nl: { id: "nl_BE-nathalie-medium", mb: 60, label: "Nederlands (Belgisch)" },
  en: { id: "en_GB-alba-medium", mb: 60, label: "English (British)" },
  fr: { id: "fr_FR-siwis-medium", mb: 60, label: "Français" }
};

const CHOICE_KEY = "recall.betterVoice";

let library = null;
let session = null;
let sessionFor = "";
let lastError = "";

/* ------------------------------------------------------------------ wanted */

// Off unless somebody deliberately turned it on. Rule two.
export function wanted() {
  try {
    return window.localStorage.getItem(CHOICE_KEY) === "yes";
  } catch (err) {
    return false;
  }
}

export function setWanted(yes) {
  try {
    if (yes) window.localStorage.setItem(CHOICE_KEY, "yes");
    else window.localStorage.removeItem(CHOICE_KEY);
  } catch (err) {
    // A phone with storage switched off simply forgets the choice, which
    // means it falls back, which is the safe direction.
  }
  if (!yes) forget();
}

export function voiceFor(lang) {
  return VOICES[lang || i18n.lang()] || null;
}

export function problem() {
  return lastError;
}

/* -------------------------------------------------------------- the library */

// Whether this browser could run a neural voice at all. Checked before
// anything is downloaded, so a phone that cannot is told so instead of
// spending sixty megabytes to find out.
export function possible() {
  if (typeof WebAssembly !== "object") return false;
  if (typeof Worker !== "function") return false;
  // The models are kept in the origin private file system. Without it every
  // reading would download the voice again, which is not something to do to
  // somebody's data plan.
  if (!(window.navigator.storage && window.navigator.storage.getDirectory)) return false;
  return true;
}

async function libraryReady() {
  if (library) return library;
  library = await import(PIPER);
  return library;
}

// Which voices are already on this device. Used to say "ready" rather than
// "60 MB" on a button somebody has already pressed once.
export async function downloaded() {
  if (!possible()) return [];
  try {
    const lib = await libraryReady();
    return await lib.stored();
  } catch (err) {
    return [];
  }
}

export async function isReady(lang) {
  const voice = voiceFor(lang);
  if (!voice) return false;
  const have = await downloaded();
  return have.indexOf(voice.id) >= 0;
}

/* ------------------------------------------------------------------ getting */

// Downloading is its own step with its own progress, because sixty megabytes
// deserves a bar and a number rather than a spinner.
export async function fetchVoice(lang, onProgress) {
  const voice = voiceFor(lang);
  if (!voice) throw new Error("no voice for " + lang);
  if (!possible()) throw new Error("this browser cannot run it");

  const lib = await libraryReady();
  await lib.download(voice.id, (p) => {
    if (onProgress && p && p.total) onProgress(Math.round(p.loaded * 100 / p.total));
  });

  // The download resolving is not the same as the file being listed. The
  // library writes the model into the origin private file system, and asking
  // for the list of stored voices straight afterwards can still come back
  // without it, which made the screen tell somebody to download sixty
  // megabytes they had just finished downloading. So wait until it is really
  // there, and give up after a few seconds rather than hanging.
  for (let i = 0; i < 20; i += 1) {
    if (await isReady(lang)) return true;
    await new Promise((done) => setTimeout(done, 150));
  }
  throw new Error("the voice downloaded but was not stored");
}

export async function remove(lang) {
  const voice = voiceFor(lang);
  if (!voice) return false;
  try {
    const lib = await libraryReady();
    await lib.remove(voice.id);
    forget();
    return true;
  } catch (err) {
    return false;
  }
}

function forget() {
  session = null;
  sessionFor = "";
}

/* ------------------------------------------------------------------ reading */

async function liveSession(lang) {
  const voice = voiceFor(lang);
  if (session && sessionFor === voice.id) return session;

  const lib = await libraryReady();
  session = await lib.TtsSession.create({
    voiceId: voice.id,
    wasmPaths: {
      onnxWasm: ORT_DIST,
      piperData: PHONEMES + "piper_phonemize.data",
      piperWasm: PHONEMES + "piper_phonemize.wasm"
    },
    progress: () => {}
  });
  sessionFor = voice.id;
  return session;
}

/* Make audio for a sentence, or say honestly that it could not.

   Returns a Blob of wav, or null. Null is not an error to report to anybody:
   it is the signal to speak the ordinary way, which is what the caller does.
   Rule one. */
export async function makeAudio(text, lang) {
  lastError = "";
  if (!wanted() || !possible()) return null;
  const words = (text || "").trim();
  if (!words) return null;

  try {
    // Never download here. If the voice is not on the device already, this
    // reading uses the device voice and the help screen is where somebody
    // chooses to fetch it. Rule two.
    if (!(await isReady(lang))) return null;
    const live = await liveSession(lang);
    const wav = await live.predict(words);
    if (!wav || !wav.size) return null;
    return wav;
  } catch (err) {
    lastError = String((err && err.message) || err);
    // A session that threw once is not trusted again, so the next reading
    // rebuilds it rather than failing the same way.
    forget();
    return null;
  }
}
