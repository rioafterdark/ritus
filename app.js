/* =========================================================
   RITUS — gamified rites tracker
   Vanilla JS · no dependencies · IndexedDB persistence
   Illustration engine lives in art.js (window.RitusArt)
   ========================================================= */
(() => {
'use strict';
const Art = window.RitusArt;
const I = (n, cls) => Art.icon(n, cls);

/* ---------------- utilities ---------------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const pad = n => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dayKey(d); };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtNum = (v, dp = 0) => Number(v).toLocaleString('en-GB', { minimumFractionDigits: dp, maximumFractionDigits: dp });
function roman(n) {
  if (n <= 0) return '0';
  const m = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s;
}
function wpick(w) { const t = w.reduce((a, b) => a + b, 0); let r = Math.random() * t; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; } return w.length - 1; }

/* ---------------- static data ---------------- */
const LAT_DAYS = ['Dies Solis', 'Dies Lunae', 'Dies Martis', 'Dies Mercurii', 'Dies Iovis', 'Dies Veneris', 'Dies Saturni'];
const MONTHS = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ATTRS = [
  { id: 'for', ab: 'FOR', n: 'Fortitudo', en: 'Strength · workout, protein' },
  { id: 'vig', ab: 'VIG', n: 'Vigor', en: 'Vitality · calories, water' },
  { id: 'tem', ab: 'TEM', n: 'Temperantia', en: 'Control · vacuums, phone out' },
  { id: 'qui', ab: 'QUI', n: 'Quies', en: 'Rest · sleep' },
  { id: 'pru', ab: 'PRU', n: 'Prudentia', en: 'Wisdom · weight & bank logs' },
];

const RITES = [
  { id: 'workout', n: 'Workout', la: 'Exercitium', type: 'check', xp: 40, attr: 'for', g: 'sword' },
  { id: 'protein', n: 'Protein', la: 'Caro', type: 'num', unit: 'g', key: 'protein', mode: 'min', quick: [10, 25, 50], step: 1, dp: 0, xp: 30, attr: 'for', g: 'meat' },
  { id: 'calories', n: 'Calories', la: 'Mensura', type: 'num', unit: 'kcal', key: 'calories', mode: 'cal', quick: [100, 250, 500], step: 1, dp: 0, xp: 30, attr: 'vig', g: 'flame' },
  { id: 'water', n: 'Water', la: 'Aqua', type: 'num', unit: 'L', key: 'water', mode: 'min', quick: [0.25, 0.5, 1], step: 0.25, dp: 2, xp: 25, attr: 'vig', g: 'drop' },
  { id: 'vacuums', n: 'Vacuums', la: 'Vacuum', type: 'sets', sets: 4, xp: 25, attr: 'tem', g: 'hourglass' },
  { id: 'phone', n: 'Phone out by 23:00', la: 'Silentium', type: 'check', xp: 30, attr: 'tem', g: 'key' },
  { id: 'sleep', n: 'Sleep', la: 'Somnus', type: 'sleep', key: 'sleep', xp: 35, attr: 'qui', g: 'moon' },
  { id: 'weight', n: 'Weight', la: 'Pondus', type: 'log', unit: 'kg', step: 0.1, dp: 1, xp: 15, attr: 'pru', g: 'scale' },
  { id: 'bank', n: 'Bank balance', la: 'Aerarium', type: 'log', unit: '€', step: 0.01, dp: 2, xp: 15, attr: 'pru', g: 'coin', priv: true },
];
const RITE = Object.fromEntries(RITES.map(r => [r.id, r]));

const SLOTS = [
  { id: 'head', n: 'Head', la: 'Caput', pri: 'pru', side: 'L' },
  { id: 'neck', n: 'Neck', la: 'Collum', pri: 'qui', side: 'L' },
  { id: 'cloak', n: 'Cloak', la: 'Pallium', pri: 'tem', side: 'L' },
  { id: 'chest', n: 'Chest', la: 'Pectus', pri: 'vig', side: 'L' },
  { id: 'legs', n: 'Legs', la: 'Crura', pri: 'for', side: 'L' },
  { id: 'main', n: 'Main hand', la: 'Dextra', pri: 'for', side: 'R' },
  { id: 'off', n: 'Off hand', la: 'Sinistra', pri: 'tem', side: 'R' },
  { id: 'hands', n: 'Hands', la: 'Manus', pri: 'for', side: 'R' },
  { id: 'ring', n: 'Ring', la: 'Anulus', pri: 'pru', side: 'R' },
  { id: 'feet', n: 'Feet', la: 'Pedes', pri: 'vig', side: 'R' },
];
const SLOT = Object.fromEntries(SLOTS.map(s => [s.id, s]));

const RAR = [
  { en: 'Common', la: 'Vulgaris', c: '#b3aa98', salv: 1 },
  { en: 'Rare', la: 'Rara', c: '#5f95d6', salv: 4 },
  { en: 'Epic', la: 'Sacra', c: '#a774ea', salv: 12 },
  { en: 'Legendary', la: 'Aurea', c: '#d9b45e', salv: 40 },
];

/* variant: [id, minRarity] */
const VARIANTS = {
  head: [['fedora', 0], ['homburg', 0], ['widebrim', 1], ['tophat', 1], ['mask', 2], ['circlet', 2]],
  neck: [['tie', 0], ['bowtie', 0], ['cravat', 1], ['scarf', 1], ['lozenge', 2]],
  cloak: [['overcoat', 0], ['trench', 0], ['cape', 1]],
  chest: [['single', 0], ['waistcoat', 0], ['double', 1], ['roll', 1], ['frock', 1], ['tuxedo', 2]],
  legs: [['trousers', 0], ['pinstripe', 1], ['slim', 1], ['tux', 2]],
  main: [['cane', 0], ['umbrella', 0], ['stiletto', 1], ['swordcane', 1], ['scepter', 2]],
  off: [['watch', 0], ['tome', 0], ['cards', 1], ['briefcase', 1], ['lantern', 2], ['rose', 2]],
  hands: [['gloves', 0], ['driving', 0], ['silk', 1]],
  ring: [['band', 0], ['signet', 1], ['gem', 2]],
  feet: [['oxford', 0], ['chelsea', 0], ['brogue', 1]],
};
const BASE_NAMES = {
  head: { fedora: 'Fedora', homburg: 'Homburg', widebrim: 'Wide-Brim Hat', tophat: 'Top Hat', mask: 'Masquerade Mask', circlet: 'Thorn Circlet' },
  neck: { tie: 'Silk Tie', bowtie: 'Bow Tie', cravat: 'Cravat', scarf: 'Cashmere Scarf', lozenge: 'Lozenge Pendant' },
  cloak: { overcoat: 'Overcoat', trench: 'Trench Coat', cape: 'Opera Cape', smoke: 'Coat of Smoke' },
  chest: { single: 'Suit Jacket', waistcoat: 'Waistcoat', double: 'Double-Breasted Jacket', roll: 'Rollneck & Blazer', frock: 'Frock Coat', tuxedo: 'Dinner Jacket' },
  legs: { trousers: 'Trousers', pinstripe: 'Pinstripe Trousers', slim: 'Tailored Trousers', tux: 'Dress Trousers' },
  main: { cane: 'Walking Cane', umbrella: 'Umbrella', stiletto: 'Stiletto', swordcane: 'Sword Cane', scepter: 'Scepter' },
  off: { watch: 'Pocket Watch', tome: 'Black Book', cards: 'Deck of Cards', briefcase: 'Doctor’s Bag', lantern: 'Lantern', rose: 'Black Rose' },
  hands: { gloves: 'Leather Gloves', driving: 'Driving Gloves', silk: 'Silk Gloves' },
  ring: { band: 'Band', signet: 'Signet', gem: 'Gem Ring' },
  feet: { oxford: 'Oxfords', chelsea: 'Chelsea Boots', brogue: 'Brogues' },
};
/* palettes: m = cloth/leather (always near-black), a = accent (tie, band, fittings), g = pocket square / gem */
const PALS = [
  [{ m: '#1b1a1e', a: '#3a3940', g: '#8a8a90' }, { m: '#26262b', a: '#5a5a62', g: '#a0a0a8' }, { m: '#161a24', a: '#2e3448', g: '#8a92a8' }, { m: '#201c1a', a: '#4a3a2e', g: '#9a8a7a' }, { m: '#121214', a: '#2a2a2f', g: '#c8c8cc' }],
  [{ m: '#18181c', a: '#c0c6cc', g: '#9fc8ff' }, { m: '#141a2a', a: '#c0c6cc', g: '#7fb8ff' }, { m: '#1d1d22', a: '#7a8a9a', g: '#e8e8ec' }],
  [{ m: '#141214', a: '#8e1b1d', g: '#ff4a3a' }, { m: '#17131c', a: '#7a4ab0', g: '#d0a8ff' }, { m: '#121214', a: '#c9a24e', g: '#ff5a4a' }],
];
const P_OBS = { m: '#0f0e10', a: '#d4ad5a', g: '#c41e22' };
const P_SAN = { m: '#170b0d', a: '#a3202a', g: '#ff3a2a' };
const P_NOX = { m: '#120f18', a: '#9b5de5', g: '#d4ad5a' };
const P_AUR = { m: '#c9a24e', a: '#0f0e10', g: '#fff1c4' };
const LEGENDS = [
  { slot: 'head', v: 'widebrim', n: 'Pileus Noctis', en: 'Hat of the Night', f: 'The brim casts the only shadow he needs.', pal: P_OBS },
  { slot: 'head', v: 'circlet', n: 'Corona Spinarum', en: 'Crown of Thorns', f: 'Discipline was never meant to be comfortable.', pal: P_OBS },
  { slot: 'neck', v: 'tie', n: 'Nodus Aureus', en: 'The Golden Knot', f: 'Tied once, perfectly, every morning.', pal: { m: '#0f0e10', a: '#c9a24e', g: '#c41e22' } },
  { slot: 'neck', v: 'lozenge', n: 'Signum Sanctvm', en: 'Mark of the Sanctum', f: 'A crimson lozenge set in gold.', pal: P_OBS },
  { slot: 'cloak', v: 'smoke', n: 'Pallium Umbrarum', en: 'Coat of Shadows', f: 'Where he walked, the room went quiet.', pal: P_NOX },
  { slot: 'cloak', v: 'cape', n: 'Pallium Noctis', en: 'Cape of Night', f: 'Lined in crimson, for those who look closely.', pal: P_OBS },
  { slot: 'chest', v: 'tuxedo', n: 'Vestis Sanctvm', en: 'Jacket of the Sanctum', f: 'Black wool, gold thread, a crimson square.', pal: P_OBS },
  { slot: 'chest', v: 'frock', n: 'Toga Atra', en: 'The Black Frock', f: 'Cut for a man who keeps his word.', pal: P_SAN },
  { slot: 'legs', v: 'tux', n: 'Bracae Atrae', en: 'Trousers of Ink', f: 'Pressed to an edge you could cut with.', pal: P_OBS },
  { slot: 'legs', v: 'pinstripe', n: 'Femoralia Umbrae', en: 'The Shadow Stripe', f: 'Lines so fine only the light can find them.', pal: P_NOX },
  { slot: 'main', v: 'swordcane', n: 'Gladius Sanctvs', en: 'Sword of the Sanctum', f: 'A gentleman’s cane. Until it isn’t.', pal: P_OBS },
  { slot: 'main', v: 'scepter', n: 'Sceptrum Noctis', en: 'Scepter of Night', f: 'Held by those who rule their own hours.', pal: P_NOX },
  { slot: 'off', v: 'watch', n: 'Horologium Aeternum', en: 'The Eternal Watch', f: 'It has never once been late.', pal: P_OBS },
  { slot: 'off', v: 'tome', n: 'Liber Mortuorum', en: 'Book of the Dead', f: 'Every rite you skip is written here.', pal: P_SAN },
  { slot: 'hands', v: 'gloves', n: 'Manus Ferri', en: 'Hands of Iron', f: 'Grip the bar. Grip the day.', pal: P_OBS },
  { slot: 'hands', v: 'silk', n: 'Chirothecae Aurorae', en: 'Gloves of Dawn', f: 'Gilded by a thousand early mornings.', pal: P_AUR },
  { slot: 'ring', v: 'gem', n: 'Anulus Stellae', en: 'Ring of the Star', f: 'A single point of light, refusing the dark.', pal: P_OBS },
  { slot: 'ring', v: 'signet', n: 'Anulus Vigiliae', en: 'Ring of the Vigil', f: 'Sealed with the wax of every promise kept.', pal: P_SAN },
  { slot: 'feet', v: 'oxford', n: 'Calcei Viae', en: 'Shoes of the Way', f: 'The path is walked daily or not at all.', pal: P_OBS },
  { slot: 'feet', v: 'chelsea', n: 'Caligae Cineris', en: 'Boots of Ash', f: 'They leave no footprints — only embers.', pal: { m: '#141214', a: '#d4ad5a', g: '#c41e22' } },
];
const PREFIX = [
  ['Plain', 'Charcoal', 'Midnight', 'Simple', 'Dark', 'Sober', 'Black'],
  ['Bespoke', 'Silver-Trimmed', 'Velvet', 'Sable', 'Onyx', 'Hand-Stitched'],
  ['Sinister', 'Oxblood', 'Eclipse', 'Gilded', 'Nocturne', 'Obsidian', 'Venomous'],
];
const SUFFIX = [[], ['of the Late Hour', 'of Discretion', 'of the Quiet Room', 'of Midnight', 'of Small Hours'], ['of the Fallen', 'of Ash', 'of Nox', 'of Whispers', 'of the Last Bell', 'of the Sealed Door']];
/* v1/v2 (pixel & high-fantasy) wardrobe → tailored wardrobe */
const OLD_MAP = {
  head: { hood: 'widebrim', cap: 'fedora', helm: 'homburg', greathelm: 'tophat', horned: 'mask', crown: 'circlet' },
  neck: { torc: 'tie', orb: 'bowtie', cross: 'cravat', skull: 'scarf', lozenge: 'lozenge' },
  cloak: { cape: 'overcoat', mantle: 'cape', tattered: 'trench', wings: 'smoke' },
  chest: { tunic: 'single', leather: 'waistcoat', mail: 'double', brigandine: 'roll', robe: 'frock', plate: 'tuxedo' },
  legs: { trousers: 'trousers', chausses: 'pinstripe', greaves: 'slim', tassets: 'tux' },
  main: { sword: 'swordcane', axe: 'umbrella', mace: 'cane', spear: 'stiletto', staff: 'scepter', scythe: 'scepter' },
  off: { buckler: 'watch', tome: 'tome', dagger: 'cards', heater: 'briefcase', lantern: 'lantern', orb: 'rose' },
  hands: { wraps: 'driving', gloves: 'gloves', gauntlets: 'silk' },
  ring: { band: 'band', signet: 'signet', gem: 'gem' },
  feet: { wraps: 'oxford', boots: 'chelsea', sabatons: 'brogue' },
};

const LOOT = { chance: .25, dryCap: 4, w: [67, 25, 7, 1], epicPity: 15, legSoft: 50, legHard: 90, forgeCost: 60 };

const TITLES = {
  novitius: ['Novitius', 'The Novice'], perfectus: ['Perfectus', 'The Complete'], constans: ['Constans', 'The Steadfast'],
  ferreus: ['Ferreus', 'The Iron-Willed'], stella: ['Stella Matutina', 'Star of the Dawn'], acolytus: ['Acolytus', 'Acolyte'],
  templarius: ['Templarius', 'Templar'], inquisitor: ['Inquisitor', 'Inquisitor'], archon: ['Archon', 'Archon'], dominus: ['Dominus', 'The Lord'],
  frater: ['Frater Ferri', 'Brother of Iron'], bellator: ['Bellator', 'The Warrior'], carnifex: ['Carnifex', 'The Butcher'],
  custos: ['Custos Aquae', 'Keeper of Waters'], somniator: ['Somniator', 'The Dreamer'], vigil: ['Vigil Noctis', 'Night Watch'],
  asceta: ['Asceta', 'The Ascetic'], temperans: ['Temperans', 'The Temperate'], mensor: ['Mensor', 'The Measurer'],
  quaestor: ['Quaestor', 'The Treasurer'], miles: ['Miles', 'The Soldier'], sanctvs: ['Sanctvs', 'The Holy'], cinerarius: ['Cinerarius', 'Keeper of Ash'],
  avarus: ['Avarus', 'The Hoarder'],
};
const SCENES = Art.SCENES;

/* ---------------- state ---------------- */
let S = null;
let todayK = dayKey();
let view = 'sheet';
let ritesDay = 'today';
let vaultFilter = 'all';
let D = null;

function freshState() {
  return {
    v: 3, name: 'Rui', created: dayKey(), xp: 0, maxLevel: 1,
    days: {}, inv: [], eq: Object.fromEntries(SLOTS.map(s => [s.id, null])),
    pity: { drop: 0, epic: 0, leg: 0 },
    ach: {}, titles: ['novitius'], title: 'novitius', bgs: ['crypta'], bg: 'crypta',
    cinis: 0, counters: { drops: 0, salvaged: 0, rar: [0, 0, 0, 0], forged: 0 },
    settings: { sound: true, hideBank: true, protein: 180, calories: 2415, calMode: 'range', calTol: 150, water: 4, sleep: 7.5 },
    intro: false, savedAt: 0,
  };
}
function starterKit(st) {
  const kit = [
    { slot: 'chest', variant: 'single', r: 0, pal: PALS[0][0], name: 'Plain Suit Jacket', st: { vig: 1 } },
    { slot: 'legs', variant: 'trousers', r: 0, pal: PALS[0][0], name: 'Plain Trousers', st: { for: 1 } },
    { slot: 'cloak', variant: 'overcoat', r: 0, pal: PALS[0][1], name: 'Charcoal Overcoat', st: { tem: 1 } },
    { slot: 'feet', variant: 'oxford', r: 0, pal: PALS[0][4], name: 'Black Oxfords', st: { vig: 1 } },
    { slot: 'main', variant: 'cane', r: 0, pal: { m: '#121214', a: '#9a9aa2', g: '#c8c8cc' }, name: 'Walking Cane', st: { for: 1 } },
  ];
  kit.forEach(k => { const it = Object.assign({ id: uid(), found: dayKey(), lock: true }, k); st.inv.push(it); st.eq[it.slot] = it.id; });
}
/* deterministic pick from an item id, so a migrated wardrobe is stable */
const idPick = (id, arr, salt = 0) => { let h = salt; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0; return arr[Math.abs(h) % arr.length]; };
function retailor(it) {
  const map = OLD_MAP[it.slot] || {};
  if (it.r === 3) {
    const opts = LEGENDS.filter(l => l.slot === it.slot), L = opts.find(l => l.n === it.name) || idPick(it.id, opts);
    return Object.assign(it, { variant: L.v, name: L.n, sub: L.en, flavor: L.f, pal: L.pal });
  }
  const v = map[it.variant] || (VARIANTS[it.slot].some(x => x[0] === it.variant) ? it.variant : VARIANTS[it.slot][0][0]);
  let name = `${idPick(it.id, PREFIX[it.r], 1)} ${BASE_NAMES[it.slot][v]}`;
  if (it.r === 2 || (it.r === 1 && idPick(it.id, [0, 1], 2))) name += ' ' + idPick(it.id, SUFFIX[it.r], 3);
  delete it.sub; delete it.flavor;
  return Object.assign(it, { variant: v, name, pal: idPick(it.id, PALS[it.r], 4) });
}
function migrate(s) {
  const out = Object.assign(freshState(), s || {});
  out.settings = Object.assign(freshState().settings, (s && s.settings) || {});
  out.pity = Object.assign(freshState().pity, (s && s.pity) || {});
  out.counters = Object.assign(freshState().counters, (s && s.counters) || {});
  out.eq = Object.assign(freshState().eq, (s && s.eq) || {});
  if (!Array.isArray(out.inv)) out.inv = [];
  if (!out.days || typeof out.days !== 'object') out.days = {};
  if (!out.titles.includes('novitius')) out.titles.unshift('novitius');
  if (!out.bgs.includes('crypta')) out.bgs.unshift('crypta');
  if (!SCENES[out.bg]) out.bg = 'crypta';
  if ((out.v || 1) < 3) { out.inv.forEach(retailor); out.v = 3; }
  return out;
}

/* ---------------- persistence (IndexedDB + localStorage mirror) ---------------- */
const Store = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        if (!('indexedDB' in window)) return res(null);
        const rq = indexedDB.open('ritus', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
        rq.onsuccess = () => { this.db = rq.result; res(this.db); };
        rq.onerror = () => res(null);
        rq.onblocked = () => res(null);
      } catch (e) { res(null); }
    });
  },
  async load() {
    let a = null, b = null;
    if (this.db) {
      a = await new Promise(res => {
        try { const g = this.db.transaction('kv', 'readonly').objectStore('kv').get('state'); g.onsuccess = () => res(g.result || null); g.onerror = () => res(null); }
        catch (e) { res(null); }
      });
    }
    try { const j = localStorage.getItem('ritus.state'); if (j) b = JSON.parse(j); } catch (e) {}
    if (a && b) return (b.savedAt || 0) > (a.savedAt || 0) ? b : a;
    return a || b;
  },
  save(s) {
    s.savedAt = Date.now();
    const json = JSON.stringify(s);
    try { localStorage.setItem('ritus.state', json); } catch (e) {}
    if (this.db) { try { this.db.transaction('kv', 'readwrite').objectStore('kv').put(JSON.parse(json), 'state'); } catch (e) {} }
  },
};
let saveT = null;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => Store.save(S), 250); }
function flush() { clearTimeout(saveT); if (S) Store.save(S); }

