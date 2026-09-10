/* The camera one-pager, and getting back to the tile you came from.

   Both of these were reported twice. The first time the camera screen was
   fixed by measuring to the top of the pill instead of subtracting its
   height, and it came back on Calm, because that skin uses a face that is
   downloaded and the height was measured once, before the face arrived.
   The back button was wired to a fixed destination, so opening a card from
   Today and pressing back landed on Everything.

   Layout cannot be measured without a browser, so these do not try. They
   assert the things that actually regressed: that a re-measure is wired to
   font loading at all, that the fit checks its own result, that a tightening
   rule exists for every level the code can set, and that no back button is
   still pointing at one hard coded tile. R2.11.
*/

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let pass = 0;
let fail = 0;

function check(what, ok, detail) {
  if (ok) pass += 1;
  else fail += 1;
  console.log((ok ? "PASS  " : "FAIL  ") + what +
    (detail ? "   " + String(detail).slice(0, 110) : ""));
  return ok;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

const app = read("js/app.js");
const css = read("css/style.css");
const page = read("index.html");
const data = JSON.parse(read("tools/skins.json"));

/* ------------------------------------------------- the camera one-pager */

check("the camera fit is re-run once a downloaded face has arrived",
  /document\.fonts[\s\S]{0,200}fitCameraScreen/.test(app));

check("and again on loadingdone, for a face that arrives later still",
  /loadingdone[\s\S]{0,160}fitCameraScreen/.test(app));

check("the fit checks whether the content actually fits its height",
  /scrollHeight/.test(app) && /data-tight/.test(app));

check("it clears the previous tightening before measuring again",
  /removeAttribute\("data-tight"\)/.test(app));

// Whatever the loop can set, the stylesheet has to answer.
const levels = [];
const loop = app.match(/for \(let step = 1; step <= (\d+)/);
const top = loop ? Number(loop[1]) : 0;
check("the tightening loop has a stated number of steps", top >= 1, top + " steps");
for (let i = 1; i <= top; i += 1) {
  const has = i === 1
    ? css.indexOf("#screen-capture[data-tight]") >= 0
    : css.indexOf('#screen-capture[data-tight="' + i + '"]') >= 0;
  check("step " + i + " has rules in the stylesheet", has);
  levels.push(has);
}

check("the last step gives up the heading rather than the buttons",
  /\[data-tight="3"\] h1 \{ display: none/.test(css));

check("no tightening step shrinks a button under the 48px touch target",
  (() => {
    const sizes = css.match(/\[data-tight[^\]]*\][^{]*\.big \{[^}]*min-height:\s*(\d+)px/g) || [];
    return sizes.every((row) => Number(row.match(/min-height:\s*(\d+)px/)[1]) >= 48);
  })(), (css.match(/\[data-tight[^\]]*\][^{]*\.big \{[^}]*min-height:\s*(\d+)px/g) || []).length +
  " button rules");

check("the screen still turns scrolling off, which is why the fit has to be right",
  /body\.on-camera \{[^}]*overflow: hidden/.test(css));

/* ------------------------------------------------ room under the pill

   Reported on an iPhone: at the end of a scroll on Today and on Everything
   the last card sits under the pill. The reserve was one number in the
   stylesheet, 96px, and two things were wrong with it. Measured on a desktop
   with no toolbar at all the pill already wanted between 100 and 106
   depending on the skin, because a skin with a three pixel edge builds a
   taller pill. And on iOS the bottom toolbar expands at the end of a scroll
   and Safari lifts the pill to keep it visible, which at a 56px toolbar
   wanted 156. So it was short by up to sixty pixels at exactly the moment
   somebody is trying to read the last card. R2.12. */

check("the reserve is a measured value, not a number in the stylesheet",
  /--pill-room/.test(css) && /function fitBottomRoom\(/.test(app));

check("the stylesheet still has a fallback for the first paint",
  /padding-bottom: var\(--pill-room,[\s\S]{0,24}calc\(96px/.test(css));

check("it measures from where the pill actually is",
  /tabs\.getBoundingClientRect\(\)/.test(app) &&
  /visualViewport/.test(app) && /offsetTop/.test(app));

check("and against what she can see, not the layout box",
  /const visible = seen \? seen\.height : window\.innerHeight;/.test(app));

check("the largest value seen is kept, so the page does not jump mid scroll",
  /if \(!\(need > 0\) \|\| need <= bottomRoomSeen\) return;/.test(app));

check("a real layout change starts the measurement over",
  /window\.addEventListener\("resize", \(\) => fitBottomRoom\(true\)\)/.test(app) &&
  /orientationchange", \(\) => fitBottomRoom\(true\)\)/.test(app));

check("but the toolbar sliding out does not, because that is the case it covers",
  /visualViewport\.addEventListener\("resize", \(\) => fitBottomRoom\(false\)\)/.test(app) &&
  /visualViewport\.addEventListener\("scroll", \(\) => fitBottomRoom\(false\)\)/.test(app));

check("changing the skin measures again, since the pill height changes with it",
  /skins\.set\(key\);[\s\S]{0,80}fitBottomRoom\(true\)/.test(app));

check("and a downloaded face measures again too",
  /loadingdone[\s\S]{0,220}fitBottomRoom\(true\)/.test(app));

/* --------------------------------------------- back to the previous tile */

check("the three tiles are named in one place",
  /const TILES = \["#\/today", "#\/capture", "#\/records"\]/.test(app));

check("the tile she is on is remembered as she moves",
  /TILES\.indexOf\(hash\) >= 0\) cameFrom = hash/.test(app));

check("a back button asks where she came from",
  /\[data-back\][\s\S]{0,140}backTo\(/.test(app));

check("and the plain data-go binding no longer also fires on it",
  /\[data-go\]:not\(\[data-back\]\)/.test(app));

const backs = page.match(/<button class="back"[^>]*>/g) || [];
check("every back button in the page is wired to the remembered tile",
  backs.length > 0 && backs.every((b) => b.indexOf("data-back") >= 0),
  backs.length + " back buttons");

check("each one still names a fallback, for a cold start on a deep link",
  backs.every((b) => /data-go="#\//.test(b)));

check("the fallback for a card is Everything, which is where cards live",
  /class="back"[^>]*data-back[^>]*data-go="#\/records"/.test(page));

/* ------------------------------------------- the two sober skins landed */

const sober = data.skins.filter((s) => s.key.indexOf("sober") === 0);
check("both sober skins are in the data", sober.length === 2,
  sober.map((s) => s.key).join(", "));

check("they are squared, because simplistic means no rounding",
  sober.every((s) => s.radius === 0));

check("one is for daylight and one is for night",
  sober.map((s) => s.group).sort().join(",") === "daylight,night");

check("their accent is the ink, not a colour",
  (() => {
    return sober.every((s) => {
      const p = data.palettes[s.pal];
      const grey = (hex) => {
        const h = hex.replace("#", "");
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        return Math.max(r, g, b) - Math.min(r, g, b) <= 6;
      };
      return grey(p.orange) && grey(p.paper) && grey(p.ink);
    });
  })(), "no hue in paper, ink or accent");

console.log("");
console.log(pass + " passed, " + fail + " failed");
process.exitCode = fail ? 1 : 0;
