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

  const LS_VOICE = 'kids-science.voice';
  const LS_RATE = 'kids-science.rate';

  let preferredVoiceName = loadStr(LS_VOICE);
  let speechRate = parseFloat(loadStr(LS_RATE)) || 0.9;

  function loadStr(key) {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }
  function saveStr(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* מצב פרטי */ }
  }

  function isHebrew(v) { return /^(he|iw)/i.test(v.lang || ''); }

  /**
   * ניקוד איכות לקול. ככל שגבוה יותר — נשמע אנושי יותר.
   * הסדר כאן חשוב: ברוב המכשירים מותקנים כמה קולות עבריים
   * באיכות שונה מאוד, והדפדפן בוחר בעצמו — לא תמיד את הטוב.
   */
  function voiceScore(v) {
    const name = (v.name || '').toLowerCase();
    let s = 0;
    // קולות נוירונים/משודרגים — הכי אנושיים
    if (/premium|enhanced|neural|natural|siri/.test(name)) s += 60;
    // קולות רשת של גוגל טובים בדרך כלל מהמקומיים
    if (v.localService === false) s += 30;
    if (/google/.test(name)) s += 20;
    // קול נשי נתפס כנעים יותר לילדים; carmit הוא הקול העברי של אפל
    if (/carmit|female|נקבה|woman/.test(name)) s += 10;
    // קולות "compact"/"eloquence" הם הישנים והמכניים ביותר
    if (/compact|eloquence|espeak/.test(name)) s -= 50;
    return s;
  }

  /** כל הקולות העבריים במכשיר, מהטוב לפחות טוב */
  function listVoices() {
    if (!synth) return [];
    return (synth.getVoices() || [])
      .filter(isHebrew)
      .sort((a, b) => voiceScore(b) - voiceScore(a));
  }

  function pickVoice() {
    if (!synth) return null;
    const voices = synth.getVoices() || [];
    if (!voices.length) return null;
    voicesReady = true;
    const hebrew = listVoices();
    // העדפה מפורשת של המשתמש גוברת על הדירוג האוטומטי
    hebrewVoice =
      (preferredVoiceName && hebrew.find(v => v.name === preferredVoiceName)) ||
      hebrew[0] ||
      null;
    return hebrewVoice;
  }

  /**
   * ניקוי טקסט לפני הקראה. סימנים כמו … ו-־ נקראים מוזר
   * במנועי TTS ומוסיפים לתחושה המכנית.
   */
  function normalizeForSpeech(text) {
    return String(text)
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, ' ') // אמוג'י וחצים
      .replace(/…/g, ',')      // שלוש נקודות -> הפסקה קצרה
      .replace(/־/g, ' ')      // מקף עברי
      .replace(/\s*—\s*/g, ', ') // מקף ארוך -> הפסקה
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.!?])/g, '$1')
      .replace(/([.!?])\s*,/g, '$1')   // "בום!, בום" -> "בום! בום"
      .replace(/,\s*,/g, ',')
      .trim();
  }

  /* מנויים שרוצים לדעת מתי רשימת הקולות התעדכנה (היא נטענת אסינכרונית) */
  const voiceListeners = [];
  function onVoices(cb) { voiceListeners.push(cb); }
  function notifyVoices() { voiceListeners.forEach(cb => { try { cb(); } catch (e) { /* ignore */ } }); }

  if (synth) {
    pickVoice();
    synth.addEventListener?.('voiceschanged', () => { pickVoice(); notifyVoices(); });
    // בחלק מהמכשירים voiceschanged לא נורה — בודקים שוב אחרי רגע
    setTimeout(() => { if (!hebrewVoice) { pickVoice(); notifyVoices(); } }, 1200);
  }

  /**
   * מצב הקריינות במכשיר הזה:
   *   'none'       — לדפדפן אין בכלל Web Speech (למשל בתוך חלון מוטמע מסוים)
   *   'no-hebrew'  — יש הקראה, אבל לא נמצא קול עברי מותקן
   *   'ok'         — יש קול עברי
   */
  function speechState() {
    if (!synth) return 'none';
    const voices = synth.getVoices() || [];
    if (!voices.length) return 'no-hebrew';
    return hebrewVoice ? 'ok' : 'no-hebrew';
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
    // הפניה לקול יכולה להתיישן כשרשימת הקולות מתחלפת — לא נותנים לזה
    // להפיל את כל הקריינות; בלי voice הדפדפן יבחר לפי lang
    try { if (hebrewVoice) u.voice = hebrewVoice; } catch (e) { hebrewVoice = null; }
    u.rate = item.rate ?? speechRate; // קצב נינוח לילדים, ניתן לכוונון
    // pitch גבוה על מנוע פשוט נשמע מכני ומתכתי — 1.0 הכי טבעי
    u.pitch = item.pitch ?? 1.0;
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
      .map(normalizeForSpeech)
      .filter(Boolean)
      .map((t, i, arr) => ({
        text: t,
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
    speechState,
    onVoices,

    /** רשימת הקולות העבריים במכשיר, מהטוב לפחות טוב */
    voices() {
      return listVoices().map(v => ({
        name: v.name,
        lang: v.lang,
        network: v.localService === false,
        score: voiceScore(v)
      }));
    },
    get voiceName() { return hebrewVoice ? hebrewVoice.name : ''; },
    setVoice(name) {
      preferredVoiceName = name || '';
      saveStr(LS_VOICE, preferredVoiceName);
      pickVoice();
      return hebrewVoice ? hebrewVoice.name : '';
    },

    get rate() { return speechRate; },
    setRate(r) {
      speechRate = Math.min(1.2, Math.max(0.6, Number(r) || 0.9));
      saveStr(LS_RATE, String(speechRate));
      return speechRate;
    },

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
