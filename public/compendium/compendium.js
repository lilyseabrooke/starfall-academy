/* ===========================================================================
   Starfall Academy — Reference Compendium  ·  app logic
   Vanilla DOM on the Starfall Academy design tokens (mirrors the Campus Map).
   Live data is pulled from the published Google Sheets via PapaParse, exactly
   as the original compendium did; only the presentation has been reworked.
   =========================================================================== */

/* ---- Tweak defaults (the host rewrites this block on disk when changed) --- */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "cardScale": 100,
  "density": "regular",
  "levelColors": true,
  "categoryIcons": true,
  "watermark": 50,
  "rankShade": 13,
  "rankBorder": 22
}/*EDITMODE-END*/;

/* ---- Live data sources (published CSV, unchanged from the original) ------- */
const sheets = {
  "Spells":    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd/pub?gid=0&single=true&output=csv",
  "Potions":   "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd/pub?gid=646516393&single=true&output=csv",
  "Glyphs":    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd/pub?gid=1319626806&single=true&output=csv",
  "Wands":     "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd/pub?gid=1233793945&single=true&output=csv",
  "Artifacts": "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd/pub?gid=697341861&single=true&output=csv",
  "Plants":    "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd/pub?gid=699108983&single=true&output=csv",
  "Items":     "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd/pub?gid=1377072119&single=true&output=csv",
  "Classes":   "https://docs.google.com/spreadsheets/d/e/2PACX-1vTXtnorBMPVkIS5vVvc1hiPA_9MNwo3v5gcC__rVMLa28HHCjuKjCm5f_dwQgXfWVF9jF9rfl6oLsfd/pub?gid=1631797228&single=true&output=csv"
};

const CATEGORY_ICONS = {
  "Spells": "sparkles", "Potions": "flask-conical", "Glyphs": "pen-tool",
  "Wands": "wand-2", "Artifacts": "gem", "Plants": "sprout", "Items": "backpack", "Classes": "graduation-cap"
};

/* header meta line per category (unchanged formats, rendered as badges below) */
const headerFields = {
  spell:    e => ({ level: e.LEVEL, txt: e.SUBJECT }),
  potion:   e => ({ txt: trio("Cost", e.COST, "Intensity", e.INTENSITY) }),
  glyph:    e => ({ txt: trio("Cost", e.COST, "Intensity", e.INTENSITY) }),
  wand:     e => ({ txt: e.COST ? "Cost · " + e.COST : "" }),
  artifact: e => ({ level: e.LEVEL, txt: e.SUBJECT }),
  plant:    e => ({ txt: trio("Value", e.VALUE, "Intensity", e.INTENSITY) }),
  item:     e => ({ txt: e.COST ? "Cost · " + e.COST : "" }),
  class:    e => ({ txt: "" })
};
function trio(a, av, b, bv){
  const parts = [];
  if (av) parts.push(a + " · " + av);
  if (bv) parts.push(b + " · " + bv);
  return parts.join("    ");
}

/* level → badge tone */
const LEVEL_TONE = { BASIC:"forest", STANDARD:"teal", ADVANCED:"plum", LEGENDARY:"gold", HEX:"crimson", TWISTED:"crimson" };
function levelTone(level){
  if (!level) return "neutral";
  const first = level.toString().trim().toUpperCase().split(/\s+/)[0];
  return LEVEL_TONE[first] || "neutral";
}

/* ---- DOM refs ------------------------------------------------------------ */
const catsEl   = document.getElementById("cats");
const list     = document.getElementById("list");
const searchBar= document.getElementById("search-bar");
const filterBtn= document.getElementById("filter-button");
const filterMenu = document.getElementById("filter-menu");
const sortBtn  = document.getElementById("sort-button");
const sortMenu = document.getElementById("sort-menu");
const sortCurrent = document.getElementById("sort-current");

let currentData = [];
let currentCategory = "Spells";
let sortState = { field:"NAME", label:"Name", dir:"asc", type:"text" };
let sortByCategory = {};
try { sortByCategory = JSON.parse(localStorage.getItem("starfallCompendiumSort") || "{}") || {}; } catch(e){ sortByCategory = {}; }

