// 붙여 넣은 답 읽기 — 기획서 2판 7절. 너그럽게 읽는다.
// - 이름표가 붙은 줄만 읽고 나머지(코드 상자 표시, 앞뒤 설명, 빈 줄)는 버린다.
// - 이름표 띄어쓰기·쌍점 차이, 굵게 표시(**), 줄 앞 기호는 무시한다.
// - JSON으로 온 답도 받는다.
// - GPT가 "(12자)" 같은 안내를 그대로 따라 쓴 칸은 비어 있는 것으로 본다.
// - "/"는 줄바꿈으로 바꾼다(사진 프롬프트는 빼고).
import { FIELDS, SLOTS } from './fields.js';

const norm = (s) => s.replace(/[\s*_`"'#>\-•·]/g, '').replace(/：/g, ':');

const LABELS = new Map();
for (const f of FIELDS) LABELS.set(norm(f.label), f);
for (const s of SLOTS) LABELS.set(norm(s.label), { key: 'p' + s.n, photo: true });

// 값이 안내문 그대로인가: "(12자)", "(2줄, 줄당 9자)", "이름 | 설명", "(1장 큰 사진 프롬프트)"
function isHint(v) {
  const t = v.replace(/\s/g, '');
  if (!t) return true;
  if (/^\(.*\)$/.test(t) && /(자|줄|프롬프트)/.test(t)) return true;
  if (/^이름\|설명/.test(t)) return true;
  return false;
}

const breaks = (v) => v.split('/').map((x) => x.trim()).filter(Boolean).join('\n');

function put(out, f, raw) {
  let v = String(raw ?? '').trim();
  if (isHint(v)) return;
  if (f.photo) { out[f.key] = v; return; }
  if (f.pair) {
    const [name, ...rest] = v.split(/\s*[|｜]\s*/);
    const desc = rest.join(' ').trim();
    if (name && !isHint(name)) out[f.key + '.name'] = breaks(name);
    if (desc && !isHint(desc)) out[f.key + '.desc'] = breaks(desc);
    return;
  }
  out[f.key] = breaks(v);
}

function fromJson(text) {
  const a = text.indexOf('{');
  const b = text.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  let obj;
  try { obj = JSON.parse(text.slice(a, b + 1)); } catch { return null; }
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  for (const [k, val] of Object.entries(obj)) {
    const f = LABELS.get(norm(k));
    if (!f) continue;
    if (f.pair && val && typeof val === 'object') {
      put(out, f, `${val.이름 ?? val.name ?? ''} | ${val.설명 ?? val.desc ?? ''}`);
    } else {
      put(out, f, val);
    }
  }
  return Object.keys(out).length ? out : null;
}

export function parseAnswer(text) {
  const json = fromJson(text);
  if (json) return json;

  // 실제 ChatGPT 웹 답은 "/" 뒤에서 진짜로 줄을 바꿔 보낸다(2026-10-16 확인).
  // 그래서 "/"로 끝난 칸 다음의 이름표 없는 줄은 그 칸에 이어 붙인다.
  const raw = [];
  let last = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(.{2,20}?)\s*[:：]\s*(.*)$/);
    const f = m && LABELS.get(norm(m[1]));
    if (f) { last = { f, v: m[2] }; raw.push(last); continue; }
    const t = line.trim();
    if (last && t && !t.startsWith('```') && /\/\s*$/.test(last.v)) last.v = last.v.replace(/\s*$/, '') + t;
    else last = null;
  }
  const out = {};
  for (const { f, v } of raw) put(out, f, v);
  return out;
}
