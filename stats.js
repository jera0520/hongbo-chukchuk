// 사이트판에만: 쓴 횟수 세기. 세는 곳은 김진현 Cloudflare 계정의 작은 집계 프로그램(counter/, 주소는 <meta name="hb-count">)이다.
// 한글 척척 stats.js와 같은 방식. 보내는 것은 일 이름 하나(열어 봄·누른 단추·단계 도착·붙여 넣은 답을 읽었는지·받기 등)와,
// 열 때는 들어온 곳의 주소 이름(예: www.threads.com), 앱 안 화면이면 앱 이름(예: threads), 그 밖의 일에는 휴대폰이면 붙이는 |m 표시뿐이다.
// 적은 글·ChatGPT 답·사진·파일 이름은 보내지 않고 쿠키도 쓰지 않는다.
// 이 사이트 주소가 아니거나(내 컴퓨터 시험), 자동 시험 브라우저이거나, 추적 거부(GPC·Do Not Track)를 켠 브라우저에서는 보내지 않는다.
(() => {
  const meta = document.querySelector('meta[name="hb-count"]');
  if (!meta) return;
  const url = meta.content;
  if (navigator.webdriver || location.hostname !== 'jera0520.github.io') return;
  if (navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

  const send = body => {
    try {
      fetch(url, { method: 'POST', body, mode: 'no-cors', credentials: 'omit', cache: 'no-store', keepalive: true }).catch(() => {});
    } catch (e) { /* 보내기가 막힌 브라우저 */ }
  };
  // 휴대폰(손가락으로만 누르는 좁은 화면)이면 열기 말고 다른 일에 |m을 붙인다(어디서 멈추는지 휴대폰과 컴퓨터를 나눠 보려고)
  const mobile = matchMedia('(hover: none) and (pointer: coarse) and (max-width: 600px)').matches;
  const hit = ev => send(mobile ? ev + '|m' : ev);
  // 한 번 하면 되는 일은 페이지를 연 뒤(또는 「처음부터 다시」 뒤) 한 번만 센다
  const once = new Set();
  const one = ev => { if (!once.has(ev)) { once.add(ev); hit(ev); } };
  // 들어온 곳: 다른 사이트면 주소 이름만, 이 사이트의 다른 쪽(자료실 등)이면 첫 경로까지
  const from = () => {
    try {
      const u = new URL(document.referrer);
      if (!/^https?:$/.test(u.protocol)) return '';
      return u.hostname === location.hostname ? u.hostname + '/' + (u.pathname.split('/')[1] || '') : u.hostname;
    } catch (e) { return ''; }
  };
  send('open|' + from());
  if (mobile) hit('phone');
  // 스레드·인스타·페이스북·카톡·네이버 앱 안 화면(브라우저 이름표로 안다)
  const ua = navigator.userAgent;
  const inapp = /Barcelona/.test(ua) ? 'threads' : /Instagram/.test(ua) ? 'instagram' : /FBAN|FBAV|FB_IAB/.test(ua) ? 'facebook'
    : /KAKAOTALK/i.test(ua) ? 'kakaotalk' : /NAVER\(inapp/.test(ua) ? 'naver' : '';
  if (inapp) send('inapp|' + inapp);

  // 사람이 누르거나 친 직후에 바뀐 단계만 「도착」으로 센다(페이지를 열 때 전에 하던 단계로 돌아가는 것은 resume)
  let act = 0;
  for (const t of ['pointerdown', 'keydown']) addEventListener(t, () => { act = Date.now(); }, true);
  const secs = [...document.querySelectorAll('section[data-step]')];
  const now = () => { const s = secs.find(x => !x.hidden); return s ? Number(s.dataset.step) : 0; };
  let step = now();
  // 글꼴이 이미 있으면 main.js가 이 파일보다 먼저 전에 하던 단계로 돌려 둔다
  if (step > 1) one('resume');
  const watch = new MutationObserver(() => {
    const n = now();
    if (!n || n === step) return;
    step = n;
    if (Date.now() - act > 1500) { if (n > 1) one('resume'); return; }
    if (n > 1) one('step' + n);
  });
  for (const s of secs) watch.observe(s, { attributes: true, attributeFilter: ['hidden'] });

  // 글: 「알리는 것」을 직접 적기 시작함(예시 넣기는 글을 대신 넣으므로 안 셈), ChatGPT 답을 붙여 넣음, 미리보기 글자를 고침
  document.addEventListener('input', e => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.id === 'f-what' && t.value.trim()) one('what_type');
    else if (t.id === 'answer' && t.value.trim()) one('ans_in');
    else if (t.closest('#preview [data-k]')) one('edit');
  }, true);
  // 안내 글로 결과를 본다: 질문지 복사 막힘, 답을 읽음/못 읽음, 받음(내 내용/예시)/실패
  const watchMsg = (id, fn) => {
    const el = document.getElementById(id);
    if (el) new MutationObserver(() => fn(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
  };
  watchMsg('m-prompt', t => { if (/복사가 막혔어요/.test(t)) one('copy_err'); });
  watchMsg('m-answer', t => {
    if (/미리보기에서 글자를 눌러 고칠 수/.test(t) && !/예시 답/.test(t)) one('ans_ok');
    if (/이름표가 있어야 읽을 수/.test(t)) one('ans_bad');
  });
  const sampleNow = () => /지금은 예시 내용이에요/.test((document.getElementById('warns') || {}).textContent || '');
  watchMsg('m-export', t => {
    if (/^받았어요/.test(t)) hit(sampleNow() ? 'dl_sample' : 'dl_ok');
    if (/그림을 만들지 못했어요/.test(t)) hit('dl_err');
  });

  // Ⅱ에서 ChatGPT 탭·앱에 다녀옴(질문지를 복사한 뒤에만)
  let away = false;
  const leave = () => { if (now() === 2 && once.has('copy_prompt') && !away) { away = true; one('gpt_leave'); } };
  const back = () => { if (away && document.visibilityState === 'visible') { away = false; if (now() === 2) one('gpt_back'); } };
  document.addEventListener('visibilitychange', () => (document.visibilityState === 'hidden' ? leave : back)());
  addEventListener('blur', leave);
  addEventListener('focus', back);

  // 사진: 고르기 창에서 고름, 칸에 끌어다 놓음
  document.addEventListener('change', e => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.type === 'file' && t.files && t.files.length) one('photo');
  }, true);
  addEventListener('drop', e => { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) one('photo'); }, true);
  // 사용법 영상을 끝까지 봄(ended는 버블링하지 않아 붙잡는 단계에서 본다)
  document.addEventListener('ended', e => { if (e.target instanceof Element && e.target.closest('#howto-dlg')) hit('howto_end'); }, true);

  // 누른 곳 → 일 이름. 셋째 값 1은 한 번만
  const CLICKS = [
    ['#howto-open', 'howto'], ['#b-sample', 'sample', 1], ['#tabs li[data-go]', 'tab', 1],
    ['#b-copy-prompt', 'copy_prompt', 1], ['#open-gpt', 'open_gpt', 1], ['[data-act="prompt"]', 'ai_prompt', 1],
    ['#accents .swatch', 'accent', 1], ['#b-zip', 'dl_zip'], ['#b-long', 'dl_long'],
  ];
  document.addEventListener('click', e => {
    if (!(e.target instanceof Element)) return;
    const c = CLICKS.find(([sel]) => e.target.closest(sel));
    if (c && !(e.target.closest('button:disabled'))) (c[2] ? one : hit)(c[1]);
    // 「처음부터 다시」는 두 번 눌러야 지워진다(이 단추가 「한 번 더 누르면」일 때 누르면 지움)
    const r = e.target.closest('#b-reset');
    if (r && /한 번 더/.test(r.textContent)) { hit('reset'); once.clear(); }
  }, true);
})();
