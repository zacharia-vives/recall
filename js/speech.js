import * as i18n from "./i18n.js?v=49";

// Reading out loud, with the Web Speech API. Free, and on the voices we allow
// it also works with no network. Requirement S2: we speak the text as it is, we
// never shorten or rewrite what a letter says.
//
// The interface speaks Dutch, French or English, and a letter may be in a
// different language again, so speak() takes the language of the text it is
// given and falls back to the one she chose.
//
// Two things make a voice sound like a machine, and only one of them is the
// voice. The other is what you hand it. A wall of text with no sentence breaks,
// a date written 14/10/2026, an abbreviation like dr., a marker like
// [national number removed]: read literally, all of that sounds like a robot
// reading a form, because that is exactly what it is. So the text is turned
// into something a person would say before a single word is spoken.
//
// On the voice itself: the best sounding voices on Windows and Android are the
// online ones, and those send the text to a server. This app promises that a
// hospital letter never leaves the device, so those are refused, by name and by
// the localService flag, and we pick the best voice that runs on the phone.
// That is a real cost in warmth and it is the right way round.

// Only used before the dictionary has an opinion, which is almost never.
const DEFAULT_LANG = "en-GB";
const VOICE_KEY = "recall.voice";

// Names that mean the phone is not doing the speaking.
const CLOUD = /online|cloud|remote|server|azure|neural.*online/i;

// Names that mean the maker put effort into this one. iOS calls its good ones
// Premium and Enhanced, Android ships neural Google voices, Windows names its
// on-device neural ones Natural.
const GOOD = /premium|enhanced|siri|natural|neural|wavenet|google/i;

function allVoices() {
  return window.speechSynthesis ? window.speechSynthesis.getVoices() || [] : [];
}

// Everything that can speak this language without telling anybody about it.
export function voicesFor(lang) {
  const short = (lang || i18n.spokenLang()).slice(0, 2).toLowerCase();
  const sameLang = allVoices()
    .filter((v) => !CLOUD.test(v.name))
    .filter((v) => (v.lang || "").replace("_", "-").toLowerCase().startsWith(short));
  const onDevice = sameLang.filter((v) => v.localService !== false);
  // Prefer a voice that lives on the phone, but do not insist. Some browsers
  // report localService false for everything they have, and insisting left
  // this list empty and sent the caller to its last resort.
  return onDevice.length ? onDevice : sameLang;
}

function score(voice, lang) {
  let n = 0;
  if (GOOD.test(voice.name)) n += 10;
  if ((voice.lang || "").replace("_", "-").toLowerCase() === lang.toLowerCase()) n += 4;
  if (voice.default) n += 1;
  // Compact is the small, tinny iOS variant of a voice that also exists in a
  // better version, so it goes last.
  if (/compact/i.test(voice.name)) n -= 8;
  return n;
}

function chosenName() {
  try {
    return window.localStorage.getItem(VOICE_KEY) || "";
  } catch (err) {
    return "";
  }
}

export function chooseVoice(name) {
  try {
    if (name) window.localStorage.setItem(VOICE_KEY, name);
    else window.localStorage.removeItem(VOICE_KEY);
  } catch (err) {
    // nothing to do
  }
}

// The best voice for the language of the words, and the rules for when there
// is not one.
//
// Two things were wrong here. The voice she had chosen in the settings was
// looked up across every voice on the phone, not just the ones that speak the
// language being read, so choosing a French voice once meant English and Dutch
// were read in French from then on, in every language, for ever. And when
// nothing matched at all it returned the first voice in the phone's list,
// whatever language that was: on a Belgian phone that is French, so an English
// letter came out French.
//
// The fallback is her own language now. If the words are in a language the
// phone cannot speak, they are read in the language she set the app to, which
// is at least a voice she can follow. If even that is missing, no voice is
// named and the utterance carries the language tag instead, which lets the
// browser choose rather than being handed the wrong one. R2.14.
function bestOf(list, lang) {
  if (!list.length) return null;
  const mine = chosenName();
  if (mine) {
    // Only if it speaks this language. That was the bug.
    const picked = list.find((v) => v.name === mine);
    if (picked) return picked;
  }
  return list.slice().sort((a, b) => score(b, lang) - score(a, lang))[0];
}

