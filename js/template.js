// 「깔끔·모던」 5장 그리기 — 기획서 2판 5절의 뼈대.
// 장마다 역할: 1 첫인상, 2 무엇을 하나, 3 무엇이 남나, 4 누구에게, 5 신청하기.
// 크기·자리는 cards.css에 있다. 여기서는 칸(data-k)과 사진 칸(data-slot)만 놓는다.
import { FIELDS } from './fields.js';

export const ACCENTS = [
  { id: 'green', name: '짙은 초록', color: '#1F4D3A' },
  { id: 'navy', name: '남색', color: '#1D3557' },
  { id: 'ink', name: '먹색', color: '#26282B' },
  { id: 'brick', name: '벽돌', color: '#9A3B2B' },
];

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// 칸마다 줄 수 한도(넘침 검사에 씀)
const LINES = {};
for (const f of FIELDS) {
  if (f.pair) { LINES[f.key + '.name'] = 1; LINES[f.key + '.desc'] = 1; } else LINES[f.key] = f.lines;
}

export function renderCards(data, photos, opts = {}) {
  const { accent = ACCENTS[0].color, editable = false } = opts;
  const ed = editable ? ' contenteditable="plaintext-only" spellcheck="false"' : '';
  const t = (k, tag = 'div', cls = '') =>
    `<${tag} class="t ${cls}" data-k="${k}" data-lines="${LINES[k] || 1}"${ed}>${esc(data[k])}</${tag}>`;

  const slot = (n) => {
    const p = photos[n];
    const style = p ? ` style="${photoStyle(p, n)}"` : '';
    const cls = p ? 'ph' : 'ph empty';
    const ai = p && p.ai ? '<span class="aitag">AI 생성 이미지</span>' : '';
    return `<div class="${cls}" data-slot="${n}"${style}><span class="ph-hint">사진 ${n} · 끌어다 놓기</span>${ai}</div>`;
  };

  // 강조색은 장마다 직접 단다(한 장씩 그림으로 찍을 때 바깥 상자의 값이 따라오지 않는다)
  const cs = ` style="--accent:${accent}"`;
  const top = (i) => `<div class="top">${t('tag', 'div', 'tag')}<div class="pno">${i} / 5</div></div>`;
  const foot = `<div class="foot">${t('foot', 'div', 'foot-t')}</div>`;
  const pair = (k) => `<div class="row">${t(k + '.name', 'div', 'r-name')}${t(k + '.desc', 'div', 'r-desc')}</div>`;

  const cards = [
    `<section class="card c1"${cs}>${top(1)}
      ${t('c1.kicker', 'div', 'kicker')}
      ${t('c1.title', 'h2', 'title')}
      ${t('c1.desc', 'p', 'desc')}
      ${slot(1)}${foot}</section>`,
    `<section class="card c2 dark"${cs}>${top(2)}
      ${t('c2.title', 'h2', 'title')}
      <div class="rows">${pair('c2.i1')}${pair('c2.i2')}${pair('c2.i3')}</div>
      ${foot}</section>`,
    `<section class="card c3"${cs}>${top(3)}
      ${t('c3.title', 'h2', 'title')}
      ${slot(3)}
      ${t('c3.desc', 'p', 'desc')}
      ${foot}</section>`,
    `<section class="card c4 dark"${cs}>${top(4)}
      ${t('c4.title', 'h2', 'title')}
      <div class="rows">${pair('c4.t1')}${pair('c4.t2')}</div>
      ${foot}</section>`,
    `<section class="card c5"${cs}>${top(5)}
      ${t('c5.title', 'h2', 'title')}
      ${t('c5.desc', 'p', 'desc')}
      ${slot(5)}
      <div class="cta">${t('c5.button', 'div', 'btn')}</div>
      ${t('c5.info', 'p', 'info')}
      ${foot}</section>`,
  ];
  return `<div class="cards">${cards.join('')}</div>`;
}

// 사진 칸 배경: 칸을 꽉 채우는 크기 × 배율, 위치는 fx·fy(0~1)
const SLOT_SIZE = { 1: [860, 540], 3: [732, 560], 5: [860, 420] };
export function photoLayout(p, n) {
  const [W, H] = SLOT_SIZE[n];
  const s = Math.max(W / p.iw, H / p.ih) * (p.zoom || 1);
  return { W, H, dw: p.iw * s, dh: p.ih * s };
}
function photoStyle(p, n) {
  const { dw, dh } = photoLayout(p, n);
  return `background-image:url('${p.src}');background-size:${dw.toFixed(1)}px ${dh.toFixed(1)}px;` +
    `background-position:${(p.fx * 100).toFixed(2)}% ${(p.fy * 100).toFixed(2)}%`;
}

// 칸을 넘친 글자 찾기: 줄 수 한도보다 줄이 많거나 옆으로 넘치면 넘침
export function findOverflows(root) {
  const over = [];
  for (const el of root.querySelectorAll('.t[data-k]')) {
    const lines = Number(el.dataset.lines) || 1;
    const lh = parseFloat(getComputedStyle(el).lineHeight);
    // 큰 글자는 획이 줄 높이 밖으로 몇 px 나온다 → 반 줄 넘게 커질 때만 넘침
    const tooTall = el.scrollHeight > (lines + 0.5) * lh;
    const tooWide = el.scrollWidth > el.clientWidth + 1;
    el.classList.toggle('over', tooTall || tooWide);
    if (tooTall || tooWide) over.push(el.dataset.k);
  }
  return [...new Set(over)];
}