/* ---------------- sound: bells, anvils and horns, synthesised ---------------- */
const SFX = {
  ctx: null,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone(f, d, type = 'sine', vol = .05, when = 0, attack = .005) {
    if (!S || !S.settings.sound || !this.ctx) return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + d + .05);
  },
  bell(f, when = 0, vol = .05) { this.tone(f, 1.6, 'sine', vol, when); this.tone(f * 2.76, .9, 'sine', vol * .35, when); this.tone(f * 5.4, .4, 'sine', vol * .15, when); },
  done() { this.bell(523, 0, .045); this.bell(784, .09, .035); },
  undo() { this.tone(196, .25, 'triangle', .05); },
  tick() { this.tone(1200, .05, 'triangle', .02); },
  loot(r) { const seq = [[392, 523], [392, 523, 659], [330, 440, 554, 659], [262, 392, 523, 659, 784, 1047]][r]; seq.forEach((f, i) => this.bell(f, i * .11, .04)); if (r === 3) this.tone(98, 2.2, 'sawtooth', .02, 0, .3); },
  level() { [262, 330, 392, 523].forEach((f, i) => this.tone(f, 1.4, 'sawtooth', .018, i * .14, .06)); [523, 659, 784, 1047].forEach((f, i) => this.bell(f, .6 + i * .1, .04)); this.tone(65, 2.5, 'sine', .07, 0, .2); },
  ach() { [659, 784, 988, 1319].forEach((f, i) => this.bell(f, i * .09, .035)); },
};
const buzz = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

