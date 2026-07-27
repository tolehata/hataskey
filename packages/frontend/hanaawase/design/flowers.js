// 花常 — 花のピース図案（すべて完全オリジナル）
// viewBox 64x64 / フラット塗り + 影1段 / 輪郭 墨 #2b2620 2px / 色と形の両方で判別
const INK = '#2b2620';
const r = (v) => Math.round(v * 10) / 10;

// ---- 汎用: 花弁パス生成 ----
function petal(cx, cy, deg, r0, r1, w, kind) {
  const a = (deg - 90) * Math.PI / 180;
  const dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
  const bx = cx + dx * r0, by = cy + dy * r0;
  const tx = cx + dx * r1, ty = cy + dy * r1;
  const blx = bx + px * w / 2, bly = by + py * w / 2;
  const brx = bx - px * w / 2, bry = by - py * w / 2;
  const mlx = cx + dx * (r1 * 0.6) + px * w / 2, mly = cy + dy * (r1 * 0.6) + py * w / 2;
  const mrx = cx + dx * (r1 * 0.6) - px * w / 2, mry = cy + dy * (r1 * 0.6) - py * w / 2;
  const R = (n) => r(n);
  if (kind === 'point') {
    return `M${R(blx)} ${R(bly)} Q${R(mlx)} ${R(mly)} ${R(tx)} ${R(ty)} Q${R(mrx)} ${R(mry)} ${R(brx)} ${R(bry)} Z`;
  }
  if (kind === 'cleft') { // 桜: 先端に切れ込み
    const tlx = tx - dx * (r1 * 0.14) + px * (w * 0.16), tly = ty - dy * (r1 * 0.14) + py * (w * 0.16);
    const trx = tx - dx * (r1 * 0.14) - px * (w * 0.16), try_ = ty - dy * (r1 * 0.14) - py * (w * 0.16);
    const nx = tx - dx * (r1 * 0.30), ny = ty - dy * (r1 * 0.30);
    return `M${R(blx)} ${R(bly)} Q${R(mlx)} ${R(mly)} ${R(tlx)} ${R(tly)} Q${R(nx)} ${R(ny)} ${R(trx)} ${R(try_)} Q${R(mrx)} ${R(mry)} ${R(brx)} ${R(bry)} Z`;
  }
  // round（梅）
  const olx = tx + px * (w * 0.34), oly = ty + py * (w * 0.34);
  const orx = tx - px * (w * 0.34), ory = ty - py * (w * 0.34);
  return `M${R(blx)} ${R(bly)} C${R(mlx)} ${R(mly)} ${R(olx)} ${R(oly)} ${R(tx)} ${R(ty)} C${R(orx)} ${R(ory)} ${R(mrx)} ${R(mry)} ${R(brx)} ${R(bry)} Z`;
}

function svgEl(sh, overrideFill, stroke) {
  const fill = overrideFill || sh.fill || 'none';
  const st = stroke ? ` stroke="${INK}" stroke-width="2"` : '';
  if (sh.t === 'c') return `<circle cx="${sh.cx}" cy="${sh.cy}" r="${sh.r}" fill="${fill}"${st}/>`;
  if (sh.t === 'r') return `<rect x="${sh.x}" y="${sh.y}" width="${sh.w}" height="${sh.h}"${sh.rx ? ` rx="${sh.rx}"` : ''} fill="${fill}"${st}/>`;
  if (sh.t === 'p') return `<polygon points="${sh.pts}" fill="${fill}"${st}/>`;
  if (sh.t === 'l') return `<path d="${sh.d}" fill="none" stroke="${overrideFill || sh.stroke}" stroke-width="${sh.sw || 2}" stroke-linecap="round"/>`;
  return `<path d="${sh.d}" fill="${fill}"${st}/>`;
}

function build(shapes, shadow, extra) {
  const back = shapes.filter(s => s.t !== 'l');
  const s = back.map(sh => svgEl(sh, shadow, false)).join('');
  const m = shapes.map(sh => svgEl(sh, null, true)).join('');
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block;overflow:visible" aria-hidden="true">`
    + `<g transform="translate(1.3,2.1)" opacity="0.55">${s}</g>`
    + `<g stroke-linejoin="round" stroke-linecap="round">${m}</g>${extra || ''}</svg>`;
}

// ---------- 6種の季節花 ----------
// 松: 三段三角 + 幹
const matsu = build([
  { t: 'r', x: 29, y: 42, w: 6, h: 16, fill: '#6b4a2e' },
  { t: 'p', pts: '32,32 12,52 52,52', fill: '#2f6e4f' },
  { t: 'p', pts: '32,20 17,40 47,40', fill: '#2f6e4f' },
  { t: 'p', pts: '32,9 21,27 43,27', fill: '#2f6e4f' },
], '#1c4230');

// 梅: 丸5弁 + 蕊
const ume = build([
  ...[0, 72, 144, 216, 288].map(d => ({ d: petal(32, 33, d, 5, 27, 20, 'round'), fill: '#c4383d' })),
  { t: 'c', cx: 32, cy: 33, r: 6, fill: '#f2d98c' },
], '#8f272b');

