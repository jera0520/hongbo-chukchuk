// 사이트판에만: 「사용법 영상 보기」를 누르면 영상 창을 열고 처음부터 틀고, 닫으면 멈춘다(한글 척척과 같은 방식).
// 단추 속 미리보기(howto_peek.mp4, 소리 없음)는 페이지가 다 열린 뒤, Ⅰ단계에서 단추가 화면에 보일 때만 받아 반복한다.
// 동작 줄이기나 데이터 절약을 켠 사람에게는 첫 그림만 보여 준다.
// 영상이 끝나면 창을 저절로 닫고, 닫으면 아직 아무것도 안 적은 사람에게 「알리는 것」 칸을 가리킨다.
(() => {
  const open = document.getElementById('howto-open');
  const dlg = document.getElementById('howto-dlg');
  if (!open || !dlg || typeof dlg.showModal !== 'function') return;
  const v = dlg.querySelector('video');
  const peek = open.querySelector('.howto-peek');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = () => !!(navigator.connection && navigator.connection.saveData);
  let seen = true;
  let loaded = false;
  const busy = () => {
    const s = document.querySelector('section[data-step]:not([hidden])');
    return !!s && s.dataset.step !== '1';
  };
  const peekOn = () => {
    if (!peek) return;
    if (calm.matches || saveData() || !loaded || !seen || busy() || dlg.open || document.hidden) { peek.pause(); return; }
    if (!peek.getAttribute('src')) peek.src = 'howto_peek.mp4';
    const p = peek.play();
    if (p && p.catch) p.catch(() => {});
  };
  open.hidden = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => { seen = es[es.length - 1].isIntersecting; peekOn(); }).observe(open);
  }
  const onLoad = () => { loaded = true; peekOn(); };
  if (document.readyState === 'complete') onLoad(); else addEventListener('load', onLoad, { once: true });
  document.addEventListener('visibilitychange', peekOn);
  const mo = new MutationObserver(peekOn);
  for (const s of document.querySelectorAll('section[data-step]')) mo.observe(s, { attributes: true, attributeFilter: ['hidden'] });
  calm.addEventListener('change', peekOn);

  open.addEventListener('click', () => {
    dlg.showModal();
    peekOn();
    try { v.currentTime = 0; } catch (e) { /* 아직 안 받은 영상 */ }
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
  });
  dlg.querySelector('.howto-x').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  // 이제 할 곳: Ⅰ단계에서 「알리는 것」이 비어 있을 때만 그 칸을 가리킨다
  const guide = () => {
    const f = document.getElementById('f-what');
    if (busy() || !f || f.value.trim() || f.offsetParent === null) return;
    const r = f.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) f.scrollIntoView({ block: 'center', behavior: calm.matches ? 'auto' : 'smooth' });
    f.focus({ preventScroll: true });
    if (calm.matches) return;
    f.classList.remove('ring');
    void f.offsetWidth;
    f.classList.add('ring');
    setTimeout(() => f.classList.remove('ring'), 1100);
  };
  v.addEventListener('ended', () => setTimeout(() => { if (dlg.open) dlg.close(); }, 600));
  dlg.addEventListener('close', () => {
    v.pause();
    peekOn();
    setTimeout(guide, 250);
  });
})();