/* ---------------- items ---------------- */
const itemById = id => S.inv.find(i => i.id === id);
const equippedMap = () => Object.fromEntries(SLOTS.map(s => [s.id, S.eq[s.id] ? itemById(S.eq[s.id]) : null]));
const equippedList = () => Object.values(equippedMap()).filter(Boolean);
const iconCache = new Map();
function itemIcon(it) { if (!iconCache.has(it.id)) iconCache.set(it.id, Art.toURL(Art.itemArt(it))); return iconCache.get(it.id); }
let stageCache = { key: null, svg: '' };
function stageMarkup() {
  const key = SLOTS.map(s => S.eq[s.id] || '').join('|') + '#' + S.bg;
  if (stageCache.key !== key) stageCache = { key, svg: Art.stage(equippedMap(), S.bg) };
  return stageCache.svg;
}
function genItem(r, slotId) {
  const slot = slotId ? SLOT[slotId] : pick(SLOTS);
  let it;
  if (r === 3) { const L = pick(LEGENDS.filter(l => l.slot === slot.id)); it = { variant: L.v, name: L.n, sub: L.en, flavor: L.f, pal: L.pal }; }
  else {
    const opts = VARIANTS[slot.id].filter(v => v[1] <= r), v = pick(opts)[0], base = BASE_NAMES[slot.id][v];
    let name = `${pick(PREFIX[r])} ${base}`;
    if (r === 2 || (r === 1 && Math.random() < .5)) name += ' ' + pick(SUFFIX[r]);
    it = { variant: v, name, pal: pick(PALS[r]) };
  }
  const budget = [2, 4, 7, 12][r] + (Math.random() < .3 ? 1 : 0), st = {};
  for (let i = 0; i < budget; i++) { const a = Math.random() < .55 ? slot.pri : pick(ATTRS).id; st[a] = (st[a] || 0) + 1; }
  return Object.assign(it, { id: uid(), slot: slot.id, r, st, found: dayKey(), lock: r >= 2 });
}
function rollLoot(src) {
  const p = S.pity;
  if (src === 'rite' && !(Math.random() < LOOT.chance || p.drop >= LOOT.dryCap)) { p.drop++; return null; }
  if (src === 'rite') p.drop = 0;
  const w = [...LOOT.w];
  if (p.leg >= LOOT.legSoft) w[3] += (p.leg - LOOT.legSoft + 1) * 2.5;
  let r = wpick(w);
  if (src !== 'rite' && r < 1) r = 1;
  if (p.epic + 1 >= LOOT.epicPity && r < 2) r = 2;
  if (p.leg + 1 >= LOOT.legHard) r = 3;
  p.epic = r >= 2 ? 0 : p.epic + 1;
  p.leg = r === 3 ? 0 : p.leg + 1;
  const it = genItem(r);
  S.inv.push(it); S.counters.drops++; S.counters.rar[r]++;
  return it;
}
const statLine = st => ATTRS.filter(a => st[a.id]).map(a => `<span><b>+${st[a.id]}</b> ${a.ab}</span>`).join('');

/* ---------------- days, rites & XP ---------------- */
const need = L => Math.round(60 * Math.pow(L, 1.6) + 40);
function lvl(xp) { let L = 1; while (xp >= need(L) && L < 999) { xp -= need(L); L++; } return { L, into: xp, need: need(L) }; }
const getDay = k => S.days[k] || (S.days[k] = { h: {}, pb: 0, chest: false });
const isDone = h => !!(h && (h.done || h.rest));
const target = r => S.settings[r.key];
function fmtSleep(v) { if (v == null || v === '') return ''; let h = Math.floor(v), m = Math.round((v - h) * 60); if (m === 60) { h++; m = 0; } return `${h}h${pad(m)}`; }
function parseSleep(s) {
  s = String(s).trim().toLowerCase().replace(',', '.');
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\s*[h:]\s*(\d{1,2})?\s*m?$/);
  if (m) return +m[1] + (m[2] ? +m[2] / 60 : 0);
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
function evalDone(r, h) {
  const s = S.settings;
  switch (r.type) {
    case 'check': return !!h.done;
    case 'sets': return (h.v || 0) >= r.sets;
    case 'log': return h.v != null && h.v !== '';
    case 'sleep': return h.v != null && h.v >= s.sleep - 1e-9;
    case 'num': {
      if (h.v == null) return false;
      const T = target(r);
      if (r.mode === 'cal') { if (s.calMode === 'max') return h.v > 0 && h.v <= T; if (s.calMode === 'min') return h.v >= T; return Math.abs(h.v - T) <= s.calTol; }
      return h.v >= T - 1e-9;
    }
  }
  return false;
}
function targetText(r) {
  const s = S.settings;
  switch (r.id) {
    case 'workout': return 'Daily · up to two rest days a week count';
    case 'protein': return `Target ${s.protein} g`;
    case 'calories': return s.calMode === 'range' ? `Target ${fmtNum(s.calories)} kcal ± ${s.calTol}` : s.calMode === 'max' ? `At most ${fmtNum(s.calories)} kcal` : `At least ${fmtNum(s.calories)} kcal`;
    case 'water': return `Target ${s.water} L`;
    case 'vacuums': return 'Four holds · 15–30 s each';
    case 'phone': return 'Phone set aside by 23:00';
    case 'sleep': return `Target ${fmtSleep(s.sleep)}`;
    case 'weight': return 'Weigh in daily';
    case 'bank': return 'Log balance daily · stays on this device';
  }
  return '';
}
function streakBefore(rid, k) { let n = 0; k = addDays(k, -1); while (isDone(S.days[k]?.h?.[rid]) && n < 3650) { n++; k = addDays(k, -1); } return n; }
function perfectBefore(k) { let n = 0; k = addDays(k, -1); while (S.days[k]?.pb && n < 3650) { n++; k = addDays(k, -1); } return n; }
function riteXP(r, k, rest) { const st = streakBefore(r.id, k); return Math.round(r.xp * (rest ? .5 : 1) * (1 + Math.min(.3, .02 * st))); }
function weekRestUsed(k, exceptK) {
  const d = parseKey(k), wd = (d.getDay() + 6) % 7, mon = addDays(k, -wd); let n = 0;
  for (let i = 0; i < 7; i++) { const kk = addDays(mon, i); if (kk !== exceptK && S.days[kk]?.h?.workout?.rest) n++; }
  return n;
}
function gain(x) { S.xp = Math.max(0, S.xp + x); }

/* the single mutation path for rites */
function commit(k, rid, mut) {
  SFX.init();
  const r = RITE[rid], d = getDay(k), h = d.h[rid] || (d.h[rid] = {});
  const before = isDone(h);
  mut(h);
  if (r.type !== 'check') h.done = evalDone(r, h);
  const after = isDone(h);
  const mode = h.done ? 'full' : 'rest';
  const ev = { xp: 0, loot: null, perfect: 0, chest: null };
  if (after && !h.xp) {
    h.xp = riteXP(r, k, mode === 'rest'); h.xm = mode; gain(h.xp); ev.xp = h.xp;
    if (!h.rolled) { h.rolled = true; ev.loot = rollLoot('rite'); }
  } else if (!after && h.xp) {
    gain(-h.xp); ev.xp = -h.xp; h.xp = 0;
  } else if (after && h.xp && h.xm !== mode) {
    gain(-h.xp); const nx = riteXP(r, k, mode === 'rest'); ev.xp = nx - h.xp; h.xp = nx; h.xm = mode; gain(nx);
  }
  const perfect = RITES.every(rr => isDone(d.h[rr.id]));
  if (perfect && !d.pb) {
    d.pb = 100 + 10 * Math.min(10, perfectBefore(k)); gain(d.pb); ev.perfect = d.pb;
    if (!d.chest) { d.chest = true; ev.chest = rollLoot('chest'); }
  } else if (!perfect && d.pb) { gain(-d.pb); ev.perfect = -d.pb; d.pb = 0; }
  if (after && !before) { SFX.done(); buzz(15); } else if (!after && before) SFX.undo(); else SFX.tick();

  persist(); D = null;
  render();
  if (ev.xp) floatXP(rid, ev.xp);
  if (ev.loot) queue({ type: 'loot', item: ev.loot, src: 'rite', rite: r });
  if (ev.perfect > 0) queue({ type: 'loot', item: ev.chest, src: 'chest', xp: ev.perfect });
  postCheck();
}
function postCheck() {
  const L = lvl(S.xp).L;
  if (L > S.maxLevel) { const from = S.maxLevel; S.maxLevel = L; queue({ type: 'level', L, from }); persist(); }
  checkAch();
}

