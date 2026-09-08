// Getting Recall onto the home screen.
//
// Android and Chrome give us an event and a real prompt. iOS gives us nothing,
// so there we can only tell the user where the button is. Requirement N8.

let deferred = null;

window.addEventListener("beforeinstallprompt", (event) => {
  // Keep the event so we can show the prompt at a moment that makes sense,
  // instead of the moment the browser feels like it.
  event.preventDefault();
  deferred = event;
});

window.addEventListener("appinstalled", () => {
  deferred = null;
});

// Already running from the home screen, so there is nothing to ask.
export function installed() {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return window.navigator.standalone === true;
}

export function onIphone() {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
}

export function canPrompt() {
  return deferred !== null;
}

// True when it is worth showing anything at all.
export function worthAsking() {
  if (installed()) return false;
  return canPrompt() || onIphone();
}

export async function prompt() {
  if (!deferred) return "unavailable";
  const event = deferred;
  deferred = null;
  event.prompt();
  const choice = await event.userChoice;
  return choice && choice.outcome ? choice.outcome : "dismissed";
}

export function iphoneSteps() {
  return "Press the share button at the bottom of Safari, then choose Add to Home Screen.";
}
