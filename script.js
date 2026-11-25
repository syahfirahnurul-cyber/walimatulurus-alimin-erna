/* =====================================================================
   DR. ALIMIN & ERNA — Pihak Lelaki Luxury Stationery
   Awwwards-Level Motion: Lenis Smooth Scroll + GSAP 3.12 + ScrollTrigger
   Techniques:
   1. Lenis Inertial Smooth Scroll synced to GSAP Ticker
   2. Scrubbed Gold Hairline Progress Filament
   3. GPU Clip-Path Curtain Reveals (Hero Card & Doa Parchment)
   4. Editorial Baseline Mask Typography Reveals (yPercent: 100 -> 0)
   5. Multi-Layer Batik Sogan Scale + Parallax Scrub
   ===================================================================== */

const CARD_CONFIG = {
  itinerary: [
    // icon: ikon emas (gerbang mihrab = ketibaan, bosara Bugis = jamuan/majlis, bulan sabit = bersurai)
    { time: '10:00 Pagi', title: 'Ketibaan Tetamu & Jamuan Bermula', note: 'Pendaftaran kehadiran serta jamuan para jemputan', icon: 'assets/icon-arrival.webp' },
    { time: '10:00 Pagi – 5:00 Petang', title: 'Majlis Kesyukuran Perkahwinan', note: '', icon: 'assets/icon-feast.webp' },
    { time: '5:00 Petang', title: 'Majlis Bersurai', note: 'Terima kasih atas kehadiran serta doa restu', icon: 'assets/icon-farewell.webp' }
  ],
  siblings: [],
  relatives: [],

  // Buku Ucapan & Doa dikongsi (Google Sheets milik klien melalui Apps Script).
  // Ikut langkah dalam ucapan-apps-script.gs, kemudian tampal URL Web App (/exec) di sini.
  // Jika kosong, kad berjalan dalam "mod pratonton": ucapan hanya disimpan pada peranti itu.
  wishesEndpoint: ''
};

let lenisInstance = null;

document.addEventListener('DOMContentLoaded', () => {
  initLenisSmoothScroll();
  initRealistic3DEnvelope();
  initSideFlora();
  initGsapScrollTrigger();
  initCountdown();
  initItinerary();
  initExtraFamily();
  initCalendarDownload();
  initLazyMap();
  initWishesOnly();
  initMusicPlayer();
  initBottomNavHighlight();
});

/* 0. Lenis Inertial Smooth Scroll Synced Directly to GSAP Ticker */
function initLenisSmoothScroll() {
  if (
    typeof window.Lenis === 'undefined' ||
    typeof window.gsap === 'undefined' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  lenisInstance = new Lenis({
    lerp: 0.085,
    smoothWheel: true,
    wheelMultiplier: 0.92
  });

  if (typeof window.ScrollTrigger !== 'undefined') {
    lenisInstance.on('scroll', ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenisInstance.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // Smooth anchor scrolling for Bottom Nav Dock via Lenis
  document.querySelectorAll('.bottom-nav a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      const targetEl = document.querySelector(targetId);
      if (targetEl && lenisInstance) {
        e.preventDefault();
        lenisInstance.scrollTo(targetEl, { offset: -8, duration: 1.15 });
      }
    });
  });
}

