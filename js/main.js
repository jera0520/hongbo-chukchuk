// 홍보 척척 — 화면 흐름: Ⅰ 알릴 것 → Ⅱ ChatGPT로 글 받기(질문지 복사·붙여 넣기) → Ⅲ 사진 → Ⅳ 받기
// 한 번에 한 단계만 보인다. 탭으로 아무 단계나 오갈 수 있다.
import { FIELDS, SLOTS, fieldNames } from './fields.js';
import { buildPrompt } from './prompt.js';
import { parseAnswer } from './parse.js';
import { renderCards, findOverflows, photoLayout, ACCENTS } from './template.js';
import { photoFromFile, photoFromUrl, dragPan } from './photo.js';
import { cardsToPngs, pngsToZip, pngsToLong, saveBlob } from './export.js';
import { SAMPLE_FORM, SAMPLE_ANSWER, SAMPLE_PHOTOS } from './sample.js';

const $ = (s) => document.querySelector(s);
const NAMES = fieldNames();
const TEXT_KEYS = Object.keys(NAMES);
const STORE = 'hongbo-chukchuk.v1';
const STEP_STORE = 'hongbo-chukchuk.step';
const FORM_IDS = ['what', 'who', 'when', 'whom', 'must'];

// 칸마다 [줄 수, 줄당 글자 수] — 넘쳤을 때 "몇 자 줄이기"를 알려 주는 데 쓴다
const LIMITS = {};
for (const f of FIELDS) {
  if (f.pair) { LIMITS[f.key + '.name'] = [1, f.pair[0]]; LIMITS[f.key + '.desc'] = [1, f.pair[1]]; } else LIMITS[f.key] = [f.lines, f.per];
}
function shrinkHint(k) {
  const [lines, per] = LIMITS[k] || [1, 0];
  const rows = (state.data[k] || '').split('\n');
  if (rows.length > lines) return `${lines}줄로`;
  const extra = Math.max(...rows.map((r) => r.length - per));
  return extra > 0 ? `${extra}자 줄이기` : '조금 줄이기';
}

const state = {
  form: {},
  data: {},
  prompts: {},
  photos: {},
  aiCopied: {},
  accent: ACCENTS[0].color,
  isSample: true,
};

