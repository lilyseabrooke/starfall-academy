/* @ds-bundle: {"format":3,"namespace":"StarfallAcademyDesignSystem_61fef2","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Crest","sourcePath":"components/core/Crest.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Banner","sourcePath":"components/feedback/Banner.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"4d7b6ddb9c44","components/core/Button.jsx":"39e784906f3a","components/core/Card.jsx":"051c04c160de","components/core/Crest.jsx":"d4549c6df090","components/core/IconButton.jsx":"24f7fcb69b4a","components/feedback/Banner.jsx":"592a23263a56","components/forms/Checkbox.jsx":"baba6f921079","components/forms/Input.jsx":"6bacff2f312b","components/forms/Select.jsx":"7a34966df493","components/forms/Switch.jsx":"585d7f8132aa","components/navigation/Tabs.jsx":"b784eaf9dbb1","ui_kits/academy-portal/AppShell.jsx":"ce3255b79cd4","ui_kits/academy-portal/AtriumScreen.jsx":"1a4aabe5aa6d","ui_kits/academy-portal/CourseScreen.jsx":"0aa53262557c","ui_kits/academy-portal/GateScreen.jsx":"0ba4d3782c39","ui_kits/academy-portal/data.js":"5774bd2f47c8"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.StarfallAcademyDesignSystem_61fef2 = window.StarfallAcademyDesignSystem_61fef2 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-badge {
  display: inline-flex; align-items: center; gap: 0.4em;
  font-family: var(--font-sans); font-weight: var(--weight-medium);
  font-size: var(--text-2xs); letter-spacing: var(--tracking-wide);
  text-transform: uppercase; line-height: 1;
  padding: 0.42em 0.72em; border-radius: var(--radius-pill);
  border: 1px solid transparent; white-space: nowrap;
}
.sa-badge--square { border-radius: var(--radius-sm); }
.sa-badge__dot { width: 0.5em; height: 0.5em; border-radius: 50%; background: currentColor; opacity: 0.9; }
.sa-badge svg { width: 1em; height: 1em; }

/* tones — soft tinted fills with a kindred border */
.sa-badge--gold    { background: var(--brand-subtle); color: var(--gold-200); border-color: var(--border-strong); }
.sa-badge--neutral { background: var(--ink-700); color: var(--text-body); border-color: var(--ink-600); }
.sa-badge--plum    { background: color-mix(in oklab, var(--plum-500) 22%, var(--ink-900)); color: var(--plum-300); border-color: color-mix(in oklab, var(--plum-500) 50%, transparent); }
.sa-badge--forest  { background: color-mix(in oklab, var(--forest-500) 22%, var(--ink-900)); color: var(--forest-300); border-color: color-mix(in oklab, var(--forest-500) 55%, transparent); }
.sa-badge--teal    { background: color-mix(in oklab, var(--teal-500) 22%, var(--ink-900)); color: var(--teal-300); border-color: color-mix(in oklab, var(--teal-500) 50%, transparent); }
.sa-badge--crimson { background: color-mix(in oklab, var(--crimson-500) 24%, var(--ink-900)); color: var(--crimson-300); border-color: color-mix(in oklab, var(--crimson-500) 52%, transparent); }

/* solid gold variant for emphasis */
.sa-badge--solid { background: var(--grad-gold); color: var(--text-on-gold); border-color: var(--gold-700); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-badge-css")) {
  const el = document.createElement("style");
  el.id = "sa-badge-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Badge({
  children,
  tone = "gold",
  solid = false,
  square = false,
  dot = false,
  className = "",
  ...rest
}) {
  const cls = ["sa-badge", solid ? "sa-badge--solid" : `sa-badge--${tone}`, square ? "sa-badge--square" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "sa-badge__dot"
  }) : null, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Inject component CSS once — keeps the component self-contained. */