/* Sort fields available per category (key · label · comparator type) */
const SORT_FIELDS = {
  SPELLS:    [["NAME","Name","text"],["SUBJECT","Subject","text"],["STAT","Stat","text"],["LEVEL","Level","level"],["DC","DC","num"]],
  POTIONS:   [["NAME","Name","text"],["COST","Cost","num"],["INTENSITY","Intensity","num"]],
  GLYPHS:    [["NAME","Name","text"],["COST","Cost","num"],["INTENSITY","Intensity","num"]],
  WANDS:     [["NAME","Name","text"],["COST","Cost","num"]],
  ARTIFACTS: [["NAME","Name","text"],["SUBJECT","Subject","text"],["LEVEL","Level","level"],["COST","Cost","num"],["INTENSITY","Intensity","num"],["DC","DC","num"]],
  PLANTS:    [["NAME","Name","text"],["VALUE","Value","num"],["INTENSITY","Intensity","num"]],
  ITEMS:     [["NAME","Name","text"],["COST","Cost","num"]],
  CLASSES:   [["NAME","Name","text"]]
};
const LEVEL_ORDER = { BASIC:0, STANDARD:1, ADVANCED:2, LEGENDARY:3, HEX:4, TWISTED:4 };
function levelRank(v){
  if (!v) return 99;
  const first = v.toString().trim().toUpperCase().split(/\s+/)[0];
  return LEVEL_ORDER[first] != null ? LEVEL_ORDER[first] : 50;
}

/* ===========================================================================
   Category tabs
   =========================================================================== */
function buildCats(){
  catsEl.innerHTML = "";
  Object.keys(sheets).forEach(name => {
    const b = document.createElement("button");
    b.className = "cat" + (name === currentCategory ? " is-active" : "");
    b.dataset.cat = name;
    b.innerHTML = `<i data-lucide="${CATEGORY_ICONS[name] || "circle"}"></i><span>${name}</span>`;
    b.addEventListener("click", () => selectCategory(name));
    catsEl.appendChild(b);
  });
  refreshIcons();
}

function setTopbarH(){
  const h = document.querySelector(".topbar").offsetHeight;
  document.documentElement.style.setProperty("--topbar-h", h + "px");
}
window.addEventListener("resize", setTopbarH);
window.addEventListener("load", setTopbarH);

function selectCategory(name){
  if (name === currentCategory && currentData.length) return;
  currentCategory = name;
  localStorage.setItem("starfallCompendiumLastCategory", name);
  [...catsEl.children].forEach(c => c.classList.toggle("is-active", c.dataset.cat === name));
  filterBtn.disabled = (name === "Classes");
  filterMenu.classList.remove("show");
  filterBtn.classList.remove("is-active");
  searchBar.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  loadSheet(name);
}

/* ===========================================================================
   Data loading
   =========================================================================== */
function loadSheet(name){
  showState("loading");
  Papa.parse(sheets[name], {
    download: true,
    header: true,
    complete: results => {
      currentData = (results.data || []).filter(r => r && r.ID && (r.NAME || "").trim());
      if (!currentData.length){ showState("empty"); return; }
      renderFilters(name);
      setupFilterListeners();
      renderSortOptions(name);
      applyFilters();
    },
    error: () => showState("error")
  });
}

function showState(kind){
  list.innerHTML = "";
  const map = {
    loading: ["loading", "Gathering materials", "The fetch hound will be with you shortly…"],
    error:   ["error", "The archive is sealed", "We could not reach the records. Check your connection and try again."],
    empty:   ["empty", "Nothing to show", "No entries were found in this volume."]
  };
  const [mod, title, text] = map[kind];
  const el = document.createElement("div");
  el.className = "state state--" + mod;
  el.innerHTML = `
    <img class="state__crest" src="assets/crest-lines.png" alt="" />
    <div class="state__title">${title}</div>
    <div class="state__text">${text}</div>
    ${kind === "error" ? `<button class="state__action" id="retry-btn">Try again</button>` : ""}`;
  list.appendChild(el);
  if (kind === "error"){
    document.getElementById("retry-btn").addEventListener("click", () => loadSheet(currentCategory));
  }
}

/* ===========================================================================
   Rendering entries
   =========================================================================== */
const SKIP_KEYS = new Set(["ID", "NAME"]);
const CATEGORY_SKIP_KEYS = {
  item: new Set(["TAGS", "CHECK"])
};

function renderEntries(data){
  list.innerHTML = "";
  if (!data.length){
    const el = document.createElement("div");
    el.className = "state state--empty";
    el.innerHTML = `
      <img class="state__crest" src="assets/crest-lines.png" alt="" />
      <div class="state__title">No matches</div>
      <div class="state__text">The fetch hound has searched and found nothing.</div>
      <button class="state__action" id="clear-empty">Clear filters</button>`;
    list.appendChild(el);
    document.getElementById("clear-empty").addEventListener("click", () => { searchBar.value=""; resetFilters(); });
    return;
  }
  const frag = document.createDocumentFragment();
  data.forEach(entry => frag.appendChild(buildCard(entry)));
  list.appendChild(frag);
}