export function pickVoice(lang) {
  const useLang = lang || i18n.spokenLang();
  const said = bestOf(voicesFor(useLang), useLang);
  if (said) return said;

  // Nothing speaks the language of the words. Fall back to her own.
  const hers = i18n.spokenLang();
  if (hers.slice(0, 2).toLowerCase() !== useLang.slice(0, 2).toLowerCase()) {
    const ours = bestOf(voicesFor(hers), hers);
    if (ours) return ours;
  }
  return null;
}

/* turning stored text into something a person would say */

// Three languages, so the shaping is a table rather than a pile of ifs. Add a
// language here and the whole of humanise() follows.
const SHAPE = {
  en: {
    months: ["January", "February", "March", "April", "May", "June", "July",
      "August", "September", "October", "November", "December"],
    date: (day, month, year) => "the " + day + ordinal(day) + " of " + month + " " + year,
    onTheHour: (hour) => hour + " o'clock",
    pastTheHour: (hour, min) => hour + " " + min,
    numberDropped: "a number Recall does not keep",
    accountDropped: "an account number Recall does not keep",
    somethingDropped: "something Recall does not keep",
    short: [[/\bdr\.\s*/gi, "doctor "], [/\bmr\.\s*/gi, "mister "],
            [/\bmrs\.\s*/gi, "missus "], [/\bno\.\s*/gi, "number "],
            [/\be\.g\.\s*/gi, "for example "], [/\betc\.\s*/gi, "and so on "]]
  },
  nl: {
    months: ["januari", "februari", "maart", "april", "mei", "juni", "juli",
      "augustus", "september", "oktober", "november", "december"],
    date: (day, month, year) => day + " " + month + " " + year,
    onTheHour: (hour) => hour + " uur",
    pastTheHour: (hour, min) => hour + " uur " + min,
    numberDropped: "een nummer dat wij niet bewaren",
    accountDropped: "een rekeningnummer dat wij niet bewaren",
    somethingDropped: "iets dat wij niet bewaren",
    short: [[/\bdr\.\s*/gi, "dokter "], [/\bnr\.\s*/gi, "nummer "],
            [/\bt\.a\.v\.\s*/gi, "ter attentie van "], [/\bbv\.\s*/gi, "bijvoorbeeld "],
            [/\bevt\.\s*/gi, "eventueel "], [/\ba\.u\.b\.\s*/gi, "alstublieft "]]
  },
  fr: {
    months: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
      "août", "septembre", "octobre", "novembre", "décembre"],
    date: (day, month, year) => "le " + day + " " + month + " " + year,
    onTheHour: (hour) => hour + " heures",
    pastTheHour: (hour, min) => hour + " heures " + min,
    numberDropped: "un numéro que Recall ne garde pas",
    accountDropped: "un numéro de compte que Recall ne garde pas",
    somethingDropped: "quelque chose que Recall ne garde pas",
    short: [[/\bdr\.\s*/gi, "docteur "], [/\bm\.\s*/gi, "monsieur "],
            [/\bmme\.?\s*/gi, "madame "], [/\bn°\s*/gi, "numéro "],
            [/\bp\.\s*ex\.\s*/gi, "par exemple "], [/\betc\.\s*/gi, "et ainsi de suite "]]
  }
};

function shapeFor(lang) {
  const short = String(lang || "").slice(0, 2).toLowerCase();
  return SHAPE[short] || SHAPE.en;
}

function ordinal(day) {
  const n = Number(day);
  if (n === 1 || n === 21 || n === 31) return "st";
  if (n === 2 || n === 22) return "nd";
  if (n === 3 || n === 23) return "rd";
  return "th";
}

