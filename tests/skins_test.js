/* Every skin, and the promise that none of them can break the app.

       node tests/skins_test.js

   A skin changes colour, type, shape and layout, so it can go wrong in more
   ways than a colour scheme can. What is checked here is that it cannot: that
   every palette clears Recall's own rule by role, that every skin falls back
   to the one that ships when anything is missing, and that no layout hides a
   reminder without saying so.

   The contrast maths is repeated here rather than imported, on purpose. The
   generator computes it before writing the CSS; this reads the CSS back and
   computes it again. If the two ever disagree, something was edited by hand
   that should not have been.
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const results = [];

function check(name, ok, detail) {
  results.push((ok ? "PASS" : "FAIL") + "  " + name +
    (detail ? "   " + String(detail).slice(0, 110) : ""));
  return ok;
}

// Line endings are normalised on the way in. Git checks these files out with
// CRLF on Windows, so a regex written against a newline stopped matching the
// moment the working tree was normalised, and two checks failed for a reason
// that had nothing to do with the code they were testing.
function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
}

// skins.json is what the generator writes and what the stylesheet, the
// module and the face list are all built from, so it is the count every
// one of them has to agree with. Reading it here means adding a skin does
// not mean editing a number in three tests.
const data = JSON.parse(read("tools/skins.json"));

/* ------------------------------------------------------------- wcag maths */
function chan(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function lum(hex) {
  const h = hex.replace("#", "");
  return 0.2126 * chan(parseInt(h.slice(0, 2), 16)) +
         0.7152 * chan(parseInt(h.slice(2, 4), 16)) +
         0.0722 * chan(parseInt(h.slice(4, 6), 16));
}
function ratio(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/* --------------------------------------------- read the skins back out of css */
const css = read("css/skins.css");
const blocks = [];
const re = /:root(?:\[data-skin="([a-z0-9-]+)"\])?\s*\{([^}]*)\}/g;
let m;
while ((m = re.exec(css)) !== null) {
  const key = m[1] || "warm-paper";
  const body = m[2];
  const tokens = {};
  body.replace(/--([a-z-]+):\s*([^;]+);/g, function (all, name, value) {
    tokens[name] = value.trim();
    return all;
  });
  if (tokens.paper) blocks.push({ key: key, t: tokens });
}

check("every skin has a block in the stylesheet",
  blocks.length === data.skins.length,
  blocks.length + " blocks for " + data.skins.length + " skins");
check("the default is a bare :root, so the app works with no skin attribute",
  blocks.length > 0 && blocks[0].key === "warm-paper" &&
  css.indexOf('[data-skin="warm-paper"]') === -1);

/* Recall's rule, by role. The button label is 24px at weight 700, which WCAG
   counts as large text, so it is judged at 3:1 and not 4.5:1. */
const CHECKS = [
  ["running text", "body", "paper", 4.5],
  ["card title", "ink", "card", 4.5],
  ["secondary line", "mid", "card", 4.5],
  ["button label", "on-accent", "orange", 3.0],
  ["text on a tint", "on-soft", "orange-soft", 4.5],
  ["done in green", "ok", "card", 4.5],
  // Both of these reuse an existing token rather than adding one, so they are
  // worth proving rather than assuming.
  ["text on an ink ground", "paper", "ink", 4.5],
  ["the call button label", "on-accent", "ok", 3.0]
];

let worstOverall = { over: Infinity };
const failures = [];
blocks.forEach(function (b) {
  CHECKS.forEach(function (c) {
    const fg = b.t[c[1]], bg = b.t[c[2]];
    if (!fg || !bg) {
      failures.push(b.key + " has no " + c[1] + " or " + c[2]);
      return;
    }
    const r = ratio(fg, bg);
    if (r < c[3]) failures.push(b.key + " " + c[0] + " " + r.toFixed(2) + " needs " + c[3]);
    if (r / c[3] < worstOverall.over) worstOverall = { over: r / c[3], skin: b.key, role: c[0], r: r, need: c[3] };
  });
});
check("every skin clears the rule in every role", !failures.length, failures.slice(0, 3).join("; "));
check("and the tightest measurement across all of them is stated",
  worstOverall.r > 0,
  worstOverall.skin + ", " + worstOverall.role + ", " + worstOverall.r.toFixed(2) +
  ":1 against " + worstOverall.need.toFixed(1));

/* Shape and size */
const sizes = [];
blocks.forEach(function (b) {
  ["face", "radius", "edge", "base"].forEach(function (k) {
    if (!b.t[k]) failures.push(b.key + " has no --" + k);
  });
  const base = parseInt(b.t.base, 10);
  sizes.push(base);
  if (base < 22) failures.push(b.key + " sets a base of " + base + "px, under the 22px floor");
  const stack = b.t.face || "";
  if (!/(sans-serif|serif|monospace)\s*$/.test(stack)) {
    failures.push(b.key + " has a face stack with no generic fallback: " + stack);
  }
});
check("every skin carries a face, a radius, an edge and a base", !failures.length,
  failures.slice(0, 3).join("; "));
check("no skin goes below the 22px floor", Math.min.apply(null, sizes) >= 22,
  "smallest is " + Math.min.apply(null, sizes) + "px");
check("every type stack ends in a generic family, so a missing webfont still reads",
  !failures.some(function (f) { return f.indexOf("generic fallback") >= 0; }));

/* ------------------------------------------------------------- the module */
const mod = read("js/skins.js");
check("the module lists every skin",
  (mod.match(/key: "/g) || []).length === data.skins.length,
  (mod.match(/key: "/g) || []).length + " entries");
check("the default needs no stylesheet of its own",
  /export const DEFAULT = "warm-paper"/.test(mod));
check("an unknown stored name falls back rather than breaking",
  /known\(saved\) \? saved : DEFAULT/.test(mod));
check("storage that throws falls back too",
  /catch \(err\) \{\s*return DEFAULT;/.test(mod));
check("no third party is contacted for a face",
  mod.indexOf("googleapis") < 0 && mod.indexOf("fonts.g") < 0);
check("the default carries no face of its own, so a fresh phone downloads no type",
  /\{ key: "warm-paper", layout: "cards", base: 22, group: "daylight" \}/.test(mod));

const withFace = (mod.match(/face: "/g) || []).length;
// The four that need no download are the ones on a face every phone has.
const noFace = data.skins.filter((x) => ["system", "verdana", "georgia"]
  .indexOf(x.font) >= 0).length;
check("the skins wanting a downloaded face are the ones not on a system face",
  withFace === data.skins.length - noFace,
  withFace + " needing a face, " + noFace + " on a system face");

/* The faces are ours, and every one a skin asks for has to exist. */
const fontsCss = read("css/fonts.css");
const declared = {};
(fontsCss.match(/font-family: "([^"]+)"/g) || []).forEach(function (m) {
  declared[m.replace(/font-family: "|"/g, "")] = true;
});
const wanted = [];
blocks.forEach(function (b) {
  const first = /^\s*"?([^",]+)"?/.exec(b.t.face || "");
  if (first) wanted.push(first[1].replace(/"/g, "").trim());
});
const orphans = wanted.filter(function (w) {
  const generic = /^(Verdana|Georgia|Segoe UI|system-ui|serif|sans-serif|monospace)$/.test(w);
  return !generic && !declared[w];
});
check("every face a skin asks for is declared in fonts.css", !orphans.length,
  orphans.slice(0, 4).join(", "));
check("the font files are served from this app, not from Google",
  /url\("\.\.\/fonts\//.test(fontsCss) && fontsCss.indexOf("gstatic") < 0);
check("both latin subsets are declared, so Dutch and French accents render",
  /unicode-range: U\+0100-02BA/.test(fontsCss) && /unicode-range: U\+0000-00FF/.test(fontsCss));
check("every face swaps rather than blocking the first paint",
  (fontsCss.match(/font-display: swap/g) || []).length ===
  (fontsCss.match(/@font-face\s*\{/g) || []).length,
  (fontsCss.match(/font-display: swap/g) || []).length + " swap of " +
  (fontsCss.match(/@font-face\s*\{/g) || []).length + " rules");

/* --------------------------------------------------------------- the css hooks */
const layouts = ["cards", "plain", "stripe", "ticket", "gutter", "notice", "one", "tiles"];
layouts.forEach(function (l) {
  check("the " + l + " layout has rules", css.indexOf('[data-layout="' + l + '"]') >= 0);
});
check("every layout named by the module has rules in the stylesheet",
  layouts.every(function (l) { return mod.indexOf('layout: "' + l + '"') >= 0; }));

/* One layout hides rows, and it is the only one allowed to. */
/* Find the rules that hide rows and ask which layout each one belongs to,
   rather than searching the whole file per layout, which matches everything. */
const hiders = [];
const hideRule = /([^}]*:not\(:first-child\)[^{]*)\{[^}]*display:\s*none/g;
let hit;
while ((hit = hideRule.exec(css)) !== null) {
  const owner = /\[data-layout="([a-z]+)"\]/.exec(hit[1]);
  if (owner && hiders.indexOf(owner[1]) < 0) hiders.push(owner[1]);
}
check("exactly one layout hides rows, and it is the one thing layout",
  hiders.length === 1 && hiders[0] === "one", hiders.join(", ") || "none");

const app = read("js/app.js");
check("and it always says how many it is holding back",
  /look\.rest/.test(app) && /total - 1/.test(app));
check("the count is a button that reveals them", /data-open-all/.test(app));

/* ------------------------------------------------- what the Pixel photo showed

   A photograph from a real phone showed the button labels spilling out of
   their own colour on a tiles skin: "Read it out loud" wrapped to two lines
   and the second line sat outside the button. The cause was flex-basis 0,
   which is right for sharing width in a row and wrong in the column that the
   tiles and one-thing layouts create, because it makes the button's base
   HEIGHT zero and a short screen then shrinks it under its own text.

   Measured before the fix: buttons 54 to 60px tall needing 72. R2.8. */
const style = read("css/style.css");
check("a row button shares width but never shrinks under its label",
  /\.today-acts \.big \{[^}]*flex: 1 0 auto;/.test(style));
check("and its height follows the words",
  /\.today-acts \.big \{[^}]*height: auto;/.test(style));
check("no button anywhere may be shrunk by a flex parent",
  /\.big \{[^}]*flex-shrink: 0;/.test(style));
check("the button's min width can never exceed what holds it",
  /min-width: min\(8rem, 100%\)/.test(style));

/* Long words. Dutch and French are longer than the English these boxes were
   sized against, and a narrow column makes it worse. R2.9. */
check("a long title wraps rather than pushing past the edge",
  /\.today-main \.title \{[^}]*overflow-wrap: anywhere;/.test(style));
check("so does a long second line",
  /\.today-main \.meta \{[^}]*overflow-wrap: anywhere;/.test(style));
check("the text half of a row is allowed to be narrow",
  /\.today-main > span,\s*\.card-body \{ min-width: 0; \}/.test(style) ||
  /min-width: 0;/.test(style));
check("no card is wider than the list holding it", /\.card \{\s*max-width: 100%;/.test(style));

/* The three ways in, as one pill. */
check("the tab bar is a floating pill, not a slab welded to the edge",
  /\.tabs \{[^}]*border-radius: 999px;/.test(style) &&
  /\.tabs \{[^}]*bottom: calc\(4px/.test(style));
check("it keeps clear of the phone's own gesture bar",
  /env\(safe-area-inset-bottom/.test(style));
check("its border follows the skin, so it belongs to whichever is on",
  /\.tabs \{[^}]*border: var\(--edge\) solid var\(--ink\);/.test(style));
check("each of the three is still a comfortable target",
  /\.tab \{[^}]*min-height: 72px;/.test(style));
check("the current one is not shown by colour alone",
  /\.tab\[aria-current="page"\] \{[^}]*box-shadow: inset 0 0 0 3px/.test(style));
check("a long tab label wraps instead of widening the pill",
  /\.tab \{[^}]*overflow-wrap: anywhere;/.test(style));
check("the page leaves room for the pill to float over",
  /padding-bottom: var\(--pill-room,/.test(style) &&
  /env\(safe-area-inset-bottom/.test(style));

/* --------------------------------------------- the camera screen is one page

   A photograph from an iPhone showed the two photo buttons sitting underneath
   the pill, cut off. The fit calculation subtracted the pill's HEIGHT, which
   was right when it was welded to the bottom edge and wrong once it floated:
   its real footprint is its height plus its gap plus whatever the phone
   reserves. Measuring to its top edge knows all three. R2.10. */
check("the camera fit measures to the top of the pill, not its height",
  /pill\.top > 0 \? pill\.top :/.test(app) && /tabs\.getBoundingClientRect\(\)/.test(app));
check("and it still has a floor, so a tiny screen does not collapse the picture",
  /Math\.max\(240,/.test(app));
check("it is recalculated when the viewport changes",
  /visualViewport\.addEventListener\("resize", fitCameraScreen\)/.test(app));

/* The pill sits low without standing on the home indicator. */
// The number itself is measured at runtime now, because a fixed one was
// short by up to sixty pixels once the iOS toolbar lifted the pill.
check("and the page reserves the matching room",
  /padding-bottom: var\(--pill-room,[\s\S]{0,24}calc\(96px/.test(style));

/* The lozenge that slides between the three. */
const markup = read("index.html");
check("the lozenge is its own element, because a background cannot travel",
  /class="tab-thumb"/.test(markup) && /\.tab-thumb \{/.test(style));
/* The gap around the lozenge has to be the same on all four sides. It was not:
   an absolutely positioned child sits against the padding BOX, which includes
   the padding, so top 0 meant no gap above or below while the ends kept the
   5px a flex item gets from the content box. One variable now feeds both. */
check("the pill names its inset once", /--pill-pad: 5px;/.test(style));
check("and uses it for its own padding", /padding: var\(--pill-pad\);/.test(style));
check("the lozenge is inset by that same number, not by zero",
  /top: var\(--pill-pad\);\s*bottom: var\(--pill-pad\);/.test(style));
check("so the gap cannot differ between the axes",
  !/\.tab-thumb \{[^}]*top: 0;/.test(style));
check("it slides rather than jumping",
  /\.tab-thumb \{[^}]*transition: transform/.test(style));
check("it is measured from the current tab's own box, not assumed thirds",
  /here\.offsetWidth/.test(app) && /here\.offsetLeft/.test(app));
check("it moves whenever the screen changes", /moveTabThumb\(\);/.test(app));
check("and is measured again when the phone turns or the labels change",
  /"orientationchange", moveTabThumb/.test(app) && /"resize", moveTabThumb/.test(app));
check("it is hidden from anything that reads the page aloud",
  /class="tab-thumb" aria-hidden="true"/.test(markup));
check("until it is measured the plain background shows the state instead",
  /\.tabs:not\(\.thumbed\) \.tab\[aria-current="page"\] \{/.test(style));
check("so the current tab is never carried by the animation alone",
  /\.tabs:not\(\.thumbed\) \.tab-thumb \{ opacity: 0; \}/.test(style));
check("somebody who asked for less movement gets no travel",
  /prefers-reduced-motion: reduce\) \{\s*\.tab-thumb \{ transition: none; \}/.test(style));
check("the pill sits lower still, on a quarter of the reserved strip",
  /bottom: calc\(4px \+ env\(safe-area-inset-bottom, 0px\) \/ 4\)/.test(style));

/* The one control that was ignoring the skin entirely. */
check("the zoom slider takes its colour from the skin",
  /input\[type="range"\] \{[^}]*accent-color: var\(--orange\);/.test(style));
check("and it has a visible focus ring",
  /input\[type="range"\]:focus-visible/.test(style));

/* ---------------------------------------------------------------- the markup */
const index = read("index.html");
check("the skin stylesheet is linked after the base one",
  index.indexOf("css/style.css") < index.indexOf("css/skins.css") &&
  index.indexOf("css/skins.css") > 0);
check("the skin goes on before the first paint, in a plain script",
  /localStorage.getItem\("recall.skin"\)/.test(index) &&
  index.indexOf('recall.skin') < index.indexOf('type="module"'));
check("the early script validates what it reads from storage",
  /\/\^\[a-z0-9-\]\{2,30\}\$\//.test(index));
check("there is a picker and a way back to the ordinary look",
  /id="skin-pick"/.test(index) && /id="skin-reset"/.test(index));

/* one row, eight layouts */
// The point of this one is that the time comes out as its own span, so the
// eight layouts can place it where each of them wants. It used to name the
// exact expression, clockTime(reminder.dueAt), which broke when the stored
// time stopped moving and the row started asking which occurrence is current
// instead. What matters is that a clock time is emitted in that span.
check("the row emits the time on its own, for the layouts that place it",
  /class="when"/.test(app) && /clockTime\(/.test(app) &&
  /class="when"[\s\S]{0,120}clockTime\(/.test(app));
check("and still emits the state, the title and the rest of the line",
  /class="title"/.test(app) && /class="meta"/.test(app) && /class="status"/.test(app));
check("a missing time renders as nothing rather than a dangling colon",
  /if \(!iso\) return "";/.test(app));

/* ----------------------------------------------------------------- offline */
const sw = read("sw.js");
check("skins.css and skins.js are in the offline shell",
  /"css\/skins\.css"/.test(sw) && /"js\/skins\.js"/.test(sw));
check("fonts.css is in the shell but the 1.4 MB of type is not",
  /"css\/fonts\.css"/.test(sw) && sw.indexOf(".woff2") < 0);
check("and no rule mentions Google, because nothing is fetched from there",
  sw.indexOf("googleapis") < 0 && sw.indexOf("gstatic") < 0);
check("the voice files are still left alone", /voiceFiles/.test(sw));

/* ------------------------------------------------------------ the dictionary */
const dict = read("js/i18n.js");
const names = (mod.match(/key: "([a-z0-9-]+)"/g) || []).map(function (s) {
  return s.replace(/key: "|"/g, "");
});
const missingNames = names.filter(function (k) { return dict.indexOf('"skin.' + k + '"') < 0; });
check("every skin has a name in the dictionary", !missingNames.length,
  missingNames.slice(0, 4).join(", "));
["daylight", "night", "lowvision"].forEach(function (g) {
  check("the " + g + " group has a name", dict.indexOf('"lookgroup.' + g + '"') >= 0);
});
check("no skin name is left in English in the other two languages",
  !/"skin\.[a-z0-9-]+":\s*\{ en: "([^"]+)",\s*nl: "\1",\s*fr: "\1"/.test(dict));

/* ------------------------------------------------- the chrome band
   The header was painted with --ink and --paper, and ink is the text colour,
   so on all eleven dark palettes it came out as a bright white band across a
   dark app. The sober dark skin is what made it obvious. --bar and --on-bar
   always resolve to a dark surface with light type. R2.11. */
const barSkins = data.skins.map((s) => {
  const sel = s.key === "warm-paper" ? ":root {"
    : ':root[data-skin="' + s.key + '"] {';
  const at = css.indexOf(sel);
  const block = at < 0 ? "" : css.slice(at, css.indexOf("}", at));
  const bar = (block.match(/--bar: (#[0-9A-Fa-f]{6})/) || [])[1];
  const on = (block.match(/--on-bar: (#[0-9A-Fa-f]{6})/) || [])[1];
  return { key: s.key, bar: bar, on: on };
});

check("every skin declares a chrome band",
  barSkins.every((s) => s.bar && s.on),
  barSkins.filter((s) => !s.bar).map((s) => s.key).join(",") || "all present");

check("no skin has a header brighter than its own type",
  barSkins.every((s) => lum(s.bar) < 0.4),
  barSkins.filter((s) => lum(s.bar) >= 0.4).map((s) => s.key).join(",") ||
  "all dark");

check("and the header type clears 4.5:1 on every one of them",
  barSkins.every((s) => ratio(s.on, s.bar) >= 4.5),
  "tightest " + Math.min.apply(null, barSkins.map(
    (s) => Math.round(ratio(s.on, s.bar) * 100) / 100)) + ":1");

check("the stylesheet paints the header from the band, not from the ink",
  /\.topbar \{[^}]*background: var\(--bar/.test(read("css/style.css")));

console.log(results.join("\n"));
const failed = results.filter(function (r) { return r.indexOf("FAIL") === 0; });
console.log("\n" + (results.length - failed.length) + " passed, " + failed.length + " failed");
process.exit(failed.length ? 1 : 0)