/* ---------------- derived stats ---------------- */
function derive() {
  if (D) return D;
  const T = dayKey(), keys = Object.keys(S.days).filter(k => S.days[k]).sort();
  const first = keys[0] && keys[0] < T ? keys[0] : T, d30 = addDays(T, -29);
  const out = { rite: {}, perfect: { total: 0, best: 0, cur: 0 }, anyDays: 0, anyDone: 0, vacSets: 0, level: lvl(S.xp).L };
  RITES.forEach(r => out.rite[r.id] = { total: 0, best: 0, cur: 0, last30: 0, trained: 0 });
  const run = Object.fromEntries(RITES.map(r => [r.id, 0])); let prun = 0, guard = 0;
  for (let k = first; k <= T && guard < 4000; k = addDays(k, 1), guard++) {
    const d = S.days[k]; let all = true, any = false;
    RITES.forEach(r => {
      const h = d?.h?.[r.id], ok = isDone(h), o = out.rite[r.id];
      if (r.id === 'vacuums' && h) out.vacSets += (h.v || 0);
      if (ok) { o.total++; run[r.id]++; o.best = Math.max(o.best, run[r.id]); any = true; if (k >= d30) o.last30++; if (r.id === 'workout' && h.done) o.trained++; }
      else { all = false; if (k !== T) run[r.id] = 0; }
    });
    if (any) { out.anyDays++; out.anyDone++; }
    if (all) { out.perfect.total++; prun++; out.perfect.best = Math.max(out.perfect.best, prun); } else if (k !== T) prun = 0;
  }
  RITES.forEach(r => { out.rite[r.id].cur = run[r.id]; });
  out.perfect.cur = prun;
  D = out; return out;
}
function attrs() {
  const dd = derive(), base = {}, gear = {};
  ATTRS.forEach(a => { const rs = RITES.filter(r => r.attr === a.id); const c = rs.reduce((s, r) => s + dd.rite[r.id].total, 0); base[a.id] = 5 + Math.floor(c / (4 * rs.length)); gear[a.id] = 0; });
  equippedList().forEach(it => { for (const k in it.st) gear[k] = (gear[k] || 0) + it.st[k]; });
  return { base, gear };
}

/* ---------------- achievements ---------------- */
const ACH = [
  { id: 'initium', n: 'Initium', d: 'Fulfil your first rite.', g: 'star', t: x => x.anyDone >= 1 },
  { id: 'perfectus', n: 'Dies Perfectus', d: 'Keep every rite in a single day.', g: 'lozenge', t: x => x.perfect.total >= 1, title: 'perfectus', bg: 'cathedra' },
  { id: 'triduum', n: 'Triduum', d: 'Three perfect days in a row.', g: 'flame', t: x => x.perfect.best >= 3, p: x => [x.perfect.best, 3] },
  { id: 'hebdomas', n: 'Hebdomas', d: 'Seven perfect days in a row.', g: 'flame', t: x => x.perfect.best >= 7, p: x => [x.perfect.best, 7], title: 'constans' },
  { id: 'mensis', n: 'Mensis Ferreus', d: 'Thirty perfect days in a row.', g: 'flame', t: x => x.perfect.best >= 30, p: x => [x.perfect.best, 30], title: 'ferreus', bg: 'ignis' },
  { id: 'centuria', n: 'Centuria', d: 'A hundred perfect days in a row.', g: 'crown', t: x => x.perfect.best >= 100, p: x => [x.perfect.best, 100], title: 'stella' },
  { id: 'gradus5', n: 'Gradus V', d: 'Reach level 5.', g: 'shield', t: x => x.level >= 5, p: x => [x.level, 5], title: 'acolytus' },
  { id: 'gradus10', n: 'Gradus X', d: 'Reach level 10.', g: 'shield', t: x => x.level >= 10, p: x => [x.level, 10], title: 'templarius', bg: 'sanguis' },
  { id: 'gradus20', n: 'Gradus XX', d: 'Reach level 20.', g: 'shield', t: x => x.level >= 20, p: x => [x.level, 20], title: 'inquisitor' },
  { id: 'gradus30', n: 'Gradus XXX', d: 'Reach level 30.', g: 'shield', t: x => x.level >= 30, p: x => [x.level, 30], title: 'archon', bg: 'abyssus' },
  { id: 'gradus40', n: 'Gradus XL', d: 'Reach level 40.', g: 'crown', t: x => x.level >= 40, p: x => [x.level, 40], title: 'dominus' },
  { id: 'ferrum', n: 'Ferrum', d: 'Train thirty times.', g: 'sword', t: x => x.rite.workout.trained >= 30, p: x => [x.rite.workout.trained, 30], title: 'frater' },
  { id: 'proelia', n: 'Centum Proelia', d: 'Train a hundred times.', g: 'sword', t: x => x.rite.workout.trained >= 100, p: x => [x.rite.workout.trained, 100], title: 'bellator' },
  { id: 'caro', n: 'Caro', d: 'Hit protein on thirty days.', g: 'meat', t: x => x.rite.protein.total >= 30, p: x => [x.rite.protein.total, 30], title: 'carnifex' },
  { id: 'mensura', n: 'Mensura', d: 'Hit calories on thirty days.', g: 'flame', t: x => x.rite.calories.total >= 30, p: x => [x.rite.calories.total, 30], title: 'temperans' },
  { id: 'fons', n: 'Fons', d: 'Drink 4 L on thirty days.', g: 'drop', t: x => x.rite.water.total >= 30, p: x => [x.rite.water.total, 30], title: 'custos' },
  { id: 'vacuum', n: 'Vacuum', d: 'Hold a hundred vacuum sets.', g: 'hourglass', t: x => x.vacSets >= 100, p: x => [x.vacSets, 100], title: 'asceta' },
  { id: 'silentium', n: 'Silentium', d: 'Phone out by 23:00 on thirty nights.', g: 'key', t: x => x.rite.phone.total >= 30, p: x => [x.rite.phone.total, 30], title: 'vigil' },
  { id: 'somnus', n: 'Somnus', d: 'Sleep 7h30 on thirty nights.', g: 'moon', t: x => x.rite.sleep.total >= 30, p: x => [x.rite.sleep.total, 30], title: 'somniator', bg: 'nox' },
  { id: 'pondus', n: 'Pondus', d: 'Weigh in on thirty days.', g: 'scale', t: x => x.rite.weight.total >= 30, p: x => [x.rite.weight.total, 30], title: 'mensor' },
  { id: 'aerarium', n: 'Aerarium', d: 'Log your balance on thirty days.', g: 'coin', t: x => x.rite.bank.total >= 30, p: x => [x.rite.bank.total, 30], title: 'quaestor' },
  { id: 'spolia', n: 'Spolia', d: 'Find a rare item.', g: 'chest', t: () => S.counters.rar[1] + S.counters.rar[2] + S.counters.rar[3] >= 1 },
  { id: 'sacra', n: 'Res Sacra', d: 'Find an epic item.', g: 'eye', t: () => S.counters.rar[2] + S.counters.rar[3] >= 1 },
  { id: 'aureum', n: 'Aureum', d: 'Find a legendary item.', g: 'crown', t: () => S.counters.rar[3] >= 1, bg: 'aurum' },
  { id: 'armatura', n: 'Armatura', d: 'Fill all ten equipment slots.', g: 'shield', t: () => SLOTS.every(s => S.eq[s.id]), title: 'miles' },
  { id: 'gloria', n: 'Gloria', d: 'Wear ten legendaries at once.', g: 'crown', t: () => equippedList().filter(i => i.r === 3).length >= 10, p: () => [equippedList().filter(i => i.r === 3).length, 10], title: 'sanctvs' },
  { id: 'avarus', n: 'Avarus', d: 'Own fifty items.', g: 'coin', t: () => S.inv.length >= 50, p: () => [S.inv.length, 50], title: 'avarus' },
  { id: 'cinis', n: 'Cinis', d: 'Salvage twenty-five items.', g: 'skull', t: () => S.counters.salvaged >= 25, p: () => [S.counters.salvaged, 25], title: 'cinerarius' },
];
function checkAch() {
  const x = derive(); let changed = false;
  ACH.forEach(a => {
    if (S.ach[a.id]) return;
    if (a.t(x)) {
      S.ach[a.id] = dayKey(); changed = true;
      if (a.title && !S.titles.includes(a.title)) S.titles.push(a.title);
      if (a.bg && !S.bgs.includes(a.bg)) S.bgs.push(a.bg);
      queue({ type: 'ach', a });
    }
  });
  if (changed) { persist(); render(); }
}

/* =========================================================
   RENDERING
   ========================================================= */
function renderHeader() {
  const d = new Date();
  $('#date').innerHTML = `<b>${LAT_DAYS[d.getDay()]}</b><span>${d.getDate()} ${MONTHS[d.getMonth()]} ${roman(d.getFullYear())}</span>`;
  const day = S.days[todayK], n = RITES.filter(r => isDone(day?.h?.[r.id])).length;
  $('#rites-badge').textContent = n < RITES.length ? String(RITES.length - n) : '';
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
}
function render() {
  if (!S) return;
  renderHeader();
  $$('.view').forEach(v => v.hidden = v.id !== 'v-' + view);
  ({ sheet: renderSheet, rites: renderRites, vault: renderVault, sigilla: renderSigilla, annales: renderAnnales })[view]();
}

