/* =========================================================
   RITUS — illustration engine
   Layered SVG figure (paper-doll) in black-tie noir,
   painted scenes, engraved icons and wax seals.
   Exposes window.RitusArt.
   ========================================================= */
(() => {
'use strict';

/* ---------- colour ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function h2r(h) { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function r2h(r) { return '#' + r.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join(''); }
function mix(a, b, t) { const A = h2r(a), B = h2r(b); return r2h(A.map((v, i) => v + (B[i] - v) * t)); }
const dk = (c, t = .35) => mix(c, '#000000', t);
const lt = (c, t = .25) => mix(c, '#ffffff', t);
const lum = c => { const [r, g, b] = h2r(c); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
const tone = c => lum(c) < .22 ? mix(c, '#c4c0b8', .6) : c;
function hash(a, b) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
const f1 = n => Math.round(n * 10) / 10;

/* ---------- per-drawing context: gradients, patterns, filters ---------- */
function mk(prefix) {
  const c = { p: prefix, n: 0, defs: [], one: false };
  c.id = () => c.p + (c.n++);
  const stops = st => st.map(s => `<stop offset="${s[0]}" stop-color="${s[1]}"${s[2] != null ? ` stop-opacity="${s[2]}"` : ''}/>`).join('');
  c.lg = (st, x1 = 0, y1 = 0, x2 = 1, y2 = 0) => { const id = c.id(); c.defs.push(`<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(st)}</linearGradient>`); return `url(#${id})`; };
  c.rg = (st, cx = .4, cy = .35, r = .75) => { const id = c.id(); c.defs.push(`<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(st)}</radialGradient>`); return `url(#${id})`; };
  c.metal = m => c.lg([[0, dk(m, .6)], [.16, dk(m, .12)], [.38, lt(m, .55)], [.5, lt(m, .12)], [.72, dk(m, .22)], [1, dk(m, .65)]]);
  c.metalV = m => c.lg([[0, lt(m, .45)], [.3, m], [.55, dk(m, .25)], [.7, lt(m, .15)], [1, dk(m, .6)]], 0, 0, 0, 1);
  /* wool suiting: lifts very dark colours so black-on-black still reads */
  c.suit = m => c.lg([[0, dk(m, .55)], [.24, mix(m, '#8c8c96', .07)], [.46, mix(m, '#b4b4be', .15)], [.72, mix(m, '#6a6a72', .04)], [1, dk(m, .6)]]);
  c.satin = m => c.lg([[0, dk(m, .5)], [.3, mix(m, '#ffffff', .1)], [.42, mix(m, '#ffffff', .32)], [.56, mix(m, '#ffffff', .08)], [1, dk(m, .55)]]);
  c.gloss = m => c.lg([[0, mix(m, '#ffffff', .3)], [.3, mix(m, '#ffffff', .08)], [.7, m], [1, dk(m, .7)]], 0, 0, .4, 1);
  c.leather = m => c.lg([[0, dk(m, .6)], [.25, m], [.45, lt(m, .18)], [.7, dk(m, .12)], [1, dk(m, .62)]]);
  c.gold = a => c.lg([[0, dk(a, .55)], [.22, a], [.42, lt(a, .62)], [.58, a], [1, dk(a, .55)]]);
  c.gem = g => c.rg([[0, lt(g, .75)], [.3, lt(g, .2)], [.75, g], [1, dk(g, .55)]], .38, .32, .8);
  c.shade = () => c.lg([[0, '#000', .55], [.32, '#000', 0], [.58, '#fff', .05], [.8, '#000', .12], [1, '#000', .6]]);
  c.vshade = () => c.lg([[0, '#fff', .05], [.5, '#000', 0], [1, '#000', .45]], 0, 0, 0, 1);
  c.blur = sd => { const id = c.id(); c.defs.push(`<filter id="${id}" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="${sd}"/></filter>`); return `url(#${id})`; };
  c.clip = d => { const id = c.id(); c.defs.push(`<clipPath id="${id}"><path d="${d}"/></clipPath>`); return `url(#${id})`; };
  c.sym = s => c.one ? s : s + `<g transform="matrix(-1 0 0 1 400 0)">${s}</g>`;
  return c;
}
const O = ' stroke="#060506" stroke-width="1.2" stroke-linejoin="round"';
const P = it => ({ m: it.pal.m, a: it.pal.a, g: it.pal.g || '#c9c2b4', bl: tone(it.pal.m), r: it.r || 0 });

/* ---------- anatomy (viewBox 0 0 400 600, left side = viewer's left) ---------- */
const SKIN = '#c8977a', SKIN_D = '#8c5c45', SKIN_L = '#e4b79a', HAIR = '#1c130f', HAIR_L = '#3e2b20';
const SHIRT = '#1d1c21', TROU = '#17161a', SHOE = '#0e0d10';
const TORSO = 'M187 158 C176 164 154 166 143 174 C134 182 135 198 139 214 C145 240 151 262 157 290 C157 306 156 320 157 334 L243 334 C244 320 243 306 243 290 C249 262 255 240 261 214 C265 198 266 182 257 174 C246 166 224 164 213 158 Z';
const ARM = 'M146 172 C133 174 126 188 125 204 C122 230 120 254 119 276 C117 300 116 326 116 348 L137 350 C138 326 139 302 141 280 C143 258 147 236 150 212 C151 196 151 182 146 172 Z';
const LEG = 'M158 336 C156 378 158 420 162 456 C164 490 166 520 168 556 L194 556 C194 522 196 490 197 456 C199 420 200 384 201 352 Z';
const LEG_SLIM = 'M160 336 C159 378 162 420 165 456 C167 490 169 520 171 554 L193 554 C193 522 194 490 195 456 C197 420 199 384 201 352 Z';
const HIPS = 'M156 318 L244 318 L246 354 C230 362 214 364 200 366 C186 364 170 362 154 354 Z';
const SHOE_P = 'M163 546 L195 546 C197 557 198 569 197 582 L152 584 C147 577 151 565 163 559 Z';
const HAND = 'M113 344 C108 354 109 372 113 382 C117 392 130 394 135 385 C139 377 140 360 137 346 Z';
const FACE = 'M200 80 C217 80 228 92 228 108 C228 116 227 124 225 130 C221 141 211 148 200 149 C189 148 179 141 175 130 C173 124 172 116 172 108 C172 92 183 80 200 80 Z';
/* tailoring */
const J_HALF = 'M190 157 L200 286 C197 320 192 346 186 371 L149 369 C149 345 151 318 152 290 C148 262 142 240 136 214 C132 198 131 182 140 174 C151 166 175 161 190 157 Z';
const J_LONG = 'M190 157 L200 280 C196 330 188 400 178 464 L145 460 C145 400 148 340 152 290 C148 262 142 240 136 214 C132 198 131 182 140 174 C151 166 175 161 190 157 Z';
const J_SLEEVE = 'M147 170 C132 172 124 186 123 204 C120 230 118 256 117 280 C115 304 114 326 114 344 L138 347 C139 326 140 302 142 280 C144 258 148 236 151 212 C152 196 152 182 147 170 Z';
const LAPEL = {
  notch: 'M189 157 L199 280 C192 258 180 234 167 212 L174 203 L165 195 C169 182 176 167 184 158 Z',
  peak: 'M189 157 L199 262 C192 244 180 222 167 205 L158 184 L172 194 C175 180 179 167 185 158 Z',
  shawl: 'M189 157 L199 284 C190 262 174 234 166 208 C164 188 172 168 184 158 Z',
};
const VEST = 'M189 160 L200 236 L200 300 L178 314 L156 298 C152 272 148 248 144 222 C146 202 150 188 157 176 C167 170 179 165 189 160 Z';
const COAT_SLEEVE = 'M149 167 C131 169 121 186 119 205 C115 233 112 263 111 291 C109 313 108 331 108 345 L140 349 C141 328 142 305 144 282 C146 258 150 236 153 212 C155 194 155 180 149 167 Z';
const COAT_PANEL = 'M187 156 C168 160 150 164 140 174 C132 184 130 200 132 216 C130 300 126 400 120 506 L168 506 C170 420 172 330 176 262 C180 222 184 188 188 162 Z';
const COAT_LAPEL = 'M187 157 C178 170 172 190 170 208 L159 202 L155 214 C163 236 170 250 176 262 C180 224 184 190 188 162 Z';

function hairBack(c) {
  return `<path d="M171 104 C167 80 184 69 201 70 C221 71 234 85 230 106 C232 128 236 150 241 172 C233 177 226 175 222 168 C225 150 225 134 225 120 L175 120 C175 134 175 150 178 168 C174 175 167 177 159 172 C164 150 168 128 171 104 Z" fill="${c.lg([[0, HAIR], [.5, HAIR_L], [1, HAIR]])}"${O}/>`
    + c.sym(`<path d="M172 128 C171 142 172 154 170 166 M176 126 C176 140 177 152 175 164" stroke="${HAIR_L}" stroke-width="1" fill="none" opacity=".6"/>`);
}
function head(c) {
  const skin = c.rg([[0, SKIN_L], [.55, SKIN], [1, SKIN_D]], .42, .38, .72);
  let s = c.sym(`<ellipse cx="172" cy="115" rx="4.5" ry="8.5" fill="${SKIN_D}"${O}/>`);
  s += `<path d="${FACE}" fill="${skin}"${O}/>`;
  s += `<path d="${FACE}" fill="${c.lg([[0, '#000', 0], [.55, '#000', 0], [1, '#2a120a', .38]])}"/>`;
  s += c.sym(`<ellipse cx="189" cy="113" rx="9.5" ry="5.5" fill="${SKIN_D}" opacity=".35"/>`);
  s += c.sym(`<path d="M180.5 106 Q188 100.5 196 103.5" stroke="${HAIR}" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  s += c.sym(`<path d="M183.5 113 Q189 109.4 194.5 113 Q189 115.8 183.5 113 Z" fill="#e3d8c8"/><circle cx="189.4" cy="112.8" r="2.3" fill="#4b5a4e"/><circle cx="189.4" cy="112.8" r="1.05" fill="#100a08"/><circle cx="188.6" cy="112" r=".55" fill="#fff" opacity=".8"/><path d="M183 112.7 Q189 108.7 195 112.7" stroke="#2a1812" stroke-width="1.2" fill="none"/>`);
  s += `<path d="M199.5 110 C199 117 197.5 122 195.8 125.5 C197.6 127.6 202.4 127.6 204.4 125.5" stroke="${SKIN_D}" stroke-width="1.7" fill="none" stroke-linecap="round"/><path d="M201.3 111 L201.8 122" stroke="${SKIN_L}" stroke-width="1.6" opacity=".55"/>`;
  s += c.sym(`<path d="M176 119 C178 128 182 134 188 136.5" stroke="${SKIN_D}" stroke-width="2.4" fill="none" opacity=".3"/>`);
  s += `<path d="M174 121 C175 138 186 153 200 154 C214 153 225 138 226 121 C222 132 216 136 211 134 C207 139.5 193 139.5 189 134 C184 136 178 132 174 121 Z" fill="${c.lg([[0, HAIR_L], [1, HAIR]], 0, 0, 0, 1)}"/>`;
  let st = ''; for (let i = 0; i < 16; i++) { const x = 178 + i * 3, y = 136 + Math.abs(i - 7.5) * -.6 + 4; st += `M${x} ${f1(y)} l${f1((i - 8) * .25)} 6 `; }
  s += `<path d="${st}" stroke="${HAIR_L}" stroke-width=".8" opacity=".55"/>`;
  s += `<path d="M188.5 132 C192.5 128.5 197 129 200 130.6 C203 129 207.5 128.5 211.5 132 C207 133.6 203 133 200 134.2 C197 133 193 133.6 188.5 132 Z" fill="${HAIR}"/>`;
  s += `<path d="M195.5 137.6 Q200 139.4 204.5 137.6" stroke="#6b4232" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M172 110 C169 86 185 73 202 74 C221 75 232 89 229 110 C226 98 216 90 204 91 C196 92 189 97 185 105 C182 99 176 101 172 110 Z" fill="${c.lg([[0, HAIR_L], [1, HAIR]], 0, 0, 1, 1)}"${O}/>`;
  s += `<path d="M186 84 C192 80 200 79 208 81 M190 90 C196 86 204 86 212 89 M178 96 C182 88 188 84 194 82" stroke="${HAIR_L}" stroke-width="1" fill="none" opacity=".7"/>`;
  return s;
}

/* ---------- base: black shirt, black trousers, black shoes ---------- */
function shoe(c, m, extra = '') {
  return `<path d="${SHOE_P}" fill="${c.gloss(m)}"${O}/><path d="M152 579 L197 580 L197 585 L151 584 Z" fill="#050405"/><ellipse cx="163" cy="571" rx="7" ry="2.4" fill="#fff" opacity=".22"/>${extra}`;
}
function baseLower(c) {
  const f = c.suit(TROU);
  return c.sym(`<path d="${LEG}" fill="${f}"${O}/><path d="M181 362 L182 548" stroke="${lt(TROU, .22)}" stroke-width="1" opacity=".5"/>`)
    + `<path d="${HIPS}" fill="${f}"${O}/>`
    + c.sym(shoe(c, SHOE));
}
function baseTorso(c) {
  const f = c.suit(SHIRT);
  return `<path d="M187 132 L187 164 C193 170 207 170 213 164 L213 132 Z" fill="${c.lg([[0, SKIN_D], [.5, SKIN], [1, SKIN_D]])}"/>`
    + `<ellipse cx="200" cy="146" rx="15" ry="9" fill="#3a1a10" opacity=".35"/>`
    + `<path d="${TORSO}" fill="${f}"${O}/><path d="M200 168 L200 334" stroke="${dk(SHIRT, .6)}" stroke-width="1.2"/>`
    + [190, 214, 238, 262, 286, 310].map(y => `<circle cx="201.5" cy="${y}" r="1.5" fill="#0a090b"/>`).join('')
    + c.sym(`<path d="${ARM}" fill="${f}"${O}/><path d="M117 336 L137 338" stroke="${dk(SHIRT, .6)}" stroke-width="1.2"/>`)
    + c.sym(`<path d="M186 153 C187 162 191 170 197 177 L200 165 L190 151 Z" fill="${c.suit(lt(SHIRT, .05))}"${O}/>`);
}

/* ---------- jackets, waistcoats, coats ---------- */
function pocketSquare(c, g, x = 216, y = 211) {
  return `<path d="M${x - 2} ${y + 2} L${x + 21} ${y - 1}" stroke="#050405" stroke-width="2"/><path d="M${x} ${y + 1} L${x + 3} ${y - 9} L${x + 7} ${y - 3} L${x + 11} ${y - 11} L${x + 14} ${y - 4} L${x + 18} ${y - 10} L${x + 19} ${y}" fill="${c.satin(g)}" stroke="${dk(g, .5)}" stroke-width=".6"/>`;
}
function button(c, x, y, a, r = 3) { return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.rg([[0, lt(a, .4)], [.6, a], [1, dk(a, .6)]], .35, .3, .8)}" stroke="#050405" stroke-width=".6"/>`; }
function sleeves(c, m, a, shirtCuff = true) {
  return c.sym(`<path d="${J_SLEEVE}" fill="${c.suit(m)}"${O}/><path d="M124 206 C122 240 120 270 118 300" stroke="${mix(m, '#9a9aa4', .12)}" stroke-width="1" fill="none" opacity=".5"/>`
    + (shirtCuff ? `<path d="M114 341 L138 344 L138 351 L114 349 Z" fill="${c.suit(lt(SHIRT, .08))}"${O}/><circle cx="126" cy="347" r="2" fill="${c.gold(a)}"/>` : '')
    + `<path d="M116 328 L138 331" stroke="${dk(m, .7)}" stroke-width="1.2"/>`
    + [0, 1, 2].map(i => `<circle cx="${133 - i * 4}" cy="${322 - i * 1}" r="1.4" fill="${dk(m, .7)}"/>`).join(''));
}
function jacket(c, it, o = {}) {
  const { m, a, g } = P(it), lapel = o.lapel || 'notch', half = o.long ? J_LONG : J_HALF;
  const lf = lapel === 'shawl' ? c.satin(m) : c.suit(mix(m, '#ffffff', .03));
  let s = sleeves(c, m, a);
  s += c.sym(`<path d="${half}" fill="${c.suit(m)}"${O}/><path d="${half}" fill="${c.vshade()}"/>`);
  if (o.dbl) s += `<path d="M186 258 L214 258 L215 371 L185 371 Z" fill="${c.suit(m)}"/><path d="M214 258 L215 371" stroke="#050405" stroke-width="1.2"/>`;
  s += c.sym(`<path d="${LAPEL[lapel]}" fill="${lf}"${O}/><path d="M184 158 C176 168 170 182 166 196" stroke="${mix(m, '#ffffff', .28)}" stroke-width=".8" fill="none" opacity=".7"/>`);
  if (o.velvet) s += c.sym(`<path d="${LAPEL[lapel]}" fill="${a}" opacity=".18"/>`);
  if (!o.long) s += c.sym(`<path d="M157 330 L184 332" stroke="#050405" stroke-width="2.2"/><path d="M157 327.5 L184 329.5" stroke="${mix(m, '#ffffff', .18)}" stroke-width=".7" opacity=".6"/>`);
  s += pocketSquare(c, g);
  (o.buttons || [[201, 292]]).forEach(([x, y]) => s += button(c, x, y, o.btn || dk(m, .1)));
  if (it.r >= 3) s += `<path d="M228 228 L232 233 L228 238 L224 233 Z" fill="${c.gold(a)}" stroke="#050405" stroke-width=".5"/><circle cx="228" cy="233" r="1.4" fill="${c.gem(g)}"/>`;
  return s;
}
function chest(c, it) {
  const { m, a, g } = P(it);
  switch (it.variant) {
    case 'waistcoat': {
      let s = c.sym(`<path d="${VEST}" fill="${c.suit(m)}"${O}/><path d="M160 272 L180 270" stroke="#050405" stroke-width="1.6"/><path d="${VEST}" fill="${c.vshade()}"/>`);
      [246, 262, 278, 294].forEach(y => s += button(c, 201, y, a, 2.4));
      s += `<path d="M201 270 C210 282 222 284 232 276" stroke="${c.gold(a)}" stroke-width="1.6" stroke-dasharray="2.4 1.3" fill="none"/>`;
      return s;
    }
    case 'roll': {
      const knit = '#121115';
      let s = `<path d="M190 157 L210 157 L200 286 Z" fill="${c.suit(knit)}"/>`;
      s += `<path d="M184 132 L216 132 L218 168 C210 175 190 175 182 168 Z" fill="${c.suit(knit)}"${O}/>`;
      for (let x = 186; x <= 214; x += 4) s += `<path d="M${x} 134 L${x} 170" stroke="#000" stroke-width="1" opacity=".5"/>`;
      return s + jacket(c, it, { lapel: 'notch' });
    }
    case 'double': return jacket(c, it, { lapel: 'peak', dbl: true, buttons: [[189, 268], [213, 268], [189, 296], [213, 296], [189, 324], [213, 324]] });
    case 'frock': return jacket(c, it, { lapel: 'notch', long: true, velvet: true, buttons: [[201, 248], [201, 268]] });
    case 'tuxedo': return jacket(c, it, { lapel: 'shawl', btn: dk(m, .2) });
    case 'single': default: return jacket(c, it, { lapel: 'notch' });
  }
}

/* ---------- trousers & shoes ---------- */
function legs(c, it) {
  const { m, a } = P(it), f = c.suit(m);
  const path = it.variant === 'slim' ? LEG_SLIM : LEG;
  let s = c.sym(`<path d="${path}" fill="${f}"${O}/><path d="M181 362 L182 548" stroke="${mix(m, '#ffffff', .2)}" stroke-width="1" opacity=".55"/>`) + `<path d="${HIPS}" fill="${f}"${O}/>`;
  if (it.variant === 'pinstripe') {
    const cl = c.clip(LEG); let l = ''; for (let x = 156; x <= 202; x += 6) l += `M${x} 330 L${f1(x + (x - 180) * .05)} 560 `;
    s += c.sym(`<path d="${l}" stroke="${mix(m, '#ffffff', .3)}" stroke-width=".7" opacity=".55" clip-path="${cl}"/>`);
    let h = ''; for (let x = 158; x <= 242; x += 6) h += `M${x} 318 L${x} 364 `;
    s += `<path d="${h}" stroke="${mix(m, '#ffffff', .3)}" stroke-width=".7" opacity=".45" clip-path="${c.clip(HIPS)}"/>`;
  }
  if (it.variant === 'tux') s += c.sym(`<path d="M159 340 C158 400 161 470 168 552" stroke="${c.satin(m)}" stroke-width="3.2" fill="none"/>`);
  if (it.variant === 'slim') s += c.sym(`<path d="M170 548 L193 548" stroke="#050405" stroke-width="1.4"/>`);
  s += `<path d="M158 318 L242 318" stroke="#050405" stroke-width="1.4"/><path d="M196 318 L196 326 M205 318 L205 326" stroke="${dk(m, .6)}" stroke-width="2"/>`;
  return s;
}
function feet(c, it) {
  const { m, a } = P(it);
  switch (it.variant) {
    case 'chelsea':
      return c.sym(`<path d="M166 528 L195 528 L195 552 L166 552 Z" fill="${c.gloss(m)}"${O}/><path d="M168 530 C172 538 172 546 168 552 M193 530 C189 538 189 546 193 552" stroke="${dk(m, .6)}" stroke-width="2.2" fill="none"/><path d="M180 528 L180 522" stroke="${dk(m, .4)}" stroke-width="3"/>` + shoe(c, m));
    case 'brogue': {
      let dots = ''; for (let i = 0; i < 9; i++) { const t = i / 8, x = 158 + t * 34, y = 566 - Math.sin(t * Math.PI) * 9; dots += `<circle cx="${f1(x)}" cy="${f1(y)}" r=".9" fill="${dk(m, .7)}"/>`; }
      return c.sym(shoe(c, m, `<path d="M156 568 C164 554 184 552 196 562" stroke="${dk(m, .65)}" stroke-width="1.2" fill="none"/>${dots}<path d="M172 552 L190 552 M174 556 L190 556" stroke="${lt(m, .15)}" stroke-width=".9"/>`));
    }
    case 'oxford': default:
      return c.sym(shoe(c, m, `<path d="M171 551 L192 551 M172 555 L192 555" stroke="${lt(m, .2)}" stroke-width=".9"/><path d="M158 566 C162 560 168 558 172 560" stroke="${dk(m, .65)}" stroke-width="1" fill="none"/>`));
  }
}

/* ---------- gloves ---------- */
function hands(c, it) {
  if (!it) {
    const sk = c.lg([[0, SKIN_D], [.45, SKIN], [1, SKIN_D]]);
    return c.sym(`<path d="${HAND}" fill="${sk}"${O}/><path d="M113 362 C119 364 126 364 134 361 M113 371 C119 373 126 373 134 370 M114 379 C119 381 126 381 133 379" stroke="${SKIN_D}" stroke-width="1" fill="none" opacity=".7"/><path d="M135 352 C141 357 141 367 135 373" stroke="${SKIN_D}" stroke-width="1.5" fill="none"/>`);
  }
  const { m, a } = P(it);
  const knuckles = `<path d="M113 363 C119 365 126 365 134 362 M113 372 C119 374 126 374 134 371" stroke="${dk(m, .7)}" stroke-width="1" fill="none"/><path d="M135 352 C141 357 141 367 135 373" stroke="${dk(m, .7)}" stroke-width="1.4" fill="none"/>`;
  switch (it.variant) {
    case 'driving':
      return c.sym(`<path d="M112 338 L138 340 L137 352 L112 350 Z" fill="${c.gloss(m)}"${O}/><path d="${HAND}" fill="${c.gloss(m)}"${O}/>${knuckles}<circle cx="117" cy="360" r="1.8" fill="${SKIN_D}"/><circle cx="123" cy="361" r="1.8" fill="${SKIN_D}"/><circle cx="129" cy="360" r="1.8" fill="${SKIN_D}"/><path d="M112 344 L138 346" stroke="${c.metal(a)}" stroke-width="2"/><circle cx="133" cy="345.6" r="1.8" fill="${c.metal(a)}"/>`);
    case 'silk':
      return c.sym(`<path d="M111 330 L139 332 L137 352 L112 350 Z" fill="${c.satin(m)}"${O}/><path d="${HAND}" fill="${c.satin(m)}"${O}/>${knuckles}<path d="M111 331 L139 333" stroke="${c.gold(a)}" stroke-width="2.6"/>`);
    case 'gloves': default:
      return c.sym(`<path d="M112 336 L138 338 L137 352 L112 350 Z" fill="${c.gloss(m)}"${O}/><path d="${HAND}" fill="${c.gloss(m)}"${O}/>${knuckles}<path d="M118 352 L119 362 M124 352 L125 362 M130 352 L130 361" stroke="${dk(m, .7)}" stroke-width=".8"/>`);
  }
}
function ringOn(c, it) { const { a, g } = P(it); return `<path d="M267 371 C272 373 279 373 284 371" stroke="${c.gold(a)}" stroke-width="3.2" fill="none" stroke-linecap="round"/><circle cx="275.5" cy="371.5" r="2.4" fill="${c.gem(g)}"/>`; }

/* ---------- hats & masks ---------- */
function brimShadow(c, k = 1) { return c.icon ? '' : `<path d="${FACE}" fill="${c.lg([[0, '#000', .78 * k], [.32, '#000', .5 * k], [.58, '#000', .14 * k], [1, '#000', 0]], 0, 0, 0, 1)}"/>`; }
function headItem(c, it) {
  const { m, a, g, r } = P(it); let s = '';
  switch (it.variant) {
    case 'homburg':
      s += brimShadow(c, .9);
      s += `<path d="M176 95 C175 70 185 56 200 55 C215 56 225 70 224 95 Z" fill="${c.suit(m)}"${O}/><path d="M200 58 L200 82" stroke="#050405" stroke-width="2.4"/><path d="M196 60 C198 70 198 78 197 84" stroke="${mix(m, '#ffffff', .2)}" stroke-width=".8" fill="none"/>`;
      s += `<path d="M176 86 L224 86 L224 96 L176 96 Z" fill="${c.satin(a)}"/>`;
      s += `<path d="M152 99 C166 92 234 92 248 99 C244 107 222 109 200 109 C178 109 156 107 152 99 Z" fill="${c.suit(m)}"${O}/><path d="M152 99 C166 91 234 91 248 99" stroke="${mix(m, '#ffffff', .3)}" stroke-width="2.6" fill="none"/>`;
      break;
    case 'widebrim':
      s += brimShadow(c, 1.15);
      s += `<path d="M178 99 L180 65 C190 61 210 61 220 65 L222 99 Z" fill="${c.suit(m)}"${O}/><path d="M178 90 L222 90 L222 99 L178 99 Z" fill="${c.satin(a)}"/>`;
      s += `<path d="M126 103 C150 91 250 91 274 103 C262 114 232 117 200 117 C168 117 138 114 126 103 Z" fill="${c.suit(m)}"${O}/><path d="M128 102 C150 92 250 92 272 102" stroke="${mix(m, '#ffffff', .22)}" stroke-width="1" fill="none"/>`;
      if (r >= 3) s += `<path d="M200 90 L204 94.5 L200 99 L196 94.5 Z" fill="${c.gold(a === '#d4ad5a' ? a : '#d4ad5a')}"/><circle cx="200" cy="94.5" r="1.4" fill="${c.gem(g)}"/>`;
      break;
    case 'tophat':
      s += brimShadow(c, .85);
      s += `<path d="M179 99 L181 30 C190 26 210 26 219 30 L221 99 Z" fill="${c.satin(m)}"${O}/><path d="M181 30 C190 34 210 34 219 30" stroke="${mix(m, '#ffffff', .25)}" stroke-width="1" fill="none"/>`;
      s += `<path d="M179 86 L221 86 L221 98 L179 98 Z" fill="${c.satin(a)}"/>`;
      s += `<path d="M158 101 C170 93 230 93 242 101 C236 108 164 108 158 101 Z" fill="${c.suit(m)}"${O}/><path d="M158 101 C170 92 230 92 242 101" stroke="${mix(m, '#ffffff', .3)}" stroke-width="2.4" fill="none"/>`;
      break;
    case 'mask': {
      const holes = 'M183 113 a6.5 4.3 0 1 0 13 0 a6.5 4.3 0 1 0 -13 0 Z M204 113 a6.5 4.3 0 1 0 13 0 a6.5 4.3 0 1 0 -13 0 Z';
      const mk2 = `M168 104 C178 95 192 97 200 104 C208 97 222 95 232 104 C234 115 227 126 216 126 C208 126 203 120 200 117 C197 120 192 126 184 126 C173 126 166 115 168 104 Z ${holes}`;
      s += `<path d="${mk2}" fill="${c.gloss(m)}" fill-rule="evenodd"${O}/><path d="M168 104 C178 95 192 97 200 104 C208 97 222 95 232 104" stroke="${c.gold(a)}" stroke-width="1.6" fill="none"/>`;
      s += `<path d="M182 108 C186 104 192 104 196 108 M204 108 C208 104 214 104 218 108" stroke="${c.gold(a)}" stroke-width=".9" fill="none"/><path d="M200 107 L203 110.5 L200 114 L197 110.5 Z" fill="${c.gem(g)}"/>`;
      s += `<path d="M168 104 C162 100 158 104 154 100 M232 104 C238 100 242 104 246 100" stroke="${dk(m, .2)}" stroke-width="1.4" fill="none"/>`;
      break;
    }
    case 'circlet': {
      const band = c.metal(r >= 3 ? a : mix(m, '#6a6a72', .4));
      s += `<path d="M171 97 C186 102 214 102 229 97" stroke="${band}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      for (let i = 0; i < 9; i++) { const t = i / 8, x = 173 + t * 54, y = 98 + Math.sin(t * Math.PI) * 3.6, h = i % 2 ? 7 : 11, d = (t - .5) * 4; s += `<path d="M${f1(x - 2)} ${f1(y)} L${f1(x + d)} ${f1(y - h)} L${f1(x + 2)} ${f1(y)} Z" fill="${band}"/>`; }
      if (r >= 2) s += `<circle cx="200" cy="101" r="2.6" fill="${c.gem(g)}"/>`;
      break;
    }
    case 'fedora': default:
      s += brimShadow(c);
      s += `<path d="M176 95 C175 72 185 58 200 57 C215 58 225 72 224 95 Z" fill="${c.suit(m)}"${O}/><path d="M189 61 C191 70 191 80 189 90 M211 61 C209 70 209 80 211 90 M188 63 Q200 71 212 63" stroke="#050405" stroke-width="1.3" fill="none" opacity=".75"/>`;
      s += `<path d="M176 86 L224 86 L224 95 L176 95 Z" fill="${c.satin(a)}"/><path d="M216 86 L219 86 L219 95 L216 95 Z" fill="${dk(a, .4)}"/>`;
      s += `<path d="M150 100 C166 90 234 90 250 100 C242 108 222 111 200 111 C178 111 158 108 150 100 Z" fill="${c.suit(m)}"${O}/><path d="M152 99 C168 91 232 91 248 99" stroke="${mix(m, '#ffffff', .28)}" stroke-width="1" fill="none"/>`;
  }
  return s;
}

/* ---------- neckwear: under the jacket (tie, bow, cravat, pendant) or over it (scarf) ---------- */
const NECK_OVER = { scarf: 1 };
function neck(c, it) {
  const { m, a, g, r } = P(it);
  switch (it.variant) {
    case 'bowtie':
      return `<path d="M200 168 L184 160 C182 166 182 172 184 178 Z M200 168 L216 160 C218 166 218 172 216 178 Z" fill="${c.satin(a)}"${O}/><rect x="196.5" y="164" width="7" height="9" rx="1.5" fill="${c.satin(dk(a, .1))}"${O}/>`;
    case 'cravat':
      return `<path d="M188 162 C190 180 195 196 200 204 C205 196 210 180 212 162 C206 170 194 170 188 162 Z" fill="${c.satin(a)}"${O}/><path d="M194 172 C196 182 198 190 200 196 M206 172 C204 182 202 190 200 196" stroke="${dk(a, .45)}" stroke-width="1" fill="none"/><circle cx="200" cy="180" r="2.6" fill="${c.gem(g)}" stroke="${c.gold('#d4ad5a')}" stroke-width="1.2"/>`;
    case 'scarf':
      return `<path d="M180 154 C186 170 214 170 220 154 L224 166 C212 180 188 180 176 166 Z" fill="${c.suit(a)}"${O}/>`
        + `<path d="M178 164 C175 200 173 250 170 312 L190 314 C190 258 190 210 192 172 Z" fill="${c.suit(a)}"${O}/><path d="M222 166 C226 210 229 260 232 330 L212 332 C210 270 208 220 208 172 Z" fill="${c.suit(dk(a, .1))}"${O}/>`
        + `<path d="M171 306 l0 10 M175 307 l0 10 M179 308 l0 10 M183 308 l0 10 M187 308 l0 10 M214 326 l0 10 M218 326 l0 10 M222 326 l0 10 M226 325 l0 10 M230 324 l0 10" stroke="${a}" stroke-width="1.4"/>`;
    case 'lozenge':
      return `<path d="M190 164 Q192 190 200 202 Q208 190 210 164" stroke="${c.gold(a)}" stroke-width="1.6" stroke-dasharray="2.4 1.2" fill="none"/><path d="M200 197 L212 213 L200 231 L188 213 Z" fill="${c.gold(a)}"${O}/><path d="M200 202 L207.5 213 L200 225 L192.5 213 Z" fill="${c.gem(g)}"/>`;
    case 'tie': default: {
      let s = `<path d="M195 165 L205 165 L203.5 178 L196.5 178 Z" fill="${c.satin(dk(a, .1))}"${O}/><path d="M196.5 178 L203.5 178 L208 262 L200 273 L192 262 Z" fill="${c.satin(a)}"${O}/>`;
      if (r >= 1) { let l = ''; for (let y = 186; y < 270; y += 9) l += `M${f1(193 + (y - 178) * .02)} ${y + 6} L${f1(207 - (y - 178) * .02)} ${y} `; s += `<path d="${l}" stroke="${r >= 2 ? g : lt(a, .3)}" stroke-width="1.2" opacity=".55" clip-path="${c.clip('M196.5 178 L203.5 178 L208 262 L200 273 L192 262 Z')}"/>`; }
      if (r >= 3) s += `<path d="M193 222 L207 222" stroke="${c.gold('#d4ad5a')}" stroke-width="2"/>`;
      return s;
    }
  }
}

/* ---------- coats ---------- */
function cloakBack(c, it) {
  const { m, a, g } = P(it);
  switch (it.variant) {
    case 'cape': {
      return `<path d="M150 166 C128 220 116 290 112 372 L288 372 C284 290 272 220 250 166 Z" fill="${c.suit(m)}"${O}/><path d="M150 166 C128 220 116 290 112 372 L288 372 C284 290 272 220 250 166 Z" fill="${c.vshade()}"/>`
        + c.sym(`<path d="M178 168 C166 150 162 124 168 100 C177 112 185 134 189 158 Z" fill="${c.satin(g)}"${O}/><path d="M176 168 C164 150 160 126 165 103 C168 102 170 104 171 106 C168 126 172 148 182 164 Z" fill="${c.suit(m)}"/>`);
    }
    case 'smoke': {
      let s = `<path d="M148 168 C132 220 126 320 122 420 L120 470 L280 470 L278 420 C274 320 268 220 252 168 Z" fill="${c.suit(m)}"${O}/>`;
      const fade = c.lg([[0, mix(m, '#3a3540', .4), .9], [1, m, 0]], 0, 0, 0, 1), bl = c.blur(3);
      let w = ''; for (let i = 0; i < 9; i++) { const x = 124 + i * 19, len = 60 + hash(i, 61) * 70, sway = (hash(i, 62) - .5) * 40; w += `<path d="M${x - 12} 462 C${f1(x - 10 + sway * .3)} ${f1(462 + len * .4)} ${f1(x + sway)} ${f1(462 + len * .7)} ${f1(x + sway * .6)} ${f1(462 + len)} C${f1(x + 8 + sway)} ${f1(462 + len * .6)} ${x + 12} ${f1(462 + len * .3)} ${x + 12} 462 Z" fill="${fade}"/>`; }
      s += `<g class="a-fog" filter="${bl}">${w}</g><ellipse cx="200" cy="500" rx="110" ry="30" fill="${a}" opacity=".12" filter="${c.blur(14)}"/>`;
      return s;
    }
    case 'trench': case 'overcoat': default:
      return `<path d="M148 168 C132 220 126 320 122 420 C120 450 118 480 117 506 L283 506 C282 480 280 450 278 420 C274 320 268 220 252 168 Z" fill="${c.suit(m)}"${O}/><path d="M148 168 C132 220 126 320 122 420 C120 450 118 480 117 506 L283 506 C282 480 280 450 278 420 C274 320 268 220 252 168 Z" fill="${c.vshade()}"/>`;
  }
}
function cloakFront(c, it) {
  const { m, a, g } = P(it);
  if (it.variant === 'cape') {
    return c.sym(`<path d="M188 158 C168 162 146 168 135 182 C125 200 117 242 113 302 L134 308 C138 262 147 222 161 197 C172 183 182 170 190 162 Z" fill="${c.satin(g)}"${O}/><path d="M188 158 C168 162 146 168 135 182 C125 200 119 242 116 300 L127 302 C132 260 144 220 158 195 C170 181 181 168 189 161 Z" fill="${c.suit(m)}"/>`)
      + `<path d="M190 166 L210 166" stroke="${c.gold(a)}" stroke-width="1.6"/><circle cx="188" cy="166" r="4.4" fill="${c.gold(a)}"${O}/><circle cx="212" cy="166" r="4.4" fill="${c.gold(a)}"${O}/>`;
  }
  const smoke = it.variant === 'smoke', panel = smoke ? COAT_PANEL.replace(/506/g, '470') : COAT_PANEL;
  let s = c.sym(`<path d="${panel}" fill="${c.suit(m)}"${O}/><path d="${COAT_LAPEL}" fill="${c.suit(mix(m, '#ffffff', .04))}"${O}/><path d="M186 158 C178 172 173 190 171 206" stroke="${mix(m, '#ffffff', .28)}" stroke-width=".9" fill="none" opacity=".7"/>`
    + `<path d="${COAT_SLEEVE}" fill="${c.suit(m)}"${O}/><path d="M109 330 L140 334" stroke="#050405" stroke-width="1.4"/><path d="M127 206 C122 240 118 280 114 320" stroke="${mix(m, '#9a9aa4', .12)}" stroke-width="1" fill="none" opacity=".5"/>`);
  if (it.variant === 'trench') {
    s += c.sym(`<path d="M124 294 L176 298 L176 311 L124 307 Z" fill="${c.suit(dk(m, .25))}"${O}/><path d="M139 172 L166 165 L167 174 L142 181 Z" fill="${c.suit(m)}"${O}/>`);
    s += `<rect x="162" y="295" width="12" height="16" rx="1.5" fill="none" stroke="${c.metal(a)}" stroke-width="2.2"/>`;
    s += c.sym(button(c, 166, 250, dk(m, .1), 3) + button(c, 166, 340, dk(m, .1), 3));
  } else if (!smoke) {
    s += c.sym(button(c, 171, 300, dk(m, .1), 3.2) + button(c, 172, 344, dk(m, .1), 3.2));
  } else {
    s += c.sym(`<path d="M120 462 C140 470 160 470 168 462" stroke="${a}" stroke-width="1.4" fill="none" opacity=".7"/>`);
  }
  return s;
}

/* ---------- canes & instruments, main hand (hand ~125,365) ---------- */
function mainW(c, it) {
  const { m, a, g, bl, r } = P(it);
  const black = c.gloss(m);
  switch (it.variant) {
    case 'umbrella':
      return `<path d="M125 356 L125 334 C125 320 142 320 142 333" stroke="${c.leather('#2a1a12')}" stroke-width="6" fill="none" stroke-linecap="round"/>`
        + `<path d="M123 390 L127 390 L126 404 L124 404 Z" fill="${black}"/><path d="M118 402 C113 444 115 504 123 566 L127 566 C135 504 137 444 132 402 Z" fill="${c.suit(m)}"${O}/>`
        + `<path d="M121 410 C120 460 121 510 124 560 M129 410 C130 460 129 510 126 560" stroke="#050405" stroke-width="1" fill="none" opacity=".7"/><path d="M116 452 L134 452" stroke="${c.suit(dk(m, .2))}" stroke-width="5"/><circle cx="131" cy="452" r="1.8" fill="${c.metal(a)}"/>`
        + `<path d="M124 566 L126 566 L125.5 584 L124.5 584 Z" fill="${c.metal(a)}"/>`;
    case 'stiletto':
      return `<path d="M120.5 398 L129.5 398 L127 478 L125 490 L123 478 Z" fill="${c.lg([[0, dk(bl, .45)], [.45, lt(bl, .55)], [1, dk(bl, .5)]])}"${O}/><path d="M108 392 C116 389 134 389 142 392 L141 398 C134 396 116 396 109 398 Z" fill="${c.metal(a)}"${O}/><ellipse cx="125" cy="338" rx="5.5" ry="5" fill="${c.metal(a)}"${O}/><rect x="121" y="342" width="8" height="48" rx="2" fill="${black}"/>`;
    case 'swordcane': {
      let s = `<path d="M122 418 L128 418 L127 584 L123 584 Z" fill="${black}"${O}/><path d="M123.5 572 L126.5 572 L126 584 L124 584 Z" fill="${c.metal(a)}"/>`;
      s += `<path d="M123 392 L127 392 L127 418 L123 418 Z" fill="${c.lg([[0, dk(tone('#c4c0b8'), .3)], [.5, '#f2efe8'], [1, dk(tone('#c4c0b8'), .4)]])}"/>`;
      s += `<rect x="120" y="414" width="10" height="7" rx="1.5" fill="${c.gold(a)}"${O}/><rect x="120.5" y="386" width="9" height="7" rx="1.5" fill="${c.gold(a)}"${O}/>`;
      s += `<path d="M118 340 C118 330 132 330 132 340 L130 350 L120 350 Z" fill="${c.gold(a)}"${O}/>`;
      if (r >= 2) s += `<circle cx="125" cy="337" r="2.6" fill="${c.gem(g)}"/>`;
      return s;
    }
    case 'scepter': {
      let s = `<circle cx="125" cy="52" r="26" fill="${g}" opacity=".4" filter="${c.blur(9)}" class="a-pulse"/>`;
      s += `<path d="M122 76 L128 76 L127.5 584 L122.5 584 Z" fill="${black}"${O}/>`;
      [140, 240, 470].forEach(y => s += `<rect x="120.5" y="${y}" width="9" height="6" rx="1" fill="${c.gold(a)}"/>`);
      s += `<circle cx="125" cy="54" r="12" fill="${c.gem(g)}"${O}/><ellipse cx="121" cy="49" rx="4" ry="3" fill="#fff" opacity=".45"/>`;
      s += `<path d="M125 82 C112 76 108 62 113 46 M125 82 C138 76 142 62 137 46 M125 82 L125 66" stroke="${c.gold(a)}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M125 36 L128 42 L125 48 L122 42 Z" fill="${c.gold(a)}"/>`;
      return s;
    }
    case 'cane': default: {
      let s = `<path d="M122 346 L128 346 L127 584 L123 584 Z" fill="${black}"${O}/><path d="M124 350 L124 570" stroke="${mix(m, '#ffffff', .3)}" stroke-width=".8" opacity=".6"/><path d="M123.5 572 L126.5 572 L126 584 L124 584 Z" fill="${c.metal(a)}"/>`;
      s += `<ellipse cx="125" cy="339" rx="8.5" ry="7.5" fill="${c.rg([[0, lt(a, .6)], [.5, a], [1, dk(a, .6)]], .35, .3, .8)}"${O}/><rect x="120.5" y="344" width="9" height="5" rx="1" fill="${c.metal(a)}"/>`;
      return s;
    }
  }
}

/* ---------- off hand (hand ~275,365) ---------- */
const FRONT = { watch: 1, cards: 1, rose: 1 };
function offW(c, it) {
  const { m, a, g, bl, r } = P(it);
  switch (it.variant) {
    case 'tome':
      return `<g transform="rotate(-8 272 404)"><rect x="248" y="372" width="50" height="64" rx="3" fill="${c.leather(m)}"${O}/><rect x="293" y="376" width="6" height="56" fill="${c.lg([[0, '#efe3c6'], [1, '#b8a682']])}"/><path d="M248 372 L258 372 L248 382 Z M248 436 L258 436 L248 426 Z M298 372 L288 372 L298 382 Z M298 436 L288 436 L298 426 Z" fill="${c.gold(a)}"/><path d="M262 384 L284 384 L284 424 L262 424 Z" fill="none" stroke="${c.gold(a)}" stroke-width="1.2"/><path d="M273 394 L280 404 L273 414 L266 404 Z" fill="${c.gem(g)}"/><rect x="292" y="398" width="9" height="10" rx="1" fill="${c.gold(a)}"${O}/></g>`;
    case 'briefcase':
      return `<path d="M262 390 C262 376 290 376 290 390" stroke="${c.leather(dk(m, .2))}" stroke-width="5" fill="none"/>`
        + `<path d="M242 400 C242 392 248 388 256 388 L296 388 C304 388 310 392 310 400 L313 456 L239 456 Z" fill="${c.gloss(mix(m, '#2a1a12', .4))}"${O}/><path d="M241 404 L311 404" stroke="#050405" stroke-width="1.4"/><rect x="270" y="398" width="12" height="11" rx="1.5" fill="${c.gold(a)}"${O}/><path d="M244 412 L245 452 M308 412 L309 452" stroke="${lt(m, .2)}" stroke-width=".8" stroke-dasharray="2.5 2" opacity=".7"/>`;
    case 'lantern':
      return `<circle cx="276" cy="434" r="44" fill="${g}" opacity=".35" filter="${c.blur(14)}" class="a-pulse"/>`
        + `<path d="M276 386 L276 412" stroke="${c.metal(a)}" stroke-width="2" stroke-dasharray="3 1.5"/><path d="M266 412 L286 412 L290 420 L262 420 Z" fill="${c.gloss(m)}"${O}/><rect x="262" y="420" width="28" height="36" fill="${c.gem(g)}"${O}/><path d="M262 420 L262 456 M276 420 L276 456 M290 420 L290 456" stroke="${c.gloss(m)}" stroke-width="2.4"/><path d="M260 456 L292 456 L288 464 L264 464 Z" fill="${c.gloss(m)}"${O}/>`;
    case 'cards': {
      let s = ''; [-34, -12, 10, 32].forEach((ang, i) => {
        s += `<g transform="rotate(${ang} 276 384)"><rect x="263" y="334" width="26" height="38" rx="2.5" fill="${c.lg([[0, lt(m, .12)], [1, dk(m, .3)]], 0, 0, 1, 1)}" stroke="${c.gold(a)}" stroke-width="1.2"/><rect x="266.5" y="337.5" width="19" height="31" rx="1.5" fill="none" stroke="${a}" stroke-width=".6" opacity=".7"/><path d="M276 344 L282 353 L276 362 L270 353 Z" fill="${i === 3 ? c.gem(g) : a}" opacity="${i === 3 ? 1 : .55}"/></g>`;
      });
      return s;
    }
    case 'rose':
      return `<path d="M276 356 C279 340 278 326 279 312" stroke="#1a2618" stroke-width="2.6" fill="none"/><path d="M278 336 C286 330 292 332 294 336 C288 340 282 340 278 336 Z" fill="#1e3020"/><path d="M279 344 L283 342 M277 326 L273 323" stroke="#1a2618" stroke-width="1.4"/>`
        + `<path d="M279 314 C266 312 264 298 270 292 C272 284 286 284 288 292 C294 298 292 312 279 314 Z" fill="${c.rg([[0, lt(g, .2)], [.6, g], [1, dk(g, .6)]], .45, .4, .7)}"${O}/><path d="M272 296 C276 292 282 292 286 297 M274 302 C278 298 283 299 285 304 C281 308 276 307 274 302" stroke="${dk(g, .55)}" stroke-width="1.1" fill="none"/>`;
    case 'watch': default:
      return `<path d="M271 388 C266 404 272 418 282 426" stroke="${c.gold(a)}" stroke-width="1.8" stroke-dasharray="2.6 1.4" fill="none"/><circle cx="284" cy="426" r="2.6" fill="none" stroke="${c.gold(a)}" stroke-width="1.6"/>`
        + `<circle cx="285" cy="444" r="15" fill="${c.gold(a)}"${O}/><circle cx="285" cy="444" r="11.5" fill="${c.rg([[0, '#fbf6e8'], [1, '#d8ccb0']], .4, .35, .8)}"/>`
        + [0, 1, 2, 3].map(i => { const an = i * Math.PI / 2; return `<path d="M${f1(285 + Math.cos(an) * 9)} ${f1(444 + Math.sin(an) * 9)} L${f1(285 + Math.cos(an) * 10.6)} ${f1(444 + Math.sin(an) * 10.6)}" stroke="#2a2018" stroke-width="1.2"/>`; }).join('')
        + `<path d="M285 444 L285 436.5 M285 444 L290 447" stroke="#1a1410" stroke-width="1.3" stroke-linecap="round"/>` + (r >= 2 ? `<circle cx="285" cy="444" r="1.6" fill="${c.gem(g)}"/>` : '');
  }
}

/* ---------- composer ---------- */
function figure(E, prefix = 'f') {
  const c = mk(prefix); let s = '';
  s += hairBack(c);
  if (E.cloak) s += cloakBack(c, E.cloak);
  s += baseLower(c);
  if (E.legs) s += legs(c, E.legs);
  if (E.feet) s += feet(c, E.feet);
  s += baseTorso(c);
  if (E.neck && !NECK_OVER[E.neck.variant]) s += neck(c, E.neck);
  if (E.chest) s += chest(c, E.chest);
  if (E.neck && NECK_OVER[E.neck.variant]) s += neck(c, E.neck);
  if (E.cloak) s += cloakFront(c, E.cloak);
  s += head(c);
  if (E.head) s += headItem(c, E.head);
  if (E.main) s += mainW(c, E.main);
  if (E.off && !FRONT[E.off.variant]) s += offW(c, E.off);
  s += hands(c, E.hands);
  if (E.ring) s += ringOn(c, E.ring);
  if (E.off && FRONT[E.off.variant]) s += offW(c, E.off);
  return { defs: c.defs.join(''), body: s };
}

/* ---------- stand-alone item art (icons) ---------- */
let measureSvg = null;
function bbox(markup) {
  if (!measureSvg) {
    measureSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    measureSvg.setAttribute('width', '400'); measureSvg.setAttribute('height', '600');
    measureSvg.style.cssText = 'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none';
    document.body.appendChild(measureSvg);
  }
  measureSvg.innerHTML = `<g>${markup}</g>`;
  try { const b = measureSvg.firstChild.getBBox(); return b.width ? b : null; } catch (e) { return null; }
}
function itemArt(it) {
  const c = mk('i'), solo = it.slot === 'hands' || it.slot === 'feet';
  c.icon = true;
  c.one = solo;
  let s = '';
  switch (it.slot) {
    case 'head': s = headItem(c, it); break;
    case 'neck': s = neck(c, it); break;
    case 'cloak': s = cloakBack(c, it) + cloakFront(c, it); break;
    case 'chest': s = chest(c, it); break;
    case 'legs': s = legs(c, it); break;
    case 'feet': s = feet(c, it); break;
    case 'hands': s = hands(c, it); break;
    case 'main': s = mainW(c, it); break;
    case 'off': s = offW(c, it); break;
    case 'ring': {
      const { a, g } = P(it), gd = c.gold(a);
      s = `<ellipse cx="200" cy="320" rx="34" ry="14" fill="none" stroke="${dk(a, .5)}" stroke-width="10"/><ellipse cx="200" cy="318" rx="34" ry="14" fill="none" stroke="${gd}" stroke-width="8"/>`;
      if (it.variant === 'band') s += `<path d="M168 322 C180 330 220 330 232 322" stroke="${lt(a, .5)}" stroke-width="1.4" fill="none"/>`;
      else if (it.variant === 'signet') s += `<ellipse cx="200" cy="302" rx="16" ry="11" fill="${gd}"${O}/><path d="M200 295 L207 302 L200 309 L193 302 Z" fill="${c.gem(g)}"/>`;
      else s += `<path d="M190 304 L192 292 L208 292 L210 304 Z" fill="${gd}"/><path d="M200 274 L212 288 L200 302 L188 288 Z" fill="${c.gem(g)}"${O}/><path d="M188 288 L212 288 M200 274 L200 302" stroke="${lt(g, .6)}" stroke-width=".8" opacity=".7"/>`;
    }
  }
  if (it.slot === 'main') s = `<g transform="rotate(38 125 380)">${s}</g>`;
  const defs = c.defs.join('');
  const b = bbox(`<defs>${defs}</defs>${s}`) || { x: 100, y: 100, width: 200, height: 300 };
  const pad = 8, sz = Math.max(b.width, b.height) + pad * 2, x = b.x + b.width / 2 - sz / 2, y = b.y + b.height / 2 - sz / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${f1(x)} ${f1(y)} ${f1(sz)} ${f1(sz)}"><defs>${defs}</defs>${s}</svg>`;
}
const toURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

/* =========================================================
   SCENES (backgrounds)
   ========================================================= */
const ANIM_CSS = `.a-fl{transform-box:fill-box;transform-origin:50% 100%;animation:aFl 1.3s ease-in-out infinite alternate}@keyframes aFl{0%{transform:scale(1,1) skewX(0)}50%{transform:scale(.93,1.08) skewX(2deg)}100%{transform:scale(1.05,.94) skewX(-2deg)}}.a-glw,.a-pulse{animation:aGlw 1.9s ease-in-out infinite alternate}@keyframes aGlw{from{opacity:.55}to{opacity:1}}.a-glw2{animation:aGlw2 6s ease-in-out infinite alternate}@keyframes aGlw2{from{opacity:.5}to{opacity:1}}.a-fog{animation:aFog 24s ease-in-out infinite alternate}.a-fogr{animation:aFog 31s ease-in-out infinite alternate-reverse}@keyframes aFog{from{transform:translateX(-30px)}to{transform:translateX(30px)}}.a-tw{animation:aTw 2.6s ease-in-out infinite alternate}@keyframes aTw{from{opacity:.15}to{opacity:1}}.a-emb{animation:aEmb 7s linear infinite}@keyframes aEmb{0%{transform:translate(0,0);opacity:0}10%{opacity:1}100%{transform:translate(24px,-470px);opacity:0}}.a-mote{animation:aMote 8s ease-in-out infinite alternate}@keyframes aMote{from{transform:translate(0,0);opacity:.15}to{transform:translate(14px,-28px);opacity:.8}}.a-float{animation:aFloat 7s ease-in-out infinite alternate}@keyframes aFloat{from{transform:translateY(0)}to{transform:translateY(-10px)}}@keyframes aRain{from{transform:translate(0,0)}to{transform:translate(-17px,60px)}}.a-rain{animation:aRain .55s linear infinite}.a-spin{transform-box:fill-box;transform-origin:50% 50%;animation:aSpin 40s linear infinite}@keyframes aSpin{to{transform:rotate(360deg)}}`;

function sceneCtx(id) {
  const c = mk('sc' + id + '_');
  c.b = {}; [3, 6, 10, 16, 28].forEach(n => c.b[n] = c.blur(n));
  return c;
}
const vign = c => `<rect width="400" height="600" fill="${c.rg([[0, '#000', 0], [.62, '#000', .05], [1, '#000', .82]], .5, .45, .75)}"/>`;
const motes = (c, n, col, x0 = 60, x1 = 340, y0 = 120, y1 = 520) => { let s = ''; for (let i = 0; i < n; i++) s += `<circle class="a-mote" style="animation-delay:-${(hash(i, 21) * 8).toFixed(2)}s" cx="${f1(x0 + hash(i, 22) * (x1 - x0))}" cy="${f1(y0 + hash(i, 23) * (y1 - y0))}" r="${f1(.7 + hash(i, 24) * 1.3)}" fill="${col}"/>`; return s; };
function flame(c, x, y, k = 1) {
  const o = `M${x - 18 * k} ${y} C${x - 24 * k} ${y - 24 * k} ${x - 8 * k} ${y - 36 * k} ${x - 6 * k} ${y - 56 * k} C${x} ${y - 40 * k} ${x + 4 * k} ${y - 46 * k} ${x + 6 * k} ${y - 68 * k} C${x + 16 * k} ${y - 46 * k} ${x + 26 * k} ${y - 30 * k} ${x + 18 * k} ${y} Z`;
  const i = `M${x - 9 * k} ${y} C${x - 12 * k} ${y - 14 * k} ${x - 3 * k} ${y - 22 * k} ${x} ${y - 36 * k} C${x + 5 * k} ${y - 22 * k} ${x + 13 * k} ${y - 14 * k} ${x + 9 * k} ${y} Z`;
  return `<g class="a-fl"><path d="${o}" fill="${c.lg([[0, '#ffb04a'], [.5, '#e0561a'], [1, '#7a1a0a', .2]], 0, 1, 0, 0)}"/><path d="${i}" fill="${c.lg([[0, '#fff3c4'], [1, '#ffc25a']], 0, 1, 0, 0)}"/></g>`;
}
function brazier(c, x, y) {
  const glow = c.rg([[0, '#ffb257', .55], [.35, '#d4601c', .2], [1, '#000', 0]], .5, .5, .5);
  return `<circle class="a-glw" cx="${x}" cy="${y - 20}" r="130" fill="${glow}"/>`
    + `<path d="M${x - 16} ${y + 90} L${x} ${y + 18} L${x + 16} ${y + 90} M${x} ${y + 18} L${x} ${y + 92}" stroke="#2b2420" stroke-width="5" fill="none"/>`
    + `<path d="M${x - 28} ${y} C${x - 26} ${y + 20} ${x + 26} ${y + 20} ${x + 28} ${y} Z" fill="${c.lg([[0, '#4a3b30'], [.5, '#1d1612'], [1, '#0c0907']])}" stroke="#0a0706"/>`
    + flame(c, x, y + 2, .9) + `<ellipse cx="${x}" cy="${y + 1}" rx="26" ry="4" fill="#ff7a2a" opacity=".55"/>`;
}
function pine(x, y, h, col) { let p = ''; for (let i = 0; i < 4; i++) { const w = h * (.42 - i * .07), yy = y - i * h * .22; p += `M${x - w} ${f1(yy)} L${x} ${f1(yy - h * .45)} L${x + w} ${f1(yy)} Z `; } return `<path d="${p} M${x - 3} ${y} L${x + 3} ${y} L${x + 3} ${y + 14} L${x - 3} ${y + 14} Z" fill="${col}"/>`; }
function deadTree(x, y, dir, col) {
  return `<path d="M${x} ${y} C${x + 4 * dir} ${y - 60} ${x - 6 * dir} ${y - 110} ${x + 10 * dir} ${y - 170} M${x + 2 * dir} ${y - 80} C${x + 30 * dir} ${y - 100} ${x + 48 * dir} ${y - 120} ${x + 56 * dir} ${y - 150} M${x - 2 * dir} ${y - 120} C${x - 24 * dir} ${y - 140} ${x - 34 * dir} ${y - 160} ${x - 30 * dir} ${y - 186} M${x + 8 * dir} ${y - 150} C${x + 20 * dir} ${y - 170} ${x + 34 * dir} ${y - 176} ${x + 40 * dir} ${y - 196} M${x + 40 * dir} ${y - 135} l${14 * dir} -6 M${x - 22 * dir} ${y - 148} l${-12 * dir} -4" stroke="${col}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M${x - 8} ${y} L${x + 8} ${y} L${x + 4} ${y - 70} L${x - 2} ${y - 70} Z" fill="${col}"/>`;
}

const SCENES = {
  crypta: { n: 'Angiportus', en: 'The Rain-Slick Alley', how: 'Where every vow begins.', rim: '#e0404a', make(c) {
    let s = `<rect width="400" height="600" fill="${c.lg([[0, '#090a0f'], [1, '#13151c']], 0, 0, 0, 1)}"/>`;
    for (let row = 0; row < 27; row++) { const y = row * 18, off = (row % 2) * 24; for (let x = -24 + off; x < 400; x += 48) { const k = hash(x + 90, row); s += `<rect x="${x + 1}" y="${y + 1}" width="46" height="16" fill="${k < .2 ? '#1b1c23' : k < .6 ? '#16171d' : '#121319'}"/>`; } }
    s += `<rect width="400" height="480" fill="${c.lg([[0, '#000', .55], [.3, '#000', .1], [.7, '#000', .1], [1, '#000', .6]])}"/>`;
    s += `<rect x="146" y="250" width="108" height="226" fill="#060609" stroke="#22232b" stroke-width="6"/><rect x="152" y="256" width="96" height="214" fill="${c.lg([[0, '#0d0d12'], [1, '#040406']], 0, 0, 0, 1)}"/>`;
    s += `<circle class="a-glw" cx="200" cy="232" r="70" fill="${c.rg([[0, '#ffcf8a', .45], [1, '#ffcf8a', 0]], .5, .5, .5)}"/><path d="M190 226 L210 226 L206 238 L194 238 Z" fill="#2a2620"/><ellipse cx="200" cy="238" rx="8" ry="3" fill="#ffe4b0"/>`;
    s += `<path d="M10 130 L130 130 M10 150 L130 150 M10 130 L10 210 M130 130 L130 210 M10 210 L130 210 M30 130 L30 210 M50 130 L50 210 M70 130 L70 210 M90 130 L90 210 M110 130 L110 210 M40 210 L60 330 M48 222 L64 222 M52 246 L68 246 M56 270 L72 270 M60 294 L76 294" stroke="#07070a" stroke-width="3" fill="none"/>`;
    s += `<g class="a-glw"><path d="M338 160 L364 196 L338 232 L312 196 Z" fill="none" stroke="#ff3040" stroke-width="7" opacity=".45" filter="${c.b[6]}"/><path d="M338 160 L364 196 L338 232 L312 196 Z" fill="none" stroke="#ff6a74" stroke-width="2.4"/><path d="M338 178 L351 196 L338 214 L325 196 Z" fill="none" stroke="#ffb0b6" stroke-width="1.4"/></g><ellipse cx="338" cy="196" rx="70" ry="80" fill="#ff2030" opacity=".08" filter="${c.b[16]}"/>`;
    s += `<path d="M46 520 L46 150 C46 130 60 120 76 120" stroke="#0a0a0d" stroke-width="7" fill="none"/><path d="M66 118 L88 118 L84 132 L70 132 Z" fill="#141418"/><ellipse cx="77" cy="133" rx="9" ry="3" fill="#ffe0a0"/>`;
    s += `<path d="M70 134 L84 134 L170 520 L-20 520 Z" fill="${c.lg([[0, '#ffd28a', .2], [1, '#ffd28a', 0]], 0, 0, 0, 1)}" filter="${c.b[6]}"/><circle class="a-glw" cx="77" cy="130" r="40" fill="${c.rg([[0, '#ffd28a', .55], [1, '#ffd28a', 0]], .5, .5, .5)}"/>`;
    s += `<rect y="476" width="400" height="124" fill="${c.lg([[0, '#0f1016'], [1, '#050508']], 0, 0, 0, 1)}"/><path d="M0 476 L400 476" stroke="#262832" stroke-width="2"/>`;
    s += `<ellipse cx="90" cy="540" rx="70" ry="9" fill="#ffd28a" opacity=".22" filter="${c.b[6]}"/><ellipse cx="320" cy="560" rx="60" ry="8" fill="#ff3040" opacity=".25" filter="${c.b[6]}"/><ellipse cx="200" cy="590" rx="140" ry="10" fill="#9aa4c0" opacity=".08" filter="${c.b[6]}"/>`;
    s += `<g class="a-fog"><ellipse cx="300" cy="500" rx="90" ry="22" fill="#9aa4c0" opacity=".1" filter="${c.b[16]}"/><ellipse cx="120" cy="510" rx="80" ry="18" fill="#9aa4c0" opacity=".08" filter="${c.b[16]}"/></g>`;
    let rain = ''; for (let row = -2; row < 11; row++) for (let i = 0; i < 9; i++) { const x = -60 + hash(i, 81) * 520 - 17 * row, y = row * 60 + hash(i, 82) * 60; rain += `M${f1(x)} ${f1(y)} l-3 16 `; }
    return { back: s, front: `<g class="a-rain"><path d="${rain}" stroke="#aeb8d4" stroke-width="1" opacity=".3"/></g>` + vign(c) };
  } },
  cathedra: { n: 'Ecclesia', en: 'The Nave at Night', how: 'Unlocked by your first perfect day.', rim: '#ffe6b0', make(c) {
    let s = `<rect width="400" height="600" fill="${c.lg([[0, '#15100c'], [1, '#090706']], 0, 0, 0, 1)}"/>`;
    const win = 'M146 340 L146 124 C146 72 172 40 200 26 C228 40 254 72 254 124 L254 340 Z';
    s += `<path d="${win}" fill="${c.lg([[0, '#fff6dc'], [.5, '#e8cc8a'], [1, '#7a5e36']], 0, 0, 0, 1)}"/>`;
    s += `<path d="M182 100 L182 340 M218 100 L218 340 M146 214 L254 214 M146 270 L254 270" stroke="#1a120c" stroke-width="4"/><circle cx="200" cy="78" r="16" fill="none" stroke="#1a120c" stroke-width="3.5"/><path d="M200 62 L200 94 M184 78 L216 78" stroke="#1a120c" stroke-width="2.5"/>`;
    s += `<path d="${win}" fill="none" stroke="#2c2119" stroke-width="12"/>`;
    s += `<g class="a-glw2"><path d="M150 150 L250 150 L338 600 L62 600 Z" fill="${c.lg([[0, '#fff0c8', .26], [1, '#ffe0a0', 0]], 0, 0, 0, 1)}" filter="${c.b[10]}"/><path d="M186 150 L214 150 L262 600 L138 600 Z" fill="${c.lg([[0, '#fff8e0', .24], [1, '#fff', 0]], 0, 0, 0, 1)}" filter="${c.b[6]}"/></g>`;
    [[96, 128, '#1c1612'], [272, 304, '#1c1612'], [16, 76, '#2a221c'], [324, 384, '#2a221c']].forEach(([x0, x1, col]) => { s += `<rect x="${x0}" y="0" width="${x1 - x0}" height="490" fill="${c.lg([[0, dk(col, .5)], [.4, lt(col, .1)], [1, dk(col, .6)]])}"/><rect x="${x0 - 6}" y="470" width="${x1 - x0 + 12}" height="22" fill="${dk(col, .2)}" stroke="#0a0706"/><path d="M${x0 + (x1 - x0) * .33} 0 L${x0 + (x1 - x0) * .33} 470 M${x0 + (x1 - x0) * .66} 0 L${x0 + (x1 - x0) * .66} 470" stroke="#000" stroke-width="1.2" opacity=".4"/>`; });
    s += `<rect y="490" width="400" height="110" fill="${c.lg([[0, '#221a14'], [1, '#0a0706']], 0, 0, 0, 1)}"/><ellipse cx="200" cy="556" rx="150" ry="26" fill="#ffe9b8" opacity=".14" filter="${c.b[10]}"/>`;
    s += motes(c, 18, '#fff1c8', 130, 270, 160, 540);
    return { back: s, front: vign(c) };
  } },
  nox: { n: 'Urbs Nocturna', en: 'The City at Night', how: 'Sleep 7h30 on 30 nights.', rim: '#8fa8ff', make(c) {
    let s = `<rect width="400" height="600" fill="${c.lg([[0, '#04050b'], [.6, '#0c0e22'], [1, '#2a1c3c']], 0, 0, 0, 1)}"/>`;
    for (let i = 0; i < 40; i++) s += `<circle ${i % 3 ? '' : 'class="a-tw"'} style="animation-delay:-${(hash(i, 34) * 3).toFixed(2)}s" cx="${f1(hash(i, 31) * 400)}" cy="${f1(hash(i, 32) * 220)}" r="${f1(.5 + hash(i, 33) * .9)}" fill="#e8eefc" opacity="${f1(.3 + hash(i, 35) * .5)}"/>`;
    s += `<circle cx="300" cy="96" r="80" fill="${c.rg([[0, '#cfd8ff', .28], [1, '#cfd8ff', 0]], .5, .5, .5)}"/><circle cx="300" cy="96" r="24" fill="${c.rg([[0, '#fbf8ee'], [1, '#c3bfae']], .4, .35, .8)}"/>`;
    const city = (y0, hmin, hmax, col, win, seed, step) => { let b = '', w = ''; for (let x = -10, i = 0; x < 410; i++) { const bw = step + Math.floor(hash(i, seed) * step), h = hmin + hash(i, seed + 1) * (hmax - hmin), top = y0 - h; b += `<rect x="${x}" y="${f1(top)}" width="${bw}" height="${f1(h + 200)}" fill="${col}"/>`; if (hash(i, seed + 2) < .25) b += `<path d="M${x + bw / 2 - 1} ${f1(top)} L${x + bw / 2} ${f1(top - 24 - hash(i, seed + 3) * 30)} L${x + bw / 2 + 1} ${f1(top)} Z" fill="${col}"/>`; for (let wy = top + 8; wy < y0 - 4; wy += 9) for (let wx = x + 4; wx < x + bw - 4; wx += 7) { const k = hash(wx * 7 + seed, wy); if (k < win) w += `<rect ${k < win * .15 ? 'class="a-tw"' : ''} x="${f1(wx)}" y="${f1(wy)}" width="2.6" height="3.6" fill="#ffd690" opacity="${f1(.35 + k * 2)}"/>`; } x += bw + 2; } return b + w; };
    s += city(400, 60, 170, '#11132a', .1, 11, 22);
    s += `<g class="a-fog"><ellipse cx="200" cy="390" rx="320" ry="26" fill="#8a7ab4" opacity=".14" filter="${c.b[10]}"/></g>`;
    s += city(470, 40, 140, '#08091a', .14, 41, 30);
    s += `<rect y="478" width="400" height="122" fill="${c.lg([[0, '#0c0c12'], [1, '#040406']], 0, 0, 0, 1)}"/><rect y="470" width="400" height="10" fill="#14141c"/><path d="M0 470 L400 470" stroke="#2a2a36" stroke-width="1.4"/>`;
    s += `<path d="M318 470 L322 410 M374 470 L370 410 M330 470 L334 430 M362 470 L358 430" stroke="#050508" stroke-width="3"/><path d="M314 410 L378 410 L380 350 C372 340 320 340 312 350 Z" fill="#07070b"/><path d="M308 350 L346 322 L384 350 Z" fill="#07070b"/><path d="M60 470 L60 390 M52 400 L68 400 M54 414 L66 414" stroke="#06060a" stroke-width="2.4"/>`;
    return { back: s, front: `<g class="a-fogr"><ellipse cx="200" cy="560" rx="280" ry="26" fill="#8a96b4" opacity=".1" filter="${c.b[10]}"/></g>` + vign(c) };
  } },
  ignis: { n: 'Ignis Aeternus', en: 'The Burning Wastes', how: '30 perfect days in a row.', rim: '#ff6a2a', make(c) {
    let s = `<rect width="400" height="600" fill="${c.lg([[0, '#0b0404'], [.45, '#2a0a06'], [.75, '#7a1e0a'], [1, '#b8420f']], 0, 0, 0, 1)}"/>`;
    s += `<g class="a-fog">${[[80, 120, 120, 40], [300, 90, 140, 46], [200, 170, 160, 40], [60, 230, 100, 30]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#1a0b08" opacity=".7" filter="${c.b[16]}"/>`).join('')}</g>`;
    s += `<path d="M178 250 C150 180 200 140 180 60 C230 120 250 170 222 250 Z" fill="#2a1210" opacity=".7" filter="${c.b[16]}"/>`;
    s += `<path d="M40 440 L168 252 L186 264 L212 258 L232 252 L360 440 Z" fill="${c.lg([[0, '#1d0e0b'], [1, '#090404']], 0, 0, 0, 1)}"/>`;
    s += `<ellipse class="a-glw" cx="200" cy="258" rx="34" ry="10" fill="#ff7a2a" filter="${c.b[6]}"/>`;
    const lava = 'M196 262 C190 300 176 330 170 372 C166 400 156 420 150 440 M214 260 C222 300 238 336 246 380 M206 262 C204 300 210 340 206 400';
    s += `<path d="${lava}" stroke="#ff6a1a" stroke-width="6" fill="none" opacity=".5" filter="${c.b[3]}"/><path d="${lava}" stroke="#ffb24a" stroke-width="2" fill="none"/>`;
    s += `<path d="M0 440 L60 420 L120 446 L180 428 L240 450 L310 424 L400 444 L400 520 L0 520 Z" fill="#120706"/>`;
    s += `<path d="M0 500 C120 486 280 486 400 500 L400 600 L0 600 Z" fill="${c.lg([[0, '#160908'], [1, '#050202']], 0, 0, 0, 1)}"/>`;
    const cr = 'M40 540 L90 552 L120 548 L150 566 M260 556 L300 546 L340 560 L380 548 M170 590 L210 578 L240 590';
    s += `<path d="${cr}" stroke="#ff5a14" stroke-width="5" fill="none" opacity=".45" filter="${c.b[3]}"/><path d="${cr}" stroke="#ff8a2a" stroke-width="1.5" fill="none"/>`;
    for (let i = 0; i < 26; i++) s += `<circle class="a-emb" style="animation-delay:-${(hash(i, 41) * 7).toFixed(2)}s;animation-duration:${(5 + hash(i, 42) * 5).toFixed(1)}s" cx="${f1(hash(i, 43) * 400)}" cy="${f1(560 + hash(i, 44) * 40)}" r="${f1(.9 + hash(i, 45) * 1.6)}" fill="${i % 3 ? '#ffb35a' : '#ffe08a'}"/>`;
    return { back: s, front: vign(c) };
  } },
  sanguis: { n: 'Luna Sanguinis', en: 'Blood Moon over the Graves', how: 'Reach level 10.', rim: '#ff3a2a', make(c) {
    let s = `<rect width="400" height="600" fill="${c.lg([[0, '#080304'], [.5, '#1f0607'], [1, '#3a0b0d']], 0, 0, 0, 1)}"/>`;
    s += `<circle cx="200" cy="200" r="180" fill="${c.rg([[0, '#b02a24', .38], [1, '#b02a24', 0]], .5, .5, .5)}"/><circle cx="200" cy="200" r="104" fill="${c.rg([[0, '#e0503e'], [.55, '#a4241e'], [1, '#580c0e']], .4, .38, .75)}"/>`;
    [[170, 170, 18, 12], [232, 214, 26, 18], [190, 246, 12, 8], [246, 160, 10, 7], [150, 220, 9, 7]].forEach(([x, y, rx, ry]) => s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#4a0a0c" opacity=".28"/>`);
    s += `<g class="a-fog"><path d="M-40 230 C60 222 160 236 260 226 C320 220 380 228 440 222 L440 232 C360 240 280 236 200 242 C100 248 20 240 -40 242 Z" fill="#0d0405" opacity=".85" filter="${c.b[3]}"/><path d="M-40 168 C80 160 200 172 300 164 L440 166 L440 172 C320 176 200 180 60 176 L-40 178 Z" fill="#0d0405" opacity=".7" filter="${c.b[3]}"/></g>`;
    s += `<path d="M-30 486 C40 410 150 418 220 486 Z M180 494 C250 430 360 432 430 494 Z" fill="#0d0506"/>`;
    s += `<path d="M108 452 L120 400 L132 452 Z M300 460 L308 414 L320 412 L326 460 Z M152 462 L156 426 L166 428 L168 462 Z" fill="#160a0b"/>`;
    s += deadTree(30, 520, 1, '#060203') + deadTree(372, 528, -1, '#060203');
    { let f = ''; for (let x = 4; x < 400; x += 11) f += `M${x} 520 L${x} 470 M${x - 3} 474 L${x} 466 L${x + 3} 474 `; s += `<path d="${f} M0 482 L400 482 M0 510 L400 510" stroke="#050203" stroke-width="2.2" fill="none"/>`; }
    s += `<rect y="486" width="400" height="114" fill="${c.lg([[0, '#0c0506'], [1, '#040102']], 0, 0, 0, 1)}"/>`;
    return { back: s, front: `<g class="a-fogr"><ellipse cx="200" cy="560" rx="300" ry="34" fill="#5a1a1c" opacity=".22" filter="${c.b[10]}"/></g>` + vign(c) };
  } },
  aurum: { n: 'Aula Aurea', en: 'The Gilded Hall', how: 'Find your first legendary.', rim: '#ffd27a', make(c) {
    let s = `<rect width="400" height="600" fill="${c.lg([[0, '#0d0a06'], [1, '#050403']], 0, 0, 0, 1)}"/>`;
    let rays = ''; for (let i = 0; i <= 36; i++) { const an = Math.PI + i / 36 * Math.PI; rays += `M200 470 L${f1(200 + Math.cos(an) * 330)} ${f1(470 + Math.sin(an) * 330)} `; }
    s += `<path d="${rays}" stroke="#c9a24e" stroke-width="1.2" opacity=".2"/>`;
    [120, 190, 260].forEach((r, i) => s += `<path d="M${200 - r} 470 A${r} ${r} 0 0 1 ${200 + r} 470" stroke="#c9a24e" stroke-width="${2 - i * .4}" fill="none" opacity=".35"/>`);
    s += `<g class="a-glw2"><circle cx="200" cy="300" r="170" fill="${c.rg([[0, '#ffd27a', .22], [1, '#ffd27a', 0]], .5, .5, .5)}"/></g>`;
    s += `<path d="M108 470 L108 160 L128 160 L128 132 L148 132 L148 110 L252 110 L252 132 L272 132 L272 160 L292 160 L292 470" stroke="${c.gold('#c9a24e')}" stroke-width="3" fill="none"/><path d="M116 470 L116 168 L136 168 L136 140 L156 140 L156 118 L244 118 L244 140 L264 140 L264 168 L284 168 L284 470" stroke="#c9a24e" stroke-width="1" fill="none" opacity=".5"/>`;
    [[16, 70], [330, 384]].forEach(([x0, x1]) => { s += `<rect x="${x0}" y="40" width="${x1 - x0}" height="430" fill="${c.lg([[0, '#050403'], [.45, '#1c160c'], [1, '#050403']])}"/>`; for (let x = x0 + 8; x < x1 - 4; x += 9) s += `<path d="M${x} 70 L${x} 444" stroke="#c9a24e" stroke-width=".8" opacity=".45"/>`; s += `<path d="M${x0 - 6} 40 L${x1 + 6} 40 L${x1 + 6} 52 L${x1} 52 L${x1} 62 L${x0} 62 L${x0} 52 L${x0 - 6} 52 Z" fill="${c.gold('#c9a24e')}"/><rect x="${x0 - 6}" y="452" width="${x1 - x0 + 12}" height="18" fill="${c.gold('#c9a24e')}"/>`; });
    s += `<rect y="470" width="400" height="130" fill="${c.lg([[0, '#1a1409'], [1, '#050403']], 0, 0, 0, 1)}"/><path d="M0 470 L400 470" stroke="#d9b45e" stroke-width="2"/>`;
    [[200, 520, 1], [90, 540, .8], [310, 540, .8], [200, 580, 1.2], [40, 585, .9], [360, 585, .9]].forEach(([x, y, k]) => s += `<path d="M${x} ${f1(y - 8 * k)} L${f1(x + 20 * k)} ${y} L${x} ${f1(y + 8 * k)} L${f1(x - 20 * k)} ${y} Z" fill="none" stroke="#c9a24e" stroke-width="1" opacity=".5"/>`);
    s += `<ellipse cx="200" cy="556" rx="140" ry="22" fill="#ffd27a" opacity=".14" filter="${c.b[10]}"/>` + motes(c, 20, '#ffd98a', 40, 360, 60, 520);
    return { back: s, front: vign(c) };
  } },
  abyssus: { n: 'Abyssus', en: 'The Abyss', how: 'Reach level 30.', rim: '#a070ff', make(c) {
    let s = `<rect width="400" height="600" fill="#05030a"/>`;
    [[90, 140, 120, '#2a1450', .55], [320, 220, 140, '#14204a', .5], [200, 380, 160, '#3a1040', .35]].forEach(([x, y, r, col, o]) => s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="${o}" filter="${c.b[28]}"/>`);
    for (let i = 0; i < 40; i++) s += `<circle ${i % 2 ? 'class="a-tw"' : ''} style="animation-delay:-${(hash(i, 51) * 3).toFixed(2)}s" cx="${f1(hash(i, 52) * 400)}" cy="${f1(hash(i, 53) * 480)}" r="${f1(.5 + hash(i, 54))}" fill="#d9c4ff" opacity=".7"/>`;
    [[70, 200, 1], [330, 150, .8], [300, 360, .6], [60, 400, .7]].forEach(([x, y, k], i) => s += `<g class="a-float" style="animation-delay:-${i * 1.7}s"><path d="M${x - 40 * k} ${y} L${x + 36 * k} ${y - 6 * k} L${x + 22 * k} ${y + 22 * k} L${x} ${y + 48 * k} L${x - 18 * k} ${y + 20 * k} Z" fill="#140e1c" stroke="#3a2350"/><path d="M${x - 18 * k} ${y + 20 * k} L${x} ${y + 48 * k} L${x + 22 * k} ${y + 22 * k}" stroke="#9b5de5" stroke-width="2" fill="none" opacity=".55" filter="${c.b[3]}"/></g>`);
    let runes = ''; for (let i = 0; i < 24; i++) runes += `<path d="M-4 -152 L4 -152 L0 -138 Z M-2 -132 L2 -132 L2 -124 L-2 -124 Z" transform="rotate(${i * 15})" fill="#c9a0ff"/>`;
    s += `<ellipse cx="200" cy="560" rx="180" ry="40" fill="#9b5de5" opacity=".2" filter="${c.b[16]}"/><g transform="translate(200 560) scale(1 .24)"><g class="a-spin"><circle r="160" fill="none" stroke="#9b5de5" stroke-width="4"/><circle r="118" fill="none" stroke="#7a4ad0" stroke-width="2"/>${runes}</g></g>`;
    return { back: s, front: vign(c) };
  } },
};
const sceneCache = new Map();
function scene(id) {
  if (!SCENES[id]) id = 'crypta';
  if (!sceneCache.has(id)) { const c = sceneCtx(id), m = SCENES[id].make(c); sceneCache.set(id, { defs: c.defs.join(''), back: m.back, front: m.front, rim: SCENES[id].rim }); }
  return sceneCache.get(id);
}
function sceneThumb(id) { const s = scene(id); return toURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><style>${ANIM_CSS}</style><defs>${s.defs}</defs>${s.back}${s.front}</svg>`); }

/* stage-wide defs: grain, lighting, silhouette mask, aura */
function stageDefs(rim, aura, px = 'st') {
  return `<filter id="${px}grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="t"/><feColorMatrix in="t" type="saturate" values="0" result="g"/><feComponentTransfer in="g" result="g2"><feFuncR type="linear" slope=".5" intercept=".25"/><feFuncG type="linear" slope=".5" intercept=".25"/><feFuncB type="linear" slope=".5" intercept=".25"/><feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer><feComposite in="g2" in2="SourceAlpha" operator="in" result="gm"/><feBlend in="gm" in2="SourceGraphic" mode="soft-light"/></filter>`
    + `<filter id="${px}white"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>`
    + `<mask id="${px}figm" maskUnits="userSpaceOnUse" x="-50" y="-50" width="500" height="700"><use href="#${px}fig" filter="url(#${px}white)"/></mask>`
    + `<linearGradient id="${px}lightG" gradientUnits="userSpaceOnUse" x1="90" y1="60" x2="310" y2="580"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#808080" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>`
    + `<linearGradient id="${px}rimG" gradientUnits="userSpaceOnUse" x1="90" y1="0" x2="310" y2="0"><stop offset="0" stop-color="${rim}" stop-opacity=".42"/><stop offset=".2" stop-color="${rim}" stop-opacity="0"/><stop offset=".8" stop-color="${rim}" stop-opacity="0"/><stop offset="1" stop-color="${rim}" stop-opacity=".42"/></linearGradient>`
    + `<filter id="${px}blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`
    + (aura ? `<filter id="${px}aura" x="-20%" y="-20%" width="140%" height="140%"><feFlood flood-color="${aura}" result="f"/><feComposite in="f" in2="SourceAlpha" operator="in" result="s"/><feMorphology in="s" operator="dilate" radius="2" result="d"/><feGaussianBlur in="d" stdDeviation="7" result="bl"/><feComponentTransfer in="bl"><feFuncA type="linear" slope=".55"/></feComponentTransfer></filter>` : '');
}
/* full stage: scene + hero + lighting. One per document (ids prefixed). */
function stage(E, bgId, opts = {}) {
  const px = opts.px || 'st', f = figure(E, px + 'f'), sc = scene(bgId);
  const aura = E.ring && E.ring.r >= 2 ? E.ring.pal.g : (Object.values(E).filter(i => i && i.r === 3).length >= 4 ? '#CDAB58' : null);
  let spark = '';
  const nl = Object.values(E).filter(i => i && i.r === 3).length;
  for (let i = 0; i < nl * 2; i++) spark += `<path class="a-tw" style="animation-delay:-${(hash(i, 71) * 2.6).toFixed(2)}s" transform="translate(${f1(90 + hash(i, 72) * 220)} ${f1(80 + hash(i, 73) * 440)})" d="M0 -5 L1.2 -1.2 L5 0 L1.2 1.2 L0 5 L-1.2 1.2 L-5 0 L-1.2 -1.2 Z" fill="#fff1c4"/>`;
  return `<svg viewBox="0 0 400 600" xmlns="http://www.w3.org/2000/svg" class="stage-svg" role="img" aria-label="${opts.label || 'Your character'}">`
    + (opts.css ? `<style>${ANIM_CSS}</style>` : '')
    + `<defs>${stageDefs(sc.rim, aura, px)}${f.defs}${sc.defs}</defs>${sc.back}`
    + `<ellipse cx="200" cy="558" rx="80" ry="11" fill="#000" opacity=".6" filter="url(#${px}blur)"/>`
    + `<g transform="translate(20 30) scale(.9)">${aura ? `<use href="#${px}fig" filter="url(#${px}aura)"/>` : ''}<g id="${px}fig" filter="url(#${px}grain)">${f.body}</g>`
    + `<rect width="400" height="600" fill="url(#${px}lightG)" mask="url(#${px}figm)" style="mix-blend-mode:soft-light"/><rect width="400" height="600" fill="url(#${px}rimG)" mask="url(#${px}figm)" style="mix-blend-mode:screen"/></g>`
    + spark + sc.front + `</svg>`;
}

/* =========================================================
   ICONS (engraved line art, 24×24) & WAX SEALS
   ========================================================= */
const ICONS = {
  sword: '<path d="M20 4 L10.5 13.5 M20 4 l-.6 3.4 M20 4 l-3.4 .6 M6.5 12.5 l5 5 M9 15 l-4.6 4.6"/><circle cx="3.6" cy="20.4" r="1.1"/>',
  meat: '<path d="M15 3c3.3 0 6 2.7 6 6 0 3.1-2.4 5.6-5.4 6l-3.4 3.4"/><path d="M15 3C11.7 3 9 5.7 9 9c0 .9.2 1.7.5 2.5l-3 3"/><path d="M6.5 14.5a2.1 2.1 0 1 0-2 3.2 2.1 2.1 0 1 0 3.2 2 L12.2 15"/><path d="M14 7.5c1.5 0 2.5 1 2.5 2.5"/>',
  flame: '<path d="M12 2.5c2 4 6.5 6 6.5 11.2a6.5 6.5 0 0 1-13 0c0-3 2-5.2 3.2-6.2 0 2 .9 3.6 2.4 4.2C11 7.8 10.6 5.4 12 2.5z"/><path d="M12 20a2.6 2.6 0 0 1-2.6-2.6c0-1.6 1.6-3 2.6-4.4 1 1.4 2.6 2.8 2.6 4.4A2.6 2.6 0 0 1 12 20z"/>',
  drop: '<path d="M12 3c3 4.5 6.5 7.8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 10.8 9 7.5 12 3z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/><path d="M9.5 19.5h5M10.5 9h3"/>',
  key: '<circle cx="8" cy="8" r="4.2"/><path d="M11 11l9.5 9.5M16 16l2.2-2.2M18.4 18.4l2.2-2.2"/><circle cx="8" cy="8" r="1.4"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/><path d="M15.5 5.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z"/>',
  scale: '<path d="M12 3v18M7.5 21h9M4 7h16M12 3l-1.5 1.5M12 3l1.5 1.5"/><path d="M6.5 7l-3 6.5a3 3 0 0 0 6 0L6.5 7M17.5 7l-3 6.5a3 3 0 0 0 6 0L17.5 7"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="6"/><path d="M12 8.5v7M10 10.4c.3-.8 1-1.2 2-1.2 1.2 0 2 .6 2 1.4 0 1.9-4 1-4 2.9 0 .8.8 1.4 2 1.4 1 0 1.7-.4 2-1.2"/>',
  crown: '<path d="M3.5 18.5h17M4.5 18.5L3 8.5l5 4 4-7.5 4 7.5 5-4-1.5 10"/><circle cx="12" cy="14.5" r="1.2"/>',
  star: '<path d="M12 2.5l2 6.6 6.8-1.9-4.3 5 4.3 5-6.8-1.9-2 6.6-2-6.6-6.8 1.9 4.3-5-4.3-5 6.8 1.9z"/>',
  skull: '<path d="M12 3a7.5 7.5 0 0 0-7.5 7.5c0 2.6 1.1 4.4 2.8 5.5V19h9.4v-3c1.7-1.1 2.8-2.9 2.8-5.5A7.5 7.5 0 0 0 12 3z"/><circle cx="9" cy="11.5" r="1.7"/><circle cx="15" cy="11.5" r="1.7"/><path d="M10 19v2.5M12 19v2.5M14 19v2.5M12 14l-.8 1.6h1.6z"/>',
  lozenge: '<path d="M12 2l7.5 10L12 22 4.5 12z"/><path d="M12 7l3.8 5L12 17l-3.8-5z"/>',
  shield: '<path d="M12 2.5l8 2.8v6c0 5-3.4 8.8-8 10.7-4.6-1.9-8-5.7-8-10.7v-6z"/><path d="M12 6.5v11M7.5 10.5h9"/>',
  chest: '<path d="M3 10.5h18v9.5H3zM3 10.5C3 6.5 7 4 12 4s9 2.5 9 6.5M3 14h18"/><path d="M10.5 12.5h3v4h-3z"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3.2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.3"/>',
  book: '<path d="M4 4.5h6a2 2 0 0 1 2 2V20a2 2 0 0 0-2-2H4zM20 4.5h-6a2 2 0 0 0-2 2V20a2 2 0 0 1 2-2h6z"/><path d="M6.5 8h3M6.5 11h3M14.5 8h3M14.5 11h3"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11M12 15v2.5"/>',
  helm: '<path d="M4.5 20v-7.5a7.5 7.5 0 0 1 15 0V20h-5.5l-.8-6h-2.4l-.8 6z"/><path d="M12 5V2.5M4.5 12.5h15"/>',
  rest: '<path d="M4 18h16M6 18v-5a6 6 0 0 1 12 0v5"/><path d="M15 3h4l-4 4h4"/>',
};
function icon(name, cls = '') { return `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`; }

const sealCache = new Map();
function seal(name, on) {
  const key = name + on; if (sealCache.has(key)) return sealCache.get(key);
  const base = on ? '#8e1b1d' : '#2c2527', hi = on ? '#d0473e' : '#4a4144', lo = on ? '#3e0709' : '#141012', ink = on ? '#e4be66' : '#3c3335';
  let d = ''; for (let i = 0; i <= 60; i++) { const a = i / 60 * Math.PI * 2, r = 52 + Math.sin(a * 7) * 2.2 + Math.sin(a * 13 + 1) * 1.4 + (hash(i, 9) - .5) * 2.6; d += (i ? 'L' : 'M') + f1(60 + Math.cos(a) * r) + ' ' + f1(60 + Math.sin(a) * r); } d += 'Z';
  const ic = ICONS[name] || ICONS.star;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><radialGradient id="w" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${lo}"/></radialGradient><filter id="b"><feGaussianBlur stdDeviation="3"/></filter></defs>`
    + `<ellipse cx="62" cy="66" rx="52" ry="50" fill="#000" opacity=".45" filter="url(#b)"/><path d="${d}" fill="url(#w)"/>`
    + `<circle cx="60" cy="60" r="39" fill="none" stroke="${lo}" stroke-width="3.5"/><circle cx="60" cy="60" r="36.5" fill="none" stroke="${hi}" stroke-width="1" opacity=".55"/>`
    + `<g transform="translate(36 36) scale(2)" fill="none" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(.5 .5)" stroke="${lo}" stroke-width="2.2">${ic}</g><g transform="translate(-.4 -.4)" stroke="${hi}" stroke-width="1.6" opacity=".7">${ic}</g><g stroke="${ink}" stroke-width="1.5">${ic}</g></g>`
    + `<ellipse cx="42" cy="34" rx="16" ry="8" fill="#fff" opacity="${on ? .16 : .06}" transform="rotate(-30 42 34)" filter="url(#b)"/></svg>`;
  const u = toURL(svg); sealCache.set(key, u); return u;
}

/* corner filigree for panels */
function corners() {
  const p = '<path d="M1 29V1H29" stroke="#8a6f32" stroke-width="1" fill="none"/><path d="M5 26V5H26" stroke="#CDAB58" stroke-width=".7" fill="none" opacity=".8"/><path d="M9 18V9H18" stroke="#CDAB58" stroke-width=".6" fill="none" opacity=".5"/><path d="M5 1L9 5L5 9L1 5Z" fill="#CDAB58"/>';
  const w = t => `url("${toURL(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30"><g transform="${t}">${p}</g></svg>`)}")`;
  return { tl: w(''), tr: w('matrix(-1 0 0 1 30 0)'), bl: w('matrix(1 0 0 -1 0 30)'), br: w('matrix(-1 0 0 -1 30 30)') };
}

window.RitusArt = { figure, stage, itemArt, NECK_OVER, toURL, scene, sceneThumb, SCENES, stageDefs, icon, ICONS, seal, corners, ANIM_CSS, FRONT };
})();