/* 1. Realistic 5-Layer 3D Scroll-Driven + Tap-to-Open Envelope (Ref: walimatulurus-erna-alimin.pages.dev) */
function initRealistic3DEnvelope() {
  const hero = document.getElementById('hero');
  const env3d = document.getElementById('env3d');
  const flap = document.getElementById('envFlap');
  const card = document.getElementById('envCard');
  const seal = document.getElementById('btnSeal');
  const head = document.getElementById('heroHead');
  const cta = document.getElementById('heroCta');
  const openBtn = document.getElementById('btnOpen');
  const mainEl = document.getElementById('invitation-main');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!hero || !flap || !card) return;

  const carrier = document.getElementById('envCarrier');
  const band = document.getElementById('envBand');
  const pin = env3d ? env3d.offsetParent : null; // .hero-pin (sticky)
  const cardSurface = card.querySelector('.env-card-surface');
  const envParts = env3d ? env3d.querySelectorAll('.env-back, .env-pocket, .env-shadow') : [];
  const flapFaces = flap.querySelectorAll('.env-flap-face');
  const shadeFront = flap.querySelector('.flap-shade-front');
  const shadeBack = flap.querySelector('.flap-shade-back');
  const sealRing = seal ? seal.querySelector('.seal-pulse-ring') : null;
  const heroCanvas = document.querySelector('#utama .card-frame-canvas');
  const heroAnims = document.querySelectorAll('#utama .hero-anim');

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const easeInOutSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;

  const canAnimate =
    !reduce &&
    typeof window.gsap !== 'undefined' &&
    typeof window.ScrollTrigger !== 'undefined' &&
    env3d && pin && carrier && mainEl && heroCanvas;

  // ---------------------------------------------------------------
  // Mod statik (reduced-motion / GSAP gagal dimuat): tiada 225vh skrol mati.
  // Sampul tertutup dipaparkan sekali; ketik terus ke kandungan.
  // ---------------------------------------------------------------
  if (!canAnimate) {
    hero.classList.add('is-static');
    const goToMain = () => {
      tryPlayMusic(true);
      if (mainEl) mainEl.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    };
    if (seal) seal.addEventListener('click', goToMain);
    if (openBtn) openBtn.addEventListener('click', goToMain);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // Kad mihrab: lebar 86% sampul, nisbah 2:3 (selaras dengan .env-card dalam CSS).
  // Dikira dari nisbah, bukan offsetWidth, kerana FLIP menulis width/height inline.
  const CARD_WIDTH_RATIO = 0.86;
  const CARD_ASPECT = 1.5;      // tinggi / lebar
  const CARD_SCALE_END = 1.07;

  // Nilai susun atur yang diukur semula pada setiap ScrollTrigger refresh.
  const L = { envShift: 0, yStart: 44, yEnd: -45, fx: 0, fy: 0, tW: 0, tH: 0, drop: 400 };

  function measureEnvelopeLayout() {
    const vh = window.innerHeight;

    // Tarik kandungan utama naik ke bawah lapisan hero: pada penghujung animasi,
    // kad sebenar di Band 1 berada tepat di bawah kad sampul, jadi peralihan tanpa sambungan.
    mainEl.style.marginTop = `${-vh}px`;

    const pinH = pin.offsetHeight;
    const envTop = env3d.offsetTop;
    const envLeft = env3d.offsetLeft;
    const envW = env3d.offsetWidth;
    const envH = env3d.offsetHeight;
    const cardW = envW * CARD_WIDTH_RATIO;
    const cardH = cardW * CARD_ASPECT;

    // Kedudukan menegak kad (yPercent, relatif tinggi kad; kad berlabuh di bawah sampul):
    //  mula: atas kad 6px di bawah bibir sampul (tersembunyi di bawah flap);
    //  akhir: bawah kad masih 10% di dalam poket (kad "baru ditarik keluar").
    L.yStart = ((6 - envH + cardH) / cardH) * 100;
    L.yEnd = ((0.1 * envH - envH) / cardH) * 100;

    // (a) Sampul turun mengimbangi kad yang naik, supaya "kad + sampul" kekal di tengah.
    const cardTopEnd = envH + cardH * (L.yEnd / 100) - cardH - (cardH * (CARD_SCALE_END - 1)) / 2;
    const compositeTop = Math.min(cardTopEnd, 0);
    const compositeH = envH - compositeTop;
    const targetTop = Math.max(16, (pinH - compositeH) / 2);
    L.envShift = clamp(targetTop - (envTop + compositeTop), -envTop, Math.max(0, pinH - (envTop + envH) - 16));

    // (b) FLIP: sasaran = kotak .card-frame-canvas pada saat animasi tamat (koordinat .hero-pin).
    const pinTopAtEnd = Math.min(0, vh - pinH);
    const mainTopAtEnd = 0; // kerana marginTop = -vh
    const mainRect = mainEl.getBoundingClientRect();
    const canvasRect = heroCanvas.getBoundingClientRect();
    L.tW = heroCanvas.offsetWidth;
    L.tH = heroCanvas.offsetHeight;
    const tTop = mainTopAtEnd + (canvasRect.top - mainRect.top) - pinTopAtEnd;
    const tLeft = canvasRect.left - pin.getBoundingClientRect().left;

    // Kad: left:50% + xPercent:-50 (pusat = pusat sampul + x), bottom:0 (atas = bawah sampul - tinggi + y).
    L.fx = tLeft + L.tW / 2 - (envLeft + envW / 2);
    L.fy = tTop - (envTop + envH - L.tH) - L.envShift;
    L.drop = vh * 0.65;
  }

  // Keadaan awal eksplisit (elak GSAP membaca translate(-50%) CSS sebagai piksel).
  measureEnvelopeLayout();
  gsap.set(card, { x: 0, y: 0, xPercent: -50, yPercent: L.yStart, scale: 1 });
  // z:1 meletakkan cop sedikit di hadapan muka flap (elak z-fighting dalam preserve-3d).
  if (seal) gsap.set(seal, { x: 0, y: 0, xPercent: -50, yPercent: -50, z: 1, scale: 1 });
  gsap.set(heroAnims, { autoAlpha: 0, y: 18 });
  measureEnvelopeLayout();

  // Kandungan kad utama muncul sebaik kad sampul "mendarat" di tempatnya.
  let heroRevealed = false;
  function revealHeroCard() {
    if (heroRevealed) return;
    heroRevealed = true;
    gsap.to(heroAnims, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', overwrite: true });
  }

  // ---------------------------------------------------------------
  // Timeline sinematik (jumlah 1 unit = keseluruhan skrol hero)
  //  0.01–0.09  pita sutera Lipa' Sabbe (Bugis) meluncur keluar dari sampul
  //  0.06–0.12  cop lilin ditekan, kemudian "tercabut" sedikit dari poket
  //  0.00–0.34  tajuk & butang beredar
  //  0.10–0.43  flap berengsel terbuka membawa cop; bayang cahaya ikut sudut
  //  0.40–0.67  kad meluncur naik (selepas flap terbuka), sampul turun mengimbangi
  //  0.68–0.82  sampul dilepaskan ke bawah
  //  0.72–0.95  FLIP: kad membesar ke kedudukan kad utama Band 1
  //  0.955–0.985 lapisan hero pudar, kad sebenar mengambil alih
  // ---------------------------------------------------------------
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: hero,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      invalidateOnRefresh: true
    },
    onUpdate() {
      flap.classList.toggle('is-behind', gsap.getProperty(flap, 'rotationX') < -90);
      if (seal) seal.style.pointerEvents = tl.progress() > 0.04 ? 'none' : '';
      if (tl.progress() > 0.95) revealHeroCard();
    }
  });

  tl.to(cta, { autoAlpha: 0, duration: 0.12 }, 0)
    .to(head, { autoAlpha: 0, y: -28, duration: 0.28, ease: 'sine.inOut' }, 0.06)

    // Pita Lipa' Sabbe: ditarik keluar ke kanan (sedikit condong), seperti membuka pengikat sampul sebenar.
    .to(band, { xPercent: 115, rotation: 2.5, autoAlpha: 0, duration: 0.08, ease: 'power2.in' }, 0.01)

    // Cop lilin: tekan → tercabut (z naik, condong sedikit) → kekal pada flap.
    // Tidak dipudarkan: lilin tidak "hilang", ia terangkat bersama flap.
    .to(sealRing, { autoAlpha: 0, duration: 0.03 }, 0)
    .to(seal, { scale: 0.93, duration: 0.025, ease: 'power2.in' }, 0.06)
    .to(seal, { scale: 1.02, z: 6, rotationX: 8, duration: 0.035, ease: 'back.out(2)' }, 0.085)

    // Flap: 0 → -180deg. Cahaya dari atas-depan: muka depan gelap menghampiri 90deg
    // (condong ke bawah), liner pula paling gelap pada 90deg dan cerah bila menghadap kita.
    .fromTo(flap, { rotationX: 0 }, { rotationX: -180, duration: 0.33, ease: 'power1.inOut' }, 0.1)
    .fromTo(shadeFront, { opacity: 0 }, { opacity: 0.26, duration: 0.165, ease: 'power1.in' }, 0.1)
    .fromTo(shadeBack, { opacity: 0.32 }, { opacity: 0, duration: 0.165, ease: 'power1.out' }, 0.265)

    // Kad hanya ditarik keluar selepas flap hampir terbuka penuh (seperti sampul sebenar),
    // supaya liner Batik pada flap sempat dilihat dahulu.
    .fromTo(card, { yPercent: () => L.yStart }, { yPercent: () => L.yEnd, duration: 0.27, ease: 'power2.inOut' }, 0.4)
    .to(card, { scale: CARD_SCALE_END, duration: 0.15, ease: 'sine.inOut' }, 0.52)
    .fromTo(env3d, { y: 0 }, { y: () => L.envShift, duration: 0.28, ease: 'sine.inOut' }, 0.4)

    .to(envParts, { y: () => L.drop, autoAlpha: 0, duration: 0.14, ease: 'power2.in' }, 0.68)
    .to(flap, { y: () => L.drop, duration: 0.14, ease: 'power2.in' }, 0.68)
    // Pudar setiap muka flap (bukan engsel): opacity pada elemen preserve-3d merosakkan backface.
    .to(flapFaces, { autoAlpha: 0, duration: 0.1 }, 0.7)
    .set(carrier, { zIndex: 7, clipPath: 'none' }, 0.72)

    .to(cardSurface, { autoAlpha: 0, duration: 0.1 }, 0.72)
    // FLIP dengan saiz SEBENAR (width/height), bukan scaleX/scaleY: latar 3-slice kad mihrab
    // dibentang semula, jadi gerbang & reben tidak herot sepanjang peralihan.
    .to(card, {
      yPercent: 0,
      x: () => L.fx,
      y: () => L.fy,
      width: () => L.tW,
      height: () => L.tH,
      scale: 1,
      duration: 0.23,
      ease: 'power2.inOut'
    }, 0.72)

    .to(pin, { autoAlpha: 0, duration: 0.03 }, 0.955)
    .to({}, { duration: 0.015 }, 0.985);

  ScrollTrigger.addEventListener('refreshInit', measureEnvelopeLayout);

  // Jika halaman dimuat semula di tengah kandungan (skrol dipulihkan), terus paparkan kad utama.
  ScrollTrigger.addEventListener('refresh', () => {
    if (tl.scrollTrigger && window.scrollY >= tl.scrollTrigger.end - 2) revealHeroCard();
  });

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());

  // Ketik cop lilin / "Buka Jemputan": auto-skrol sinematik melalui keseluruhan timeline
  // hingga mendarat pada kad utama. easeInOutSine supaya cop & flap tidak tergesa-gesa.
  function triggerOpenScroll() {
    tryPlayMusic(true);
    const st = tl.scrollTrigger;
    const end = st.end;
    const remaining = Math.max(0, end - window.scrollY);
    const fullSpan = Math.max(1, end - st.start);
    const duration = 1.4 + 3.0 * (remaining / fullSpan); // ~4.4s dari keadaan tertutup

    if (lenisInstance) {
      lenisInstance.scrollTo(end, { duration, easing: easeInOutSine });
    } else {
      window.scrollTo({ top: end, behavior: 'smooth' });
    }
  }

  if (seal) seal.addEventListener('click', triggerOpenScroll);
  if (openBtn) openBtn.addEventListener('click', triggerOpenScroll);
}