function buildCard(entry){
  const category = (entry.ID.split("_")[0] || "").toLowerCase();
  const isClass = category === "class";
  const card = document.createElement("div");
  card.className = "entry" + (isClass ? " classCard" : "");

  const meta = (headerFields[category] || (() => ({ txt: "" })))(entry);
  const metaHtml = buildMeta(meta);

  card.innerHTML = `
    <div class="entry-header">
      <div class="entry-headline">
        <div class="entry-title">${esc(entry.NAME || "Unnamed")}</div>
        ${metaHtml ? `<div class="entry-meta">${metaHtml}</div>` : ""}
      </div>
      <div class="entry-actions">
        <button class="icon-btn header-copy" title="Copy entry" aria-label="Copy entry">${SVG_COPY}</button>
        <span class="entry-chev">${SVG_CHEVRON}</span>
      </div>
    </div>
    <div class="entry-content">
      <div class="entry-rule"></div>
      ${isClass ? renderClassCard(entry) : renderDetails(entry, category)}
      ${isClass ? "" : `<button class="copy-button">${SVG_COPY}Copy entry</button>`}
    </div>`;

  card.querySelector(".entry-header").addEventListener("click", () => card.classList.toggle("open"));
  card.querySelector(".header-copy").addEventListener("click", e => { e.stopPropagation(); copyEntry(entry); });
  const cb = card.querySelector(".copy-button");
  if (cb) cb.addEventListener("click", e => { e.stopPropagation(); copyEntry(entry); });
  return card;
}

function buildMeta(meta){
  let html = "";
  if (meta.level){
    const tone = levelTone(meta.level);
    html += `<span class="badge badge--${tone}"><span class="badge__dot"></span>${esc(meta.level)}</span>`;
  }
  if (meta.txt){
    if (html) html += `<span class="entry-meta__sep"></span>`;
    html += `<span class="entry-meta__txt">${esc(meta.txt)}</span>`;
  }
  return html;
}

/* Heuristic layout: short values → facts grid; long / multi-line → prose blocks */
function renderDetails(entry, category){
  const facts = [], blocks = [];
  const catSkip = (category && CATEGORY_SKIP_KEYS[category]) || null;
  for (const key in entry){
    if (SKIP_KEYS.has(key)) continue;
    if (catSkip && catSkip.has(key.toUpperCase())) continue;
    let val = entry[key];
    if (val === undefined || val === null) continue;
    val = val.toString().trim();
    if (!val) continue;
    const multiline = /•/.test(val);
    const html = esc(val).replace(/•/g, "<br>");
    if (multiline || val.length > 46){
      blocks.push(`<div class="block"><div class="block__k">${esc(key)}</div><div class="block__v">${html}</div></div>`);
    } else {
      facts.push(`<div class="fact"><span class="fact__k">${esc(key)}</span><span class="fact__v">${html}</span></div>`);
    }
  }
  let out = "";
  if (facts.length)  out += `<div class="facts">${facts.join("")}</div>`;
  if (blocks.length) out += `<div class="blocks">${blocks.join("")}</div>`;
  return out || `<div class="block__v" style="color:var(--text-faint);font-style:italic">No further details recorded.</div>`;
}

function renderClassCard(entry){
  const name = (entry.NAME || "").toString();
  let html = `<div class="classCardName">${esc(name)}</div>`;
  if (entry["PATH 1"] || entry["PATH 2"]){
    html += `<div class="classPaths">
      <div class="classPath"><div class="path-eyebrow">Path I</div><div class="path-title">${esc(entry["PATH 1"] || "—")}</div></div>
      <div class="classPath"><div class="path-eyebrow">Path II</div><div class="path-title">${esc(entry["PATH 2"] || "—")}</div></div>
    </div>`;
  }
  const ranks = [];
  for (let rank = 1; rank < 10; rank += 2){
    [[rank,1],[rank,2],[rank+1,1],[rank+1,2]].forEach(([r,c]) => {
      const nm = entry[`RANK ${r}-${c} NAME`];
      const ds = entry[`RANK ${r}-${c} DESCRIPTION`];
      if (!nm && !ds) return;
      ranks.push(`<div class="classRank">
        <div class="classRank__name"><span class="classRank__tier">R${r}.${c}</span>${esc((nm||"").toString())}</div>
        <div class="classRank__desc">${esc((ds||"").toString()).replace(/•/g,"<br>")}</div>
      </div>`);
    });
  }
  if (ranks.length) html += `<div class="classRanks">${ranks.join("")}</div>`;
  return html;
}

/* ===========================================================================
   Filters  (semantics ported verbatim from the original compendium)
   =========================================================================== */
