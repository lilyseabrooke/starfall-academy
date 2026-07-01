/* Generate .sf-sheet-scoped copies of the vendored prototype stylesheets.
   Usage: node scripts/scope-css.js
   Source: public/character-sheet/*.css  →  src/sheet/styles/*.css
   The native sheet root imports the scoped copies; edit the SOURCE files. */
const fs = require("fs");
const path = require("path");
const postcss = require("postcss");

const SCOPE = ".sf-sheet";
const SRC = path.join(__dirname, "..", "public", "character-sheet");
const OUT = path.join(__dirname, "..", "src", "sheet", "styles");
const files = ["app.css", "rolls.css", "inventory.css", "map.css", "forge.css", "forge-alloc.css", "bonus.css", "gm.css"];

function scopeSelector(sel) {
  return sel
    .split(",")
    .map((raw) => {
      let s = raw.trim();
      if (!s) return s;
      s = s.replace(/^(html\s+body|html|body|:root|#root)\b/, SCOPE);
      if (
        s === SCOPE ||
        s.startsWith(SCOPE + " ") ||
        s.startsWith(SCOPE + ".") ||
        s.startsWith(SCOPE + ":") ||
        s.startsWith(SCOPE + ">") ||
        s.startsWith(SCOPE + "[")
      ) {
        return s;
      }
      return SCOPE + " " + s;
    })
    .join(", ");
}

const inKeyframes = (rule) =>
  rule.parent && rule.parent.type === "atrule" && /keyframes/i.test(rule.parent.name || "");

const plugin = {
  postcssPlugin: "scope-sf",
  Rule(rule) {
    if (inKeyframes(rule)) return; // 0%/100% steps stay untouched
    rule.selector = scopeSelector(rule.selector);
  },
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of files) {
    const css = fs.readFileSync(path.join(SRC, f), "utf8");
    const out = await postcss([plugin]).process(css, { from: undefined });
    const banner = `/* Scoped under ${SCOPE} for the native sheet. GENERATED from\n   public/character-sheet/${f} by scripts/scope-css.js — edit the source there. */\n`;
    fs.writeFileSync(path.join(OUT, f), banner + out.css);
    console.log("scoped", f, "(" + out.css.length + " bytes)");
  }
})();