/* 2B. Sulur emas Jawa di sudut skrin (kelopak bunga gugur dibuang untuk rupa kontemporari) */
function initSideFlora() {
  const sideFlora = document.getElementById('side-flora');
  if (sideFlora) sideFlora.classList.add('is-active');
}

/* Helper: Wrap Monumental Headings in Baseline Overflow Masks */
function prepareEditorialMasks() {
  const selectors = '.band-heading, .mempelai-fullname, .host-name, .venue-display-name';
  document.querySelectorAll(selectors).forEach((el) => {
    if (el.dataset.masked) return;
    el.dataset.masked = 'true';
    const inner = document.createElement('span');
    inner.className = 'reveal-line';
    inner.innerHTML = el.innerHTML;
    el.innerHTML = '';
    el.classList.add('reveal-mask');
    el.appendChild(inner);
  });
}

/* 3. Awwwards-Grade GSAP ScrollTrigger Choreography */
function initGsapScrollTrigger() {
  if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    prepareEditorialMasks();

    // A. Gold Hairline Scroll Progress Bar (Scrubbed)
    const progressBar = document.getElementById('scroll-progress-bar');
    if (progressBar) {
      gsap.to(progressBar, {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: '#invitation-main',
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.25
        }
      });
    }

    // B. Editorial Baseline Mask Reveals for Monumental Names & Headings
    document.querySelectorAll('.reveal-mask').forEach((mask) => {
      const line = mask.querySelector('.reveal-line');
      if (!line) return;
      gsap.from(line, {
        yPercent: 110,
        opacity: 0,
        duration: 0.9,
        ease: 'power4.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: mask,
          start: 'top 88%',
          once: true
        }
      });
    });

    // B2. Scroll-Driven Couple Convergence + Golden Halo (Reference: Animasi Pasangan Merapat Mengikut Skrol)
    const coupleStage = document.getElementById('coupleStage');
    const coupleLeft = document.getElementById('coupleLeft');
    const coupleRight = document.getElementById('coupleRight');
    const coupleHalo = document.getElementById('coupleHalo');
    if (coupleStage && coupleLeft && coupleRight) {
      const coupleTl = gsap.timeline({
        scrollTrigger: {
          trigger: coupleStage,
          start: 'top 86%',
          end: 'center 52%',
          scrub: 1.05
        }
      });

      coupleTl
        .fromTo(coupleLeft, { x: -46, opacity: 0.25 }, { x: 0, opacity: 1, ease: 'power2.out' }, 0)
        .fromTo(coupleRight, { x: 46, opacity: 0.25 }, { x: 0, opacity: 1, ease: 'power2.out' }, 0);

      if (coupleHalo) {
        coupleTl.fromTo(
          coupleHalo,
          { scale: 0.65, opacity: 0 },
          { scale: 1.08, opacity: 1, ease: 'power2.out' },
          0.15
        );
      }
    }

    // B3. Scroll-Driven Gentle Bloom Scale on Corner Javanese Sulur Flora
    const floraCorners = document.querySelectorAll('.flora-corner');
    if (floraCorners.length) {
      gsap.fromTo(
        floraCorners,
        { opacity: 0.32, scale: 0.9 },
        {
          opacity: 0.85,
          scale: 1.05,
          ease: 'none',
          scrollTrigger: {
            trigger: '#invitation-main',
            start: 'top top',
            end: '55% bottom',
            scrub: 1
          }
        }
      );
    }

    // C. Section Staggered Editorial Elements
    document.querySelectorAll('.gsap-section').forEach((section) => {
      const items = section.querySelectorAll('.gsap-up');
      if (!items.length) return;

      gsap.from(items, {
        y: 26,
        opacity: 0,
        duration: 0.82,
        stagger: 0.085,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: section,
          start: 'top 82%',
          once: true
        }
      });
    });

    // D. Gold Filigree Dividers Expand Smoothly From Center
    document.querySelectorAll('.gold-divider-img').forEach((div) => {
      if (div.classList.contains('hero-anim')) return;
      gsap.from(div, {
        scaleX: 0.62,
        opacity: 0,
        duration: 0.85,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: div,
          start: 'top 88%',
          once: true
        }
      });
    });

    // E. Atur Cara Majlis Timeline Cascade
    const timelineItems = document.querySelectorAll('.itinerary-item');
    if (timelineItems.length) {
      gsap.from(timelineItems, {
        x: -14,
        opacity: 0,
        duration: 0.72,
        stagger: 0.14,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: '.itinerary-timeline',
          start: 'top 86%',
          once: true
        }
      });
    }

    // F. Multi-Layer Batik Sogan Scale + Parallax & Doa Card Clip-Path Unfurl
    const batikBg = document.querySelector('.batik-parallax-bg');
    if (batikBg) {
      gsap.fromTo(
        batikBg,
        { yPercent: -12, scale: 1.12 },
        {
          yPercent: 14,
          scale: 1.02,
          ease: 'none',
          scrollTrigger: {
            trigger: '.band-batik-doa',
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2
          }
        }
      );
    }

    const doaCard = document.querySelector('.doa-parchment-card');
    if (doaCard) {
      gsap.fromTo(
        doaCard,
        { clipPath: 'inset(8% 3% 8% 3%)', scale: 0.96 },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          scale: 1,
          duration: 1.0,
          ease: 'power3.out',
          clearProps: 'clipPath,transform',
          scrollTrigger: {
            trigger: '.band-batik-doa',
            start: 'top 78%',
            once: true
          }
        }
      );
    }
  });

  ScrollTrigger.refresh();
}