const SUBJECTS = ["Any","Alchemy","Arcane History","Artificy","Bestiology","Chronomancy","Counterhexology","Crystallomancy","Demonology","Divination","Draconology","Enchantment","Evocation","Herbalism","Hypnomancy","Illusion","Necromancy","Restoration","Runology","Summoning","Telekinesis","Teleportation","Transmutation","Wandcrafting","Warding"];
const SKILLS   = ["Any","Agility","Analyze","Art","Athletics","Comprehend","Concentration","Creature","Deception","Endurance","Hide Object","Improvise","Investigation","Perception","Persuasion","Read Person","Recall Information","Research","Search","Sleight of Hand","Stealth","Tact","Tracking","Willpower","Win Over"];
const STATS    = ["Any","Focus","Creativity","Logic","Insight","Body","Charm"];

function renderFilters(category){
  filterMenu.innerHTML = `<div class="filter-menu__head">Refine ${category}</div>`;
  const c = category.toUpperCase();
  if (c === "SPELLS"){
    appendCategorySelect("SUBJECT", SUBJECTS); appendCategorySelect("STAT", STATS);
    appendLevels("HEX"); appendRange("DC"); appendRadios("RITUAL"); appendRadios("VOLATILE");
  } else if (c === "POTIONS"){
    appendRange("COST"); appendRange("INTENSITY"); appendRadios("TWISTED");
  } else if (c === "GLYPHS"){
    appendRange("COST"); appendRange("INTENSITY");
  } else if (c === "WANDS"){
    appendRange("COST"); appendRadios("TWISTED");
  } else if (c === "ARTIFACTS"){
    appendCategorySelect("SUBJECT", SUBJECTS); appendLevels("TWISTED");
    appendRange("COST"); appendRange("INTENSITY"); appendCategorySelect("SKILL", SKILLS); appendRange("DC");
  } else if (c === "PLANTS"){
    appendRange("VALUE"); appendRange("INTENSITY"); appendRadios("SINGLE-USE");
  } else if (c === "ITEMS"){
    appendRange("COST"); appendRadios("SINGLE-USE");
  }
  appendResetButton();
}

