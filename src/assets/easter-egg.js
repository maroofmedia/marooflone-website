(function () {
  'use strict';

  // --- Audio API ---
  class SoundFX {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playChime(noteIndex = 0) {
      this.init();
      if (!this.ctx) return;

      try {
        // Pentatonic warm chime scale
        const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66];
        const freq = notes[noteIndex % notes.length];
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.065, now + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.39);
      } catch (e) { }
    }

    playCelebration() {
      this.init();
      if (!this.ctx) return;

      try {
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((freq, idx) => {
          const now = this.ctx.currentTime + idx * 0.065;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now);

          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now);
          osc.stop(now + 0.44);
        });
      } catch (e) { }
    }
  }

  // --- Confetti & Spark Canvas Engine ---
  class CanvasEffects {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.particles = [];
      this.active = false;
      this.setupCanvas();
    }

    setupCanvas() {
      let canvas = document.getElementById('easterEggCanvas');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'easterEggCanvas';
        document.body.appendChild(canvas);
      }
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => this.resize(), { passive: true });
    }

    resize() {
      if (!this.canvas) return;
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }

    launchConfetti(originX, originY, count = 50) {
      const colors = ['#4FD1C5', '#38BDF8', '#818CF8', '#F472B6', '#FBBF24', '#34D399'];
      const x = originX || window.innerWidth / 2;
      const y = originY || window.innerHeight / 3;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 9 + 3;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3.5,
          size: Math.random() * 6 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 12,
          gravity: 0.22,
          drag: 0.96,
          life: 1,
          decay: Math.random() * 0.015 + 0.01
        });
      }

      this.startLoop();
    }

    startLoop() {
      if (!this.active) {
        this.active = true;
        this.animate();
      }
    }

    animate() {
      if (!this.active) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.drag;
        p.rotation += p.rotSpeed;
        p.life -= p.decay;

        if (p.life <= 0 || p.y > window.innerHeight + 50) {
          this.particles.splice(i, 1);
          continue;
        }

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = Math.max(0, p.life);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        this.ctx.restore();
      }

      if (this.particles.length > 0) {
        requestAnimationFrame(() => this.animate());
      } else {
        this.active = false;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  // --- Main Controller ---
  function initEasterEgg() {
    const waveEl = document.querySelector('.wave');
    if (!waveEl) return;

    const sound = new SoundFX();
    const fx = new CanvasEffects();

    let clickCount = 0;
    let clickTimeout = null;

    // Enhance accessibility
    waveEl.setAttribute('role', 'button');
    waveEl.setAttribute('tabindex', '0');
    waveEl.setAttribute('aria-label', 'Wave Hello');
    waveEl.classList.add('interactive-wave');

    // Multilingual Greetings
    const phrases = [
      { text: 'Salam! ✨' },
      { text: 'Adaab! 🌸' },
      { text: 'Kher Chha? ❄️' },
      { text: 'Khush Amdeed! 🌺' },
      { text: 'Marhaban! 🌙' },
      { text: 'Ahlan! ✨' },
      { text: 'Dorood! 🕊️' },
      { text: 'Merhaba! 🇹🇷' },
      { text: 'Konnichiwa! 🍵' },
      { text: 'Annyeong! 🌸' },
      { text: 'Nǐ Hǎo! 🏮' },
      { text: 'Namaste! 🙏' },
      { text: 'Vanakkam! 🪔' },
      { text: 'Bonjour! 🥐' },
      { text: '¡Hola! ☀️' },
      { text: 'Ciao! ☕' },
      { text: 'Hallo! 🥨' },
      { text: 'Olá! 🌊' },
      { text: 'Privet! ❄️' },
      { text: 'Guten Tag! 🌲' },
      { text: 'Namaskara! ✨' },
      { text: 'Cześć! 🇵🇱' }
    ];

    let lastPhraseIndex = -1;
    function getNextPhrase() {
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * phrases.length);
      } while (nextIndex === lastPhraseIndex && phrases.length > 1);
      lastPhraseIndex = nextIndex;
      return phrases[nextIndex];
    }

    function spawnFloatingPhrase(x, y) {
      const item = getNextPhrase();
      const el = document.createElement('div');
      el.className = 'wave-floating-phrase';
      el.textContent = item.text;

      // Position cleanly above the wave emoji
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      document.body.appendChild(el);

      setTimeout(() => {
        el.remove();
      }, 1350);
    }

    function spawnSparkBurst(x, y, count = 6) {
      const colors = ['#4FD1C5', '#38BDF8', '#FBBF24', '#F472B6', '#A78BFA'];
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.className = 'wave-particle-spark';

        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const dist = Math.random() * 25 + 32;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - 8;
        const size = Math.random() * 3 + 3;

        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        el.style.boxShadow = `0 0 6px ${el.style.backgroundColor}`;
        el.style.setProperty('--dx', `${dx}px`);
        el.style.setProperty('--dy', `${dy}px`);
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;

        document.body.appendChild(el);

        setTimeout(() => {
          el.remove();
        }, 850);
      }
    }

    function handleWaveClick(e) {
      e.preventDefault();
      clickCount++;

      // Trigger fluid waving gesture
      waveEl.classList.remove('is-waving');
      void waveEl.offsetWidth;
      waveEl.classList.add('is-waving');

      setTimeout(() => {
        waveEl.classList.remove('is-waving');
      }, 820);

      // Play soothing chime note
      sound.playChime(clickCount);

      // Position spawn points above the hand so nothing blocks the wave emoji
      const rect = waveEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const topY = rect.top - 8;
      const centerY = rect.top + rect.height / 2;

      spawnFloatingPhrase(centerX, topY);
      spawnSparkBurst(centerX, centerY, 6);

      // Milestone celebration at 5 clicks
      if (clickCount % 5 === 0) {
        fx.launchConfetti(centerX, topY - 10, 60);
        sound.playCelebration();
      }

      // Reset click sequence counter after 3 seconds of inactivity
      if (clickTimeout) clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => {
        clickCount = 0;
      }, 3000);
    }

    waveEl.addEventListener('click', handleWaveClick);
    waveEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleWaveClick(e);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEasterEgg);
  } else {
    initEasterEgg();
  }
})();
