// Reading out loud, with the Web Speech API. Free, and it works offline on most
// devices. Requirement S2: we speak the text as it is, we never shorten or
// rewrite what a letter says.

let dutchVoice = null;

function pickVoice() {
  if (dutchVoice) return dutchVoice;
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  dutchVoice =
    voices.find((v) => v.lang === "nl-BE") ||
    voices.find((v) => v.lang && v.lang.startsWith("nl")) ||
    null;
  return dutchVoice;
}

if (window.speechSynthesis) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    dutchVoice = null;
    pickVoice();
  });
}

export function canSpeak() {
  return "speechSynthesis" in window;
}

export function speak(text) {
  if (!canSpeak() || !text) return false;
  stop();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = "nl-BE";
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