// ---------- 저장(글만. 사진은 크기가 커서 저장하지 않는다) ----------
function save() {
  try {
    const { form, data, prompts, accent, isSample } = state;
    localStorage.setItem(STORE, JSON.stringify({ form, data, prompts, accent, isSample }));
  } catch { /* 사생활 보호 창 등에서는 저장하지 않는다 */ }
}
function load() {
  try {
    const raw = localStorage.getItem(STORE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ---------- 미리보기 ----------
const preview = $('#preview');
let overTimer = 0;

function previewScale() {
  const w = preview.clientWidth - 2 * parseFloat(getComputedStyle(preview).paddingLeft || 0);
  const two = (w - 24) / 2 / 860;
  return Math.max(0.3, Math.min(0.5, two >= 0.3 ? two : w / 860));
}

function renderPreview() {
  preview.innerHTML = renderCards(state.data, state.photos, { accent: state.accent, editable: true });
  preview.querySelector('.cards').style.setProperty('--pz', previewScale());
  $('.preview-col').classList.toggle('sample', state.isSample);
  $('#pv-title').textContent = state.isSample ? '예시 — 이렇게 5장이 만들어져요' : '내 홍보 이미지 5장';
  $('#pv-sub').textContent = state.isSample ? '가상의 「소소공방」 예시예요. Ⅱ에서 ChatGPT 답을 넣으면 내 글로 바뀝니다.' : '글자를 눌러 바로 고칠 수 있어요. 사진은 끌어서 위치를 옮겨요.';
  bindPreview();
  checkOverflow();
}

function checkOverflow() {
  clearTimeout(overTimer);
  overTimer = setTimeout(() => { state.overflows = findOverflows(preview); renderWarns(); }, 60);
}

function bindPreview() {
  preview.querySelectorAll('.t[data-k]').forEach((el) => {
    el.addEventListener('input', () => {
      const k = el.dataset.k;
      state.data[k] = el.innerText.replace(/\n$/, '');
      // 꼬리표·아래 안내는 다섯 장에 다 있다 → 다른 장도 같이 바꾼다
      preview.querySelectorAll(`.t[data-k="${k}"]`).forEach((o) => { if (o !== el) o.textContent = state.data[k]; });
      save();
      checkOverflow();
    });
    // 붙여 넣을 때 서식은 버린다(plaintext-only를 모르는 브라우저 대비)
    el.addEventListener('paste', (e) => {
      e.preventDefault();
      document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    });
  });

  preview.querySelectorAll('.ph[data-slot]').forEach((el) => {
    const n = Number(el.dataset.slot);
    bindDrop(el, n);
    el.addEventListener('pointerdown', (ev) => {
      const p = state.photos[n];
      if (!p) return;
      const scale = el.getBoundingClientRect().width / photoLayout(p, n).W;
      dragPan(el, p, n, scale, (fx, fy) => {
        p.fx = fx; p.fy = fy;
        el.style.backgroundPosition = `${fx * 100}% ${fy * 100}%`;
      }, () => renderSlots())(ev);
    });
  });
}

// ---------- 단계 이동 ----------
let step = 1;
function go(n, animate = true) {
  const dir = n < step ? 'back' : 'fwd';
  step = n;
  document.querySelectorAll('section[data-step]').forEach((sec) => {
    const on = Number(sec.dataset.step) === n;
    sec.hidden = !on;
    if (on && animate) { sec.removeAttribute('data-dir'); void sec.offsetWidth; sec.dataset.dir = dir; }
  });
  document.querySelectorAll('#tabs li').forEach((li) => {
    const k = Number(li.dataset.go);
    li.classList.toggle('now', k === n);
    li.classList.toggle('done', k !== n && stepDone(k));
    const b = li.querySelector('button');
    if (k === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
  });
  try { localStorage.setItem(STEP_STORE, String(n)); } catch { /* 저장 못 하는 창 */ }
  if (n === 2) markPaste();
  if (n === 4) renderWarns();
  if (animate) {
    // 탭 줄은 위에 붙어 있어서 늘 0 → 탭 줄을 담은 두 단 전체의 위치로 잰다
    const top = $('.layout').getBoundingClientRect().top;
    if (top < 0) window.scrollTo({ top: window.scrollY + top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}
function stepDone(k) {
  if (k === 1) return !!(state.form.what || '').trim();
  if (k === 2) return !state.isSample && TEXT_KEYS.some((k2) => (state.data[k2] || '').trim());
  if (k === 3) return SLOTS.some((s) => state.photos[s.n] && !state.photos[s.n].sample);
  return false;
}
$('#tabs').addEventListener('click', (e) => {
  const li = e.target.closest('li[data-go]');
  if (li) go(Number(li.dataset.go));
});
$('#to2').addEventListener('click', () => go(2));
$('#to3').addEventListener('click', () => go(3));
$('#to4').addEventListener('click', () => go(4));

// ---------- Ⅰ 알릴 것 ----------
function syncTo2() {
  const ok = !!(state.form.what || '').trim();
  $('#to2').disabled = !ok;
  say('#m-s1', ok ? '' : '「알리는 것」을 적으면 눌러져요.', '');
}
function bindForm() {
  for (const id of FORM_IDS) {
    const el = $('#f-' + id);
    el.value = state.form[id] || '';
    el.addEventListener('input', () => { state.form[id] = el.value; save(); renderPrompt(); syncTo2(); if (state.isSample) clearSampleAnswer(); });
  }
  syncTo2();
  const box = $('#accents');
  box.innerHTML = ACCENTS.map((a) =>
    `<button type="button" class="swatch" role="radio" data-color="${a.color}" aria-checked="${a.color === state.accent}"><i style="background:${a.color}"></i>${a.name}</button>`).join('');
  box.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (!b) return;
    state.accent = b.dataset.color;
    box.querySelectorAll('.swatch').forEach((s) => s.setAttribute('aria-checked', String(s === b)));
    save();
    renderPreview();
  });
}

$('#b-sample').addEventListener('click', async () => {
  Object.assign(state.form, SAMPLE_FORM);
  FORM_IDS.forEach((id) => { $('#f-' + id).value = state.form[id] || ''; });
  syncTo2();
  renderPrompt();
  $('#answer').value = SAMPLE_ANSWER;
  pasteAt = 4;
  showCheck({ sample: true });
  go(2);
  await loadSamplePhotos();
  say('#m-answer', '예시 답을 넣어 봤어요. 오른쪽 미리보기의 글자를 눌러 고쳐 볼 수 있어요. 내 것을 만들 땐 Ⅰ로 돌아가 내 내용을 적으세요.', 'ok');
});

let resetArmed = 0;
$('#b-reset').addEventListener('click', (e) => {
  const b = e.currentTarget;
  if (!resetArmed) {
    b.textContent = '한 번 더 누르면 모두 지워져요';
    resetArmed = setTimeout(() => { resetArmed = 0; b.textContent = '처음부터 다시'; }, 4000);
    return;
  }
  clearTimeout(resetArmed); resetArmed = 0; b.textContent = '처음부터 다시';
  state.form = {}; state.data = {}; state.prompts = {}; state.photos = {}; state.aiCopied = {}; state.isSample = false;
  FORM_IDS.forEach((id) => { $('#f-' + id).value = ''; });
  $('#answer').value = '';
  $('#got').hidden = true;
  pasteAt = 1;
  say('#m-answer', '', ''); say('#m-prompt', '', '');
  $('#to3').disabled = true;
  save(); renderPrompt(); renderSlots(); renderPreview(); syncTo2();
  go(1);
});

// ---------- Ⅱ 질문지 ----------
function currentPrompt() {
  const own = SLOTS.filter((s) => state.photos[s.n] && !state.photos[s.n].sample).map((s) => s.n);
  return buildPrompt(state.form, own);
}
function renderPrompt() {
  $('#prompt-text').textContent = currentPrompt();
  const ok = (state.form.what || '').trim();
  $('#b-copy-prompt').disabled = !ok;
  if (!ok) say('#m-prompt', 'Ⅰ에서 「알리는 것」을 먼저 적어 주세요.', 'bad');
  else if ($('#m-prompt').textContent.startsWith('Ⅰ')) say('#m-prompt', '', '');
}
// 예시를 본 뒤 내 것을 만들기 시작하면 예시 답을 비운다(붙여 넣을 때 섞이지 않게)
function clearSampleAnswer() {
  if (!$('#answer').value) return;
  $('#answer').value = '';
  $('#got').hidden = true;
  $('#to3').disabled = true;
  say('#m-answer', '', '');
  pasteAt = 1; markPaste();
}
$('#b-copy-prompt').addEventListener('click', async () => {
  if (state.isSample) clearSampleAnswer();
  const ok = await copyText(currentPrompt());
  say('#m-prompt', ok ? '복사했어요.' : '복사가 막혔어요. 「질문지 내용 보기」를 열어 직접 복사해 주세요.', ok ? 'ok' : 'bad');
  if (ok && pasteAt < 2) { pasteAt = 2; markPaste(); }
});

// 3칸 중 지금 할 칸을 표시한다(1 질문지 복사 → 2 ChatGPT에 보내기 → 3 답 붙여 넣기, 4는 다 됨)
let pasteAt = 1;
function markPaste() {
  document.querySelectorAll('#psteps > li').forEach((li) => {
    const k = Number(li.dataset.ps);
    li.classList.toggle('now', k === pasteAt);
    li.classList.toggle('done', k < pasteAt);
  });
}
$('#open-gpt').addEventListener('click', () => { if (pasteAt <= 2) { pasteAt = 3; markPaste(); } });
// ChatGPT 탭에 다녀오면 붙여 넣을 칸을 가리킨다
window.addEventListener('focus', () => {
  if (step === 2 && pasteAt === 2) { pasteAt = 3; markPaste(); }
});

// ---------- Ⅱ 붙여 넣기 ----------
let parsed = {};
let parseTimer = 0;
$('#answer').addEventListener('input', () => { clearTimeout(parseTimer); parseTimer = setTimeout(showCheck, 250); });

// 붙여 넣으면 바로 읽어서 틀에 넣는다(넣기 단추 없음)
function showCheck({ sample = false } = {}) {
  parsed = parseAnswer($('#answer').value);
  const got = TEXT_KEYS.filter((k) => parsed[k]);
  const box = $('#got');
  if (!$('#answer').value.trim()) { box.hidden = true; say('#m-answer', '', ''); return; }
  box.hidden = false;
  if (!got.length) {
    box.classList.add('bad');
    $('#got-sum').textContent = '읽은 칸이 없어요.';
    $('#check-body').innerHTML = '';
    say('#m-answer', 'ChatGPT 답의 회색 상자 오른쪽 위 복사 단추로 복사했는지 봐 주세요. 「1장 큰제목:」 같은 이름표가 있어야 읽을 수 있어요.', 'bad');
    return;
  }
  box.classList.remove('bad');
  const photoN = SLOTS.filter((s) => parsed['p' + s.n]).length;
  const missing = TEXT_KEYS.length - got.length;
  $('#got-sum').textContent = `틀에 넣었어요 · ${TEXT_KEYS.length}칸 중 ${got.length}칸` + (photoN ? ` · 사진 프롬프트 ${photoN}개` : '') + (missing ? ` · 빈 칸 ${missing}개는 미리보기에서 직접 쓰면 돼요` : '');
  $('#check-body').innerHTML = TEXT_KEYS.map((k) => {
    const v = parsed[k];
    return `<tr><th>${NAMES[k]}</th>${v ? `<td>${escapeHtml(v)}</td>` : '<td class="empty">비어 있음</td>'}</tr>`;
  }).join('');
  applyAnswer({ sample });
  pasteAt = 4; markPaste();
  $('#to3').disabled = false;
  if (!sample) say('#m-answer', '오른쪽 미리보기에서 글자를 눌러 고칠 수 있어요.', 'ok');
}

function applyAnswer({ sample }) {
  const p = parseAnswer($('#answer').value);
  state.data = {};
  for (const k of TEXT_KEYS) state.data[k] = p[k] || '';
  state.prompts = {};
  for (const s of SLOTS) if (p['p' + s.n]) state.prompts[s.n] = p['p' + s.n];
  if (!sample) {
    // 내 답을 넣으면 예시 사진은 뺀다
    for (const s of SLOTS) if (state.photos[s.n]?.sample) delete state.photos[s.n];
  }
  state.isSample = sample;
  save(); renderSlots(); renderPreview(); renderPrompt();
  go(step, false);
}

// ---------- Ⅲ 사진 ----------
function renderSlots() {
  $('#slots').innerHTML = SLOTS.map((s) => {
    const p = state.photos[s.n];
    const thumb = p ? `style="background-image:url('${p.src}')"` : '';
    return `<div class="slot" data-n="${s.n}">
      <div class="thumb${p ? ' has' : ''}" data-n="${s.n}" ${thumb} tabindex="0" role="button" aria-label="${s.label} 사진 고르기">사진을 끌어다<br>놓거나 누르기</div>
      <div>
        <p class="slot-name">${s.label} <small>${s.what} · ${s.w}×${s.h}</small></p>
        <div class="row-btns">
          <button type="button" class="btn ghost small" data-act="pick">사진 고르기</button>
          <button type="button" class="btn ghost small" data-act="prompt" ${state.prompts[s.n] ? '' : 'disabled title="Ⅱ에서 답을 넣으면 생겨요"'}>AI 프롬프트 복사</button>
          ${p ? '<button type="button" class="btn quiet small" data-act="remove">빼기</button>' : ''}
        </div>
        ${p ? `<div class="slot-tools">
          <label>크기 <input type="range" min="100" max="300" step="5" value="${Math.round((p.zoom || 1) * 100)}" data-act="zoom" aria-label="${s.label} 크기"></label>
          <label><input type="checkbox" data-act="ai" ${p.ai ? 'checked' : ''}> AI로 만든 사진 (꼬리표)</label>
        </div>` : ''}
        <p class="msg" data-msg="${s.n}"></p>
      </div>
      <input type="file" accept="image/*" hidden data-file="${s.n}">
    </div>`;
  }).join('');

  $('#slots').querySelectorAll('.slot').forEach((row) => {
    const n = Number(row.dataset.n);
    const file = row.querySelector('input[type=file]');
    const thumb = row.querySelector('.thumb');
    bindDrop(thumb, n);
    thumb.addEventListener('click', () => file.click());
    thumb.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } });
    file.addEventListener('change', () => { if (file.files[0]) setPhoto(n, file.files[0]); file.value = ''; });
    row.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'pick') file.click();
      if (act === 'remove') { delete state.photos[n]; renderSlots(); renderPreview(); renderPrompt(); }
      if (act === 'prompt') {
        const s = SLOTS.find((x) => x.n === n);
        const ok = await copyText(`${state.prompts[n]} Landscape 3:2. The image will be cropped to ${s.w}x${s.h}, keep the subject near the center.`);
        state.aiCopied[n] = true;
        say(`[data-msg="${n}"]`, ok ? '복사했어요. ChatGPT에 붙여 넣어 사진을 만든 뒤, 내려받은 사진을 이 칸에 끌어다 놓으세요.' : '복사가 막혔어요.', ok ? 'ok' : 'bad');
      }
    });
    row.addEventListener('input', (e) => {
      const act = e.target.dataset.act;
      const p = state.photos[n];
      if (!p) return;
      if (act === 'zoom') { p.zoom = Number(e.target.value) / 100; refreshPhoto(n); }
      if (act === 'ai') { p.ai = e.target.checked; renderPreview(); }
    });
  });
}

