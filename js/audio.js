/* ============================================================
   audio.js — קריינות בעברית (Web Speech) + מוזיקה ואפקטים (Web Audio)
   שני ערוצים נפרדים לגמרי:
     Sound.narrationOn  — הקראה של השאלות והתשובות
     Sound.musicOn      — מוזיקת רקע + צלילי הצלחה/עידוד
   הכול נוצר בדפדפן — אין קבצי שמע ואין תלות באינטרנט.
   ============================================================ */

const Sound = (() => {
  const LS_NARR = 'kids-science.narration';
  const LS_MUSIC = 'kids-science.music';

  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let musicTimer = null;
  let step = 0;
  let started = false;

  let narrationOn = load(LS_NARR, true);
  let musicOn = load(LS_MUSIC, true);

  function load(key, def) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? def : v === '1';
    } catch (e) { return def; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, val ? '1' : '0'); } catch (e) { /* מצב פרטי */ }
  }

  /* ---------- Web Audio ---------- */

  function ensureCtx() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = musicOn ? 0.055 : 0;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = musicOn ? 0.5 : 0;
    sfxGain.connect(masterGain);
    return ctx;
  }

  /* צליל בודד רך */
  function tone(freq, start, dur, type = 'sine', peak = 0.5, dest = null) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  /* ---------- מוזיקת רקע: לולאה עדינה בסולם פנטטוני ---------- */

  const MELODY = [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 11, 9, 7, 4, 2];
  const BASE = 261.63; // דו

  function noteFreq(semi) { return BASE * Math.pow(2, semi / 12); }

  function musicTick() {
    if (!ctx || !musicOn) return;
    const t = ctx.currentTime + 0.05;
    const semi = MELODY[step % MELODY.length];
    tone(noteFreq(semi + 12), t, 0.55, 'triangle', 0.5, musicGain);
    if (step % 4 === 0) {
      tone(noteFreq(semi - 12), t, 1.1, 'sine', 0.7, musicGain);
    }
    step++;
  }

  function startMusic() {
    if (!ensureCtx() || musicTimer || !musicOn) return;
    musicTick();
    musicTimer = setInterval(musicTick, 420);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  /* ---------- אפקטים ---------- */

  const SFX = {
    pop() {
      if (!ensureCtx() || !musicOn) return;
      const t = ctx.currentTime;
      tone(520, t, 0.12, 'sine', 0.35);
      tone(780, t + 0.05, 0.12, 'sine', 0.25);
    },
    correct() {
      if (!ensureCtx() || !musicOn) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(f, t + i * 0.09, 0.35, 'triangle', 0.45);
      });
      tone(1567.98, t + 0.42, 0.5, 'sine', 0.18);
    },
    wrong() {
      if (!ensureCtx() || !musicOn) return;
      const t = ctx.currentTime;
      tone(330, t, 0.18, 'sine', 0.3);
      tone(262, t + 0.15, 0.3, 'sine', 0.28);
    },
    tada() {
      if (!ensureCtx() || !musicOn) return;
      const t = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
        tone(f, t + i * 0.11, 0.5, 'triangle', 0.45);
      });
      [1046.5, 1318.5, 1567.98].forEach((f, i) => {
        tone(f, t + 0.7 + i * 0.07, 0.8, 'sine', 0.3);
      });
    }
  };

  /* ---------- קריינות ---------- */

  const synth = window.speechSynthesis || null;
  let hebrewVoice = null;
  let voicesReady = false;

  function pickVoice() {
    if (!synth) return null;
    const voices = synth.getVoices() || [];
    if (!voices.length) return null;
    voicesReady = true;
    hebrewVoice =
      voices.find(v => /^he/i.test(v.lang) && /google|natural|premium|enhanced/i.test(v.name)) ||
      voices.find(v => /^he/i.test(v.lang)) ||
      voices.find(v => /iw/i.test(v.lang)) ||
      null;
    return hebrewVoice;
  }

  if (synth) {
    pickVoice();
    synth.addEventListener?.('voiceschanged', pickVoice);
  }

  let speakQueue = [];
  let speaking = false;

  function speakNext() {
    if (!synth || !speakQueue.length) { speaking = false; return; }
    speaking = true;
    const item = speakQueue.shift();
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = 'he-IL';
    if (!voicesReady) pickVoice();
    if (hebrewVoice) u.voice = hebrewVoice;
    u.rate = item.rate ?? 0.92;   // קצב נינוח לילדים
    u.pitch = item.pitch ?? 1.12; // קול חמוד יותר
    u.volume = 1;
    u.onend = () => { item.onend?.(); setTimeout(speakNext, item.gap ?? 120); };
    u.onerror = () => { item.onend?.(); setTimeout(speakNext, 80); };
    try { synth.speak(u); } catch (e) { speaking = false; }
  }

  /** מקריא טקסט (או מערך טקסטים ברצף). מתעלם אם הקריינות מושתקת. */
  function speak(text, opts = {}) {
    if (!synth || !narrationOn) return;
    const list = Array.isArray(text) ? text : [text];
    stopSpeaking();
    speakQueue = list
      .filter(Boolean)
      .map((t, i, arr) => ({
        text: String(t),
        rate: opts.rate,
        pitch: opts.pitch,
        gap: opts.gap,
        onend: i === arr.length - 1 ? opts.onend : null
      }));
    // ב-Chrome צריך לפעמים "לבעוט" את המנוע אחרי cancel
    setTimeout(speakNext, 60);
  }

  function stopSpeaking() {
    speakQueue = [];
    speaking = false;
    try { synth && synth.cancel(); } catch (e) { /* ignore */ }
  }

  /* כרום משתיק קריינות ארוכה — טריק תחזוקה מוכר */
  if (synth) {
    setInterval(() => {
      if (speaking && synth.speaking && !synth.paused) {
        try { synth.pause(); synth.resume(); } catch (e) { /* ignore */ }
      }
    }, 9000);
  }

  /* ---------- API ---------- */

  return {
    get narrationOn() { return narrationOn; },
    get musicOn() { return musicOn; },
    get speechSupported() { return !!synth; },

    /** להפעיל בפעם הראשונה שהמשתמש נוגע במסך (מדיניות דפדפנים) */
    unlock() {
      if (started) { ensureCtx(); return; }
      started = true;
      ensureCtx();
      if (musicOn) startMusic();
    },

    toggleNarration() {
      narrationOn = !narrationOn;
      save(LS_NARR, narrationOn);
      if (!narrationOn) stopSpeaking();
      return narrationOn;
    },

    toggleMusic() {
      musicOn = !musicOn;
      save(LS_MUSIC, musicOn);
      ensureCtx();
      if (musicGain) musicGain.gain.value = musicOn ? 0.055 : 0;
      if (sfxGain) sfxGain.gain.value = musicOn ? 0.5 : 0;
      if (musicOn) startMusic(); else stopMusic();
      return musicOn;
    },

    /** משתיק זמנית את המוזיקה (למשל כשמנגן סרטון) ומחזיר פונקציית שחזור */
    duckMusic() {
      if (!musicGain) return () => {};
      const prev = musicGain.gain.value;
      musicGain.gain.value = 0;
      stopMusic();
      return () => {
        if (musicOn) { musicGain.gain.value = prev || 0.055; startMusic(); }
      };
    },

    speak,
    stopSpeaking,
    sfx: SFX
  };
})();