// 桜: 切れ込み5弁 + 中心
const sakura = build([
  ...[0, 72, 144, 216, 288].map(d => ({ d: petal(32, 33, d, 4, 28, 21, 'cleft'), fill: '#f2a7b8' })),
  { t: 'c', cx: 32, cy: 33, r: 5, fill: '#b3556e' },
], '#c77d90');

// 紫陽花: 4弁の小花を4つ束ねる
function floret(fx, fy, s) {
  return [0, 90, 180, 270].map(d => ({ d: petal(fx, fy, d, 1.5 * s, 8 * s, 8 * s, 'round'), fill: '#7b86c8' }))
    .concat([{ t: 'c', cx: fx, cy: fy, r: 2.4 * s, fill: '#f4efe3' }]);
}
const ajisai = build([
  ...floret(32, 20, 1), ...floret(20, 34, 1), ...floret(44, 34, 1), ...floret(32, 46, 1),
], '#4d579a');

// 向日葵: 放射花弁 + 茶中心
const himawari = build([
  ...Array.from({ length: 14 }, (_, i) => ({ d: petal(32, 32, i * (360 / 14), 12, 30, 8, 'point'), fill: '#f2b135' })),
  { t: 'c', cx: 32, cy: 32, r: 12, fill: '#7a4a26' },
], '#c98a1f');

// 菊: 細弁多数（二重） + 中心
const kiku = build([
  ...Array.from({ length: 18 }, (_, i) => ({ d: petal(32, 32, i * 20, 8, 30, 5, 'point'), fill: '#f4efe3' })),
  ...Array.from({ length: 12 }, (_, i) => ({ d: petal(32, 32, i * 30 + 15, 5, 20, 5, 'point'), fill: '#f4efe3' })),
  { t: 'c', cx: 32, cy: 32, r: 7, fill: '#c9a04e' },
], '#cfc6b0');

// ---------- 特殊3種 ----------
// 短冊: 縦長札 + 朱帯 + 消去方向の矢印
const tanzaku = build([
  { t: 'r', x: 20, y: 6, w: 24, h: 52, fill: '#f4efe3' },
  { t: 'r', x: 20, y: 6, w: 24, h: 9, fill: '#c4383d' },
  { t: 'l', d: 'M32 22 L32 50', stroke: INK, sw: 2 },
  { t: 'l', d: 'M27 45 L32 51 L37 45', stroke: INK, sw: 2 },
], '#cfc6b0');

// 鞠: 円 + 手鞠の三分割 + 三色面
const mari = build([
  { t: 'c', cx: 32, cy: 32, r: 24, fill: '#c4383d' },
  { d: 'M32 8 A24 24 0 0 1 53 44 L32 32 Z', fill: '#2d4a73' },
  { d: 'M53 44 A24 24 0 0 1 11 44 L32 32 Z', fill: '#c9a04e' },
  { t: 'l', d: 'M32 8 L32 32 M53 44 L32 32 M11 44 L32 32', stroke: INK, sw: 1.6 },
  { t: 'c', cx: 32, cy: 32, r: 3, fill: '#f4efe3' },
], '#8f272b');

// 月: 淡金の満月 + 細い雲一筋（クレーターなし）
const tsuki = build([
  { t: 'c', cx: 32, cy: 32, r: 24, fill: '#e8d9a8' },
  { d: 'M12 38 Q26 33 40 38 Q52 42 54 38', fill: 'none' },
  { t: 'l', d: 'M13 37 Q27 31 41 37 Q51 41 53 37', stroke: '#2b2620', sw: 3 },
], '#c9b988');

// ---------- 花びら1枚（パーティクル流用） ----------
function petalOne(fill, kind) {
  const d = petal(32, 40, 0, 2, 34, 20, kind || 'round');
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block;overflow:visible" aria-hidden="true">`
    + `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

export const FLOWERS = {
  matsu: { name: '松', color: '#2f6e4f', svg: matsu, petal: petalOne('#2f6e4f', 'point') },
  ume: { name: '梅', color: '#c4383d', svg: ume, petal: petalOne('#c4383d', 'round') },
  sakura: { name: '桜', color: '#f2a7b8', svg: sakura, petal: petalOne('#f2a7b8', 'cleft') },
  ajisai: { name: '紫陽花', color: '#7b86c8', svg: ajisai, petal: petalOne('#7b86c8', 'round') },
  himawari: { name: '向日葵', color: '#f2b135', svg: himawari, petal: petalOne('#f2b135', 'point') },
  kiku: { name: '菊', color: '#f4efe3', svg: kiku, petal: petalOne('#f4efe3', 'point') },
};
export const SPECIALS = {
  tanzaku: { name: '短冊', svg: tanzaku },
  mari: { name: '鞠', svg: mari },
  tsuki: { name: '月', svg: tsuki },
};
// 椿（撃破演出の冬の花）
export const TSUBAKI = build([
  ...[0, 72, 144, 216, 288].map(d => ({ d: petal(32, 33, d, 3, 27, 22, 'round'), fill: '#c4383d' })),
  { t: 'c', cx: 32, cy: 33, r: 6, fill: '#f2d98c' },
  ...Array.from({ length: 6 }, (_, i) => ({ t: 'c', cx: 32 + Math.cos(i) * 4, cy: 33 + Math.sin(i) * 4, r: 1.4, fill: '#7a4a26' })),
], '#8f272b');
export const TSUBAKI_PETAL = petalOne('#c4383d', 'round');