const CSS = `
.sa-btn {
  --_bg: transparent; --_fg: var(--text-strong); --_bd: transparent;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.6em;
  font-family: var(--font-sans); font-weight: var(--weight-medium);
  letter-spacing: var(--tracking-wide); text-transform: uppercase;
  border: 1px solid var(--_bd); background: var(--_bg); color: var(--_fg);
  border-radius: var(--radius-sm); cursor: pointer; white-space: nowrap;
  transition: background var(--dur-base) var(--ease-standard),
              border-color var(--dur-base) var(--ease-standard),
              color var(--dur-base) var(--ease-standard),
              transform var(--dur-fast) var(--ease-standard),
              box-shadow var(--dur-base) var(--ease-standard);
}
.sa-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.sa-btn:active { transform: translateY(1px); }
.sa-btn[disabled] { opacity: 0.45; cursor: not-allowed; transform: none; }
.sa-btn__icon { display: inline-flex; width: 1.1em; height: 1.1em; }
.sa-btn__icon svg { width: 100%; height: 100%; }

/* sizes */
.sa-btn--sm { height: var(--control-sm); padding: 0 var(--space-3); font-size: var(--text-xs); }
.sa-btn--md { height: var(--control-md); padding: 0 var(--space-5); font-size: var(--text-sm); }
.sa-btn--lg { height: var(--control-lg); padding: 0 var(--space-6); font-size: var(--text-md); }

/* primary — gilded gold */
.sa-btn--primary { --_bg: var(--grad-gold); --_fg: var(--text-on-gold); --_bd: var(--gold-700);
  box-shadow: var(--inset-hi), var(--shadow-sm); font-weight: var(--weight-semibold, 600); }
.sa-btn--primary:hover:not([disabled]) { box-shadow: var(--glow-gold); }
.sa-btn--primary:active { box-shadow: var(--shadow-sm); }

/* secondary — gilded outline */
.sa-btn--secondary { --_bg: transparent; --_fg: var(--gold-300); --_bd: var(--border-strong); }
.sa-btn--secondary:hover:not([disabled]) { --_bg: var(--brand-subtle); --_fg: var(--gold-200); --_bd: var(--gold-500); }

/* ghost — quiet */
.sa-btn--ghost { --_bg: transparent; --_fg: var(--text-body); --_bd: transparent; }
.sa-btn--ghost:hover:not([disabled]) { --_bg: var(--ink-700); --_fg: var(--text-strong); }

/* danger */
.sa-btn--danger { --_bg: var(--crimson-500); --_fg: var(--parchment-50); --_bd: var(--crimson-700); }
.sa-btn--danger:hover:not([disabled]) { --_bg: var(--crimson-300); --_fg: var(--ink-950); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-btn-css")) {
  const el = document.createElement("style");
  el.id = "sa-btn-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Button({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  fullWidth = false,
  disabled = false,
  type = "button",
  className = "",
  ...rest
}) {
  const cls = ["sa-btn", `sa-btn--${variant}`, `sa-btn--${size}`, className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    disabled: disabled,
    style: fullWidth ? {
      width: "100%"
    } : undefined
  }, rest), iconLeft ? /*#__PURE__*/React.createElement("span", {
    className: "sa-btn__icon"
  }, iconLeft) : null, children, iconRight ? /*#__PURE__*/React.createElement("span", {
    className: "sa-btn__icon"
  }, iconRight) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-card {
  position: relative; border-radius: var(--radius-lg);
  background: var(--surface-card); border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-md);
  transition: transform var(--dur-base) var(--ease-out),
              box-shadow var(--dur-base) var(--ease-out),
              border-color var(--dur-base) var(--ease-out);
}
.sa-card--gilded { border-color: var(--border-default); box-shadow: var(--inset-hi), var(--shadow-lg); }
.sa-card--gilded::before {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  padding: 1px; background: var(--rule-gold); opacity: .5;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
}
.sa-card--parchment { background: var(--grad-parchment); border-color: var(--parchment-300); color: var(--text-ink); box-shadow: var(--shadow-lg); }
.sa-card--parchment .sa-card__eyebrow { color: var(--gold-700); }
.sa-card--parchment .sa-card__title { color: var(--text-ink); }
.sa-card--interactive { cursor: pointer; }
.sa-card--interactive:hover { transform: translateY(-3px); box-shadow: var(--shadow-xl); border-color: var(--border-strong); }
.sa-card--interactive:active { transform: translateY(-1px); }

.sa-card__pad-sm { padding: var(--space-4); }
.sa-card__pad-md { padding: var(--space-5); }
.sa-card__pad-lg { padding: var(--space-6); }

.sa-card__eyebrow { font-family: var(--font-sans); font-weight: 500; font-size: var(--text-2xs);
  letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--text-gold); margin-bottom: var(--space-2); }
.sa-card__title { font-family: var(--font-display); font-weight: 700; text-transform: uppercase;
  letter-spacing: var(--tracking-wide); font-size: var(--text-xl); color: var(--text-strong); margin: 0 0 var(--space-3); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-card-css")) {
  const el = document.createElement("style");
  el.id = "sa-card-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Card({
  children,
  variant = "default",
  padding = "md",
  interactive = false,
  eyebrow,
  title,
  className = "",
  ...rest
}) {
  const cls = ["sa-card", variant !== "default" ? `sa-card--${variant}` : "", `sa-card__pad-${padding}`, interactive ? "sa-card--interactive" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), eyebrow ? /*#__PURE__*/React.createElement("div", {
    className: "sa-card__eyebrow"
  }, eyebrow) : null, title ? /*#__PURE__*/React.createElement("h3", {
    className: "sa-card__title"
  }, title) : null, children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Crest.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-crest { display: inline-block; line-height: 0; }
.sa-crest img { display: block; height: 100%; width: auto; object-fit: contain; }
/* Recolor the line crest to gold leaf — handy for watermarks / monochrome use. */
.sa-crest--gold img { filter: brightness(0) saturate(100%) invert(72%) sepia(38%) saturate(420%) hue-rotate(2deg) brightness(92%); }
.sa-crest--ink img { filter: brightness(0); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-crest-css")) {
  const el = document.createElement("style");
  el.id = "sa-crest-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Crest({
  form = "simple",
  size = 64,
  tint = "none",
  basePath = "assets",
  alt = "Starfall Academy crest",
  className = "",
  ...rest
}) {
  const cls = ["sa-crest", tint !== "none" ? `sa-crest--${tint}` : "", className].filter(Boolean).join(" ");
  const src = `${basePath}/crest-${form}.png`;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls,
    style: {
      height: typeof size === "number" ? `${size}px` : size
    }
  }, rest), /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt
  }));
}
Object.assign(__ds_scope, { Crest });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Crest.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-iconbtn {
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid transparent; background: transparent; color: var(--text-body);
  border-radius: var(--radius-sm); cursor: pointer;
  transition: background var(--dur-base) var(--ease-standard),
              color var(--dur-base) var(--ease-standard),
              border-color var(--dur-base) var(--ease-standard),
              transform var(--dur-fast) var(--ease-standard);
}
.sa-iconbtn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.sa-iconbtn:active { transform: translateY(1px); }
.sa-iconbtn[disabled] { opacity: 0.4; cursor: not-allowed; transform: none; }
.sa-iconbtn svg { width: 1.25em; height: 1.25em; display: block; }
.sa-iconbtn--sm { width: var(--control-sm); height: var(--control-sm); font-size: var(--text-sm); }
.sa-iconbtn--md { width: var(--control-md); height: var(--control-md); font-size: var(--text-md); }
.sa-iconbtn--lg { width: var(--control-lg); height: var(--control-lg); font-size: var(--text-lg); }
.sa-iconbtn--ghost:hover:not([disabled]) { background: var(--ink-700); color: var(--text-strong); }
.sa-iconbtn--outline { border-color: var(--border-default); color: var(--gold-300); }
.sa-iconbtn--outline:hover:not([disabled]) { background: var(--brand-subtle); border-color: var(--gold-500); }
.sa-iconbtn--solid { background: var(--grad-gold); color: var(--text-on-gold); box-shadow: var(--inset-hi); }
.sa-iconbtn--solid:hover:not([disabled]) { box-shadow: var(--glow-gold); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-iconbtn-css")) {
  const el = document.createElement("style");
  el.id = "sa-iconbtn-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function IconButton({
  children,
  label,
  variant = "ghost",
  size = "md",
  disabled = false,
  className = "",
  ...rest
}) {
  const cls = ["sa-iconbtn", `sa-iconbtn--${variant}`, `sa-iconbtn--${size}`, className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    "aria-label": label,
    title: label,
    disabled: disabled
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Banner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-banner {
  display: flex; gap: var(--space-3); align-items: flex-start;
  padding: var(--space-4); border-radius: var(--radius-md);
  border: 1px solid var(--_bd, var(--border-default)); background: var(--_bg, var(--ink-800));
  font-family: var(--font-sans); position: relative;
}
.sa-banner::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: var(--radius-md) 0 0 var(--radius-md); background: var(--_accent, var(--gold-500)); }
.sa-banner__icon { flex: none; color: var(--_accent, var(--gold-400)); display: inline-flex; margin-top: 1px; }
.sa-banner__icon svg { width: 1.2em; height: 1.2em; }
.sa-banner__body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
.sa-banner__title { font-family: var(--font-display); font-weight: 700; text-transform: uppercase; letter-spacing: var(--tracking-wide); font-size: var(--text-sm); color: var(--text-strong); }
.sa-banner__msg { font-size: var(--text-sm); color: var(--text-body); line-height: 1.5; }
.sa-banner__close { flex: none; appearance: none; background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 2px; border-radius: var(--radius-xs); display: inline-flex; }
.sa-banner__close:hover { color: var(--text-strong); }
.sa-banner__close svg { width: 1em; height: 1em; }

.sa-banner--info    { --_bg: color-mix(in oklab, var(--teal-500) 16%, var(--ink-900)); --_bd: color-mix(in oklab, var(--teal-500) 40%, transparent); --_accent: var(--teal-300); }
.sa-banner--success { --_bg: color-mix(in oklab, var(--forest-500) 18%, var(--ink-900)); --_bd: color-mix(in oklab, var(--forest-500) 45%, transparent); --_accent: var(--forest-300); }
.sa-banner--warning { --_bg: color-mix(in oklab, var(--gold-500) 14%, var(--ink-900)); --_bd: var(--border-strong); --_accent: var(--gold-300); }
.sa-banner--danger  { --_bg: color-mix(in oklab, var(--crimson-500) 18%, var(--ink-900)); --_bd: color-mix(in oklab, var(--crimson-500) 45%, transparent); --_accent: var(--crimson-300); }
.sa-banner--arcane  { --_bg: color-mix(in oklab, var(--plum-500) 18%, var(--ink-900)); --_bd: color-mix(in oklab, var(--plum-500) 45%, transparent); --_accent: var(--plum-300); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-banner-css")) {
  const el = document.createElement("style");
  el.id = "sa-banner-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
const CloseIcon = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M18 6 6 18M6 6l12 12"
}));
function Banner({
  tone = "info",
  title,
  icon,
  children,
  onDismiss,
  className = "",
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["sa-banner", `sa-banner--${tone}`, className].filter(Boolean).join(" "),
    role: "status"
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    className: "sa-banner__icon"
  }, icon) : null, /*#__PURE__*/React.createElement("div", {
    className: "sa-banner__body"
  }, title ? /*#__PURE__*/React.createElement("span", {
    className: "sa-banner__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("span", {
    className: "sa-banner__msg"
  }, children) : null), onDismiss ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "sa-banner__close",
    "aria-label": "Dismiss",
    onClick: onDismiss
  }, /*#__PURE__*/React.createElement(CloseIcon, null)) : null);
}
Object.assign(__ds_scope, { Banner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Banner.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-check { display: inline-flex; align-items: flex-start; gap: var(--space-3); font-family: var(--font-sans); cursor: pointer; user-select: none; }
.sa-check input { position: absolute; opacity: 0; width: 0; height: 0; }
.sa-check__box {
  position: relative; width: 20px; height: 20px; flex: none; margin-top: 1px;
  border: 1px solid var(--border-strong); border-radius: var(--radius-xs);
  background: var(--ink-950);
  transition: background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard);
}
.sa-check__box::after {
  content: ""; position: absolute; left: 6px; top: 2px; width: 5px; height: 10px;
  border: solid var(--ink-950); border-width: 0 2px 2px 0; transform: rotate(45deg) scale(0);
  transition: transform var(--dur-fast) var(--ease-out);
}
.sa-check input:checked + .sa-check__box { background: var(--grad-gold); border-color: var(--gold-700); }
.sa-check input:checked + .sa-check__box::after { transform: rotate(45deg) scale(1); }
.sa-check input:indeterminate + .sa-check__box { background: var(--grad-gold); border-color: var(--gold-700); }
.sa-check input:indeterminate + .sa-check__box::after { transform: rotate(0) scale(1); left: 4px; top: 8px; width: 10px; height: 0; border-width: 0 0 2px 0; }
.sa-check input:focus-visible + .sa-check__box { box-shadow: 0 0 0 3px var(--focus-ring); }
.sa-check input:disabled + .sa-check__box { opacity: .45; }
.sa-check--disabled { cursor: not-allowed; }
.sa-check__body { display: flex; flex-direction: column; gap: 2px; }
.sa-check__label { font-size: var(--text-sm); color: var(--text-body); letter-spacing: var(--tracking-wide); line-height: 1.3; }
.sa-check__desc { font-size: var(--text-xs); color: var(--text-muted); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-check-css")) {
  const el = document.createElement("style");
  el.id = "sa-check-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Checkbox({
  label,
  description,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  indeterminate = false,
  className = "",
  ...rest
}) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const cls = ["sa-check", disabled ? "sa-check--disabled" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    type: "checkbox",
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "sa-check__box"
  }), label || description ? /*#__PURE__*/React.createElement("span", {
    className: "sa-check__body"
  }, label ? /*#__PURE__*/React.createElement("span", {
    className: "sa-check__label"
  }, label) : null, description ? /*#__PURE__*/React.createElement("span", {
    className: "sa-check__desc"
  }, description) : null) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-field { display: flex; flex-direction: column; gap: var(--space-2); font-family: var(--font-sans); }
.sa-field__label { font-size: var(--text-sm); font-weight: var(--weight-medium); letter-spacing: var(--tracking-wide); color: var(--text-body); }
.sa-field__req { color: var(--gold-400); margin-left: 2px; }
.sa-field__wrap { position: relative; display: flex; align-items: center; }
.sa-field__icon { position: absolute; display: inline-flex; color: var(--text-muted); pointer-events: none; }
.sa-field__icon svg { width: 1.05em; height: 1.05em; }
.sa-field__icon--left { left: var(--space-3); }
.sa-field__icon--right { right: var(--space-3); }
.sa-input {
  width: 100%; height: var(--control-md); box-sizing: border-box;
  background: var(--ink-950); color: var(--text-strong);
  border: 1px solid var(--border-default); border-radius: var(--radius-sm);
  font-family: var(--font-sans); font-size: var(--text-sm); letter-spacing: .01em;
  padding: 0 var(--space-3);
  transition: border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard), background var(--dur-base) var(--ease-standard);
}
.sa-input::placeholder { color: var(--text-faint); }
.sa-input--has-left { padding-left: calc(var(--space-3) + 1.4em); }
.sa-input--has-right { padding-right: calc(var(--space-3) + 1.4em); }
.sa-input:hover:not(:disabled) { border-color: var(--border-strong); }
.sa-input:focus { outline: none; border-color: var(--gold-500); box-shadow: 0 0 0 3px var(--focus-ring); background: var(--ink-900); }
.sa-input:disabled { opacity: .5; cursor: not-allowed; }
.sa-field--error .sa-input { border-color: var(--crimson-300); }
.sa-field--error .sa-input:focus { box-shadow: 0 0 0 3px color-mix(in oklab, var(--crimson-300) 45%, transparent); }
.sa-field__hint { font-size: var(--text-xs); color: var(--text-muted); }
.sa-field--error .sa-field__hint { color: var(--crimson-300); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-input-css")) {
  const el = document.createElement("style");
  el.id = "sa-input-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
let _id = 0;
function Input({
  label,
  hint,
  error,
  required = false,
  iconLeft,
  iconRight,
  id,
  className = "",
  ...rest
}) {
  const fieldId = id || `sa-input-${++_id}`;
  const wrapCls = ["sa-field", error ? "sa-field--error" : "", className].filter(Boolean).join(" ");
  const inputCls = ["sa-input", iconLeft ? "sa-input--has-left" : "", iconRight ? "sa-input--has-right" : ""].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("div", {
    className: wrapCls
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "sa-field__label",
    htmlFor: fieldId
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    className: "sa-field__req"
  }, "*") : null) : null, /*#__PURE__*/React.createElement("div", {
    className: "sa-field__wrap"
  }, iconLeft ? /*#__PURE__*/React.createElement("span", {
    className: "sa-field__icon sa-field__icon--left"
  }, iconLeft) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    className: inputCls,
    "aria-invalid": !!error
  }, rest)), iconRight ? /*#__PURE__*/React.createElement("span", {
    className: "sa-field__icon sa-field__icon--right"
  }, iconRight) : null), error ? /*#__PURE__*/React.createElement("span", {
    className: "sa-field__hint"
  }, error) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "sa-field__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-select-field { display: flex; flex-direction: column; gap: var(--space-2); font-family: var(--font-sans); }
.sa-select-field__label { font-size: var(--text-sm); font-weight: var(--weight-medium); letter-spacing: var(--tracking-wide); color: var(--text-body); }
.sa-select-wrap { position: relative; display: flex; align-items: center; }
.sa-select {
  width: 100%; height: var(--control-md); box-sizing: border-box; appearance: none;
  background: var(--ink-950); color: var(--text-strong);
  border: 1px solid var(--border-default); border-radius: var(--radius-sm);
  font-family: var(--font-sans); font-size: var(--text-sm);
  padding: 0 calc(var(--space-3) + 1.2em) 0 var(--space-3); cursor: pointer;
  transition: border-color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard);
}
.sa-select:hover:not(:disabled) { border-color: var(--border-strong); }
.sa-select:focus { outline: none; border-color: var(--gold-500); box-shadow: 0 0 0 3px var(--focus-ring); }
.sa-select:disabled { opacity: .5; cursor: not-allowed; }
.sa-select option { background: var(--ink-900); color: var(--text-strong); }
.sa-select-wrap__chevron { position: absolute; right: var(--space-3); pointer-events: none; color: var(--gold-400); display: inline-flex; }
.sa-select-wrap__chevron svg { width: 1em; height: 1em; }
.sa-select-field__hint { font-size: var(--text-xs); color: var(--text-muted); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-select-css")) {
  const el = document.createElement("style");
  el.id = "sa-select-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
const Chevron = () => /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "m6 9 6 6 6-6"
}));
let _sid = 0;
function Select({
  label,
  hint,
  options,
  children,
  id,
  className = "",
  ...rest
}) {
  const fieldId = id || `sa-select-${++_sid}`;
  return /*#__PURE__*/React.createElement("div", {
    className: ["sa-select-field", className].filter(Boolean).join(" ")
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "sa-select-field__label",
    htmlFor: fieldId
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    className: "sa-select-wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    className: "sa-select"
  }, rest), options ? options.map(o => {
    const opt = typeof o === "string" ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  }) : children), /*#__PURE__*/React.createElement("span", {
    className: "sa-select-wrap__chevron"
  }, /*#__PURE__*/React.createElement(Chevron, null))), hint ? /*#__PURE__*/React.createElement("span", {
    className: "sa-select-field__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-switch { display: inline-flex; align-items: center; gap: var(--space-3); font-family: var(--font-sans); cursor: pointer; user-select: none; }
.sa-switch input { position: absolute; opacity: 0; width: 0; height: 0; }
.sa-switch__track {
  position: relative; width: 44px; height: 24px; flex: none; border-radius: var(--radius-pill);
  background: var(--ink-600); border: 1px solid var(--ink-500);
  transition: background var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard);
}
.sa-switch__thumb {
  position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%;
  background: var(--parchment-200); box-shadow: var(--shadow-sm);
  transition: transform var(--dur-base) var(--ease-out), background var(--dur-base) var(--ease-standard);
}
.sa-switch input:checked + .sa-switch__track { background: var(--grad-gold); border-color: var(--gold-700); }
.sa-switch input:checked + .sa-switch__track .sa-switch__thumb { transform: translateX(20px); background: var(--ink-950); }
.sa-switch input:focus-visible + .sa-switch__track { box-shadow: 0 0 0 3px var(--focus-ring); }
.sa-switch input:disabled + .sa-switch__track { opacity: .45; }
.sa-switch--disabled { cursor: not-allowed; }
.sa-switch__label { font-size: var(--text-sm); color: var(--text-body); letter-spacing: var(--tracking-wide); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-switch-css")) {
  const el = document.createElement("style");
  el.id = "sa-switch-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Switch({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  className = "",
  ...rest
}) {
  const cls = ["sa-switch", disabled ? "sa-switch--disabled" : "", className].filter(Boolean).join(" ");
  return /*#__PURE__*/React.createElement("label", {
    className: cls
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    role: "switch",
    checked: checked,
    defaultChecked: defaultChecked,
    onChange: onChange,
    disabled: disabled
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "sa-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "sa-switch__thumb"
  })), label ? /*#__PURE__*/React.createElement("span", {
    className: "sa-switch__label"
  }, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const CSS = `