/* ---- Character sheet ---- */
function slotBtn(s) {
  const it = S.eq[s.id] ? itemById(S.eq[s.id]) : null;
  return `<button class="slot ${it ? 'r' + it.r : 'empty'}" data-slot="${s.id}" aria-label="${s.n}${it ? ': ' + esc(it.name) : ' (empty)'}">${it ? `<img src="${itemIcon(it)}" alt="">` : `<span class="sl">${s.la}</span>`}</button>`;
}
function renderSheet() {
  const L = lvl(S.xp), A = attrs(), dd = derive(), t = TITLES[S.title] || TITLES.novitius;
  const vals = ATTRS.map(a => A.base[a.id] + A.gear[a.id]), mx = Math.max(20, ...vals), grav = vals.reduce((a, b) => a + b, 0);
  const day = S.days[todayK], doneN = RITES.filter(r => isDone(day?.h?.[r.id])).length;
  $('#v-sheet').innerHTML = `
  <div class="sheet-wrap">
    <div>
      <div class="panel idbar">
        <div class="who"><div class="name">${esc(S.name)}</div><div class="ttl">${esc(t[0])} <span>— ${esc(t[1])}</span></div></div>
        <div class="lvl" title="Level ${L.L}"><span class="n">${roman(L.L)}</span><small>Gradus</small></div>
      </div>
      <div class="xpbar" role="progressbar" aria-valuenow="${L.into}" aria-valuemax="${L.need}"><div class="fill" style="width:${(L.into / L.need * 100).toFixed(1)}%"></div><span>${fmtNum(L.into)} / ${fmtNum(L.need)} XP</span></div>
      <div class="sheet-grid">
        <div class="slots">${SLOTS.filter(s => s.side === 'L').map(slotBtn).join('')}</div>
        <div class="stage">${stageMarkup()}<div class="grav"><span>Gravitas</span> ${grav}</div></div>
        <div class="slots">${SLOTS.filter(s => s.side === 'R').map(slotBtn).join('')}</div>
      </div>
      <button class="panel hodie" data-go="rites">
        <span class="pips">${RITES.map(r => `<span class="pip ${isDone(day?.h?.[r.id]) ? 'on' : ''}" title="${r.n}">${I(r.g)}</span>`).join('')}</span>
        <span class="cnt"><b>${doneN}<i>/${RITES.length}</i></b>rites today</span>
      </button>
    </div>
    <div class="panel statpanel">
      <h3>Attributa</h3>
      ${ATTRS.map(a => `<div class="attr"><span class="ab">${a.ab}</span><span class="an">${a.n}<small>${a.en}</small></span><span class="av">${A.base[a.id] + A.gear[a.id]}${A.gear[a.id] ? `<small>+${A.gear[a.id]} gear</small>` : ''}</span>
        <div class="bar"><i style="width:${A.base[a.id] / mx * 100}%"></i><i class="g" style="left:${A.base[a.id] / mx * 100}%;width:${A.gear[a.id] / mx * 100}%"></i></div></div>`).join('')}
      <div class="records">
        <div class="rec"><small>Perfect streak</small><b>${dd.perfect.cur} <em>best ${dd.perfect.best}</em></b></div>
        <div class="rec"><small>Perfect days</small><b>${dd.perfect.total}</b></div>
        <div class="rec"><small>Total XP</small><b>${fmtNum(S.xp)}</b></div>
        <div class="rec"><small>Days kept</small><b>${dd.anyDays}</b></div>
        <div class="rec"><small>Items found</small><b>${S.counters.drops}</b></div>
        <div class="rec"><small>Cinis</small><b>${S.cinis}</b></div>
      </div>
    </div>
  </div>`;
}

/* ---- Rites ---- */
function riteCard(r, h, k) {
  const done = isDone(h), s = S.settings;
  const xpShow = done && h.xp ? h.xp : riteXP(r, k, false);
  let ctl = '';
  switch (r.type) {
    case 'check': {
      ctl = `<button class="btn ${h.done ? 'on' : 'primary'}" data-act="toggle">${h.done ? '✓ Fulfilled' : 'Fulfil'}</button>`;
      if (r.id === 'workout') { const used = weekRestUsed(k, k); ctl += `<button class="btn ${h.rest ? 'on' : 'ghost'}" data-act="rest" ${!h.rest && used >= 2 ? 'disabled' : ''}>Rest day · ${used + (h.rest ? 1 : 0)}/2</button>`; }
      break;
    }
    case 'num': {
      const T = target(r), v = h.v ?? 0;
      let pct, cls = done ? 'done' : '';
      if (r.mode === 'cal') { const top = s.calMode === 'range' ? T + s.calTol : T; pct = clamp(v / (top * 1.1) * 100, 0, 100); if (v > top && s.calMode !== 'min') cls = 'over'; }
      else pct = clamp(v / T * 100, 0, 100);
      const tick = r.mode === 'cal' ? `<span class="tick" style="left:${clamp(T / ((s.calMode === 'range' ? T + s.calTol : T) * 1.1) * 100, 0, 100)}%"></span>` : '';
      ctl = `<div class="meter ${cls}"><i style="width:${pct}%"></i>${tick}</div>
        <div class="inrow"><input class="numin" type="number" inputmode="decimal" step="${r.step}" min="0" value="${h.v ?? ''}" placeholder="0" data-act="set" aria-label="${r.n} total"><span class="unit">/ ${r.mode === 'cal' ? fmtNum(T) : T} ${r.unit}</span></div>
        <div class="chips">${r.quick.map(q => `<button class="chip" data-act="add" data-n="${q}">+${q}</button>`).join('')}${h.v != null ? '<button class="chip x" data-act="clear" aria-label="Clear">✕</button>' : ''}</div>`;
      break;
    }
    case 'sleep': {
      const T = s.sleep;
      ctl = `<div class="meter ${done ? 'done' : ''}"><i style="width:${clamp((h.v || 0) / T * 100, 0, 100)}%"></i></div>
        <div class="inrow"><input class="numin" type="text" inputmode="decimal" value="${fmtSleep(h.v)}" placeholder="7h30" data-act="sleep" aria-label="Hours slept"></div>
        <div class="chips">${[6.5, 7, 7.5, 8].map(q => `<button class="chip ${h.v === q ? 'on' : ''}" data-act="setv" data-n="${q}">${fmtSleep(q)}</button>`).join('')}${h.v != null ? '<button class="chip x" data-act="clear" aria-label="Clear">✕</button>' : ''}</div>`;
      break;
    }
    case 'sets': {
      const v = h.v || 0;
      ctl = `<div class="setpips">${Array.from({ length: r.sets }, (_, i) => `<button class="setpip ${i < v ? 'on' : ''}" data-act="sets" data-n="${i + 1}" aria-label="Set ${i + 1}"><span>${roman(i + 1)}</span></button>`).join('')}</div>`;
      break;
    }
    case 'log': {
      const prev = prevLog(r.id, k), priv = r.priv && s.hideBank;
      let sub = '';
      if (prev) {
        const delta = h.v != null ? h.v - prev.v : null;
        sub = `<div class="sub-line">Previous <b class="${priv ? 'blurme' : ''}">${fmtNum(prev.v, r.dp)} ${r.unit}</b> <span class="muted">· ${prev.k.slice(8)}/${prev.k.slice(5, 7)}</span>${delta != null && delta !== 0 ? ` · <span class="${priv ? 'blurme ' : ''}${(r.id === 'weight' ? delta > 0 : delta < 0) ? 'up' : 'down'}">${delta > 0 ? '+' : ''}${fmtNum(delta, r.dp)}</span>` : ''}</div>`;
      }
      ctl = `<div class="inrow ${priv ? 'priv' : ''}"><input class="numin" type="number" inputmode="decimal" step="${r.step}" value="${h.v ?? ''}" placeholder="—" data-act="log" aria-label="${r.n}"><span class="unit">${r.unit}</span>
        <button class="btn small ${done ? 'on' : 'primary'}" data-act="logsave">${done ? '✓ Inscribed' : 'Inscribe'}</button>
        ${h.v != null ? '<button class="chip x" data-act="clear" aria-label="Clear">✕</button>' : ''}</div>${sub}`;
      break;
    }
  }
  return `<article class="panel rite ${done ? 'done' : ''}" data-rid="${r.id}">
    <div class="rite-ic">${I(r.g)}</div>
    <div class="rite-main">
      <div class="rite-top"><h3>${r.n}</h3><span class="lat">${r.la}</span><span class="xp">${done ? '+' + xpShow : xpShow} XP</span></div>
      <div class="rite-target">${targetText(r)}</div>
      <div class="rite-ctl">${ctl}</div>
    </div></article>`;
}
function prevLog(rid, k) { for (let i = 1; i < 400; i++) { const kk = addDays(k, -i); const v = S.days[kk]?.h?.[rid]?.v; if (v != null && v !== '') return { k: kk, v }; } return null; }
const ritesKey = () => ritesDay === 'today' ? todayK : addDays(todayK, -1);
function renderRites() {
  const k = ritesKey(), d = S.days[k] || { h: {} }, n = RITES.filter(r => isDone(d.h[r.id])).length;
  $('#v-rites').innerHTML = `
    <div class="vh"><h2>Ritus</h2><span class="sub">The daily rites</span>
      <div class="daysw"><button class="chip ${ritesDay === 'today' ? 'on' : ''}" data-day="today">Hodie</button><button class="chip ${ritesDay === 'yday' ? 'on' : ''}" data-day="yday">Heri</button></div></div>
    <div class="panel progress-strip ${d.pb ? 'perfect' : ''}">
      <div class="pcount"><b>${n}<i>/${RITES.length}</i></b><small>${ritesDay === 'today' ? 'Today' : 'Yesterday'}</small></div>
      <div class="seg">${RITES.map(r => `<i class="${isDone(d.h[r.id]) ? 'on' : ''}" title="${r.n}"></i>`).join('')}</div>
    </div>
    ${d.pb ? `<div class="panel perfect-banner">${I('lozenge')}<div><span class="t">Dies Perfectus</span><small>All rites kept · +${d.pb} XP bonus${d.chest ? ' · tribute claimed' : ''}</small></div></div>` : ''}
    <div class="rite-list">${RITES.map(r => riteCard(r, d.h[r.id] || {}, k)).join('')}</div>`;
}
function floatXP(rid, x) {
  const card = $(`.rite[data-rid="${rid}"]`); if (!card) return;
  const f = document.createElement('span'); f.className = 'float-xp' + (x < 0 ? ' neg' : ''); f.textContent = (x > 0 ? '+' : '') + x + ' XP';
  card.appendChild(f); setTimeout(() => f.remove(), 1400);
}
function onRitesClick(e) {
  const dayBtn = e.target.closest('[data-day]');
  if (dayBtn) { ritesDay = dayBtn.dataset.day; render(); return; }
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'INPUT') return;
  const card = b.closest('.rite'), rid = card.dataset.rid, k = ritesKey(), act = b.dataset.act, n = parseFloat(b.dataset.n);
  switch (act) {
    case 'toggle': commit(k, rid, h => { h.done = !h.done; if (h.done) h.rest = false; }); break;
    case 'rest': commit(k, rid, h => { h.rest = !h.rest; if (h.rest) h.done = false; }); break;
    case 'add': commit(k, rid, h => { h.v = Math.round(((h.v || 0) + n) * 100) / 100; }); break;
    case 'setv': commit(k, rid, h => { h.v = h.v === n ? null : n; }); break;
    case 'clear': commit(k, rid, h => { h.v = null; }); break;
    case 'sets': commit(k, rid, h => { h.v = (h.v || 0) === n ? n - 1 : n; }); break;
    case 'logsave': {
      const inp = $('input[data-act="log"]', card), v = inp.value === '' ? null : parseFloat(inp.value);
      if (v == null && !isDone(getDay(k).h[rid])) { inp.focus(); return; }
      commit(k, rid, h => { h.v = (v == null || isNaN(v)) ? null : v; }); break;
    }
  }
}
function onRitesChange(e) {
  const inp = e.target; if (inp.tagName !== 'INPUT') return;
  const card = inp.closest('.rite'); if (!card) return;
  const rid = card.dataset.rid, k = ritesKey(), act = inp.dataset.act;
  if (act === 'set' || act === 'log') { const v = inp.value === '' ? null : parseFloat(inp.value); commit(k, rid, h => { h.v = (v == null || isNaN(v)) ? null : Math.max(act === 'set' ? 0 : -1e12, v); }); }
  if (act === 'sleep') { const v = parseSleep(inp.value); commit(k, rid, h => { h.v = v == null ? null : clamp(v, 0, 24); }); }
}