function appendCategorySelect(title, options){
  const lo = title.toLowerCase();
  const div = document.createElement("div");
  div.className = "filter-group";
  div.innerHTML = `<label>${title}</label><select id="filter-${lo}"></select>`;
  filterMenu.appendChild(div);
  const sel = div.querySelector("select");
  options.forEach(s => { const o = document.createElement("option"); o.value = s.toUpperCase(); o.textContent = s.toUpperCase(); sel.appendChild(o); });
  new TomSelect(`#filter-${lo}`, { create:false, dropdownParent:"body" });
}
function appendLevels(hexName){
  const div = document.createElement("div");
  div.className = "filter-group";
  div.innerHTML = `<label>Level</label><select id="filter-level">
    <option>ANY</option><option>BASIC</option><option>STANDARD</option>
    <option>ADVANCED</option><option>LEGENDARY</option><option>${hexName}</option></select>`;
  filterMenu.appendChild(div);
  new TomSelect("#filter-level", { create:false, searchField:[], controlInput:null, dropdownParent:"body", onItemAdd(){ this.close(); this.blur(); } });
}
function fieldMax(field){
  let m = 0;
  currentData.forEach(e => { const v = parseFloat(e[field]); if (!isNaN(v) && v > m) m = v; });
  return m;
}
function appendRange(title){
  const lo = title.toLowerCase();
  const c = currentCategory.toUpperCase();
  let max, step;
  if (title === "COST"){
    if (c === "GLYPHS"){ max = 100; step = 5; }
    else { const dm = fieldMax("COST"); step = 100; max = dm > 0 ? Math.ceil(dm / step) * step : 10000; }
  } else {
    const dm = fieldMax(title); step = 1; max = dm > 0 ? Math.ceil(dm) : 50;
  }
  const div = document.createElement("div");
  div.className = "filter-group";
  div.innerHTML = `
    <label>${title}</label>
    <div class="filter-group__range">
      <input type="number" class="range-num" id="filter-${lo}-min" placeholder="MIN" min="0" max="${max}" step="${step}">
      <span>–</span>
      <input type="number" class="range-num" id="filter-${lo}-max" placeholder="MAX" min="0" max="${max}" step="${step}">
    </div>
    <div class="dual" data-lo="${lo}" data-max="${max}" data-step="${step}">
      <div class="dual__rail"></div>
      <div class="dual__fill"></div>
      <input type="range" class="dual__thumb dual__thumb--min" min="0" max="${max}" step="${step}" value="0" aria-label="${title} minimum">
      <input type="range" class="dual__thumb dual__thumb--max" min="0" max="${max}" step="${step}" value="${max}" aria-label="${title} maximum">
    </div>`;
  filterMenu.appendChild(div);
  wireDual(div, lo, max);
}
function wireDual(group, lo, max){
  const minNum = group.querySelector(`#filter-${lo}-min`);
  const maxNum = group.querySelector(`#filter-${lo}-max`);
  const minR = group.querySelector(".dual__thumb--min");
  const maxR = group.querySelector(".dual__thumb--max");
  const fill = group.querySelector(".dual__fill");

  function paint(){
    const a = +minR.value, b = +maxR.value;
    fill.style.left = (a / max * 100) + "%";
    fill.style.right = (100 - b / max * 100) + "%";
  }
  function slidersToNums(){
    const a = +minR.value, b = +maxR.value;
    minNum.value = a <= 0 ? "" : a;
    maxNum.value = b >= max ? "" : b;
  }
  minR.addEventListener("input", () => { if (+minR.value > +maxR.value) minR.value = maxR.value; paint(); slidersToNums(); });
  maxR.addEventListener("input", () => { if (+maxR.value < +minR.value) maxR.value = minR.value; paint(); slidersToNums(); });
  minR.addEventListener("change", applyFilters);
  maxR.addEventListener("change", applyFilters);
  function numsToSliders(){
    let a = minNum.value === "" ? 0 : Math.max(0, Math.min(max, +minNum.value));
    let b = maxNum.value === "" ? max : Math.max(0, Math.min(max, +maxNum.value));
    if (a > b) a = b;
    minR.value = a; maxR.value = b; paint();
  }
  minNum.addEventListener("input", numsToSliders);
  maxNum.addEventListener("input", numsToSliders);
  group._resetDual = () => { minR.value = 0; maxR.value = max; minNum.value = ""; maxNum.value = ""; paint(); };
  paint();
}
function appendRadios(title, options = ["YES","NO"]){
  const lo = title.toLowerCase();
  const div = document.createElement("div");
  div.className = "filter-group";
  let html = `<label>${title}</label><div class="filter-radios">
    <label class="filter-radio"><input type="radio" name="filter-${lo}" value="" checked>Any</label>`;
  options.forEach(opt => { const v = opt.toUpperCase(); html += `<label class="filter-radio"><input type="radio" name="filter-${lo}" value="${v}">${v}</label>`; });
  html += `</div>`;
  div.innerHTML = html;
  filterMenu.appendChild(div);
}
function appendResetButton(){
  const div = document.createElement("div");
  div.className = "filter-group";
  div.innerHTML = `<button class="reset-filters" id="reset-filters-button">Clear filters</button>`;
  filterMenu.appendChild(div);
  div.querySelector("#reset-filters-button").addEventListener("click", resetFilters);
}
function resetFilters(){
  filterMenu.querySelectorAll(".filter-group").forEach(g => { if (g._resetDual) g._resetDual(); });
  filterMenu.querySelectorAll("select, input[type=number], input[type=radio]").forEach(input => {
    if (input.type === "radio"){ if (input.value === "") input.checked = true; }
    else if (input.type === "number"){ input.value = ""; }
    else if (input.tagName === "SELECT"){ input.value = "ANY"; if (input.tomselect) input.tomselect.setValue("ANY", true); }
  });
  applyFilters();
}
function setupFilterListeners(){
  filterMenu.querySelectorAll("select, input[type=radio], input[type=number]").forEach(input => input.addEventListener("change", applyFilters));
}

function entryMatches(entry, filters, search){
  let show = true;
  for (const key in filters){
    const value = filters[key];
    if (!value || value === "ANY") continue;
    const field = key.replace(/^filter-/, "").toUpperCase();
    const splitEntry = entry[field] ? entry[field].split(",") : [];
    if (key.toUpperCase().endsWith("-MIN")){
      const real = field.replace("-MIN", "");
      const v = parseFloat(entry[real]);
      if (isNaN(v) || v < value) show = false;
    } else if (key.toUpperCase().endsWith("-MAX")){
      const real = field.replace("-MAX", "");
      const v = parseFloat(entry[real]);
      if (isNaN(v) || v > value) show = false;
    } else if (typeof entry[field] === "string" && splitEntry.every(e => e.toString().toUpperCase().trim() !== value.toString().toUpperCase())){
      if (value.toString().toUpperCase() !== "HEX" || entry[field].split(" ")[0].toUpperCase() !== "HEX") show = false;
    }
  }
  if (search){
    const nameMatch = (entry.NAME || "").toUpperCase().includes(search);
    const idExact = (entry.ID || "").toUpperCase() === search;
    const idAfter = ((entry.ID || "").split("_")[1] || "").toUpperCase() === search;
    if (!(nameMatch || idExact || idAfter)) show = false;
  }
  return show;
}