.sa-tabs { display: flex; gap: var(--space-1); border-bottom: 1px solid var(--hairline); font-family: var(--font-sans); }
.sa-tab {
  position: relative; appearance: none; background: none; border: none; cursor: pointer;
  font-family: var(--font-sans); font-weight: var(--weight-medium); font-size: var(--text-sm);
  letter-spacing: var(--tracking-wide); text-transform: uppercase;
  color: var(--text-muted); padding: var(--space-3) var(--space-4); margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  transition: color var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard);
  display: inline-flex; align-items: center; gap: 0.5em;
}
.sa-tab:hover { color: var(--text-body); }
.sa-tab svg { width: 1.05em; height: 1.05em; }
.sa-tab[aria-selected="true"] { color: var(--gold-300); border-bottom-color: var(--gold-500); }
.sa-tab:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: -2px; border-radius: var(--radius-xs); }
.sa-tab__count { font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--text-faint); }
.sa-tab[aria-selected="true"] .sa-tab__count { color: var(--gold-400); }
`;
if (typeof document !== "undefined" && !document.getElementById("sa-tabs-css")) {
  const el = document.createElement("style");
  el.id = "sa-tabs-css";
  el.textContent = CSS;
  document.head.appendChild(el);
}
function Tabs({
  items = [],
  value,
  defaultValue,
  onChange,
  className = "",
  ...rest
}) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = React.useState(defaultValue ?? (items[0] && items[0].value));
  const active = isControlled ? value : internal;
  const select = v => {
    if (!isControlled) setInternal(v);
    onChange && onChange(v);
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ["sa-tabs", className].filter(Boolean).join(" "),
    role: "tablist"
  }, rest), items.map(it => /*#__PURE__*/React.createElement("button", {
    key: it.value,
    role: "tab",
    type: "button",
    "aria-selected": active === it.value,
    className: "sa-tab",
    onClick: () => select(it.value)
  }, it.icon ? it.icon : null, it.label, it.count != null ? /*#__PURE__*/React.createElement("span", {
    className: "sa-tab__count"
  }, it.count) : null)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/academy-portal/AppShell.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* AppShell — sidebar + top bar chrome for the Academy portal. */
(function () {
  const {
    Crest,
    IconButton,
    Badge
  } = window.SA;
  const Ic = ({
    name,
    ...p
  }) => /*#__PURE__*/React.createElement("i", _extends({
    "data-lucide": name
  }, p));
  function AppShell({
    active,
    onNavigate,
    title,
    eyebrow,
    actions,
    children
  }) {
    const d = window.SA_DATA;
    return /*#__PURE__*/React.createElement("div", {
      className: "ap-shell"
    }, /*#__PURE__*/React.createElement("aside", {
      className: "ap-side"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-brand"
    }, /*#__PURE__*/React.createElement(Crest, {
      form: "simple",
      size: 40,
      basePath: "../../assets"
    }), /*#__PURE__*/React.createElement("div", {
      className: "ap-brand__wm"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ap-brand__name"
    }, "Starfall"), /*#__PURE__*/React.createElement("span", {
      className: "ap-brand__sub"
    }, "Academy"))), /*#__PURE__*/React.createElement("nav", {
      className: "ap-nav"
    }, d.nav.map(n => /*#__PURE__*/React.createElement("button", {
      key: n.id,
      className: "ap-nav__item" + (active === n.id ? " is-active" : ""),
      onClick: () => onNavigate && onNavigate(n.id)
    }, /*#__PURE__*/React.createElement(Ic, {
      name: n.icon
    }), /*#__PURE__*/React.createElement("span", null, n.label)))), /*#__PURE__*/React.createElement("div", {
      className: "ap-side__foot"
    }, /*#__PURE__*/React.createElement("button", {
      className: "ap-nav__item"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "settings"
    }), /*#__PURE__*/React.createElement("span", null, "Settings")), /*#__PURE__*/React.createElement("div", {
      className: "ap-user"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ap-avatar"
    }, "LV"), /*#__PURE__*/React.createElement("div", {
      className: "ap-user__meta"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ap-user__name"
    }, d.student.name), /*#__PURE__*/React.createElement("span", {
      className: "ap-user__rank"
    }, d.student.rank, " \xB7 ", d.student.house))))), /*#__PURE__*/React.createElement("main", {
      className: "ap-main"
    }, /*#__PURE__*/React.createElement("header", {
      className: "ap-top"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-top__titles"
    }, eyebrow ? /*#__PURE__*/React.createElement("span", {
      className: "sa-eyebrow"
    }, eyebrow) : null, /*#__PURE__*/React.createElement("h1", {
      className: "ap-top__h1"
    }, title)), /*#__PURE__*/React.createElement("div", {
      className: "ap-top__actions"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-search"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "search"
    }), /*#__PURE__*/React.createElement("input", {
      placeholder: "Search the archive\u2026"
    }), /*#__PURE__*/React.createElement("kbd", null, "\u2318K")), /*#__PURE__*/React.createElement(IconButton, {
      label: "Owl post",
      variant: "ghost"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "bell"
    })), /*#__PURE__*/React.createElement(Badge, {
      tone: "gold",
      className: "ap-aether"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "sparkles"
    }), " ", d.student.aether), actions)), /*#__PURE__*/React.createElement("div", {
      className: "ap-canvas"
    }, children)));
  }
  window.AppShell = AppShell;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/academy-portal/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/academy-portal/AtriumScreen.jsx
try { (() => {
/* AtriumScreen — the student dashboard. */
(function () {
  const {
    Card,
    Badge,
    Button
  } = window.SA;
  const Ic = ({
    name
  }) => /*#__PURE__*/React.createElement("i", {
    "data-lucide": name
  });
  function StatTile({
    s
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "ap-stat ap-stat--" + s.tone
    }, /*#__PURE__*/React.createElement("span", {
      className: "ap-stat__icon"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: s.icon
    })), /*#__PURE__*/React.createElement("div", {
      className: "ap-stat__body"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ap-stat__value"
    }, s.value), /*#__PURE__*/React.createElement("span", {
      className: "ap-stat__label"
    }, s.label)));
  }
  function CourseCard({
    c,
    onOpen
  }) {
    const pct = Math.round(c.done / c.lessons * 100);
    const complete = c.done === c.lessons;
    return /*#__PURE__*/React.createElement(Card, {
      variant: "default",
      interactive: true,
      className: "ap-course",
      onClick: () => onOpen(c)
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-course__glyph ap-glyph--" + c.house
    }, /*#__PURE__*/React.createElement(Ic, {
      name: c.glyph
    })), /*#__PURE__*/React.createElement("div", {
      className: "ap-course__main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-course__top"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sa-eyebrow"
    }, c.term), complete ? /*#__PURE__*/React.createElement(Badge, {
      tone: "forest",
      dot: true
    }, "Complete") : /*#__PURE__*/React.createElement(Badge, {
      tone: "neutral"
    }, c.done, "/", c.lessons)), /*#__PURE__*/React.createElement("h3", {
      className: "ap-course__title"
    }, c.title), /*#__PURE__*/React.createElement("p", {
      className: "ap-course__mentor"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "user-round"
    }), " ", c.mentor), /*#__PURE__*/React.createElement("div", {
      className: "ap-progress"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: pct + "%"
      }
    }))));
  }
  function AtriumScreen({
    onNavigate,
    onOpenCourse
  }) {
    const d = window.SA_DATA;
    const AppShell = window.AppShell;
    return /*#__PURE__*/React.createElement(AppShell, {
      active: "atrium",
      onNavigate: onNavigate,
      eyebrow: "Term IV \xB7 Arcane Studies",
      title: "The Atrium",
      actions: /*#__PURE__*/React.createElement(Button, {
        size: "md",
        iconLeft: /*#__PURE__*/React.createElement(Ic, {
          name: "plus"
        })
      }, "New Petition")
    }, /*#__PURE__*/React.createElement("section", {
      className: "ap-hero"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-hero__text"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sa-eyebrow"
    }, "Welcome back, Adept"), /*#__PURE__*/React.createElement("h2", {
      className: "ap-hero__h"
    }, "Good evening, Lyra."), /*#__PURE__*/React.createElement("p", {
      className: "ap-hero__p"
    }, "The observatory dome is open and the Wandering Lights are charted to appear tonight. Three lessons await your seal."), /*#__PURE__*/React.createElement("div", {
      className: "ap-hero__cta"
    }, /*#__PURE__*/React.createElement(Button, {
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        name: "play"
      })
    }, "Resume Cartography"), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        name: "telescope"
      })
    }, "Open Observatory"))), /*#__PURE__*/React.createElement("div", {
      className: "ap-hero__crest",
      "aria-hidden": "true"
    })), /*#__PURE__*/React.createElement("div", {
      className: "ap-stats"
    }, d.stats.map(s => /*#__PURE__*/React.createElement(StatTile, {
      key: s.label,
      s: s
    }))), /*#__PURE__*/React.createElement("div", {
      className: "ap-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-col-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-section__head"
    }, /*#__PURE__*/React.createElement("h3", {
      className: "sa-h3",
      style: {
        fontSize: "var(--text-xl)"
      }
    }, "Continue your studies"), /*#__PURE__*/React.createElement("a", {
      className: "ap-link",
      href: "#",
      onClick: e => {
        e.preventDefault();
        onNavigate("courses");
      }
    }, "All courses ", /*#__PURE__*/React.createElement(Ic, {
      name: "arrow-right"
    }))), /*#__PURE__*/React.createElement("div", {
      className: "ap-courses"
    }, d.courses.map(c => /*#__PURE__*/React.createElement(CourseCard, {
      key: c.id,
      c: c,
      onOpen: onOpenCourse
    })))), /*#__PURE__*/React.createElement("aside", {
      className: "ap-col-side"
    }, /*#__PURE__*/React.createElement(Card, {
      variant: "gilded",
      eyebrow: "Tonight",
      title: "Owl Post"
    }, /*#__PURE__*/React.createElement("ul", {
      className: "ap-feed"
    }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
      className: "ap-feed__dot ap-glyph--teal"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "telescope"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Stargazing rite"), /*#__PURE__*/React.createElement("span", null, "Observatory \xB7 9:00 PM"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
      className: "ap-feed__dot ap-glyph--crimson"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "stamp"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "2 seals due"), /*#__PURE__*/React.createElement("span", null, "Rites of Emberlight"))), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("span", {
      className: "ap-feed__dot ap-glyph--plum"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "award"
    })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Glass mastery earned"), /*#__PURE__*/React.createElement("span", null, "The Whispering Glass"))))), /*#__PURE__*/React.createElement(Card, {
      variant: "parchment"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sa-eyebrow"
    }, "Decree"), /*#__PURE__*/React.createElement("p", {
      className: "ap-decree"
    }, "\"Let no initiate mistake the map for the territory, nor the star for its light.\""), /*#__PURE__*/React.createElement("span", {
      className: "ap-decree__by"
    }, "\u2014 The Cartographer's Oath")))));
  }
  window.AtriumScreen = AtriumScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/academy-portal/AtriumScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/academy-portal/CourseScreen.jsx
try { (() => {
/* CourseScreen — a multimedia course view with a scrying-glass player. */
(function () {
  const {
    Card,
    Badge,
    Button,
    Tabs,
    IconButton
  } = window.SA;
  const Ic = ({
    name
  }) => /*#__PURE__*/React.createElement("i", {
    "data-lucide": name
  });
  function LessonRow({
    l
  }) {
    return /*#__PURE__*/React.createElement("li", {
      className: "ap-lesson" + (l.active ? " is-active" : "")
    }, /*#__PURE__*/React.createElement("span", {
      className: "ap-lesson__state" + (l.done ? " is-done" : "")
    }, l.done ? /*#__PURE__*/React.createElement(Ic, {
      name: "check"
    }) : l.active ? /*#__PURE__*/React.createElement(Ic, {
      name: "play"
    }) : /*#__PURE__*/React.createElement("span", {
      className: "ap-lesson__n"
    }, l.n)), /*#__PURE__*/React.createElement("span", {
      className: "ap-lesson__title"
    }, l.title), /*#__PURE__*/React.createElement("span", {
      className: "ap-lesson__len"
    }, l.len));
  }
  function CourseScreen({
    course,
    onNavigate,
    onBack
  }) {
    const c = course || window.SA_DATA.courses[0];
    const d = window.SA_DATA;
    const [tab, setTab] = React.useState("lessons");
    return /*#__PURE__*/React.createElement(window.AppShell, {
      active: "courses",
      onNavigate: onNavigate,
      eyebrow: c.term + " · " + c.mentor,
      title: c.title,
      actions: /*#__PURE__*/React.createElement(Button, {
        variant: "secondary",
        size: "md",
        iconLeft: /*#__PURE__*/React.createElement(Ic, {
          name: "arrow-left"
        }),
        onClick: onBack
      }, "Back to Atrium")
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-course-grid"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-course-main"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-player ap-glyph-bg--" + c.house
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-player__scrim"
    }), /*#__PURE__*/React.createElement("div", {
      className: "ap-player__crest",
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("button", {
      className: "ap-player__play",
      "aria-label": "Begin scrying"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "play"
    })), /*#__PURE__*/React.createElement("div", {
      className: "ap-player__bar"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ap-player__time"
    }, "04 \xB7 The Wandering Lights"), /*#__PURE__*/React.createElement("div", {
      className: "ap-player__track"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: "34%"
      }
    })), /*#__PURE__*/React.createElement("span", {
      className: "ap-player__time"
    }, "27:11"))), /*#__PURE__*/React.createElement("div", {
      className: "ap-course-meta"
    }, /*#__PURE__*/React.createElement(Badge, {
      tone: c.house,
      dot: true
    }, c.done, "/", c.lessons, " lessons"), /*#__PURE__*/React.createElement("span", {
      className: "ap-meta-dot"
    }), /*#__PURE__*/React.createElement("span", {
      className: "ap-muted"
    }, "14 scryings"), /*#__PURE__*/React.createElement("span", {
      className: "ap-meta-dot"
    }), /*#__PURE__*/React.createElement("span", {
      className: "ap-muted"
    }, "6 hrs of starlight"), /*#__PURE__*/React.createElement("div", {
      className: "ap-course-meta__actions"
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Bookmark",
      variant: "outline"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "bookmark"
    })), /*#__PURE__*/React.createElement(IconButton, {
      label: "Share",
      variant: "outline"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "share-2"
    })))), /*#__PURE__*/React.createElement(Tabs, {
      value: tab,
      onChange: setTab,
      items: [{
        value: "lessons",
        label: "Lessons",
        count: c.lessons
      }, {
        value: "materials",
        label: "Materials"
      }, {
        value: "discussion",
        label: "Discussion",
        count: 8
      }]
    }), tab === "lessons" ? /*#__PURE__*/React.createElement("ul", {
      className: "ap-lessons"
    }, d.lessons.map(l => /*#__PURE__*/React.createElement(LessonRow, {
      key: l.n,
      l: l
    }))) : /*#__PURE__*/React.createElement("div", {
      className: "ap-empty"
    }, /*#__PURE__*/React.createElement(Ic, {
      name: "scroll-text"
    }), /*#__PURE__*/React.createElement("p", null, tab === "materials" ? "Reading scrolls and star-charts appear here." : "Join the discussion in the common hall."))), /*#__PURE__*/React.createElement("aside", {
      className: "ap-course-side"
    }, /*#__PURE__*/React.createElement(Card, {
      variant: "gilded",
      eyebrow: "Your standing",
      title: "Ascension"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-ring"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-ring__num"
    }, "64", /*#__PURE__*/React.createElement("span", null, "%")), /*#__PURE__*/React.createElement("span", {
      className: "ap-ring__cap"
    }, "to mastery")), /*#__PURE__*/React.createElement(Button, {
      fullWidth: true,
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        name: "play"
      }),
      style: {
        marginTop: "var(--space-4)"
      }
    }, "Resume lesson 04")), /*#__PURE__*/React.createElement(Card, {
      variant: "default"
    }, /*#__PURE__*/React.createElement("span", {
      className: "sa-eyebrow"
    }, "Mentor"), /*#__PURE__*/React.createElement("div", {
      className: "ap-mentor"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ap-avatar ap-avatar--lg"
    }, c.mentor.split(" ").slice(-1)[0][0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      className: "ap-mentor__name"
    }, c.mentor), /*#__PURE__*/React.createElement("div", {
      className: "ap-muted"
    }, "Magister of the ", c.house === "teal" ? "Astral" : "Inner", " Circle"))), /*#__PURE__*/React.createElement(Button, {
      variant: "ghost",
      fullWidth: true,
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        name: "send"
      }),
      style: {
        marginTop: "var(--space-3)",
        justifyContent: "center"
      }
    }, "Send owl post")))));
  }
  window.CourseScreen = CourseScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/academy-portal/CourseScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/academy-portal/GateScreen.jsx
try { (() => {
/* GateScreen — the enrollment gate (login). */
(function () {
  const {
    Crest,
    Button,
    Input,
    Checkbox
  } = window.SA;
  const Ic = ({
    name
  }) => /*#__PURE__*/React.createElement("i", {
    "data-lucide": name
  });
  function GateScreen({
    onEnter
  }) {
    return /*#__PURE__*/React.createElement("div", {
      className: "ap-gate"
    }, /*#__PURE__*/React.createElement("div", {
      className: "ap-gate__aura"
    }), /*#__PURE__*/React.createElement("div", {
      className: "ap-gate__card"
    }, /*#__PURE__*/React.createElement(Crest, {
      form: "full",
      size: 108,
      basePath: "../../assets"
    }), /*#__PURE__*/React.createElement("div", {
      className: "ap-gate__wm"
    }, /*#__PURE__*/React.createElement("span", {
      className: "ap-gate__name"
    }, "Starfall Academy"), /*#__PURE__*/React.createElement("span", {
      className: "ap-gate__motto"
    }, "By Starlight We Rise")), /*#__PURE__*/React.createElement("hr", {
      className: "sa-rule",
      style: {
        width: "100%",
        margin: "var(--space-2) 0 var(--space-5)"
      }
    }), /*#__PURE__*/React.createElement("form", {
      className: "ap-gate__form",
      onSubmit: e => {
        e.preventDefault();
        onEnter && onEnter();
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "Initiate name",
      placeholder: "e.g. Lyra Vane",
      defaultValue: "Lyra Vane",
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        name: "user-round"
      })
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Sigil key",
      type: "password",
      defaultValue: "aether",
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        name: "key-round"
      }),
      hint: "Found on your enrollment scroll."
    }), /*#__PURE__*/React.createElement("div", {
      className: "ap-gate__row"
    }, /*#__PURE__*/React.createElement(Checkbox, {
      label: "Remember this hall",
      defaultChecked: true
    }), /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => e.preventDefault()
    }, "Lost your sigil?")), /*#__PURE__*/React.createElement(Button, {
      type: "submit",
      variant: "primary",
      size: "lg",
      fullWidth: true,
      iconLeft: /*#__PURE__*/React.createElement(Ic, {
        name: "sparkles"
      })
    }, "Enter the Atrium"), /*#__PURE__*/React.createElement(Button, {
      type: "button",
      variant: "secondary",
      size: "lg",
      fullWidth: true,
      onClick: onEnter
    }, "Enroll as a New Initiate"))), /*#__PURE__*/React.createElement("p", {
      className: "ap-gate__foot"
    }, "Term IV \xB7 MMXXVI \xB7 The doors close at the new moon"));
  }
  window.GateScreen = GateScreen;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/academy-portal/GateScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/academy-portal/data.js
try { (() => {
/* Mock data for the Starfall Academy portal UI kit. */
window.SA_DATA = {
  student: {
    name: "Lyra Vane",
    house: "Phoenix",
    rank: "Adept",
    aether: 1240,
    sigil: "A-4417"
  },
  nav: [{
    id: "atrium",
    label: "Atrium",
    icon: "layout-dashboard"
  }, {
    id: "courses",
    label: "Courses",
    icon: "book-open"
  }, {
    id: "ledger",
    label: "Ledger",
    icon: "scroll-text"
  }, {
    id: "observatory",
    label: "Observatory",
    icon: "telescope"
  }, {
    id: "archive",
    label: "Archive",
    icon: "library"
  }],
  stats: [{
    label: "Aether",
    value: "1,240",
    icon: "sparkles",
    tone: "gold"
  }, {
    label: "Courses",
    value: "5",
    icon: "book-open",
    tone: "teal"
  }, {
    label: "Ascension",
    value: "62%",
    icon: "trending-up",
    tone: "forest"
  }, {
    label: "Seals due",
    value: "2",
    icon: "stamp",
    tone: "crimson"
  }],
  courses: [{
    id: "c1",
    title: "Astral Cartography",
    house: "teal",
    term: "Term IV",
    lessons: 14,
    done: 9,
    mentor: "Magister Orrin",
    glyph: "compass"
  }, {
    id: "c2",
    title: "Rites of Emberlight",
    house: "crimson",
    term: "Term IV",
    lessons: 10,
    done: 4,
    mentor: "Dame Sera Vael",
    glyph: "flame"
  }, {
    id: "c3",
    title: "The Whispering Glass",
    house: "plum",
    term: "Term IV",
    lessons: 12,
    done: 12,
    mentor: "Archivist Pell",
    glyph: "moon-star"
  }, {
    id: "c4",
    title: "Verdant Summoning",
    house: "forest",
    term: "Term III",
    lessons: 8,
    done: 3,
    mentor: "Warden Thistle",
    glyph: "leaf"
  }],
  lessons: [{
    n: "01",
    title: "The Seven Constellations",
    len: "18 min",
    done: true
  }, {
    n: "02",
    title: "Reading the Drift",
    len: "24 min",
    done: true
  }, {
    n: "03",
    title: "Charting by Starlight",
    len: "31 min",
    done: true
  }, {
    n: "04",
    title: "The Wandering Lights",
    len: "27 min",
    done: false,
    active: true
  }, {
    n: "05",
    title: "Maps of the Hollow Sky",
    len: "22 min",
    done: false
  }, {
    n: "06",
    title: "The Cartographer's Oath",
    len: "15 min",
    done: false
  }]
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/academy-portal/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Crest = __ds_scope.Crest;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Banner = __ds_scope.Banner;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
