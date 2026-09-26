(() => {
  const variants = {
    a: { duration: 1100 },
    b: { duration: 900, frames: [
      [0, 0, 0, 0, 1, 0, 0, 0], [.12, -9, 2, -10, .88, .1, 0, 0],
      [.36, 10, -3, 4, 1.07, 1, 0, 0], [.57, 13, -3, 0, 1, .8, 0, 0],
      [.83, 3, -1, 0, 1, .2, 0, 0], [1, 0, 0, 0, 1, 0, 0, 0]
    ]},
    c: { duration: 1600, frames: [
      [0, 0, 0, 0, 1, 0, 0, 0], [.14, -3, 1, -12, .96, .1, 0, 0],
      [.35, 8, -8, 25, 1.04, .7, .35, .7], [.50, 11, -9, 42, 1, 1, .8, 1],
      [.7, 4, -4, 14, 1, .6, .7, .7], [.88, -1, 1, -5, .98, .2, .15, .2],
      [1, 0, 0, 0, 1, 0, 0, 0]
    ]}
  };

  const scrubber = document.getElementById('scrubber');
  const readout = document.getElementById('timeReadout');
  const reduce = document.getElementById('reduceMotion');
  const playButton = document.getElementById('playButton');
  const themeButton = document.getElementById('themeButton');
  const magnify = document.getElementById('magnifyScene');
  magnify.innerHTML = document.querySelector('#flightBox .flight-scene').outerHTML
    + document.querySelector('#flightBox .welcome-scene').outerHTML;
  const scenes = [...document.querySelectorAll('.flight-scene')].map(el => ({
    plane: el.querySelector('.plane'),
    trails: [...el.querySelectorAll('.flight-trail')],
    sparks: [...el.querySelectorAll('.flight-spark')],
    confetti: [...el.querySelectorAll('.flight-confetti')]
  }));
  const welcomeScenes = [...document.querySelectorAll('.welcome-scene')].map(el => ({
    icon: el.querySelector('.welcome-icon'),
    glints: [...el.querySelectorAll('.welcome-glint')]
  }));
  const banner = document.querySelector('.success-banner');
  const postCopy = document.querySelector('.post-copy');
  const postLetters = [...postCopy.textContent].map(character => {
    const span = document.createElement('span');
    span.textContent = character;
    return span;
  });
  postCopy.replaceChildren(...postLetters);
  const welcomeCopy = document.querySelector('.welcome-copy');
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  reduce.checked = media.matches;
  let variant = 'a';
  let notice = 'post';
  let raf = 0;
  let progress = 0;

  function duration() {
    return notice === 'welcome' ? 1600 : variants[variant].duration;
  }

  function interpolate(frames, t) {
    const nextIndex = frames.findIndex(frame => frame[0] >= t);
    if (nextIndex <= 0) return frames[0].slice(1);
    const before = frames[nextIndex - 1];
    const after = frames[nextIndex];
    const span = (t - before[0]) / (after[0] - before[0]);
    const ease = span * span * (3 - 2 * span);
    return before.slice(1).map((value, i) => value + (after[i + 1] - value) * ease);
  }

  function smoothstep(start, end, t) {
    const u = Math.max(0, Math.min(1, (t - start) / (end - start)));
    return u * u * (3 - 2 * u);
  }

  function renderPostCopy() {
    const elapsed = progress * duration();
    postLetters.forEach((letter, index) => {
      const elapsedForLetter = Math.max(0, Math.min(1, (elapsed - 40 - index * 35) / 380));
      const eased = reduce.checked ? 1 : 1 - Math.pow(1 - elapsedForLetter, 3);
      letter.style.opacity = String(eased);
      letter.style.transform = `translate(${(-5 * (1 - eased)).toFixed(2)}px, ${(10 * (1 - eased)).toFixed(2)}px)`;
    });
  }

  function render(t) {
    progress = Math.max(0, Math.min(1, t));
    if (notice === 'welcome') {
      const envelope = Math.sin(Math.PI * progress);
      const sway = reduce.checked ? 0 : Math.sin(2 * Math.PI * progress) * envelope * 9;
      const lift = reduce.checked ? 0 : -2.5 * envelope;
      const scale = reduce.checked ? 1 : 1 + envelope * .055;
      for (const scene of welcomeScenes) {
        scene.icon.style.transform = `translateY(${lift.toFixed(2)}px) rotate(${sway.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        scene.glints.forEach((el, i) => {
          el.style.opacity = String(reduce.checked ? 0 : envelope * (i ? .38 : .65));
          el.style.transform = `translateY(${(-envelope * (i ? 2 : 4)).toFixed(2)}px)`;
        });
      }
      updateReadout();
      return;
    }
    renderPostCopy();
    if (variant === 'a') {
      // One continuous, gently accelerating flight from lower left to upper right.
      const travel = reduce.checked ? 0 : Math.pow(progress, 1.35);
      const x = reduce.checked ? 0 : -20 + 46 * travel;
      const y = reduce.checked ? 0 : 18 - 44 * travel;
      const opacity = reduce.checked ? 1 : smoothstep(0, .18, progress) * (1 - smoothstep(.68, 1, progress));
      const trail = reduce.checked ? 0 : opacity * (1 - smoothstep(.55, 1, progress));
      for (const scene of scenes) {
        scene.plane.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(-43deg)`;
        scene.plane.style.opacity = String(opacity);
        scene.trails.forEach((el, i) => {
          el.style.opacity = String(trail * (i ? .38 : .62));
          el.style.transform = `translate(${(x + (i ? -5 : 0)).toFixed(2)}px, ${(y + (i ? 5 : 6)).toFixed(2)}px) rotate(-43deg) scaleY(.65)`;
        });
        scene.sparks.forEach(el => { el.style.opacity = '0'; });
        scene.confetti.forEach(el => { el.style.opacity = '0'; });
      }
      updateReadout();
      return;
    }
    let [x, y, rotation, scale, trail, spark, confetti] = interpolate(variants[variant].frames, progress);
    if (reduce.checked) {
      x = Math.sin(progress * Math.PI) * 3;
      y = -Math.sin(progress * Math.PI) * 2;
      rotation = Math.sin(progress * Math.PI) * 6;
      scale = 1;
      trail = spark = confetti = 0;
    }
    for (const scene of scenes) {
      scene.plane.style.opacity = '1';
      scene.plane.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rotation.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      scene.trails.forEach((el, i) => {
        el.style.opacity = String(Math.max(0, trail * (i ? .48 : .75)));
        el.style.transform = `translateX(${(x * .3).toFixed(2)}px) scaleX(${(1 + trail * 1.2).toFixed(2)})`;
      });
      scene.sparks.forEach((el, i) => {
        el.style.opacity = String(Math.max(0, spark * (i ? .6 : 1)));
        el.style.transform = `translate(${(i ? -spark * 3 : spark * 3).toFixed(2)}px,${(-spark * 3).toFixed(2)}px)`;
      });
      scene.confetti.forEach((el, i) => {
        el.style.opacity = String(confetti * (i % 2 ? .8 : 1));
        const dx = (i % 2 ? 1 : -1) * (3 + i * 2) * confetti;
        const dy = (i < 2 ? -1 : 1) * (2 + i) * confetti;
        el.style.transform = `translate(${dx.toFixed(2)}px,${dy.toFixed(2)}px) rotate(${(confetti * 45 * (i + 1)).toFixed(1)}deg)`;
      });
    }
    updateReadout();
  }

  function updateReadout() {
    scrubber.value = String(Math.round(progress * 100));
    scrubber.style.background = `linear-gradient(to right, var(--accent) ${progress * 100}%, var(--line) ${progress * 100}%)`;
    readout.innerHTML = `${Math.round(progress * 100)}% <small>/ ${(duration() / 1000).toFixed(1)}s</small>`;
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function play() {
    stop();
    render(0);
    const started = performance.now();
    const currentDuration = duration();
    function tick(now) {
      const t = Math.min(1, (now - started) / currentDuration);
      render(t);
      raf = t < 1 ? requestAnimationFrame(tick) : 0;
    }
    raf = requestAnimationFrame(tick);
  }

  document.querySelectorAll('.variant').forEach(button => {
    button.addEventListener('click', () => {
      variant = button.dataset.variant;
      document.querySelectorAll('.variant').forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      play();
    });
  });
  document.querySelectorAll('.notice-option').forEach(button => {
    button.addEventListener('click', () => {
      if (notice === button.dataset.notice) return;
      notice = button.dataset.notice;
      document.body.dataset.notice = notice;
      document.querySelectorAll('.notice-option').forEach(item => {
        const selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      document.querySelectorAll('.flight-scene').forEach(el => { el.hidden = notice === 'welcome'; });
      document.querySelectorAll('.welcome-scene').forEach(el => { el.hidden = notice === 'post'; });
      postCopy.hidden = notice === 'welcome';
      welcomeCopy.hidden = notice === 'post';
      banner.setAttribute('aria-label', notice === 'welcome' ? 'おかえりなさい、はたさん' : 'ノートを作成しました');
      play();
    });
  });
  playButton.addEventListener('click', play);
  scrubber.addEventListener('input', () => { stop(); render(Number(scrubber.value) / 100); });
  reduce.addEventListener('change', () => { stop(); render(progress); });
  media.addEventListener('change', event => { reduce.checked = event.matches; stop(); render(progress); });
  themeButton.addEventListener('click', () => {
    const light = document.body.dataset.theme !== 'light';
    document.body.dataset.theme = light ? 'light' : 'dark';
    themeButton.innerHTML = light ? '☾ <span>DARK</span>' : '☀ <span>LIGHT</span>';
    themeButton.setAttribute('aria-label', light ? '暗いテーマに切り替え' : '明るいテーマに切り替え');
  });
  render(0);
  if (!reduce.checked) play();
})();
