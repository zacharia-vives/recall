// Everything that talks to Supabase. The rest of the app never imports the
// Supabase library itself, so if this file is never called nothing is loaded and
// nothing leaves the device.
//
// Two roles live here: a helper signs in with an emailed link, a keeper phone
// signs in anonymously once and is claimed into a household with a code.

import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from "./config.js?v=25";

const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

let client = null;

export function configured() {
  return isConfigured();
}

export async function getClient() {
  if (!isConfigured()) return null;
  if (client) return client;
  const { createClient } = await import(LIB);
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return client;
}

/* ------------------------------------------------------------------ who am i */

export async function currentUser() {
  const db = await getClient();
  if (!db) return null;
  const { data } = await db.auth.getUser();
  return data ? data.user : null;
}

export async function signInByEmail(email, redirectTo) {
  const db = await getClient();
  if (!db) throw new Error("The cloud is not configured yet");
  const { error } = await db.auth.signInWithOtp({
    email: email,
    options: { emailRedirectTo: redirectTo }
  });
  if (error) throw error;
  return true;
}

export async function signInAnonymously() {
  const db = await getClient();
  if (!db) throw new Error("The cloud is not configured yet");
  const { data, error } = await db.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const db = await getClient();
  if (!db) return;
  await db.auth.signOut();
}

/* ------------------------------------------------------------- households */

export async function myMemberships() {
  const db = await getClient();
  if (!db) return [];
  const { data, error } = await db
    .from("memberships")
    .select("id, role, display_name, household_id, households(id, name, created_by)")
    .order("accepted_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createHousehold(name, helperName) {
  const db = await getClient();
  const { data, error } = await db.rpc("create_household", {
    household_name: name,
    helper_name: helperName || ""
  });
  if (error) throw error;
  return data;
}

export async function members(householdId) {
  const db = await getClient();
  const { data, error } = await db
    .from("memberships")
    .select("id, role, display_name, user_id, accepted_at")
    .eq("household_id", householdId)
    .order("accepted_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function removeMember(membershipId, householdId, name) {
  const db = await getClient();
  const { error } = await db.from("memberships").delete().eq("id", membershipId);
  if (error) throw error;
  await logActivity(householdId, "removed", null, name + " no longer has access");
}

/* --------------------------------------------------------- device linking */

function shortCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0 or 1
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += letters[Math.floor(Math.random() * letters.length)];
  }
  return out;
}

// R6.3. The helper makes a code on their own phone and types it into the phone
// of the keeper. Fifteen minutes is plenty and keeps a stray code harmless.
export async function createDeviceLink(householdId, displayName) {
  const db = await getClient();
  const user = await currentUser();
  const code = shortCode();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const { error } = await db.from("device_links").insert({
    code: code,
    household_id: householdId,
    created_by: user.id,
    display_name: displayName || "the keeper",
    expires_at: expires
  });
  if (error) throw error;
  return { code: code, expiresAt: expires };
}

// Runs on the keeper phone. The identity used here must always be a fresh
// anonymous one: if somebody types the code while still signed in as family,
// the old version claimed the code with the family account and demoted it to
// keeper, quietly taking away its right to edit or invite.
export async function claimDeviceLink(code) {
  const db = await getClient();
  const user = await currentUser();
  if (!user || user.is_anonymous !== true) {
    if (user) await signOut();
    await signInAnonymously();
  }
  const { data, error } = await db.rpc("claim_keeper_device", { link_code: code.toUpperCase() });
  if (error) throw error;
  return data;
}

// Only the helper who created a household can remove it, and the database
// enforces that. Everything in it goes with it.
export async function deleteHousehold(householdId) {
  const db = await getClient();
  const { error } = await db.from("households").delete().eq("id", householdId);
  if (error) throw error;
}

// The seam that itsme, FranceConnect and the EU wallet would plug into one day.
// They are all OpenID Connect, so the app side is this one function, and the
// difference is entirely commercial: a contract and a legal entity.
export async function signInWithProvider(provider, redirectTo) {
  const db = await getClient();
  if (!db) throw new Error("The cloud is not configured yet");
  const { error } = await db.auth.signInWithOAuth({
    provider: provider,
    options: { redirectTo: redirectTo }
  });
  if (error) throw error;
}

