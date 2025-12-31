// 화면 → PNG — 기획서 2판 8절. 사용자 브라우저 안에서만 만든다(서버로 보내지 않음).
// 미리보기(축소·편집 중)를 그대로 찍지 않고, 화면 밖에 원래 크기로 새로 그려서 찍는다.
import { domToBlob } from '../lib/modern-screenshot.mjs';
import { renderCards } from './template.js';
import { makeZip } from './zip.js';

const W = 860;
const H = 1100;

// 그림에 넣을 글꼴은 Pretendard만(도구 화면 글꼴까지 넣으면 느려진다)
const fontCss = ['Regular:400', 'SemiBold:600', 'Bold:700'].map((s) => {
  const [name, weight] = s.split(':');
  const url = new URL(`../fonts/pretendard/Pretendard-${name}.subset.woff2`, import.meta.url).href;
  return `@font-face{font-family:'PretendardHB';font-weight:${weight};src:url(${url}) format('woff2');}`;
}).join('');

async function renderOffscreen(data, photos, accent) {
  const host = document.createElement('div');
  host.className = 'exporting';
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = `position:fixed;left:-${W * 2}px;top:0;width:${W}px;pointer-events:none;`;
  host.innerHTML = renderCards(data, photos, { accent, editable: false });
  document.body.appendChild(host);
  await document.fonts.ready;
  return host;
}

// 장마다 PNG Blob. onStep(i)로 진행을 알린다.
export async function cardsToPngs(data, photos, accent, onStep = () => {}) {
  const host = await renderOffscreen(data, photos, accent);
  try {
    const out = [];
    const cards = host.querySelectorAll('.card');
    for (let i = 0; i < cards.length; i++) {
      onStep(i + 1, cards.length);
      const blob = await domToBlob(cards[i], {
        width: W,
        height: H,
        scale: 1,
        type: 'image/png',
        // backgroundColor는 주지 않는다: 주면 장 바탕(2·4장 강조색, 3장 회색)을 덮어쓴다
        font: { cssText: fontCss },
      });
      out.push(blob);
    }
    return out;
  } finally {
    host.remove();
  }
}

export async function pngsToZip(blobs, base) {
  const files = await Promise.all(blobs.map(async (b, i) => ({
    name: `${base}_${String(i + 1).padStart(2, '0')}.png`,
    data: new Uint8Array(await b.arrayBuffer()),
  })));
  return makeZip(files);
}

// 세로로 이은 긴 그림 한 장(860 × 1100×장수)
export async function pngsToLong(blobs) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H * blobs.length;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < blobs.length; i++) {
    const bmp = await createImageBitmap(blobs[i]);
    ctx.drawImage(bmp, 0, H * i, W, H);
    bmp.close?.();
  }
  return new Promise((res) => canvas.toBlob(res, 'image/png'));
}

export function saveBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