function applyFilters(){
  const filters = {};
  const inputs = filterMenu.querySelectorAll("select, input[type=number], input[type=radio]");
  const search = searchBar.value.trim().toUpperCase();
  inputs.forEach(input => {
    const idOrName = input.type === "radio" ? input.name : input.id;
    if (input.type === "radio"){ const checked = filterMenu.querySelector(`input[name="${input.name}"]:checked`); filters[idOrName] = checked ? checked.value : ""; }
    else if (input.type === "number"){ filters[idOrName] = input.value ? parseFloat(input.value) : null; }
    else { filters[idOrName] = input.value || ""; }
  });
  const shown = sortEntries(currentData.filter(e => entryMatches(e, filters, search)));
  renderEntries(shown);
  // active-filter dot
  filterBtn.classList.toggle("has-filters", Object.entries(filters).some(([k,v]) => v && v !== "ANY"));
}

/* ===========================================================================
   Filter popover open/close
   =========================================================================== */
filterBtn.addEventListener("click", e => {
  e.stopPropagation();
  if (filterBtn.disabled) return;
  const open = filterMenu.classList.toggle("show");
  filterBtn.classList.toggle("is-active", open);
});
document.addEventListener("click", e => {
  if (!filterMenu.contains(e.target) && !filterBtn.contains(e.target)){
    filterMenu.classList.remove("show");
    filterBtn.classList.remove("is-active");
  }
});
searchBar.addEventListener("input", applyFilters);

/* ===========================================================================
   Sort
   =========================================================================== */
function renderSortOptions(category){
  const fields = SORT_FIELDS[category.toUpperCase()] || [["NAME","Name","text"]];
  const saved = sortByCategory[category.toUpperCase()];
  let init = fields[0], dir = "asc";
  if (saved){
    const match = fields.find(f => f[0] === saved.field);
    if (match){ init = match; dir = saved.dir === "desc" ? "desc" : "asc"; }
  }
  sortState = { field: init[0], label: init[1], dir, type: init[2] };
  sortMenu.innerHTML = `<div class="sort-menu__head">Order by</div>` +
    fields.map(([key,label,type]) =>
      `<button class="sort-opt" data-field="${key}" data-label="${label}" data-type="${type}">
         <span>${label}</span><span class="sort-opt__dir"></span>
       </button>`).join("");
  updateSortUI();
}

function updateSortUI(){
  sortMenu.querySelectorAll(".sort-opt").forEach(opt => {
    const active = opt.dataset.field === sortState.field;
    opt.classList.toggle("is-active", active);
    opt.querySelector(".sort-opt__dir").innerHTML =
      active ? `<i data-lucide="${sortState.dir === "asc" ? "arrow-up" : "arrow-down"}"></i>` : "";
  });
  sortCurrent.textContent = sortState.label;
  refreshIcons();
}

function sortEntries(arr){
  const { field, dir, type } = sortState;
  const sign = dir === "asc" ? 1 : -1;
  return arr.slice().sort((a, b) => {
    let r;
    if (type === "num"){
      const av = parseFloat(a[field]), bv = parseFloat(b[field]);
      const am = isNaN(av), bm = isNaN(bv);
      if (am || bm){ if (am && bm) return 0; return am ? 1 : -1; } // missing values always last
      r = av - bv;
    } else if (type === "level"){
      r = levelRank(a[field]) - levelRank(b[field]);
    } else {
      r = (a[field] || "").toString().toLowerCase().localeCompare((b[field] || "").toString().toLowerCase());
    }
    if (r === 0) r = (a.NAME || "").toString().toLowerCase().localeCompare((b.NAME || "").toString().toLowerCase());
    return r * sign;
  });
}

sortBtn.addEventListener("click", e => {
  e.stopPropagation();
  const open = sortMenu.classList.toggle("show");
  sortBtn.classList.toggle("is-active", open);
});
sortMenu.addEventListener("click", e => {
  const opt = e.target.closest(".sort-opt");
  if (!opt) return;
  if (sortState.field === opt.dataset.field){
    sortState.dir = sortState.dir === "asc" ? "desc" : "asc";
  } else {
    sortState.field = opt.dataset.field;
    sortState.label = opt.dataset.label;
    sortState.type = opt.dataset.type;
    sortState.dir = "asc";
  }
  sortByCategory[currentCategory.toUpperCase()] = { field: sortState.field, dir: sortState.dir };
  try { localStorage.setItem("starfallCompendiumSort", JSON.stringify(sortByCategory)); } catch(err){}
  updateSortUI();
  applyFilters();
});
document.addEventListener("click", e => {
  if (!sortMenu.contains(e.target) && !sortBtn.contains(e.target)){
    sortMenu.classList.remove("show");
    sortBtn.classList.remove("is-active");
  }
});

/* ===========================================================================
   Copy to clipboard (+ toast)
   =========================================================================== */