// S2 still holds: nothing is added, nothing is left out, nothing is summarised.
// The same words come out, in the shape a person would say them.
export function humanise(text, lang) {
  const shape = shapeFor(lang);
  let out = String(text || "");

  // What the redaction left behind. Read as a sentence, not as brackets.
  out = out.replace(/\[national number removed\]/gi, shape.numberDropped);
  out = out.replace(/\[account number removed\]/gi, shape.accountDropped);
  out = out.replace(/\[[^\]]*removed[^\]]*\]/gi, shape.somethingDropped);

  // Dates, the way they are written on Belgian post.
  out = out.replace(/\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/g, (m, d, mo, y) => {
    const index = Math.max(0, Math.min(11, Number(mo) - 1));
    return shape.date(Number(d), shape.months[index], y);
  });

  // Times. Ten thirty rather than ten colon three zero.
  out = out.replace(/\b(\d{1,2}):(\d{2})\b/g, (m, h, min) => {
    const hour = Number(h);
    return min === "00" ? shape.onTheHour(hour) : shape.pastTheHour(hour, Number(min));
  });

  // Abbreviations nobody says out loud.
  shape.short.forEach((pair) => { out = out.replace(pair[0], pair[1]); });

  // A line of a letter is usually a sentence even when it has no full stop, and
  // the reading loses the punctuation anyway. A line break becomes a pause.
  out = out.replace(/\r/g, "");
  out = out.replace(/[ \t]+\n/g, "\n");
  out = out.replace(/\n{2,}/g, ".\n");
  out = out.replace(/([^.!?:,])\n/g, "$1.\n");

  // Things that have no sound: bullets, rules, page furniture.
  out = out.replace(/^[\s*\-_=•·]{2,}$/gm, "");
  out = out.replace(/[|_]{2,}/g, " ");
  out = out.replace(/\s{2,}/g, " ");

  return out.trim();
}

// One utterance per sentence. The gap between two utterances is what a person
// hears as taking a breath, and it is the single biggest difference between
// this and a machine reading a form.
function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^\p{L}\p{N}]/gu, "").length > 0);
}

export function canSpeak() {
  return "speechSynthesis" in window;
}

// iPhones and iPads are fussy about this in two ways that Android is not, and
// both of them bit us.
//
// First, cancel() followed by speak() in the same turn leaves iOS silent. So
// nothing is cancelled unless something is actually being said.
//
// Second, iOS often plays only the first of a queue of utterances, or none of
// them. Splitting a letter into one utterance per sentence is what makes the
// reading sound like a person taking a breath, and it is also what stopped iOS
// from reading at all. So on iOS the sentences are joined back into one
// utterance: the punctuation still produces the pauses, the voice just breathes
// a little less.
function isApple() {
  const ua = window.navigator.userAgent || "";
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  // An iPad on recent iOS reports itself as a Mac, and the touch points are
  // what tells the two apart.
  return /Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1;
}

/* A neural voice makes a wav file, which is not something speechSynthesis can
   play, so it goes through an <audio> element instead. One at a time, and the
   handle is kept so stop() can stop this as well as the ordinary queue. */
let playing = null;
let shared = null;
let unlocked = false;

// A no sample WAV. Playing this is silent, and it is the smallest thing that
// counts as playing audio, which is all an unlock needs to be.
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEA" +
  "qKwAAIhYAQACABAAZGF0YQAAAAA=";

// One element, reused. It used to make a new Audio for every read, and by the
// time it existed the user's tap was long over: read() awaits the voices
// module and then awaits the model turning text into a wav, and a browser only
// lets audio start from a gesture. So the play was refused, the rejection was
// swallowed, true was returned anyway, and the app went quiet with nothing to
// show for it. This element is created and allowed to make noise during the
// tap itself, and reused afterwards, so the later play is on an element that
// already has permission.
function element() {
  if (!shared) {
    shared = new Audio();
    shared.preload = "auto";
  }
  return shared;
}

// Called from a real user gesture, before anything is awaited. Safe to call
// as often as you like.
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  try {
    const audio = element();
    audio.src = SILENCE;
    const go = audio.play();
    if (go && go.catch) go.catch(() => { unlocked = false; });
  } catch (err) {
    unlocked = false;
  }
  // The speaking queue on iOS wants the same courtesy: the first utterance has
  // to be asked for inside a gesture or the queue stays silent all session.
  try {
    if (isApple() && canSpeak() && !window.speechSynthesis.speaking) {
      const quiet = new SpeechSynthesisUtterance(" ");
      quiet.volume = 0;
      window.speechSynthesis.speak(quiet);
    }
  } catch (err) {
    // Nothing to do: the ordinary path still tries.
  }
}

