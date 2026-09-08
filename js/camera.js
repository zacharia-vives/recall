// Camera with a magnifier. The zoom is a CSS transform on the video element,
// which works on every phone, instead of the track zoom setting that only some
// Android devices support.

let stream = null;

export async function start(video, onMessage) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    onMessage("Deze telefoon of browser laat de camera niet toe. Kies een foto.");
    return false;
  }
  // The browser now asks for permission, which can sit there for a while. Say
  // so, otherwise the user is looking at a black rectangle with no explanation.
  onMessage("Geef toestemming voor de camera. Lukt dat niet? Kies dan een foto.");

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    onMessage("");
    return true;
  } catch (err) {
    if (err && err.name === "NotAllowedError") {
      onMessage("Je gaf nog geen toestemming voor de camera. Kies een foto of geef toestemming.");
    } else {
      onMessage("De camera start niet. Kies een foto.");
    }
    return false;
  }
}

export function stop(video) {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (video) video.srcObject = null;
}

export function setZoom(video, percent) {
  video.style.transform = "scale(" + percent / 100 + ")";
}

// Grabs the current frame. We keep the long side at 1600px, which is plenty for
// OCR and keeps the photos small enough for the free storage tier.
export function capture(video) {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return Promise.resolve(null);

  const max = 1600;
  const scale = Math.min(1, max / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.85);
  });
}