/* ----------------------------------------------------------------- invites */

export async function inviteHelper(householdId, email) {
  const db = await getClient();
  const user = await currentUser();
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const { error } = await db.from("invites").insert({
    household_id: householdId,
    email: email,
    token: token,
    invited_by: user.id,
    expires_at: expires
  });
  if (error) throw error;
  await logActivity(householdId, "invited", null, email + " was invited");
  return token;
}

export async function acceptInvite(token, helperName) {
  const db = await getClient();
  const { data, error } = await db.rpc("accept_invite", {
    invite_token: token,
    helper_name: helperName || ""
  });
  if (error) throw error;
  return data;
}

/* ----------------------------------------------------------------- records */

export async function listRecords(householdId, includeBinned) {
  const db = await getClient();
  let query = db
    .from("records")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });
  if (!includeBinned) query = query.is("deleted_at", null);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addRecord(householdId, record) {
  const db = await getClient();
  const user = await currentUser();
  const row = {
    household_id: householdId,
    created_by: user.id,
    id: record.id || undefined,
    kind: record.kind,
    title: record.title,
    people: record.people || [],
    place: record.place || "",
    happens_at: record.happensAt || null,
    tags: record.tags || [],
    photo_path: record.photoPath || null,
    ocr_text: record.ocrText || "",
    spoken_text: record.spokenText || ""
  };
  const { data, error } = await db.from("records").insert(row).select().single();
  if (error) throw error;
  await logActivity(householdId, "added", data.id, record.title);
  return data;
}