/* 4. Live Countdown to 14 March 2027, 10:00 AM MYT (UTC+8) */
function initCountdown() {
  const targetTime = new Date('2027-03-14T10:00:00+08:00').getTime();
  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');

  function update() {
    const diff = targetTime - Date.now();
    if (diff <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minsEl.textContent = '00';
      secsEl.textContent = '00';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    const secs = Math.floor((diff / 1000) % 60);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minsEl.textContent = String(mins).padStart(2, '0');
    secsEl.textContent = String(secs).padStart(2, '0');
  }

  update();
  setInterval(update, 1000);
}

/* 5. Atur Cara Majlis & Optional Family Lists */
function initItinerary() {
  const list = document.getElementById('itinerary-list');
  if (!list) return;

  const withIcons = CARD_CONFIG.itinerary.some((item) => item.icon);
  list.classList.toggle('with-icons', withIcons);

  list.innerHTML = CARD_CONFIG.itinerary
    .map((item) => {
      const text = `
        <span class="itinerary-time">${escapeHtml(item.time)}</span>
        <strong class="itinerary-title">${escapeHtml(item.title)}</strong>
        ${item.note ? `<span class="itinerary-note">${escapeHtml(item.note)}</span>` : ''}`;
      if (!item.icon) return `<li class="itinerary-item">${text}</li>`;
      return `
      <li class="itinerary-item has-icon">
        <img class="itinerary-icon" src="${escapeHtml(item.icon)}" alt="" width="56" height="56" loading="lazy" />
        <div class="itinerary-text">${text}</div>
      </li>`;
    })
    .join('');
}

function initExtraFamily() {
  const container = document.getElementById('extra-family-container');
  if (!container) return;

  let html = '';
  if (CARD_CONFIG.siblings.length > 0) {
    html += `<p class="turut-sub">Adik-Beradik</p><ul class="elders-editorial-list">${CARD_CONFIG.siblings
      .map((n) => `<li>${escapeHtml(n)}</li>`)
      .join('')}</ul>`;
  }
  if (CARD_CONFIG.relatives.length > 0) {
    html += `<p class="turut-sub">Saudara-Mara</p><ul class="elders-editorial-list">${CARD_CONFIG.relatives
      .map((n) => `<li>${escapeHtml(n)}</li>`)
      .join('')}</ul>`;
  }
  container.innerHTML = html;
}

/* 6. Calendar (.ics) Download */
function initCalendarDownload() {
  const btn = document.getElementById('download-ics-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Majlis Perkahwinan Dr. Alimin & Erna//MS',
      'BEGIN:VEVENT',
      'DTSTART:20270314T020000Z',
      'DTEND:20270314T090000Z',
      'SUMMARY:Majlis Kesyukuran Perkahwinan Dr. Alimin & Erna',
      'DESCRIPTION:Majlis Kesyukuran Perkahwinan Alimin bin Alias (Dr. Alimin) & Erna Hafizah Erpian (Erna). Masa: 10:00 Pagi - 5:00 Petang.',
      'LOCATION:Dewan SJK (C) Kung Ming, Taman Megah Jaya, 91007 Tawau, Sabah',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Majlis-Perkahwinan-Dr-Alimin-Erna.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Fail kalendar (.ics) telah dimuat turun.');
  });
}

