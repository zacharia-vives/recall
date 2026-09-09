import * as i18n from "./i18n.js?v=32";

// Camera with a magnifier. The zoom is a CSS transform on the video element,
// which works on every phone, instead of the track zoom setting that only some
// Android devices support.

let stream = null;

export async function start(video, onMessage) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    onMessage(i18n.t("cam.nosupport"));
    return false;
  }
  // The browser now asks for permission, which can sit there for a while. Say
  // so, otherwise the user is looking at a black rectangle with no explanation.
  onMessage(i18n.t("cam.allow"));

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
      onMessage(i18n.t("cam.norights"));
    } else {
      onMessage(i18n.t("cam.wontstart"));
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

// Grabs what the user can actually see, not the whole sensor frame. The zoom is
// a CSS transform, so a zoomed in view used to be read in full, which is not
// what anybody pointing a magnifier expects.
//
// Two crops, in order: object-fit cover trims the frame to the shape of the box
// on screen, then the zoom keeps the middle 1/zoom of what is left.
export function capture(video, zoomPercent, boxAspect) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return Promise.resolve(null);

  const zoom = Math.max(1, (Number(zoomPercent) || 100) / 100);
  const shape = Number(boxAspect) > 0 ? Number(boxAspect) : vw / vh;

  let cropW = vw;
  let cropH = vh;
  if (vw / vh > shape) {
    cropW = vh * shape;
  } else {
    cropH = vw / shape;
  }

  cropW = cropW / zoom;
  cropH = cropH / zoom;
  const sx = (vw - cropW) / 2;
  const sy = (vh - cropH) / 2;

  // Keep the long side around 1600 px, which is plenty for reading text, and
  // never enlarge a small crop by more than double.
  const max = 1600;
  const scale = Math.min(max / Math.max(cropW, cropH), 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cropW * scale));
  canvas.height = Math.max(1, Math.round(cropH * scale));
  canvas
    .getContext("2d")
    .drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
  });
}