/* ---- Vault ---- */
function renderVault() {
  const p = S.pity, eqIds = new Set(Object.values(S.eq).filter(Boolean));
  let list = [...S.inv];
  if (vaultFilter !== 'all') list = list.filter(i => i.slot === vaultFilter);
  list.sort((a, b) => b.r - a.r || (b.found > a.found ? 1 : b.found < a.found ? -1 : 0));
  const salvageable = S.inv.filter(i => i.r === 0 && !i.lock && !eqIds.has(i.id)).length;
  $('#v-vault').innerHTML = `
    <div class="vh"><h2>Arca</h2><span class="sub">The vault · ${S.inv.length} items</span></div>
    <div class="vault-head">
      <div class="panel fate">
        <h3>Fatum</h3><p>Each rite tempts fate once a day. Fate remembers ill fortune.</p>
        <div class="fate-row"><span style="color:var(--r2)">Epic+</span><div class="fbar"><i style="width:${p.epic / LOOT.epicPity * 100}%;background:var(--r2)"></i></div><span>within ${LOOT.epicPity - p.epic}</span></div>
        <div class="fate-row"><span style="color:var(--r3)">Legendary</span><div class="fbar"><i style="width:${p.leg / LOOT.legHard * 100}%;background:var(--r3)"></i></div><span>within ${LOOT.legHard - p.leg}</span></div>
        <div class="fate-row"><span>Any drop</span><div class="fbar"><i style="width:${p.drop / LOOT.dryCap * 100}%;background:var(--crimson)"></i></div><span>≤ ${LOOT.dryCap + 1 - p.drop} rites</span></div>
      </div>
      <div class="panel forge">
        <h3>Fornax</h3><p>Burn what you won’t wear into Cinis. ${LOOT.forgeCost} Cinis forges an item of rare make or better.</p>
        <div class="cin">${S.cinis} <small>Cinis</small></div>
        <div class="row">
          <button class="btn goldb" data-act="forge" ${S.cinis < LOOT.forgeCost ? 'disabled' : ''}>Forge · ${LOOT.forgeCost}</button>
          <button class="btn ghost" data-act="burn" ${salvageable ? '' : 'disabled'}>Burn commons (${salvageable})</button>
        </div>
      </div>
    </div>
    <div class="filters">
      <button class="chip ${vaultFilter === 'all' ? 'on' : ''}" data-f="all">All</button>
      ${SLOTS.map(s => `<button class="chip ${vaultFilter === s.id ? 'on' : ''}" data-f="${s.id}">${s.n}</button>`).join('')}
    </div>
    ${list.length ? `<div class="inv">${list.map(it => `<button class="card r${it.r}" data-item="${it.id}">
        ${eqIds.has(it.id) ? '<span class="eqd">Worn</span>' : ''}${it.lock ? `<span class="lk">${I('lock')}</span>` : ''}
        <img src="${itemIcon(it)}" alt="" loading="lazy"><span class="nm">${esc(it.name)}</span></button>`).join('')}</div>`
      : `<div class="empty"><span class="t">Vacua</span>Nothing here yet. Keep your rites — the spoils will follow.</div>`}`;
}
function onVaultClick(e) {
  const f = e.target.closest('[data-f]'); if (f) { vaultFilter = f.dataset.f; render(); return; }
  const c = e.target.closest('[data-item]'); if (c) { openItem(c.dataset.item); return; }
  const a = e.target.closest('[data-act]'); if (!a) return;
  if (a.dataset.act === 'forge' && S.cinis >= LOOT.forgeCost) {
    SFX.init(); S.cinis -= LOOT.forgeCost; S.counters.forged++; const it = rollLoot('forge'); persist(); D = null; render(); queue({ type: 'loot', item: it, src: 'forge' }); postCheck();
  }
  if (a.dataset.act === 'burn') {
    const eqIds = new Set(Object.values(S.eq).filter(Boolean)), list = S.inv.filter(i => i.r === 0 && !i.lock && !eqIds.has(i.id));
    if (!list.length || !confirm(`Burn ${list.length} unlocked common item${list.length > 1 ? 's' : ''} for ${list.length} Cinis?`)) return;
    list.forEach(i => salvage(i.id, true)); persist(); render(); toast(`+${list.length} Cinis`); checkAch();
  }
}
function salvage(id, quiet) {
  const it = itemById(id); if (!it || Object.values(S.eq).includes(id) || it.lock) return;
  S.inv = S.inv.filter(i => i.id !== id); S.cinis += RAR[it.r].salv; S.counters.salvaged++; iconCache.delete(id);
  if (!quiet) { persist(); toast(`Burned · +${RAR[it.r].salv} Cinis`); checkAch(); }
}

/* ---- Drawer: item details & equip picker ---- */
function openDrawer(html) { $('#drawer-panel').innerHTML = html; $('#drawer').hidden = false; }
function closeDrawer() { $('#drawer').hidden = true; $('#drawer-panel').innerHTML = ''; }
function diffLine(it) {
  const cur = S.eq[it.slot] && S.eq[it.slot] !== it.id ? itemById(S.eq[it.slot]) : null;
  if (!cur) return statLine(it.st);
  return ATTRS.map(a => { const dlt = (it.st[a.id] || 0) - (cur.st[a.id] || 0); if (!it.st[a.id] && !dlt) return ''; return `<span class="${dlt > 0 ? 'up' : dlt < 0 ? 'dn' : ''}"><b>+${it.st[a.id] || 0}</b> ${a.ab}${dlt ? ` (${dlt > 0 ? '+' : ''}${dlt})` : ''}</span>`; }).join('');
}
function openItem(id) {
  const it = itemById(id); if (!it) return;
  const worn = S.eq[it.slot] === it.id, R = RAR[it.r];
  openDrawer(`
    <div class="dh"><h2>${SLOT[it.slot].la}</h2><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="item-hero"><div class="frame r${it.r}"><img src="${itemIcon(it)}" alt=""></div>
      <div><div class="rlabel" style="color:${R.c}">${R.la} · ${R.en} · ${SLOT[it.slot].n}</div><div class="iname">${esc(it.name)}</div>${it.sub ? `<div class="isub">${esc(it.sub)}</div>` : ''}</div></div>
    <div class="istats">${diffLine(it)}</div>
    ${it.flavor ? `<div class="flav">“${esc(it.flavor)}”</div>` : ''}
    <div class="note">Found ${it.found}${worn ? ' · currently worn' : ''}</div>
    <div class="dactions">
      ${worn ? `<button class="btn" data-iact="unequip">Unequip</button>` : `<button class="btn primary" data-iact="equip">Equip</button>`}
      <button class="btn ghost" data-iact="lock">${I('lock')} ${it.lock ? 'Locked' : 'Lock'}</button>
      <button class="btn ghost" data-iact="salvage" ${worn || it.lock ? 'disabled' : ''}>Burn · +${R.salv}</button>
    </div>`);
  $('#drawer-panel').dataset.item = id;
}
function openSlot(slotId) {
  const s = SLOT[slotId], list = S.inv.filter(i => i.slot === slotId).sort((a, b) => b.r - a.r), cur = S.eq[slotId];
  openDrawer(`
    <div class="dh"><h2>${s.la}</h2><span class="dsub">${s.n}</span><button class="x" data-close aria-label="Close">✕</button></div>
    ${list.length ? `<div class="equip-list">${list.map(it => `<button class="erow r${it.r} ${cur === it.id ? 'cur' : ''}" data-pick="${it.id}">
        <img src="${itemIcon(it)}" alt=""><div><div class="en" style="color:${RAR[it.r].c}">${esc(it.name)}</div><div class="es">${ATTRS.filter(a => it.st[a.id]).map(a => `+${it.st[a.id]} ${a.ab}`).join(' · ')}</div></div>
        <span class="tag">${cur === it.id ? 'Worn' : 'Equip'}</span></button>`).join('')}</div>
      ${cur ? `<div class="dactions"><button class="btn ghost" data-unequip="${slotId}">Leave slot empty</button></div>` : ''}`
      : `<div class="empty"><span class="t">Vacuum</span>Nothing for the ${s.n.toLowerCase()} yet. Keep your rites.</div>`}`);
}
function onDrawerClick(e) {
  if (e.target.closest('[data-close]')) { closeDrawer(); return; }
  const pk = e.target.closest('[data-pick]');
  if (pk) { const it = itemById(pk.dataset.pick); S.eq[it.slot] = S.eq[it.slot] === it.id ? null : it.id; gearChanged(); closeDrawer(); return; }
  const ue = e.target.closest('[data-unequip]'); if (ue) { S.eq[ue.dataset.unequip] = null; gearChanged(); closeDrawer(); return; }
  const ia = e.target.closest('[data-iact]'); if (!ia) return;
  const id = $('#drawer-panel').dataset.item, it = itemById(id); if (!it) return;
  switch (ia.dataset.iact) {
    case 'equip': S.eq[it.slot] = it.id; gearChanged(); closeDrawer(); toast(`Equipped · ${it.name}`); break;
    case 'unequip': S.eq[it.slot] = null; gearChanged(); closeDrawer(); break;
    case 'lock': it.lock = !it.lock; persist(); openItem(id); render(); break;
    case 'salvage': salvage(id); closeDrawer(); render(); break;
  }
}
function gearChanged() { SFX.init(); SFX.tick(); persist(); render(); checkAch(); }