/* 7. On-Demand Interactive Map */
function initLazyMap() {
  const toggleBtn = document.getElementById('toggle-map-btn');
  const container = document.getElementById('lazy-map-container');
  if (!toggleBtn || !container) return;

  let loaded = false;
  toggleBtn.addEventListener('click', () => {
    const isHidden = container.hasAttribute('hidden');
    if (isHidden) {
      if (!loaded) {
        const iframe = document.createElement('iframe');
        iframe.title = 'Peta Dewan SJK (C) Kung Ming, Tawau, Sabah';
        iframe.src = 'https://www.google.com/maps?q=Dewan+SJK+(C)+Kung+Ming+Tawau+Sabah&output=embed';
        iframe.loading = 'lazy';
        iframe.referrerPolicy = 'no-referrer-when-downgrade';
        container.appendChild(iframe);
        loaded = true;
      }
      container.removeAttribute('hidden');
      toggleBtn.textContent = 'Tutup Peta Interaktif';
      toggleBtn.setAttribute('aria-expanded', 'true');
      if (typeof window.ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    } else {
      container.setAttribute('hidden', '');
      toggleBtn.textContent = 'Paparkan Peta Interaktif';
      toggleBtn.setAttribute('aria-expanded', 'false');
      if (typeof window.ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    }
  });
}

/* 8. Buku Ucapan & Doa
   - Mod kongsi (CARD_CONFIG.wishesEndpoint diisi): ucapan dihantar ke Google Sheets klien
     dan semua tetamu nampak ucapan yang sama.
   - Mod pratonton (kosong): disimpan pada peranti ini sahaja, dan mesej memberitahunya
     dengan jujur supaya tiada tetamu tersalah faham ucapan mereka sudah sampai. */
function initWishesOnly() {
  const STORAGE_KEY = 'alimin_erna_wishes_v4';
  const MAX_NAME = 80;
  const MAX_WISH = 500;
  const endpoint = String(CARD_CONFIG.wishesEndpoint || '').trim();
  const shared = endpoint.length > 0;

  const form = document.getElementById('wish-form');
  const feedbackBox = document.getElementById('wish-feedback');
  const feedbackText = document.getElementById('wish-feedback-text');
  const listEl = document.getElementById('wishes-list');
  const countEl = document.getElementById('wishes-count');
  const submitBtn = document.getElementById('wish-submit');
  if (!form || !listEl || !countEl) return;

  if (!shared) {
    console.warn('[Buku Ucapan] wishesEndpoint kosong: mod pratonton (ucapan disimpan pada peranti ini sahaja).');
  }

  const refreshTriggers = () => {
    if (typeof window.ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  };

  function setFeedback(message) {
    feedbackText.textContent = message;
    feedbackBox.removeAttribute('hidden');
  }

  function renderWishes(wishes) {
    countEl.textContent = `${wishes.length} Ucapan`;
    if (wishes.length === 0) {
      listEl.innerHTML = '<p class="wishes-empty">Jadilah yang pertama menitipkan doa buat Dr. Alimin &amp; Erna.</p>';
    } else {
      listEl.innerHTML = wishes
        .map(
          (item) => `
            <article class="wish-entry">
              <span class="wish-name">${escapeHtml(item.name)}</span>
              <p class="wish-body">${escapeHtml(item.wish)}</p>
            </article>
          `
        )
        .join('');
    }
    refreshTriggers();
  }

  // ---- Mod pratonton (localStorage) ----
  function loadLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (Array.isArray(saved)) return saved;
    } catch (_) {}
    return [];
  }

  function saveLocal(wishes) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
    } catch (_) {}
  }

  // ---- Mod kongsi (Google Apps Script) ----
  // Content-Type text/plain = "simple request": tiada CORS preflight, yang tidak disokong Apps Script.
  async function loadShared() {
    listEl.innerHTML = '<p class="wishes-empty">Memuatkan ucapan&hellip;</p>';
    try {
      const res = await fetch(endpoint, { method: 'GET' });
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.wishes)) throw new Error('Respons tidak sah');
      renderWishes(data.wishes);
    } catch (err) {
      console.error('[Buku Ucapan] Gagal memuatkan:', err);
      countEl.textContent = '';
      listEl.innerHTML = '<p class="wishes-empty">Ucapan tidak dapat dimuatkan buat masa ini. Sila cuba sebentar lagi.</p>';
      refreshTriggers();
    }
  }

  async function sendShared(payload) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data || !data.ok) throw new Error((data && data.error) || 'Gagal dihantar');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('guest-name').value.trim().slice(0, MAX_NAME);
    const wish = document.getElementById('guest-wish').value.trim().slice(0, MAX_WISH);
    const honeypot = (document.getElementById('guest-website') || {}).value || '';

    if (!name || !wish) {
      setFeedback('Sila lengkapkan nama penuh dan ucapan anda terlebih dahulu.');
      return;
    }

    if (!shared) {
      const wishes = loadLocal();
      wishes.unshift({ name, wish });
      saveLocal(wishes);
      renderWishes(wishes);
      form.reset();
      setFeedback('Terima kasih! (Mod pratonton: ucapan ini disimpan pada peranti anda sahaja.)');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.dataset.label = submitBtn.textContent;
      submitBtn.textContent = 'Menghantar…';
    }
    try {
      await sendShared({ name, wish, website: honeypot });
      form.reset();
      setFeedback('Terima kasih! Ucapan dan doa anda telah sampai kepada keluarga mempelai.');
      showToast('Ucapan dan doa anda berjaya dihantar.');
      await loadShared();
    } catch (err) {
      console.error('[Buku Ucapan] Gagal menghantar:', err);
      setFeedback('Maaf, ucapan tidak dapat dihantar. Sila semak sambungan internet dan cuba lagi.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.label || 'Hantar Ucapan dan Doa';
      }
    }
  });

  if (shared) {
    loadShared();
  } else {
    renderWishes(loadLocal());
  }
}