function refreshPhoto(n) {
  const el = preview.querySelector(`.ph[data-slot="${n}"]`);
  const p = state.photos[n];
  if (!el || !p) return;
  const { dw, dh } = photoLayout(p, n);
  el.style.backgroundSize = `${dw}px ${dh}px`;
}

function bindDrop(el, n) {
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
  el.addEventListener('dragleave', () => el.classList.remove('drop'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('drop');
    const f = e.dataTransfer.files[0];
    if (f) setPhoto(n, f);
  });
}

async function setPhoto(n, file) {
  try {
    state.photos[n] = await photoFromFile(file, !!state.aiCopied[n]);
    say(`[data-msg="${n}"]`, '', '');
  } catch (err) {
    renderSlots();
    say(`[data-msg="${n}"]`, err.message, 'bad');
    return;
  }
  renderSlots(); renderPreview(); renderPrompt();
}

async function loadSamplePhotos() {
  for (const s of SLOTS) {
    if (state.photos[s.n] && !state.photos[s.n].sample) continue;
    try {
      const p = await photoFromUrl(SAMPLE_PHOTOS[s.n], true);
      p.sample = true;
      state.photos[s.n] = p;
    } catch { /* 예시 사진이 없으면 빈 칸으로 둔다 */ }
  }
  renderSlots(); renderPreview();
}

