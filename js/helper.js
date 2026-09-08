// The family side. Everything here needs a signed in helper and a household, so
// unlike the keeper app this one does nothing until the cloud is configured.

import * as cloud from "./cloud.js";
import { NOTICE_VERSION } from "./config.js";

const panes = {
  unconfigured: document.getElementById("s-unconfigured"),
  signin: document.getElementById("s-signin"),
  households: document.getElementById("s-households"),
  app: document.getElementById("s-app")
};

const views = {
  follow: document.getElementById("v-follow"),
  cards: document.getElementById("v-cards"),
  house: document.getElementById("v-house")
};

let household = null;   // { id, name, role, myName }
let myUserId = null;
let creating = false;   // guards against a second click while one is in flight
let cards = [];
let reminders = [];

/* -------------------------------------------------------------- utilities */

function esc(text) {
  return String(text === undefined || text === null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function say(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3000);
}

function showPane(name) {
  Object.keys(panes).forEach((key) => {
    panes[key].hidden = key !== name;
  });
}

function when(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) +
    " at " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function localValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

const KIND_BADGE = { letter: "L", person: "P", place: "●" };

/* --------------------------------------------------------------- sign in */

async function startSignIn(event) {
  event.preventDefault();
  const email = document.getElementById("email").value.trim();
  const msg = document.getElementById("signin-msg");
  const redirect = location.origin + location.pathname;
  try {
    await cloud.signInByEmail(email, redirect);
    msg.hidden = false;
    msg.textContent = "Check your email. The link brings you straight back here.";
  } catch (err) {
    msg.hidden = false;
    msg.textContent = "That did not work: " + (err.message || err);
  }
}

/* ------------------------------------------------------------ households */

async function showHouseholds() {
  const rows = await cloud.myMemberships();
  const box = document.getElementById("household-list");

  // One row per household, not one per membership, and never a duplicate.
  const seen = {};
  const unique = [];
  rows.forEach((m) => {
    if (seen[m.household_id]) return;
    seen[m.household_id] = true;
    unique.push(m);
  });

  if (unique.length === 0) {
    box.innerHTML = '<p class="none">You are not part of a household yet. Set one up below.</p>';
  } else {
    box.innerHTML = unique.map((m) => {
      const name = m.households ? m.households.name : "household";
      const mine = m.households && myUserId && m.households.created_by === myUserId;
      return '<div class="row-item">' +
        '<span class="badge">' + esc(name.slice(0, 1).toUpperCase()) + "</span>" +
        '<span class="grow"><span class="t">' + esc(name) + "</span>" +
        '<span class="s">you are the ' + esc(m.role) +
        (mine ? ", and you created it" : "") + "</span></span>" +
        '<span class="acts"><button class="btn small" data-open-hh="' + esc(m.household_id) +
        '" data-hh-name="' + esc(name) + '" data-hh-role="' + esc(m.role) +
        '" data-hh-me="' + esc(m.display_name || "") + '">Open</button>' +
        (mine
          ? '<button class="btn small danger" data-drop-hh="' + esc(m.household_id) +
            '" data-drop-name="' + esc(name) + '">Delete</button>'
          : "") +
        "</span></div>";
    }).join("");
  }
  showPane("households");
}

async function createHousehold(event) {
  event.preventDefault();

  // Without this, a double click makes two households. It made three during
  // testing, which is how this guard came to exist.
  if (creating) return;
  creating = true;
  const button = event.target.querySelector('button[type="submit"]');
  if (button) {
    button.disabled = true;
    button.textContent = "Creating...";
  }

  const name = document.getElementById("hh-name").value.trim();
  const me = document.getElementById("hh-me").value.trim();
  try {
    const id = await cloud.createHousehold(name, me);
    await cloud.recordConsent(id, NOTICE_VERSION);
    household = { id: id, name: name, role: "helper", myName: me };
    await openHousehold();
    say("The household is ready.");
  } catch (err) {
    say("Could not create it: " + (err.message || err));
  } finally {
    creating = false;
    const button = document.querySelector('#form-household button[type="submit"]');
    if (button) {
      button.disabled = false;
      button.textContent = "Create it";
    }
  }
}

/* ------------------------------------------------------------- follow up */

function reminderRow(reminder) {
  const status = cloud.reminderStatus(reminder);
  const title = reminder.records ? reminder.records.title : "a card";
  const done = status === "done";
  return '<div class="row-item ' + (status === "missed" ? "is-missed" : done ? "is-done" : "") + '">' +
    '<span class="grow"><span class="t">' + esc(title) + "</span>" +
    '<span class="s">' + esc(when(reminder.due_at)) +
    (reminder.repeat && reminder.repeat !== "none" ? " &middot; " + esc(reminder.repeat.replace("_", " ")) : "") +
    "</span></span>" +
    '<span class="pill ' + status + '">' + status + "</span>" +
    (done ? "" : '<span class="acts"><button class="btn small" data-done="' + esc(reminder.id) +
      '" data-rec="' + esc(reminder.record_id) + '">Mark done</button></span>') +
    "</div>";
}

function renderFollow() {
  const groups = { coming: [], missed: [], done: [] };
  reminders.forEach((r) => groups[cloud.reminderStatus(r)].push(r));

  const fill = (id, list, empty) => {
    const box = document.getElementById(id);
    box.innerHTML = list.length
      ? list.map(reminderRow).join("")
      : '<p class="none">' + empty + "</p>";
  };
  fill("follow-coming", groups.coming, "Nothing is due.");
  fill("follow-missed", groups.missed, "Nothing was missed.");
  fill("follow-done", groups.done.slice(0, 10), "Nothing marked done yet.");
}

/* ----------------------------------------------------------------- cards */

async function cardRow(record, binned) {
  const bits = [];
  if (record.happens_at) bits.push(when(record.happens_at));
  if (record.place) bits.push(record.place);
  if (!bits.length && record.people && record.people.length) bits.push(record.people.join(", "));

  let badge = KIND_BADGE[record.kind] || "L";
  if (record.photo_path) {
    const url = await cloud.photoLink(record.photo_path);
    if (url) badge = '<img src="' + esc(url) + '" alt="">';
  }

  const acts = binned
    ? '<button class="btn small" data-restore="' + esc(record.id) + '">Restore</button>'
    : '<button class="btn small ghost" data-edit="' + esc(record.id) + '">Edit</button>' +
      '<button class="btn small danger" data-bin="' + esc(record.id) + '">Bin</button>';

  return '<div class="row-item">' +
    '<span class="badge">' + badge + "</span>" +
    '<span class="grow"><span class="t">' + esc(record.title) + "</span>" +
    '<span class="s">' + esc(bits.join(" · ")) + "</span></span>" +
    '<span class="acts">' + acts + "</span>" +
    "</div>";
}

async function renderCards() {
  const live = cards.filter((c) => !c.deleted_at);
  const binned = cards.filter((c) => c.deleted_at);

  const list = document.getElementById("cards-list");
  list.innerHTML = live.length
    ? (await Promise.all(live.map((c) => cardRow(c, false)))).join("")
    : '<p class="none">No cards yet. Add the first one, she will hear it read out loud.</p>';

  const bin = document.getElementById("bin-list");
  bin.innerHTML = binned.length
    ? (await Promise.all(binned.map((c) => cardRow(c, true)))).join("")
    : '<p class="none">The bin is empty.</p>';
  document.getElementById("bin-wrap").hidden = binned.length === 0;
}

function openCardForm(record) {
  const form = document.getElementById("form-card");
  form.hidden = false;
  document.getElementById("c-id").value = record ? record.id : "";
  document.getElementById("c-kind").value = record ? record.kind : "letter";
  document.getElementById("c-title").value = record ? record.title : "";
  document.getElementById("c-people").value = record ? (record.people || []).join(", ") : "";
  document.getElementById("c-place").value = record ? record.place || "" : "";
  document.getElementById("c-when").value = record ? localValue(record.happens_at) : "";
  document.getElementById("c-spoken").value = record ? record.spoken_text || "" : "";
  document.getElementById("c-photo").value = "";
  document.getElementById("c-repeat").value = "";
  document.getElementById("c-remind-at").value = "";
  document.getElementById("c-title").focus();
}

async function saveCard(event) {
  event.preventDefault();
  const id = document.getElementById("c-id").value;
  const whenValue = document.getElementById("c-when").value;
  const payload = {
    kind: document.getElementById("c-kind").value,
    title: document.getElementById("c-title").value.trim(),
    people: document.getElementById("c-people").value.split(",").map((s) => s.trim()).filter(Boolean),
    place: document.getElementById("c-place").value.trim(),
    happensAt: whenValue ? new Date(whenValue).toISOString() : null,
    spokenText: document.getElementById("c-spoken").value.trim()
  };

  if (!payload.title) {
    say("The card needs a name.");
    return;
  }

  try {
    let record;
    if (id) {
      record = await cloud.updateRecord(household.id, id, {
        kind: payload.kind,
        title: payload.title,
        people: payload.people,
        place: payload.place,
        happens_at: payload.happensAt,
        spoken_text: payload.spokenText
      }, payload.title + " was changed");
    } else {
      record = await cloud.addRecord(household.id, payload);
    }

    const file = document.getElementById("c-photo").files[0];
    if (file) {
      const path = await cloud.uploadPhoto(household.id, record.id, file);
      record = await cloud.updateRecord(household.id, record.id, { photo_path: path },
        "a photo was added to " + payload.title);
    }

    const repeat = document.getElementById("c-repeat").value;
    const remindAt = document.getElementById("c-remind-at").value;
    if (repeat !== "") {
      const due = remindAt
        ? new Date(remindAt).toISOString()
        : payload.happensAt
          ? new Date(new Date(payload.happensAt).getTime() - 24 * 3600 * 1000).toISOString()
          : new Date(Date.now() + 3600 * 1000).toISOString();
      await cloud.setReminder(household.id, record.id, due, repeat || "none", payload.spokenText);
    }

    document.getElementById("form-card").hidden = true;
    await refresh();
    say(id ? "The card is updated." : "The card is added.");
  } catch (err) {
    say("Could not save it: " + (err.message || err));
  }
}

/* -------------------------------------------------------------- household */

async function renderHouse() {
  const list = await cloud.members(household.id);
  document.getElementById("members-list").innerHTML = list.map((m) =>
    '<div class="row-item">' +
    '<span class="badge">' + esc((m.display_name || "?").slice(0, 1).toUpperCase()) + "</span>" +
    '<span class="grow"><span class="t">' + esc(m.display_name || "someone") + "</span>" +
    '<span class="s">since ' + esc(when(m.accepted_at)) + "</span></span>" +
    '<span class="pill ' + esc(m.role) + '">' + esc(m.role) + "</span>" +
    (m.role === "helper"
      ? '<span class="acts"><button class="btn small danger" data-remove="' + esc(m.id) +
        '" data-name="' + esc(m.display_name || "someone") + '">Remove</button></span>'
      : "") +
    "</div>"
  ).join("");

  const log = await cloud.listActivity(household.id, 30);
  document.getElementById("activity-list").innerHTML = log.length
    ? log.map((a) =>
        '<div class="row-item"><span class="grow"><span class="t">' +
        esc(a.actor_name || "someone") + " " + esc(a.action.replace("_", " ")) + "</span>" +
        '<span class="s">' + esc(a.detail) + " &middot; " + esc(when(a.at)) + "</span></span></div>"
      ).join("")
    : '<p class="none">Nothing has happened yet.</p>';
}

async function makeLinkCode() {
  try {
    const link = await cloud.createDeviceLink(household.id, household.name);
    document.getElementById("link-code").textContent = link.code;
    say("The code works for fifteen minutes.");
  } catch (err) {
    say("Could not make a code: " + (err.message || err));
  }
}

async function sendInvite(event) {
  event.preventDefault();
  const email = document.getElementById("inv-email").value.trim();
  const msg = document.getElementById("invite-msg");
  try {
    const token = await cloud.inviteHelper(household.id, email);
    const url = location.origin + location.pathname + "?invite=" + token;
    msg.hidden = false;
    msg.textContent = "Send them this link: " + url;
    await renderHouse();
  } catch (err) {
    msg.hidden = false;
    msg.textContent = "Could not invite: " + (err.message || err);
  }
}

/* ------------------------------------------------------------------ shell */

function showView(name) {
  Object.keys(views).forEach((key) => {
    views[key].hidden = key !== name;
  });
  document.querySelectorAll(".subtab").forEach((tab) => {
    if (tab.dataset.view === name) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
}

async function refresh() {
  cards = await cloud.listRecords(household.id, true);
  reminders = await cloud.listReminders(household.id);
  renderFollow();
  await renderCards();
  await renderHouse();
}

async function openHousehold() {
  showPane("app");
  document.getElementById("who").textContent = household.name;
  showView("follow");
  await refresh();
}

function wire() {
  document.getElementById("form-signin").addEventListener("submit", startSignIn);
  document.getElementById("form-household").addEventListener("submit", createHousehold);
  document.getElementById("form-card").addEventListener("submit", saveCard);
  document.getElementById("form-invite").addEventListener("submit", sendInvite);
  document.getElementById("btn-link").addEventListener("click", makeLinkCode);

  document.getElementById("btn-new-card").addEventListener("click", () => openCardForm(null));
  document.getElementById("btn-cancel-card").addEventListener("click", () => {
    document.getElementById("form-card").hidden = true;
  });

  document.getElementById("btn-out").addEventListener("click", async () => {
    await cloud.signOut();
    location.reload();
  });

  document.querySelectorAll(".subtab").forEach((tab) => {
    tab.addEventListener("click", () => showView(tab.dataset.view));
  });

  document.addEventListener("click", async (event) => {
    const t = event.target;

    const open = t.closest("[data-open-hh]");
    if (open) {
      household = {
        id: open.dataset.openHh,
        name: open.dataset.hhName,
        role: open.dataset.hhRole,
        myName: open.dataset.hhMe
      };
      await openHousehold();
      return;
    }

    if (t.dataset.done) {
      await cloud.markDone(household.id, t.dataset.done, t.dataset.rec);
      await refresh();
      say("Marked done.");
      return;
    }
    if (t.dataset.edit) {
      openCardForm(cards.find((c) => c.id === t.dataset.edit));
      return;
    }
    if (t.dataset.bin) {
      const card = cards.find((c) => c.id === t.dataset.bin);
      if (!window.confirm("Move " + card.title + " to the bin? It stays there for thirty days.")) return;
      await cloud.binRecord(household.id, card.id, card.title);
      await refresh();
      return;
    }
    if (t.dataset.restore) {
      const card = cards.find((c) => c.id === t.dataset.restore);
      await cloud.restoreRecord(household.id, card.id, card.title);
      await refresh();
      return;
    }
    const drop = t.closest("[data-drop-hh]");
    if (drop) {
      const label = drop.dataset.dropName;
      if (!window.confirm("Delete " + label + " and everything in it? This cannot be undone.")) return;
      try {
        await cloud.deleteHousehold(drop.dataset.dropHh);
        say(label + " is gone.");
        await showHouseholds();
      } catch (err) {
        say("Could not delete it: " + (err.message || err));
      }
      return;
    }

    if (t.dataset.remove) {
      if (!window.confirm("Remove " + t.dataset.name + "? She will see that this happened.")) return;
      await cloud.removeMember(t.dataset.remove, household.id, t.dataset.name);
      await renderHouse();
      say("Removed.");
    }
  });
}

async function init() {
  if (!cloud.configured()) {
    showPane("unconfigured");
    return;
  }

  wire();

  const user = await cloud.currentUser();
  if (!user) {
    showPane("signin");
    return;
  }

  myUserId = user.id;
  document.getElementById("btn-out").hidden = false;
  document.getElementById("who").textContent = user.email || "signed in";

  // R6.5, arriving from an invitation link
  const invite = new URLSearchParams(location.search).get("invite");
  if (invite) {
    try {
      const id = await cloud.acceptInvite(invite, user.email || "");
      history.replaceState(null, "", location.pathname);
      say("You are in.");
    } catch (err) {
      say("That invitation did not work: " + (err.message || err));
    }
  }

  const rows = await cloud.myMemberships();
  if (rows.length === 1) {
    const m = rows[0];
    household = {
      id: m.household_id,
      name: m.households ? m.households.name : "household",
      role: m.role,
      myName: m.display_name
    };
    await openHousehold();
  } else {
    await showHouseholds();
  }
}

init();