/* 9. Real Background Music Player (assets/lagu.mp3) */
function tryPlayMusic(silent = false) {
  const audio = document.getElementById('bg-music');
  const btn = document.getElementById('music-toggle-btn');
  if (!audio || !btn) return;

  audio
    .play()
    .then(() => {
      btn.classList.add('is-playing');
      btn.setAttribute('aria-pressed', 'true');
    })
    .catch(() => {
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-pressed', 'false');
      if (!silent) {
        showToast('Lagu latar tidak dapat dimainkan buat masa ini.');
      }
    });
}

function initMusicPlayer() {
  const audio = document.getElementById('bg-music');
  const btn = document.getElementById('music-toggle-btn');
  if (!audio || !btn) return;

  // Butang muzik hanya dipaparkan jika fail lagu benar-benar wujud,
  // supaya tetamu tidak menekan butang yang tidak berfungsi.
  const source = audio.querySelector('source');
  const songUrl = source ? source.getAttribute('src') : audio.getAttribute('src');
  btn.hidden = true;
  if (songUrl) {
    fetch(songUrl, { method: 'HEAD' })
      .then((res) => { if (res.ok) btn.hidden = false; })
      .catch(() => {});
  }

  btn.addEventListener('click', () => {
    if (audio.paused) {
      tryPlayMusic(false);
    } else {
      audio.pause();
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-pressed', 'false');
    }
  });
}

/* 10. Bottom Nav Active Section Tracking */
function initBottomNavHighlight() {
  const navLinks = document.querySelectorAll('.bottom-nav a.nav-link');
  const sections = ['utama', 'mempelai', 'majlis', 'lokasi', 'ucapan']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach((link) => {
            link.classList.toggle('active', link.dataset.section === id);
          });
        }
      });
    },
    { rootMargin: '-30% 0px -55% 0px' }
  );

  sections.forEach((sec) => observer.observe(sec));
}

/* Helpers */
let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast-banner');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 2800);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