const toast = document.getElementById("toast");
const toastText = document.getElementById("toast-text");
const toastIcon = document.getElementById("toast-icon");
let toastTimer = null;
function showToast(msg, ok){
  if (ok === undefined) ok = true;
  toastText.textContent = msg;
  toastIcon.innerHTML = ok ? SVG_CHECK : SVG_X;
  toast.classList.toggle("toast--error", !ok);
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}
function copyText(text){
  return new Promise((resolve, reject) => {
    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.top = "0"; ta.style.left = "-9999px"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        ok ? resolve() : reject();
      } catch (e) { reject(e); }
    };
    if (navigator.clipboard && window.isSecureContext){
      navigator.clipboard.writeText(text).then(resolve, fallback);
    } else { fallback(); }
  });
}
function copyEntry(entry){
  const lines = [];
  for (const key in entry){
    if (key.toUpperCase() === "ID") continue;
    let v = entry[key];
    if (!v) continue;
    v = v.toString().trim();
    if (v.toUpperCase() === "YES") lines.push(key);
    else if (v.toUpperCase() === "NO") continue;
    else lines.push(v.replace(/•/g, "\n"));
  }
  copyText(lines.join("\n")).then(
    () => showToast(`Copied "${(entry.NAME||"entry").toString()}"`, true),
    () => showToast("Could not copy", false)
  );
}

/* ---- inline icons (avoids running lucide.createIcons over 1000+ nodes) --- */
const SVG_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`;
const SVG_CHECK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`;
const SVG_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
const SVG_COPY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;