// ---------- Ⅳ 받기 ----------
function renderWarns() {
  const w = [];
  const over = state.overflows || [];
  if (over.length) w.push(`칸을 넘친 글자: ${over.map((k) => `${NAMES[k]}(${shrinkHint(k)})`).join(', ')} — 미리보기의 빨간 칸을 눌러 고쳐 주세요.`);
  const empty = TEXT_KEYS.filter((k) => !(state.data[k] || '').trim());
  if (empty.length) w.push(`비어 있는 칸 ${empty.length}개: ${empty.map((k) => NAMES[k]).join(', ')}`);
  const noPhoto = SLOTS.filter((s) => !state.photos[s.n]).map((s) => s.label);
  if (noPhoto.length) w.push(`사진이 없는 칸: ${noPhoto.join(', ')} — 회색으로 나가요.`);
  if (state.isSample) w.push('지금은 예시 내용이에요. 내 내용으로 바꾼 뒤 받으세요.');
  $('#warns').innerHTML = w.length
    ? w.map((x) => `<li>${escapeHtml(x)}</li>`).join('')
    : '<li class="ok">넘친 칸·빈 칸 없음. 받을 준비가 됐어요.</li>';
}

function baseName() {
  const raw = (state.form.what || state.data.tag || '홍보척척').trim();
  return raw.replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 30) || '홍보척척';
}