function playWav(blob, rate) {
  return new Promise((resolve) => {
    stopWav();
    const audio = element();
    const url = URL.createObjectURL(blob);
    audio.src = url;
    // The neural voice already speaks at a measured pace, so it needs far less
    // slowing down than the device voice does. Below about 0.9 it starts to
    // sound wrong rather than calm.
    audio.playbackRate = rate || 0.95;
    playing = audio;
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      if (playing === audio) playing = null;
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    audio.addEventListener("ended", () => finish(true), { once: true });
    audio.addEventListener("error", () => finish(false), { once: true });
    // Say no when it was refused, rather than reporting success and leaving
    // her looking at a screen that promised to read something out.
    const go = audio.play();
    if (go && go.catch) go.catch(() => finish(false));
  });
}

function stopWav() {
  if (!playing) return;
  try {
    playing.pause();
    URL.revokeObjectURL(playing.src);
  } catch (err) {
    // Already gone.
  }
  playing = null;
}

/* Read something out loud, with the best voice this device actually has.

   The better voice is tried first and everything about it is allowed to fail:
   not turned on, not downloaded, browser cannot do it, model throws. Every one
   of those ends up in the same place, which is the device voice reading the
   same words. That is the fallback, and it is the reason this is safe to ship
   two days before a presentation. */
export async function read(text, lang, options) {
  if (!text) return false;
  const useLang = lang || i18n.spokenLang();
  const plain = (options && options.raw) ? String(text) : humanise(text, useLang);
  if (!plain.trim()) return false;

  try {
    const voices = await import("./voices.js?v=49");
    // The language of the words, not the language of the screen. Reading a
    // French letter with the Dutch voice would be worse than reading it with
    // the phone's own French voice, and reading German with either is wrong.
    const code = voices.codeFor(useLang);
    if (voices.wanted() && code) {
      const wav = await voices.makeAudio(plain, code);
      if (wav) {
        // Stop the ordinary queue too, or both voices talk at once.
        if (canSpeak() && (window.speechSynthesis.speaking ||
            window.speechSynthesis.pending)) {
          window.speechSynthesis.cancel();
        }
        // This used to return true whatever happened. If the browser refuses
        // to play, fall through to the phone's own voice instead of claiming
        // to have read it out.
        if (await playWav(wav, options && options.rate)) return true;
      }
    }
  } catch (err) {
    // The module itself would not even load. Fall through.
  }

  return speak(text, lang, options);
}

export function speak(text, lang, options) {
  if (!canSpeak() || !text) return false;
  stopWav();

  // Only clear the queue when there is something in it.
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
  // A tab that was hidden can leave the queue paused on some browsers, and a
  // paused queue never starts.
  if (window.speechSynthesis.paused) window.speechSynthesis.resume();

  const useLang = lang || i18n.spokenLang();
  const plain = (options && options.raw) ? String(text) : humanise(text, useLang);
  let parts = sentences(plain);
  if (!parts.length) return false;
  if (isApple()) parts = [parts.join(" ")];

  const voice = pickVoice(useLang);
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) u.voice = voice;
    u.lang = (voice && voice.lang) || useLang;
    // Slower than default, which is the whole point of this app, and a shade
    // slower again at the start of a long read so she can settle into it.
    u.rate = (options && options.rate) || (i === 0 ? 0.88 : 0.92);
    u.pitch = (options && options.pitch) || 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  });
  return true;
}

// For the voice chooser: one short line in the voice being tried.
export function sample(voiceName, lang) {
  chooseVoice(voiceName);
  const useLang = lang || i18n.spokenLang();
  return speak(i18n.t("voice.sample"), useLang);
}

export function stop() {
  stopWav();
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function speaking() {
  if (playing && !playing.paused && !playing.ended) return true;
  return canSpeak() && (window.speechSynthesis.speaking || window.speechSynthesis.pending);
}
