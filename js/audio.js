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
  // קולות עבריים מוכרים לפי מין (ה-API לא חושף מין, אז לפי שם)
  const FEMALE_HE = /carmit|hila|female|woman|נקבה|girl|she\b/i;   // Carmit=אפל, Hila=מיקרוסופט
  const MALE_HE = /asaf|male\b|\bman\b|גבר|boy/i;                   // Asaf=מיקרוסופט (גברי)

  function voiceScore(v) {
    const name = (v.name || '').toLowerCase();
    let s = 0;
    // המשתמש ביקש קול נשי — העדפה חזקה לנשי, ועונש לגברי מוכר
    if (FEMALE_HE.test(name)) s += 80;
    if (MALE_HE.test(name)) s -= 80;
    // קולות נוירונים/משודרגים — הכי אנושיים וההגייה הכי טובה
    if (/premium|enhanced|neural|natural|siri/.test(name)) s += 60;
    // קולות רשת (לא מקומיים) בדרך כלל אנושיים יותר מהמקומיים
    if (v.localService === false) s += 30;
    if (/google/.test(name)) s += 20;
    // קולות "compact"/"eloquence"/"espeak" — הישנים והמכניים ביותר
    if (/compact|eloquence|espeak/.test(name)) s -= 60;
    return s;
  }

  function voiceIsFemale(v) { return FEMALE_HE.test(v.name || ''); }

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

  /* הניקוי משותף עם סקריפט היצירה (js/narration.js) כדי שהמפתחות יתאימו */
  const normalizeForSpeech = (window.Narration ? Narration.normalizeForSpeech
    : (t) => String(t).trim());
  const keyOf = (norm) => (window.Narration ? Narration.narrationHash(norm)
    : norm);

  /* ---------- קריינים נוירוניים (קובצי שמע שנוצרו מראש) ---------- */

  const LS_NARRATOR = 'kids-science.narrator'; // '' = אוטומטי, 'g:<id>' נוירוני, 'd:<name>' מכשיר
  const VOICES_BASE = 'assets/voices';
  let neuralVoices = [];            // [{id, name, female}]
  let clipSet = new Set();          // מפתחות שיש להם קובץ שמע
  let narratorPref = loadStr(LS_NARRATOR);
  let currentAudio = null;

  /* טעינת המניפסט של הקולות הנוירוניים (אם נוצרו) */
  function loadManifest() {
    try {
      fetch(VOICES_BASE + '/manifest.json', { cache: 'no-cache' })
        .then(r => (r.ok ? r.json() : null))
        .then(m => {
          if (!m || !Array.isArray(m.voices) || !m.voices.length) return;
          neuralVoices = m.voices;
          clipSet = new Set(Object.keys(m.clips || {}));
          notifyVoices();
        })
        .catch(() => { /* אין קולות נוירוניים — ממשיכים עם Web Speech */ });
    } catch (e) { /* ignore */ }
  }

  function neuralVoiceById(id) { return neuralVoices.find(v => v.id === id) || null; }

  /* הקריין הפעיל כרגע: נוירוני או קול-מכשיר */
  function currentNarrator() {
    if (narratorPref.startsWith('g:')) {
      const v = neuralVoiceById(narratorPref.slice(2));
      if (v) return { type: 'neural', voice: v };
    }
    if (narratorPref.startsWith('d:')) {
      return { type: 'device', name: narratorPref.slice(2) };
    }
    // אוטומטי: אם יש קולות נוירוניים — ברירת המחדל היא הראשון (הכי טבעי)
    if (neuralVoices.length) return { type: 'neural', voice: neuralVoices[0] };
    return { type: 'device', name: '' };
  }

  function clipUrl(voiceId, norm) {
    return `${VOICES_BASE}/${voiceId}/${keyOf(norm)}.mp3`;
  }
  function hasClip(norm) { return clipSet.has(keyOf(norm)); }

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

  loadManifest(); // טוען קריינים נוירוניים אם נוצרו מראש

  /**
   * מצב הקריינות במכשיר הזה:
   *   'none'       — לדפדפן אין בכלל Web Speech (למשל בתוך חלון מוטמע מסוים)
   *   'no-hebrew'  — יש הקראה, אבל לא נמצא קול עברי מותקן
   *   'ok'         — יש קול עברי
   */
  function speechState() {
    if (neuralVoices.length) return 'ok';   // יש קריינים נוירוניים מובנים
    if (!synth) return 'none';
    const voices = synth.getVoices() || [];
    if (!voices.length) return 'no-hebrew';
    return hebrewVoice ? 'ok' : 'no-hebrew';
  }

  let speakQueue = [];
  let speaking = false;

  function deviceVoiceFor(name) {
    if (name) {
      const match = listVoices().find(v => v.name === name);
      if (match) return match;
    }
    if (!voicesReady) pickVoice();
    return hebrewVoice;
  }

  function afterItem(item) {
    item.onend && item.onend();
    setTimeout(speakNext, item.gap ?? 120);
  }

  /* הקראה דרך Web Speech (קול המכשיר) */
  function webSpeakItem(item, deviceName) {
    if (!synth) { afterItem(item); return; }
    const u = new SpeechSynthesisUtterance(item.text);
    u.lang = 'he-IL';
    const v = deviceVoiceFor(deviceName);
    try { if (v) u.voice = v; } catch (e) { hebrewVoice = null; }
    u.rate = item.rate ?? speechRate;
    u.pitch = item.pitch ?? 1.0;
    u.volume = 1;
    u.onend = () => afterItem(item);
    u.onerror = () => afterItem(item);
    try { synth.speak(u); } catch (e) { speaking = false; }
  }

  /* השמעת קליפ נוירוני שנוצר מראש */
  function playClipItem(item, voiceId) {
    const a = new Audio(clipUrl(voiceId, item.text));
    currentAudio = a;
    // סרגל המהירות (0.6–1.2, בסיס 0.9) ממופה ל-playbackRate סביב 1.0
    a.playbackRate = Math.max(0.6, Math.min(1.6, speechRate / 0.9));
    a.onended = () => { if (currentAudio === a) currentAudio = null; afterItem(item); };
    a.onerror = () => { if (currentAudio === a) currentAudio = null; webSpeakItem(item, ''); };
    a.play().catch(() => { if (currentAudio === a) currentAudio = null; webSpeakItem(item, ''); });
  }

  function speakNext() {
    if (!speakQueue.length) { speaking = false; return; }
    speaking = true;
    const item = speakQueue.shift();
    const nar = currentNarrator();
    if (nar.type === 'neural' && hasClip(item.text)) {
      playClipItem(item, nar.voice.id);
    } else {
      webSpeakItem(item, nar.type === 'device' ? nar.name : '');
    }
  }

  /** מקריא טקסט (או מערך טקסטים ברצף). מתעלם אם הקריינות מושתקת. */
  function speak(text, opts = {}) {
    if (!narrationOn) return;
    if (!synth && !neuralVoices.length) return;
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
    if (currentAudio) { try { currentAudio.pause(); } catch (e) { /* ignore */ } currentAudio = null; }
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
        female: voiceIsFemale(v),
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

    /* ----- קריינים לבחירה: נוירוניים (טבעיים) + קולות המכשיר ----- */
    narrators() {
      const list = neuralVoices.map(v => ({
        id: 'g:' + v.id, label: v.name, neural: true, female: v.female !== false
      }));
      listVoices().forEach(v => list.push({
        id: 'd:' + v.name, label: v.name, neural: false, female: voiceIsFemale(v)
      }));
      return list;
    },
    get narratorId() {
      const nar = currentNarrator();
      return nar.type === 'neural' ? 'g:' + nar.voice.id : 'd:' + (nar.name || (hebrewVoice ? hebrewVoice.name : ''));
    },
    setNarrator(id) {
      narratorPref = id || '';
      saveStr(LS_NARRATOR, narratorPref);
      if (narratorPref.startsWith('d:')) {
        preferredVoiceName = narratorPref.slice(2);
        saveStr(LS_VOICE, preferredVoiceName);
        pickVoice();
      }
      return this.narratorId;
    },
    get hasNeural() { return neuralVoices.length > 0; },

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