let busy = false;
async function exportAs(kind) {
  if (busy) return;
  busy = true;
  const btns = [$('#b-zip'), $('#b-long')];
  btns.forEach((b) => { b.disabled = true; });
  try {
    const blobs = await cardsToPngs(state.data, state.photos, state.accent, (i, n) => say('#m-export', `${i} / ${n}장 그리는 중…`, ''));
    if (kind === 'zip') {
      saveBlob(await pngsToZip(blobs, baseName()), `${baseName()}_5장.zip`);
    } else {
      saveBlob(await pngsToLong(blobs), `${baseName()}_긴그림.png`);
    }
    say('#m-export', '받았어요. 내려받기 폴더를 확인하세요.', 'ok');
  } catch (err) {
    console.error(err);
    say('#m-export', '그림을 만들지 못했어요. 페이지를 새로 고친 뒤 다시 해 보세요.', 'bad');
  } finally {
    busy = false;
    btns.forEach((b) => { b.disabled = false; });
  }
}
$('#b-zip').addEventListener('click', () => exportAs('zip'));
$('#b-long').addEventListener('click', () => exportAs('long'));

// ---------- 도움 ----------
function say(sel, text, kind) {
  const el = document.querySelector(sel);
  if (!el) return;
  el.textContent = text;
  el.className = 'msg' + (kind ? ' ' + kind : '');
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

// ---------- 시작 ----------
if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) document.querySelectorAll('.k-mod').forEach((k) => { k.textContent = '⌘'; });
async function start() {
  const saved = load();
  if (saved && !saved.isSample) {
    Object.assign(state, { form: saved.form || {}, data: saved.data || {}, prompts: saved.prompts || {}, accent: saved.accent || state.accent, isSample: false });
  } else {
    // 처음 온 사람: 예시 내용이 채워진 5장부터 보여 준다(입력 칸은 비워 둠)
    const p = parseAnswer(SAMPLE_ANSWER);
    for (const k of TEXT_KEYS) state.data[k] = p[k] || '';
    for (const s of SLOTS) if (p['p' + s.n]) state.prompts[s.n] = p['p' + s.n];
    if (saved?.accent) state.accent = saved.accent;
  }
  bindForm();
  renderPrompt();
  renderSlots();
  renderPreview();
  if (stepDone(2)) { pasteAt = 4; $('#to3').disabled = false; }
  let first = 1;
  try { first = Number(localStorage.getItem(STEP_STORE)) || 1; } catch { /* 저장 못 하는 창 */ }
  go(state.isSample ? 1 : Math.min(4, Math.max(1, first)), false);
  if (state.isSample) await loadSamplePhotos();
  window.addEventListener('resize', () => preview.querySelector('.cards')?.style.setProperty('--pz', previewScale()));
}
// 카드 글꼴은 틀에 처음 넣을 때 내려온다 → 다 들어오면 넘침을 다시 잰다
document.fonts.addEventListener('loadingdone', () => checkOverflow());
document.fonts.ready.then(start);
