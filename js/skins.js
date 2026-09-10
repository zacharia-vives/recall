/* Skins: how Recall looks, and who gets to decide.

   A skin is four things and all four are tokens, so nothing outside this file
   and css/skins.css has to know which one is on: a palette, a face, a shape,
   and a layout. The first three are pure CSS. The layout is a class on the
   list, because it changes where things sit rather than what colour they are.

   Three rules.

     1. Nothing here can stop the app working. A skin that will not load, a
        font that will not download, a stored name that no longer exists: all
        of them land on the one that ships, which is the default in
        style.css and needs no stylesheet of its own.
     2. No third party is ever contacted for a face. The files live in
        fonts/, because asking Google for a font would hand them the IP
        address of a woman with mild memory loss, which is the same objection
        that ruled out cloud text recognition and cloud speech. A face is
        still only downloaded when a skin that uses it is chosen, because a
        browser fetches an @font-face source only when text needs it.
     3. The rule holds whatever is chosen. Every palette in skins.css was
        checked by role before it was written: 4.5:1 for text, 3:1 for the
        24px bold button label. There is no skin in the list that fails, so
        there is no skin she can choose that makes the app unreadable.

   The names people read are in the dictionary as skin.<key>, so this file
   carries no English. */

const KEY = "recall.skin";

export const SKINS = [
  { key: "warm-paper", layout: "cards", base: 22, group: "daylight" },
  { key: "sand", layout: "cards", base: 22, group: "daylight", face: "atkinson" },
  { key: "night", layout: "cards", base: 22, group: "night" },
  { key: "broadsheet", layout: "plain", base: 22, group: "daylight", face: "literata" },
  { key: "lamp", layout: "plain", base: 22, group: "night", face: "literata" },
  { key: "large-serif", layout: "plain", base: 26, group: "lowvision" },
  { key: "blue-accent", layout: "stripe", base: 22, group: "lowvision", face: "public" },
  { key: "amber-night", layout: "stripe", base: 22, group: "night", face: "atkinson" },
  { key: "forest", layout: "stripe", base: 22, group: "night", face: "nunito" },
  { key: "appointment-slip", layout: "ticket", base: 22, group: "daylight", face: "mono" },
  { key: "night-slip", layout: "ticket", base: 22, group: "night", face: "mono" },
  { key: "pale-gold", layout: "ticket", base: 22, group: "lowvision", face: "bitter" },
  { key: "day-plan", layout: "gutter", base: 22, group: "daylight", face: "lexend" },
  { key: "departures", layout: "gutter", base: 22, group: "night", face: "oswald" },
  { key: "strong-dark", layout: "gutter", base: 22, group: "lowvision" },
  { key: "terracotta", layout: "notice", base: 22, group: "daylight", face: "archivo" },
  { key: "block", layout: "notice", base: 22, group: "night", face: "archivo" },
  { key: "amber-on-black", layout: "notice", base: 22, group: "lowvision", face: "atkinson" },
  { key: "calm", layout: "one", base: 22, group: "daylight", face: "lexend" },
  { key: "plum", layout: "one", base: 22, group: "night", face: "lexend" },
  { key: "the-next-thing", layout: "one", base: 26, group: "lowvision", face: "lexend" },
  { key: "two-tiles", layout: "tiles", base: 22, group: "daylight", face: "archivo" },
  { key: "strong-light", layout: "tiles", base: 22, group: "lowvision", face: "atkinson" },
  { key: "quiet-stone", layout: "tiles", base: 22, group: "daylight", face: "public" },
  { key: "sober-white", layout: "plain", base: 22, group: "daylight", face: "public" },
  { key: "sober-dark", layout: "plain", base: 22, group: "night", face: "public" }
];

const BY_KEY = {};
SKINS.forEach((s) => { BY_KEY[s.key] = s; });

export const DEFAULT = "warm-paper";

export function all() {
  return SKINS.slice();
}

export function known(key) {
  return Object.prototype.hasOwnProperty.call(BY_KEY, key);
}

export function get(key) {
  return BY_KEY[key] || BY_KEY[DEFAULT];
}

/* Which skin is on. A name nobody recognises reads as the default rather than
   as a broken screen, which is rule one. */
export function chosen() {
  try {
    const saved = window.localStorage.getItem(KEY);
    return known(saved) ? saved : DEFAULT;
  } catch (err) {
    return DEFAULT;
  }
}

export function layout(key) {
  return get(key || chosen()).layout;
}

/* Nothing to fetch. The faces are served from this app's own fonts folder and
   declared in css/fonts.css, so there is no third party to call and no link to
   inject. A browser only downloads an @font-face source when text actually
   needs it, so a phone on the default skin downloads no type at all. */
/* Put a skin on the page. Called from the early script in the markup before
   anything is painted, and again whenever somebody picks a different one. */
export function apply(key) {
  const use = known(key) ? key : chosen();
  const skin = get(use);
  const root = document.documentElement;

  if (use === DEFAULT) root.removeAttribute("data-skin");
  else root.setAttribute("data-skin", use);
  root.setAttribute("data-layout", skin.layout);

  return use;
}

export function set(key) {
  if (!known(key)) return chosen();
  try {
    if (key === DEFAULT) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, key);
  } catch (err) {
    // A phone with storage off forgets on the next opening and lands back on
    // the default, which is the safe direction.
  }
  return apply(key);
}
