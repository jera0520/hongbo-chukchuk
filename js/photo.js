// 사진 칸 — 기획서 2판 4절(화면 Ⅲ). 사진은 브라우저 안에서만 쓴다.
// 큰 사진은 긴 변 2400px로 줄여 JPEG 데이터 주소로 들고 있는다(그림 만들 때 그대로 들어간다).
import { photoLayout } from './template.js';

const MAX = 2400;

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => rej(new Error('사진을 열 수 없어요'));
    img.src = src;
  });
}

async function toPhoto(img, ai) {
  const s = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * s);
  const h = Math.round(img.naturalHeight * s);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return { src: c.toDataURL('image/jpeg', 0.9), iw: w, ih: h, fx: 0.5, fy: 0.5, zoom: 1, ai };
}

export async function photoFromFile(file, ai = false) {
  if (!file || !/^image\//.test(file.type)) throw new Error('사진 파일(JPG·PNG·WEBP)만 넣을 수 있어요');
  const url = URL.createObjectURL(file);
  try {
    return await toPhoto(await loadImage(url), ai);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function photoFromUrl(url, ai = false) {
  return toPhoto(await loadImage(url), ai);
}

// 미리보기에서 끌어 위치 옮기기. scale은 미리보기 축소 비율, onMove(fx, fy)는 움직일 때마다.
export function dragPan(el, p, n, scale, onMove, onEnd) {
  return (ev) => {
    if (!p) return;
    ev.preventDefault();
    const { W, H, dw, dh } = photoLayout(p, n);
    const sx = ev.clientX;
    const sy = ev.clientY;
    const fx0 = p.fx;
    const fy0 = p.fy;
    el.setPointerCapture?.(ev.pointerId);
    el.classList.add('panning');
    const move = (e) => {
      const dx = (e.clientX - sx) / scale;
      const dy = (e.clientY - sy) / scale;
      const fx = dw > W ? clamp(fx0 - dx / (dw - W)) : 0.5;
      const fy = dh > H ? clamp(fy0 - dy / (dh - H)) : 0.5;
      onMove(fx, fy);
    };
    const up = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.classList.remove('panning');
      onEnd();
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };
}

const clamp = (v) => Math.min(1, Math.max(0, v));