/* ---- Sigilla ---- */
function renderSigilla() {
  const x = derive(), got = ACH.filter(a => S.ach[a.id]).length;
  $('#v-sigilla').innerHTML = `
    <div class="vh"><h2>Sigilla</h2><span class="sub">Seals · ${got} of ${ACH.length}</span></div>
    <div class="sig-grid">${ACH.map(a => { const on = !!S.ach[a.id], pg = !on && a.p ? a.p(x) : null;
      return `<div class="seal ${on ? '' : 'lock'}"><img src="${Art.seal(a.g, on)}" alt=""><span class="sn">${a.n}</span><span class="sd">${a.d}</span>
        ${on ? `<span class="pg">${S.ach[a.id]}</span>` : pg ? `<span class="pg">${Math.min(pg[0], pg[1])} / ${pg[1]}</span>` : ''}</div>`; }).join('')}</div>
    <div class="sec-h"><h3>Tituli</h3><small>Titles · ${S.titles.length} of ${Object.keys(TITLES).length}</small></div>
    <div class="titles">${Object.entries(TITLES).map(([id, [la, en]]) => { const own = S.titles.includes(id), src = ACH.find(a => a.title === id);
      return `<button class="title-chip ${S.title === id ? 'on' : ''} ${own ? '' : 'lock'}" data-title="${id}" ${own ? '' : 'disabled'}><b>${own ? la : '· · ·'}</b><small>${own ? en : (src ? 'Seal: ' + src.n : '')}</small></button>`; }).join('')}</div>
    <div class="sec-h"><h3>Loci</h3><small>Backgrounds · ${S.bgs.length} of ${Object.keys(SCENES).length}</small></div>
    <div class="bg-grid">${Object.entries(SCENES).map(([id, b]) => { const own = S.bgs.includes(id);
      return `<button class="bgc ${S.bg === id ? 'on' : ''} ${own ? '' : 'lock'}" data-bg="${id}" ${own ? '' : 'disabled'}><img src="${Art.sceneThumb(id)}" alt=""><div><b>${b.n}</b><small>${own ? b.en : b.how}</small></div></button>`; }).join('')}</div>`;
}
function onSigillaClick(e) {
  const t = e.target.closest('[data-title]'); if (t && S.titles.includes(t.dataset.title)) { S.title = t.dataset.title; SFX.init(); SFX.tick(); persist(); render(); toast(`Title · ${TITLES[S.title][0]}`); return; }
  const b = e.target.closest('[data-bg]'); if (b && S.bgs.includes(b.dataset.bg)) { S.bg = b.dataset.bg; SFX.init(); SFX.tick(); persist(); render(); toast(`Background · ${SCENES[S.bg].n}`); }
}

