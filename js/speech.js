// Reading out loud, with the Web Speech API. Free, and it works offline on most
// devices. Requirement S2: we speak the text as it is, we never shorten or
// rewrite what a letter says.
//
// The interface is English, but a Belgian letter is usually Dutch, so speak()
// takes the language of the text it is given.

const DEFAULT_LANG = "en-GB";

function pickVoice(lang) {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  const short = lang.slice(0, 2);
  return (
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang && v.lang.replace("_", "-").startsWith(short)) ||
    null
  );
}

export function canSpeak() {
  return "speechSynthesis" in window;
}

export function speak(text, lang) {
  if (!canSpeak() || !text) return false;
  stop();
  const useLang = lang || DEFAULT_LANG;
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(useLang);
  if (voice) u.voice = voice;
  u.lang = useLang;
  u.rate = 0.9; // a bit slower than default, this is the whole point
  window.speechSynthesis.speak(u);
  return true;
}

export function stop() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

export function speaking() {
  return canSpeak() && window.speechSynthesis.speaking;
}
