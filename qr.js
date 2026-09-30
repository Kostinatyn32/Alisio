(() => {
  const video = document.querySelector('#intro-video');
  const videoStage = document.querySelector('#video-stage');
  const cta = document.querySelector('#audit-cta');
  const sound = document.querySelector('#sound-button');
  const progress = document.querySelector('#video-progress');
  const state = document.querySelector('#video-state');
  const config = window.ALISIO_QR_CONFIG || {};
  const mobileQuery = window.matchMedia('(max-width: 767px)');
  const sources = { mobile: '/video/alisio-hero-mobile.mp4', desktop: '/video/alisio-hero-desktop.mp4' };
  let sourceKind = mobileQuery.matches ? 'mobile' : 'desktop';
  let started = false;
  let revealed = false;
  const params = new URLSearchParams(location.search);
  const utm = Object.fromEntries([...params.entries()].filter(([key]) => key.startsWith('utm_')));

  const track = (event, extra = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...extra });
  };
  const reveal = (reason) => {
    if (revealed) return;
    revealed = true;
    cta.classList.add('is-visible');
    cta.setAttribute('aria-hidden', 'false');
    cta.inert = false;
    videoStage.classList.add('is-finished');
    videoStage.inert = true;
    state.textContent = reason === 'complete' ? 'ПЕРЕГЛЯД ЗАВЕРШЕНО' : 'ВІДЕО НЕДОСТУПНЕ';
    track(reason === 'complete' ? 'video_complete' : 'video_error');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    window.setTimeout(() => document.querySelector('#cta-title').focus({ preventScroll: true }), reduced ? 0 : 450);
  };
  const setMessenger = (id, url, eventName) => {
    const link = document.getElementById(id);
    if (typeof url === 'string' && /^https:\/\//i.test(url)) {
      link.href = url;
      link.removeAttribute('aria-disabled');
      link.setAttribute('aria-label', link.querySelector('span').textContent);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.addEventListener('click', () => track(eventName, utm));
      return;
    }
    link.addEventListener('click', (event) => {
      event.preventDefault();
      document.querySelector('#messenger-note').textContent = 'Посилання на месенджери ще не налаштовані.';
    });
  };
  setMessenger('telegram-link', config.telegramUrl, 'telegram_click');
  setMessenger('whatsapp-link', config.whatsappUrl, 'whatsapp_click');

  const loadVideo = () => {
    const nextKind = mobileQuery.matches ? 'mobile' : 'desktop';
    if (video.dataset.kind === nextKind) return;
    sourceKind = nextKind;
    video.dataset.kind = nextKind;
    video.src = sources[nextKind];
    video.load();
    video.play().catch(() => { state.textContent = 'НАТИСНІТЬ PLAY У ВІДЕО'; video.controls = true; });
  };
  const onViewportChange = () => {
    const nextKind = mobileQuery.matches ? 'mobile' : 'desktop';
    if (nextKind === sourceKind) return;
    const time = video.currentTime;
    const wasPlaying = !video.paused;
    sourceKind = nextKind;
    video.dataset.kind = nextKind;
    video.src = sources[nextKind];
    video.load();
    video.addEventListener('loadedmetadata', () => {
      if (Number.isFinite(time)) video.currentTime = Math.min(time, video.duration || time);
      if (wasPlaying) video.play().catch(() => {});
    }, { once: true });
  };
  if (mobileQuery.addEventListener) mobileQuery.addEventListener('change', onViewportChange);
  else mobileQuery.addListener(onViewportChange);

  video.addEventListener('playing', () => {
    video.controls = false;
    if (started) return;
    started = true;
    state.textContent = 'ВІДЕО ВІДТВОРЮЄТЬСЯ';
    track('video_start', { video_variant: sourceKind });
  });
  video.addEventListener('timeupdate', () => {
    if (!Number.isFinite(video.duration) || !video.duration) return;
    const fraction = video.currentTime / video.duration;
    progress.style.width = `${fraction * 100}%`;
    if (fraction >= .25 && !video.dataset.p25) { video.dataset.p25 = '1'; track('video_25'); }
    if (fraction >= .5 && !video.dataset.p50) { video.dataset.p50 = '1'; track('video_50'); }
    if (fraction >= .75 && !video.dataset.p75) { video.dataset.p75 = '1'; track('video_75'); }
  });
  video.addEventListener('ended', () => reveal('complete'));
  video.addEventListener('error', () => {
    state.textContent = 'ПЕРЕГЛЯНУТИ CTA';
    reveal('error');
  });

  sound.addEventListener('click', () => {
    video.muted = !video.muted;
    sound.setAttribute('aria-pressed', String(!video.muted));
    sound.setAttribute('aria-label', video.muted ? 'Увімкнути звук відео' : 'Вимкнути звук відео');
    sound.querySelector('span').textContent = video.muted ? 'Увімкнути звук' : 'Вимкнути звук';
    track('video_sound_on', { muted: video.muted });
    if (video.paused) video.play().catch(() => {});
  });

  track('qr_landing_view', { ...utm });

  const start = () => {
    video.src = sources[sourceKind];
    video.dataset.kind = sourceKind;
    video.load();
    video.play().catch(() => { state.textContent = 'НАТИСНІТЬ PLAY У ВІДЕО'; video.controls = true; });
  };
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 800 });
  else window.setTimeout(start, 150);
})();