/* ---- helpers ------------------------------------------------------------- */
function esc(s){ return (s == null ? "" : s.toString()).replace(/[&<>"]/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m])); }
function refreshIcons(){ if (window.lucide) window.lucide.createIcons(); }

/* ===========================================================================
   Tweaks panel  (host-toggled — raw postMessage protocol, like the Map)
   =========================================================================== */
const tweaks = Object.assign({}, TWEAK_DEFAULTS);

function applyTweaks(){
  const root = document.documentElement;
  root.style.setProperty("--card-scale", (tweaks.cardScale / 100).toFixed(3));
  const dens = { compact:["10px","16px","8px"], regular:["15px","20px","12px"], comfy:["20px","26px","18px"] }[tweaks.density] || ["15px","20px","12px"];
  root.style.setProperty("--card-pad-y", dens[0]);
  root.style.setProperty("--card-pad-x", dens[1]);
  root.style.setProperty("--list-gap", dens[2]);
  root.style.setProperty("--wm-opacity", (tweaks.watermark / 100).toFixed(2));
  root.style.setProperty("--rank-shade", tweaks.rankShade);
  root.style.setProperty("--rank-border", tweaks.rankBorder);
  document.body.classList.toggle("flat-levels", !tweaks.levelColors);
  document.body.classList.toggle("no-icons", !tweaks.categoryIcons);
}

function setTweak(key, val){
  tweaks[key] = val;
  applyTweaks();
  try { window.parent.postMessage({ type:"__edit_mode_set_keys", edits:{ [key]: val } }, "*"); } catch(e){}
}

function buildTweaksPanel(){
  const panel = document.createElement("aside");
  panel.className = "tweaks";
  panel.id = "tweaks-panel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="tweaks__head" id="tweaks-drag">
      <div class="tweaks__titles">
        <span class="tweaks__eyebrow">Starfall Academy</span>
        <span class="tweaks__title">Tweaks</span>
      </div>
      <button class="tweaks__close" id="tweaks-close" aria-label="Close">✕</button>
    </div>
    <div class="tweaks__body">
      <div class="tweaks__section">
        <div class="tweaks__legend">Cards</div>
        <div class="tweaks__row">
          <span class="tweaks__label">Card size</span>
          <span class="tweaks__val" id="tw-scale-val">${tweaks.cardScale}%</span>
          <input type="range" class="tweaks__slider" id="tw-scale" min="85" max="125" step="5" value="${tweaks.cardScale}">
        </div>
        <div class="tweaks__row">
          <span class="tweaks__label" style="grid-column:1 / -1">Density</span>
          <div class="tweaks__seg" id="tw-density">
            <button data-v="compact"${tweaks.density==="compact"?' class="is-active"':""}>Compact</button>
            <button data-v="regular"${tweaks.density==="regular"?' class="is-active"':""}>Regular</button>
            <button data-v="comfy"${tweaks.density==="comfy"?' class="is-active"':""}>Comfy</button>
          </div>
        </div>
      </div>
      <div class="tweaks__section">
        <div class="tweaks__legend">Style</div>
        <div class="tweaks__row">
          <span class="tweaks__label">Colour-code levels</span>
          <div class="tweaks__switch${tweaks.levelColors?" is-on":""}" id="tw-levels" role="switch"></div>
        </div>
        <div class="tweaks__row">
          <span class="tweaks__label">Category icons</span>
          <div class="tweaks__switch${tweaks.categoryIcons?" is-on":""}" id="tw-icons" role="switch"></div>
        </div>
        <div class="tweaks__row">
          <span class="tweaks__label">Crest watermark</span>
          <span class="tweaks__val" id="tw-wm-val">${tweaks.watermark}%</span>
          <input type="range" class="tweaks__slider" id="tw-wm" min="0" max="80" step="5" value="${tweaks.watermark}">
        </div>
      </div>
      <div class="tweaks__section">
        <div class="tweaks__legend">Class rank rows</div>
        <div class="tweaks__row">
          <span class="tweaks__label">Alt-row shade</span>
          <span class="tweaks__val" id="tw-rshade-val">${tweaks.rankShade}%</span>
          <input type="range" class="tweaks__slider" id="tw-rshade" min="0" max="45" step="1" value="${tweaks.rankShade}">
        </div>
        <div class="tweaks__row">
          <span class="tweaks__label">Alt-row border</span>
          <span class="tweaks__val" id="tw-rborder-val">${tweaks.rankBorder}%</span>
          <input type="range" class="tweaks__slider" id="tw-rborder" min="0" max="70" step="1" value="${tweaks.rankBorder}">
        </div>
      </div>
    </div>`;
  document.body.appendChild(panel);

  const scale = panel.querySelector("#tw-scale");
  scale.addEventListener("input", () => { panel.querySelector("#tw-scale-val").textContent = scale.value + "%"; setTweak("cardScale", +scale.value); });
  const wm = panel.querySelector("#tw-wm");
  wm.addEventListener("input", () => { panel.querySelector("#tw-wm-val").textContent = wm.value + "%"; setTweak("watermark", +wm.value); });
  const rshade = panel.querySelector("#tw-rshade");
  rshade.addEventListener("input", () => { panel.querySelector("#tw-rshade-val").textContent = rshade.value + "%"; setTweak("rankShade", +rshade.value); });
  const rborder = panel.querySelector("#tw-rborder");
  rborder.addEventListener("input", () => { panel.querySelector("#tw-rborder-val").textContent = rborder.value + "%"; setTweak("rankBorder", +rborder.value); });
  panel.querySelector("#tw-density").addEventListener("click", e => {
    const btn = e.target.closest("button"); if (!btn) return;
    [...e.currentTarget.children].forEach(b => b.classList.toggle("is-active", b === btn));
    setTweak("density", btn.dataset.v);
  });
  const lv = panel.querySelector("#tw-levels");
  lv.addEventListener("click", () => { const on = !lv.classList.contains("is-on"); lv.classList.toggle("is-on", on); setTweak("levelColors", on); });
  const ic = panel.querySelector("#tw-icons");
  ic.addEventListener("click", () => { const on = !ic.classList.contains("is-on"); ic.classList.toggle("is-on", on); setTweak("categoryIcons", on); refreshIcons(); });

  panel.querySelector("#tweaks-close").addEventListener("click", () => { panel.hidden = true; try { window.parent.postMessage({ type:"__edit_mode_dismissed" }, "*"); } catch(e){} });
  makeDraggable(panel, panel.querySelector("#tweaks-drag"));

  // host protocol
  window.addEventListener("message", e => {
    const t = e && e.data && e.data.type;
    if (t === "__activate_edit_mode") panel.hidden = false;
    else if (t === "__deactivate_edit_mode") panel.hidden = true;
  });
  try { window.parent.postMessage({ type:"__edit_mode_available" }, "*"); } catch(e){}
}

function makeDraggable(panel, handle){
  let sx, sy, ox, oy, dragging = false;
  handle.addEventListener("mousedown", e => {
    if (e.target.closest(".tweaks__close")) return;
    dragging = true;
    const r = panel.getBoundingClientRect();
    panel.style.right = "auto"; panel.style.bottom = "auto";
    panel.style.left = r.left + "px"; panel.style.top = r.top + "px";
    sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    e.preventDefault();
  });
  window.addEventListener("mousemove", e => {
    if (!dragging) return;
    panel.style.left = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, ox + e.clientX - sx)) + "px";
    panel.style.top  = Math.max(8, Math.min(window.innerHeight - 40, oy + e.clientY - sy)) + "px";
  });
  window.addEventListener("mouseup", () => { dragging = false; });
}

/* ===========================================================================
   Boot
   =========================================================================== */
buildCats();
buildTweaksPanel();
applyTweaks();
refreshIcons();
setTopbarH();

const saved = localStorage.getItem("starfallCompendiumLastCategory");
currentCategory = (saved && sheets[saved]) ? saved : "Spells";
[...catsEl.children].forEach(c => c.classList.toggle("is-active", c.dataset.cat === currentCategory));
filterBtn.disabled = (currentCategory === "Classes");
loadSheet(currentCategory);