/* ---- Annales ---- */
function lineChart(points, color, dp, unit) {
  if (points.length < 2) return `<div class="empty small">Log at least two days to draw the line.</div>`;
  const W = 320, H = 110, P = 6, vs = points.map(p => p.v), mn = Math.min(...vs), mx = Math.max(...vs), span = mx - mn || 1;
  const xs = i => P + i / (points.length - 1) * (W - 2 * P), ys = v => H - P - (v - mn) / span * (H - 2 * P);
  const pts = points.map((p, i) => `${xs(i).toFixed(1)},${ys(p.v).toFixed(1)}`).join(' ');
  const area = `${xs(0).toFixed(1)},${H} ${pts} ${xs(points.length - 1).toFixed(1)},${H}`;
  const gid = 'cg' + Math.random().toString(36).slice(2, 7);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="trend">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <line x1="0" x2="${W}" y1="${ys(mx)}" y2="${ys(mx)}" stroke="#3a2c22" stroke-dasharray="2 4"/><line x1="0" x2="${W}" y1="${ys(mn)}" y2="${ys(mn)}" stroke="#3a2c22" stroke-dasharray="2 4"/>
    <polygon points="${area}" fill="url(#${gid})"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>
    <div class="chart-meta"><span>min ${fmtNum(mn, dp)} ${unit}</span><span>max ${fmtNum(mx, dp)} ${unit}</span></div>`;
}
function series(rid, n = 90) { const out = []; for (let i = n - 1; i >= 0; i--) { const k = addDays(todayK, -i), v = S.days[k]?.h?.[rid]?.v; if (v != null && v !== '') out.push({ k, v }); } return out; }
function renderAnnales() {
  const x = derive(), weeks = 13;
  const t = parseKey(todayK), wd = (t.getDay() + 6) % 7, start = addDays(todayK, -wd - (weeks - 1) * 7);
  let cells = '';
  for (let row = 0; row < 7; row++) {
    cells += `<span class="dl">${'LMMIVSD'[row]}</span>`;
    for (let w = 0; w < weeks; w++) {
      const k = addDays(start, w * 7 + row), d = S.days[k];
      if (k > todayK) { cells += `<i class="fut"></i>`; continue; }
      const n = d ? RITES.filter(r => isDone(d.h[r.id])).length : 0;
      const col = !n ? '' : d.pb ? 'background:var(--gold)' : `background:rgba(185,32,34,${(.2 + .8 * n / RITES.length).toFixed(2)})`;
      cells += `<i class="${n ? 'f' : ''} ${k === todayK ? 'today' : ''}" style="${col}" title="${k}: ${n}/${RITES.length}"></i>`;
    }
  }
  const w = series('weight'), b = series('bank'), wl = w[w.length - 1], bl = b[b.length - 1], hide = S.settings.hideBank;
  const w7 = w.filter(p => p.k >= addDays(todayK, -6));
  const avg = a => a.reduce((s, p) => s + p.v, 0) / a.length;
  $('#v-annales').innerHTML = `
    <div class="vh"><h2>Annales</h2><span class="sub">The chronicle</span></div>
    <div class="ann-grid">
      <div class="panel pane"><h3>Calendarium</h3><div class="ps">Last ${weeks} weeks · gold marks a perfect day</div>
        <div class="heat" style="--w:${weeks}">${cells}</div>
        <div class="legend">none <i style="background:#1c1513"></i><i style="background:rgba(185,32,34,.35)"></i><i style="background:rgba(185,32,34,.7)"></i><i style="background:rgba(185,32,34,1)"></i><i style="background:var(--gold)"></i> perfect</div></div>
      <div class="panel pane"><h3>Ritus</h3><div class="ps">Streaks & constancy</div>
        <table class="rtable"><thead><tr><th>Rite</th><th>Streak</th><th>Best</th><th>Total</th><th>30d</th></tr></thead><tbody>
        ${RITES.map(r => { const o = x.rite[r.id]; return `<tr><td>${I(r.g)}${r.n.replace(' by 23:00', '')}</td><td class="${o.cur >= 7 ? 'hot' : ''}">${o.cur}</td><td>${o.best}</td><td>${o.total}</td><td>${Math.round(o.last30 / 30 * 100)}%</td></tr>`; }).join('')}
        </tbody></table></div>
      <div class="panel pane"><h3>Pondus</h3><div class="ps">Weight · last 90 days</div>
        <div class="chart-head"><b>${wl ? fmtNum(wl.v, 1) + ' kg' : '—'}</b><span>${w7.length ? '7-day mean ' + fmtNum(avg(w7), 1) + ' kg' : ''}</span></div>
        ${lineChart(w, '#d9b45e', 1, 'kg')}</div>
      <div class="panel pane"><h3>Aerarium</h3><div class="ps">Bank balance · last 90 days</div>
        <div class="priv-wrap ${hide ? '' : 'reveal'}" id="bank-wrap">
          <div class="blurme"><div class="chart-head"><b>${bl ? fmtNum(bl.v, 2) + ' €' : '—'}</b><span>${b.length > 1 ? (b[b.length - 1].v - b[0].v >= 0 ? '+' : '') + fmtNum(b[b.length - 1].v - b[0].v, 2) + ' € over period' : ''}</span></div>
          ${lineChart(b, '#c9443c', 2, '€')}</div>
          ${hide ? '<div class="hint">Tap to reveal</div>' : ''}</div></div>
    </div>`;
}
function onAnnalesClick(e) { const w = e.target.closest('#bank-wrap'); if (w) w.classList.toggle('reveal'); }

/* ---- Settings ---- */
function openSettings() {
  const s = S.settings;
  openDrawer(`
    <div class="dh"><h2>Regula</h2><span class="dsub">Settings</span><button class="x" data-close aria-label="Close">✕</button></div>
    <div class="form" id="settings-form">
      <div class="field"><label>Name</label><input class="txtin" data-k="name" value="${esc(S.name)}" maxlength="24"></div>
      <div class="rule"></div>
      <div class="field"><label>Protein target (g)</label><input class="txtin" type="number" inputmode="numeric" data-k="protein" value="${s.protein}"></div>
      <div class="field"><label>Calorie target (kcal)</label><input class="txtin" type="number" inputmode="numeric" data-k="calories" value="${s.calories}"></div>
      <div class="field"><label>Calories count as kept when…</label><div class="row">
        <button class="chip ${s.calMode === 'range' ? 'on' : ''}" data-cal="range">within ±</button>
        <button class="chip ${s.calMode === 'max' ? 'on' : ''}" data-cal="max">at most</button>
        <button class="chip ${s.calMode === 'min' ? 'on' : ''}" data-cal="min">at least</button>
        ${s.calMode === 'range' ? `<input class="numin" type="number" inputmode="numeric" data-k="calTol" value="${s.calTol}" style="width:84px"><span class="unit">kcal</span>` : ''}</div></div>
      <div class="field"><label>Water target (L)</label><input class="txtin" type="number" inputmode="decimal" step="0.25" data-k="water" value="${s.water}"></div>
      <div class="field"><label>Sleep target</label><input class="txtin" type="text" data-k="sleep" value="${fmtSleep(s.sleep)}"></div>
      <div class="note">Changing a target affects days logged from now on — past days keep their verdict.</div>
      <div class="rule"></div>
      <div class="field"><label>Sound</label><div class="row"><button class="chip ${s.sound ? 'on' : ''}" data-tog="sound">${s.sound ? 'On' : 'Off'}</button></div></div>
      <div class="field"><label>Veil the bank balance</label><div class="row"><button class="chip ${s.hideBank ? 'on' : ''}" data-tog="hideBank">${s.hideBank ? 'On' : 'Off'}</button></div></div>
      <div class="rule"></div>
      <div class="field"><label>Backup</label><div class="row"><button class="btn small" data-sact="export">Export JSON</button><button class="btn small" data-sact="import">Import JSON</button></div>
        <div class="note">Progress lives in this browser (IndexedDB). Export now and then — clearing site data wipes it.</div></div>
      <div class="field"><label>Danger</label><div class="row"><button class="btn small ghost danger" data-sact="reset">Reset everything</button></div></div>
      <div class="colophon"><span class="bl">Ritus</span> · v3 · a Sanctvm work</div>
    </div>`);
}
function onSettingsChange(e) {
  const inp = e.target.closest('[data-k]'); if (!inp) return;
  const k = inp.dataset.k, s = S.settings;
  if (k === 'name') S.name = inp.value.trim() || 'Rui';
  else if (k === 'sleep') { const v = parseSleep(inp.value); if (v) s.sleep = clamp(v, 1, 14); inp.value = fmtSleep(s.sleep); }
  else { const v = parseFloat(inp.value); if (!isNaN(v) && v > 0) s[k] = v; inp.value = s[k]; }
  persist(); render();
}
function onSettingsClick(e) {
  const c = e.target.closest('[data-cal]'); if (c) { S.settings.calMode = c.dataset.cal; persist(); openSettings(); render(); return; }
  const t = e.target.closest('[data-tog]'); if (t) { S.settings[t.dataset.tog] = !S.settings[t.dataset.tog]; persist(); openSettings(); render(); return; }
  const a = e.target.closest('[data-sact]'); if (!a) return;
  if (a.dataset.sact === 'export') {
    flush();
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' }), url = URL.createObjectURL(blob), l = document.createElement('a');
    l.href = url; l.download = `ritus-backup-${todayK}.json`; document.body.appendChild(l); l.click(); l.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  if (a.dataset.sact === 'import') $('#import-file').click();
  if (a.dataset.sact === 'reset') {
    if (!confirm('Erase all progress, items and records? This cannot be undone.')) return;
    if (!confirm('Truly? Export a backup first if you might want it back.')) return;
    S = freshState(); starterKit(S); S.intro = true; iconCache.clear(); stageCache.key = null; D = null; flush(); closeDrawer(); render();
  }
}
async function onImport(e) {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!data || typeof data !== 'object' || !data.days || !Array.isArray(data.inv)) throw new Error('Not a Ritus backup');
    if (!confirm(`Import backup with ${Object.keys(data.days).length} days and ${data.inv.length} items? This replaces your current progress.`)) return;
    S = migrate(data); iconCache.clear(); stageCache.key = null; D = null; flush(); closeDrawer(); render(); toast('Backup restored');
  } catch (err) { alert('Could not import: ' + err.message); }
}

/* =========================================================
   OVERLAYS (queue: loot → level → seals)
   ========================================================= */
const OQ = []; let ovBusy = false;
function queue(o) {
  if (o.type === 'loot' && !o.item) return;
  if (o.type === 'level') { const q = OQ.find(x => x.type === 'level'); if (q) { q.L = o.L; return; } }
  OQ.push(o); if (!ovBusy) nextOverlay();
}
function nextOverlay() {
  const ov = $('#overlay'), o = OQ.shift();
  ov.classList.remove('shake');
  if (!o) { ovBusy = false; ov.hidden = true; ov.innerHTML = ''; return; }
  ovBusy = true; ov.hidden = false;
  if (o.type === 'loot') {
    const it = o.item, R = RAR[it.r];
    const kick = o.src === 'chest' ? `Dies Perfectus · +${o.xp} XP · Tribute` : o.src === 'forge' ? 'Fornax · Forged' : `Spolia · ${o.rite.n}`;
    ov.innerHTML = `<div class="ov-card loot r${it.r}">
      <div class="ov-kicker">${kick}</div>
      <div class="loot-frame"><div class="rays"></div><img src="${itemIcon(it)}" alt=""></div>
      <div class="rlabel" style="color:${R.c}">${R.la} · ${R.en}</div>
      <h2>${esc(it.name)}</h2>${it.sub ? `<span class="isub">${esc(it.sub)}</span>` : ''}
      <div class="istats">${diffLine(it)}</div>${it.flavor ? `<div class="flav">“${esc(it.flavor)}”</div>` : ''}
      <div class="dactions"><button class="btn primary" data-ov="equip">Equip</button><button class="btn" data-ov="ok">Keep</button></div></div>`;
    ov.dataset.item = it.id;
    SFX.loot(it.r); if (it.r === 3) { ov.classList.add('shake'); buzz([40, 30, 80]); flash(); } else if (it.r === 2) buzz(40);
  } else if (o.type === 'level') {
    const sparks = Array.from({ length: 40 }, (_, i) => { const a = i / 40 * Math.PI * 2, d = 90 + Math.random() * 110; return `<i style="--dx:${(Math.cos(a) * d).toFixed(0)}px;--dy:${(Math.sin(a) * d).toFixed(0)}px;--c:${i % 3 ? '#e8c46a' : '#d0342c'};animation-delay:${(Math.random() * .2).toFixed(2)}s"></i>`; }).join('');
    const unl = ACH.filter(a => a.id.startsWith('gradus') && o.L >= a.p(derive())[1] && o.from < a.p(derive())[1]);
    ov.innerHTML = `<div class="ov-card lvlup"><div class="burst">${sparks}</div>
      <div class="kick">Ascensio</div><div class="lvl-big">${roman(o.L)}</div>
      <div class="ov-kicker">Level ${o.L} attained</div>
      <ul>${unl.map(a => `<li class="reward">${a.title ? 'Title · ' + TITLES[a.title][0] : ''}${a.bg ? ' · Background · ' + SCENES[a.bg].n : ''}</li>`).join('')}
        <li class="muted">Next level · ${fmtNum(need(o.L))} XP</li></ul>
      <div class="dactions"><button class="btn goldb" data-ov="ok">Onward</button></div></div>`;
    SFX.level(); flash(); buzz([30, 40, 30, 40, 90]);
  } else if (o.type === 'ach') {
    const a = o.a;
    ov.innerHTML = `<div class="ov-card"><div class="ov-kicker">Sigillum · A seal is set</div>
      <img class="seal-big" src="${Art.seal(a.g, true)}" alt=""><h2 class="t">${a.n}</h2><p class="muted">${a.d}</p>
      ${a.title ? `<div class="reward">Title unlocked · ${TITLES[a.title][0]}</div>` : ''}${a.bg ? `<div class="reward">Background unlocked · ${SCENES[a.bg].n}</div>` : ''}
      <div class="dactions"><button class="btn goldb" data-ov="ok">Seal it</button></div></div>`;
    SFX.ach(); buzz(30);
  } else if (o.type === 'intro') {
    ov.innerHTML = `<div class="ov-card intro"><div class="bl">Ritus</div><div class="ov-kicker">The rites make the man</div>
      <p>Nine rites, every day. Each one kept grants <b>XP once per day</b> — and tempts fate for spoils.</p>
      <p>Keep them all for a <b>Dies Perfectus</b>: bonus XP and a tribute of rare make or better.</p>
      <p>Wear what you find; your character dresses in it. Seals unlock titles and new places to stand.</p>
      <p class="muted">Forgot something last night? Switch to <b>Heri</b> to log yesterday.</p>
      <div class="dactions"><button class="btn primary wide" data-ov="ok">Begin</button></div></div>`;
  }
}
function flash() { const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 900); }
function onOverlayClick(e) {
  const b = e.target.closest('[data-ov]'); if (!b) return;
  SFX.init();
  if (b.dataset.ov === 'equip') { const it = itemById($('#overlay').dataset.item); if (it) { S.eq[it.slot] = it.id; persist(); render(); toast(`Equipped · ${it.name}`); checkAch(); } }
  nextOverlay();
}

let toastT = null;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 1900); }

/* =========================================================
   BOOT
   ========================================================= */
function go(v) { view = v; try { sessionStorage.setItem('ritus.view', v); } catch (e) {} closeDrawer(); render(); window.scrollTo({ top: 0 }); }
function wire() {
  $('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) go(b.dataset.view); });
  $('#brand').addEventListener('click', () => go('sheet'));
  $('#btn-settings').addEventListener('click', openSettings);
  $('#v-sheet').addEventListener('click', e => { const s = e.target.closest('[data-slot]'); if (s) return openSlot(s.dataset.slot); if (e.target.closest('[data-go]')) go('rites'); });
  $('#v-rites').addEventListener('click', onRitesClick);
  $('#v-rites').addEventListener('change', onRitesChange);
  $('#v-rites').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') e.target.blur(); });
  $('#v-vault').addEventListener('click', onVaultClick);
  $('#v-sigilla').addEventListener('click', onSigillaClick);
  $('#v-annales').addEventListener('click', onAnnalesClick);
  $('#drawer').addEventListener('click', e => { onDrawerClick(e); onSettingsClick(e); });
  $('#drawer').addEventListener('change', onSettingsChange);
  $('#overlay').addEventListener('click', onOverlayClick);
  $('#import-file').addEventListener('change', onImport);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#drawer').hidden) closeDrawer(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else dayCheck(); });
  window.addEventListener('pagehide', flush);
  setInterval(dayCheck, 30000);
}
function dayCheck() { const k = dayKey(); if (k !== todayK) { todayK = k; D = null; render(); } }
function decorate() {
  const c = Art.corners(), root = document.documentElement.style;
  root.setProperty('--cTL', c.tl); root.setProperty('--cTR', c.tr); root.setProperty('--cBL', c.bl); root.setProperty('--cBR', c.br);
  $$('[data-ic]').forEach(el => { el.innerHTML = I(el.dataset.ic); });
}

async function boot() {
  decorate();
  await Store.open();
  const loaded = await Store.load();
  if (loaded) S = migrate(loaded);
  else { S = freshState(); starterKit(S); }
  try { const v = sessionStorage.getItem('ritus.view'); if (v && ['sheet', 'rites', 'vault', 'sigilla', 'annales'].includes(v)) view = v; } catch (e) {}
  wire();
  render();
  if (!S.intro) { S.intro = true; queue({ type: 'intro' }); }
  persist();
  checkAch();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.__ritus = { get S() { return S; }, commit, rollLoot, genItem, render, queue };
}
boot();
})();