// Used by the keeper phone to push its own captures up. Upsert rather than
// insert: the phone retries, and a retry must not die on a duplicate id, which
// is exactly what used to break the whole sync.
export async function pushRecord(householdId, record) {
  const db = await getClient();
  const user = await currentUser();
  const row = {
    id: record.id,
    household_id: householdId,
    created_by: user.id,
    kind: record.kind,
    title: record.title,
    people: record.people || [],
    place: record.place || "",
    happens_at: record.happensAt || null,
    tags: record.tags || [],
    ocr_text: record.ocrText || "",
    spoken_text: record.spokenText || "",
    // The keeper may insert a card but may never edit one, which the security
    // test checks. So the photo has to travel with the insert: adding it
    // afterwards was refused by the database and the picture stayed behind.
    photo_path: record.photoPath || null
  };
  const { data, error } = await db
    .from("records")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecord(householdId, id, changes, what) {
  const db = await getClient();
  const { data, error } = await db
    .from("records")
    .update(changes)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  await logActivity(householdId, "edited", id, what || "a card was changed");
  return data;
}

// R5.7. Nothing is destroyed here, it goes to the bin.
export async function binRecord(householdId, id, title) {
  const db = await getClient();
  const { error } = await db
    .from("records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await logActivity(householdId, "deleted", id, title + " went to the bin");
}

export async function restoreRecord(householdId, id, title) {
  const db = await getClient();
  const { error } = await db.from("records").update({ deleted_at: null }).eq("id", id);
  if (error) throw error;
  await logActivity(householdId, "restored", id, title + " came back out of the bin");
}

/* --------------------------------------------------------------- reminders */

export async function listReminders(householdId) {
  const db = await getClient();
  const { data, error } = await db
    .from("reminders")
    .select("*, records(title, kind, photo_path)")
    .eq("household_id", householdId)
    .order("due_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function setReminder(householdId, recordId, dueAt, repeat, spokenText, id) {
  const db = await getClient();
  const { data, error } = await db
    .from("reminders")
    .insert({
      id: id || undefined,
      household_id: householdId,
      record_id: recordId,
      due_at: dueAt,
      repeat: repeat || "none",
      spoken_text: spokenText || ""
    })
    .select()
    .single();
  if (error) throw error;
  await logActivity(householdId, "reminder_set", recordId, "a reminder was set");
  return data;
}

export async function markDone(householdId, reminderId, recordId) {
  const db = await getClient();
  const user = await currentUser();
  const { error } = await db
    .from("reminders")
    .update({ done_at: new Date().toISOString(), done_by: user.id })
    .eq("id", reminderId);
  if (error) throw error;
  await logActivity(householdId, "marked_done", recordId, "marked as done");
}

// P17. Three values, and no more than three.
export function reminderStatus(reminder) {
  if (reminder.done_at) return "done";
  if (new Date(reminder.due_at).getTime() < Date.now() - 12 * 3600 * 1000) return "missed";
  return "coming";
}

/* ---------------------------------------------------------------- activity */

export async function logActivity(householdId, action, recordId, detail) {
  const db = await getClient();
  if (!db) return;
  const user = await currentUser();
  let name = "";
  try {
    const mine = await db
      .from("memberships")
      .select("display_name")
      .eq("household_id", householdId)
      .eq("user_id", user.id)
      .single();
    name = mine.data ? mine.data.display_name : "";
  } catch (err) {
    name = "";
  }
  await db.from("activity").insert({
    household_id: householdId,
    actor_id: user.id,
    actor_name: name,
    action: action,
    record_id: recordId,
    detail: detail || ""
  });
}

export async function listActivity(householdId, limit) {
  const db = await getClient();
  const { data, error } = await db
    .from("activity")
    .select("*")
    .eq("household_id", householdId)
    .order("at", { ascending: false })
    .limit(limit || 40);
  if (error) throw error;
  return data || [];
}

/* ------------------------------------------------------------------ photos */

export async function uploadPhoto(householdId, recordId, blob) {
  const db = await getClient();
  const path = householdId + "/" + recordId + ".jpg";
  const { error } = await db.storage
    .from("photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

// P5. A link that works for an hour, never a public url.
export async function photoLink(path) {
  const db = await getClient();
  if (!db || !path) return null;
  const { data, error } = await db.storage.from("photos").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

/* ----------------------------------------------------------------- consent */

// Article 7(1): a controller must be able to demonstrate that consent was
// given. So this writes the record where it belongs, and if the database
// refuses that write it falls back to the activity log, which every member may
// write to, which cannot be updated or deleted, and which carries the same
// three facts: what was agreed to, against which version of the words, and
// when. What it must never do is stop her from answering.
export async function recordConsent(householdId, noticeVersion) {
  const db = await getClient();
  const user = await currentUser();
  const { error } = await db.from("consents").insert({
    household_id: householdId,
    notice_version: noticeVersion,
    explained_by: user.id
  });
  if (!error) return "consents";

  await logActivity(householdId, "linked", null,
    "she agreed to share her cards with the family, notice version " + noticeVersion);
  return "activity";
}

// Article 7(3): withdrawing has to be as easy as giving. The row is never
// deleted, it is marked, because an audit needs to see that it happened.
export async function withdrawConsent(householdId) {
  const db = await getClient();
  const latest = await latestConsent(householdId);
  if (latest) {
    await db
      .from("consents")
      .update({ withdrawn_at: new Date().toISOString() })
      .eq("id", latest.id);
  }
  // Written either way, because this is the fact that has to be provable.
  await logActivity(householdId, "unlinked", null,
    "she stopped sharing new cards with the family");
  return latest ? latest.id : null;
}

export async function latestConsent(householdId) {
  const db = await getClient();
  const { data } = await db
    .from("consents")
    .select("*")
    .eq("household_id", householdId)
    .order("given_at", { ascending: false })
    .limit(1);
  if (data && data.length) return data[0];

  // The fallback above leaves its record in the log, so look there as well
  // before asking her the same question twice.
  const { data: log } = await db
    .from("activity")
    .select("detail, at")
    .eq("household_id", householdId)
    .eq("action", "linked")
    .order("at", { ascending: false })
    .limit(20);
  const row = (log || []).find((a) => (a.detail || "").indexOf("notice version") >= 0);
  if (!row) return null;
  return {
    id: null,
    notice_version: row.detail.split("notice version ").pop().trim(),
    given_at: row.at,
    withdrawn_at: null,
    from_log: true
  };
}
