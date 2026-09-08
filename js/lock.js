// An optional lock on the keeper phone. R7.3 and R7.4.
//
// Two honest limits, both written down in docs/analysis.md as well.
//
// One: this is a lock on the screen, not encryption. The cards live in
// IndexedDB and anybody with the phone, a cable and patience can read them.
// It stops a curious visitor, a grandchild and a stranger who picks the phone
// up in a waiting room, which is the threat that actually happens here.
//
// Two: Face ID here means the phone asks the person to prove they are the
// owner of the phone. There is no server checking the answer, because Recall
// has no server. That is the same trade as the code, one step better, and it
// is never the only way in.
//
// The code is never stored. What is stored is a salt and the result of a
// hundred and fifty thousand PBKDF2 rounds over it, so a four number code
// cannot simply be read out of the phone.

const KEY = "recall.lock";
const ROUNDS = 150000;

function readLock() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function writeLock(value) {
  try {
    if (value === null) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(value));
    return true;
  } catch (err) {
    return false;
  }
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(text) {
  const out = new Uint8Array(text.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(text.substr(i * 2, 2), 16);
  }
  return out;
}

function randomBytes(count) {
  const out = new Uint8Array(count);
  window.crypto.getRandomValues(out);
  return out;
}

async function stretch(code, salt) {
  const material = await window.crypto.subtle.importKey(
    "raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await window.crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: ROUNDS },
    material,
    256
  );
  return toHex(bits);
}

/* what is set up right now */

export function locked() {
  return readLock() !== null;
}

// Four or six, because that is what the phone itself asks for and anything
// else would be a surprise.
export function codeLength() {
  const lock = readLock();
  return lock ? lock.digits : 0;
}

export function faceReady() {
  const lock = readLock();
  return !!(lock && lock.credentialId);
}

/* setting it up, which is something family does on her phone */

export async function setCode(code) {
  if (!/^[0-9]{4}$|^[0-9]{6}$/.test(code)) {
    throw new Error("Use four numbers, or six.");
  }
  const salt = randomBytes(16);
  const hash = await stretch(code, salt);
  const ok = writeLock({
    version: 1,
    digits: code.length,
    salt: toHex(salt),
    hash: hash,
    credentialId: null
  });
  if (!ok) throw new Error("This browser will not let Recall remember the code.");
}

export function clearLock() {
  writeLock(null);
}

export async function checkCode(code) {
  const lock = readLock();
  if (!lock) return false;
  const hash = await stretch(code, fromHex(lock.salt));
  return hash === lock.hash;
}

/* Face ID and fingerprints, where the phone has them */

export async function faceAvailable() {
  try {
    if (!window.PublicKeyCredential) return false;
    if (!window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (err) {
    return false;
  }
}

// The credential stays on the phone, in the phone's own secure hardware. All
// Recall keeps is the id, so it can ask for that one credential again.
export async function addFace(name) {
  const lock = readLock();
  if (!lock) throw new Error("Set a code first, so there is always a way in.");

  const credential = await window.navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: "Recall" },
      user: {
        id: randomBytes(16),
        name: name || "her phone",
        displayName: name || "her phone"
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 }
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred"
      },
      attestation: "none",
      timeout: 60000
    }
  });
  if (!credential) throw new Error("The phone did not offer Face ID.");

  lock.credentialId = toHex(credential.rawId);
  writeLock(lock);
}

export function removeFace() {
  const lock = readLock();
  if (!lock) return;
  lock.credentialId = null;
  writeLock(lock);
}

export async function checkFace() {
  const lock = readLock();
  if (!lock || !lock.credentialId) return false;
  const assertion = await window.navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: "public-key", id: fromHex(lock.credentialId) }],
      userVerification: "required",
      timeout: 60000
    }
  });
  return !!assertion;
}
