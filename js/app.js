/* ============================================================
   app.js — הלוגיקה של החידון: מסכים, שאלות, ניקוד, קריינות
   ============================================================ */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const el = {
    body: document.body,
    screens: {
      level: $('#screen-level'),
      home: $('#screen-home'),
      quiz: $('#screen-quiz'),
      done: $('#screen-done')
    },
    levelGrid: $('#level-grid'),
    btnLevels: $('#btn-levels'),
    homeLevelTitle: $('#home-title'),
    homeLevelAges: $('#home-level-ages'),
    topicGrid: $('#topic-grid'),
    stage: $('#stage'),
    question: $('#question-text'),
    answers: $('#answers'),
    feedback: $('#feedback'),
    btnNext: $('#btn-next'),
    btnReplay: $('#btn-replay'),
    btnHome: $('#btn-home'),
    btnRandom: $('#btn-random'),
    btnAgain: $('#btn-again'),
    btnTopics: $('#btn-topics'),
    btnVideo: $('#btn-video'),
    btnNarration: $('#btn-narration'),
    btnSound: $('#btn-sound'),
    progressWrap: $('#progress-wrap'),
    progressLabel: $('#progress-label'),
    progressFill: $('#progress-fill'),
    progressBar: $('.progress-track'),
    scoreValue: $('#score-value'),
    doneTitle: $('#done-title'),
    doneText: $('#done-text'),
    doneMedal: $('#done-medal'),
    doneStars: $('#done-stars'),
    sticker: $('#sticker'),
    confetti: $('#confetti'),
    speechHint: $('#speech-hint'),
    btnTestVoice: $('#btn-test-voice'),
    voicePanel: $('#voice-panel'),
    voiceSelect: $('#voice-select'),
    voiceSelectRow: $('#voice-select-row'),
    rateSelect: $('#rate-select'),
    videoModal: $('#video-modal'),
    videoHolder: $('#video-holder'),
    videoTitle: $('#video-title'),
    btnCloseVideo: $('#btn-close-video')
  };

  const state = {
    level: null,
    topic: null,
    index: 0,
    stars: 0,
    attempts: 0,
    locked: false,
    order: [],        // סדר התצוגה המעורבב של התשובות לשאלה הנוכחית
    restoreMusic: null
  };

  const LS_BEST = 'kids-science.best';

  /* ---------- שמירת תוצאות (בטוח גם בלי localStorage) ---------- */

  function loadBest() {
    try { return JSON.parse(localStorage.getItem(LS_BEST) || '{}'); }
    catch (e) { return {}; }
  }
  function saveBest(topicId, stars) {
    try {
      const best = loadBest();
      if (!best[topicId] || stars > best[topicId]) {
        best[topicId] = stars;
        localStorage.setItem(LS_BEST, JSON.stringify(best));
      }
    } catch (e) { /* מצב פרטי — לא נורא */ }
  }

  /* ---------- מסכים ---------- */

  function showScreen(name) {
    Object.entries(el.screens).forEach(([key, node]) => {
      node.classList.toggle('is-active', key === name);
    });
    // כפתור הבית מחזיר לרשימת הנושאים — לא רלוונטי במסך הרמה או במסך הנושאים עצמו
    el.btnHome.hidden = (name === 'home' || name === 'level');
    el.progressWrap.hidden = (name !== 'quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- מסך בחירת רמה ---------- */

  function renderLevels() {
    el.levelGrid.innerHTML = LEVELS.map(lv => `
      <button class="level-card" type="button" data-level="${lv.id}"
        style="--main:${lv.theme.main}; --soft:${lv.theme.soft}; --deep:${lv.theme.deep}; --accent:${lv.theme.accent}">
        <span class="level-emoji" aria-hidden="true">${lv.emoji}</span>
        <span class="level-title">${lv.title}</span>
        <span class="level-ages">${lv.ages}</span>
        <span class="level-blurb">${lv.blurb}</span>
        <span class="level-meta">${lv.topics.length} נושאים</span>
      </button>`).join('');

    el.levelGrid.querySelectorAll('.level-card').forEach(card => {
      card.addEventListener('click', () => {
        Sound.sfx.pop();
        selectLevel(card.dataset.level);
      });
    });
  }

  function selectLevel(levelId) {
    const level = LEVELS.find(l => l.id === levelId);
    if (!level) return;
    state.level = level;
    applyTheme(level.theme);
    renderHome();
    showScreen('home');
  }

  /* ---------- מסך הנושאים ---------- */

  function renderHome() {
    const level = state.level || LEVELS[0];
    el.homeLevelTitle.textContent = level.title;
    el.homeLevelAges.textContent = level.ages;

    const best = loadBest();
    el.topicGrid.innerHTML = level.topics.map(t => {
      const stars = best[t.id] || 0;
      const total = t.questions.length;
      const badge = stars
        ? `<span class="topic-badge" title="השיא שלך">${'⭐'.repeat(Math.min(stars, 5))}</span>`
        : '';
      return `
        <button class="topic-card" type="button" data-topic="${t.id}"
          style="--main:${t.theme.main}; --soft:${t.theme.soft}; --deep:${t.theme.deep}; --accent:${t.theme.accent}">
          <span class="topic-emoji" aria-hidden="true">${t.emoji}</span>
          <span class="topic-title">${t.title}</span>
          <span class="topic-blurb">${t.blurb}</span>
          <span class="topic-meta">${total} שאלות ${badge}</span>
        </button>`;
    }).join('');

    el.topicGrid.querySelectorAll('.topic-card').forEach(card => {
      card.addEventListener('click', () => {
        Sound.sfx.pop();
        startTopic(card.dataset.topic);
      });
    });
  }

  /* ---------- התחלת נושא ---------- */

  function startTopic(topicId) {
    const topics = (state.level || LEVELS[0]).topics;
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    state.topic = topic;
    state.index = 0;
    state.stars = 0;
    applyTheme(topic.theme);
    showScreen('quiz');
    renderQuestion();
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    root.style.setProperty('--main', theme.main);
    root.style.setProperty('--soft', theme.soft);
    root.style.setProperty('--deep', theme.deep);
    root.style.setProperty('--accent', theme.accent);
  }

  /* ---------- שאלה ---------- */

  function currentQuestion() {
    return state.topic.questions[state.index];
  }

  /* ערבוב Fisher–Yates — כדי שהתשובה הנכונה לא תהיה תמיד הראשונה */
  function shuffled(n) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function renderQuestion() {
    const q = currentQuestion();
    state.attempts = 0;
    state.locked = false;
    state.order = shuffled(q.a.length);

    // אנימציה — scene של השאלה, ואם אין, ה-scene של הנושא
    el.stage.innerHTML = renderScene(q.scene || state.topic.scene);
    el.stage.classList.remove('stage-pop');
    void el.stage.offsetWidth;
    el.stage.classList.add('stage-pop');

    // שאלה
    el.question.textContent = q.q;

    // תשובות — מוצגות בסדר מעורבב, אך data-index נשאר האינדקס המקורי
    el.answers.innerHTML = state.order.map(i => {
      const ans = q.a[i];
      const emoji = ans.emoji
        ? `<span class="answer-emoji" aria-hidden="true">${ans.emoji}</span>` : '';
      return `
      <div class="answer${ans.emoji ? '' : ' answer-noemoji'}">
        <button class="answer-btn" type="button" data-index="${i}">
          ${emoji}
          <span class="answer-text">${ans.text}</span>
          <span class="answer-mark" aria-hidden="true"></span>
        </button>
        <button class="speak-btn answer-speak" type="button" data-speak="${i}"
          aria-label="הקריאו לי: ${ans.text}"><span aria-hidden="true">🔊</span></button>
      </div>`;
    }).join('');

    el.answers.querySelectorAll('.answer-btn').forEach(btn => {
      btn.addEventListener('click', () => onAnswer(Number(btn.dataset.index)));
    });
    el.answers.querySelectorAll('.answer-speak').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const i = Number(btn.dataset.speak);
        Sound.sfx.pop();
        Sound.speak(q.a[i].text);
      });
    });

    // איפוס
    el.feedback.className = 'feedback';
    el.feedback.textContent = '';
    el.btnNext.hidden = true;

    // סרטון
    const video = getVideo(state.topic.id, state.index);
    el.btnVideo.hidden = !video;

    updateProgress();
    narrateQuestion();
  }

  function narrateQuestion(includeAnswers) {
    const q = currentQuestion();
    const parts = [q.q];
    if (includeAnswers) {
      // מקריאים לפי סדר התצוגה שעל המסך
      state.order.forEach(i => parts.push(q.a[i].text));
    }
    Sound.speak(parts, { gap: 350 });
  }

  function updateProgress() {
    const total = state.topic.questions.length;
    const shown = state.index + 1;
    const pct = Math.round((state.index / total) * 100);
    el.progressLabel.textContent = `שאלה ${shown} מתוך ${total}`;
    el.progressFill.style.width = pct + '%';
    el.progressBar.setAttribute('aria-valuenow', String(pct));
    el.scoreValue.textContent = String(state.stars);
  }

  /* ---------- בדיקת תשובה ---------- */

  function onAnswer(index) {
    if (state.locked) return;
    const q = currentQuestion();
    const card = el.answers.querySelector(`.answer-btn[data-index="${index}"]`);
    if (!card || card.classList.contains('is-wrong')) return;

    if (index === q.correct) {
      state.locked = true;
      card.classList.add('is-correct');
      if (state.attempts === 0) state.stars++;
      updateProgress();
      Sound.sfx.correct();
      burstConfetti();
      disableAnswers();

      const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      showFeedback('good', praise, q.explain);
      Sound.speak([praise, q.explain], { gap: 260 });

      el.btnNext.hidden = false;
      el.btnNext.textContent = (state.index === state.topic.questions.length - 1)
        ? 'לסיום 🎉' : 'לשאלה הבאה ←';
      setTimeout(() => el.btnNext.focus({ preventScroll: true }), 400);

    } else {
      state.attempts++;
      card.classList.add('is-wrong');
      card.classList.add('shake');
      setTimeout(() => card.classList.remove('shake'), 500);
      Sound.sfx.wrong();

      if (state.attempts >= 2) {
        // אחרי שני ניסיונות — מגלים בעדינות את התשובה ולומדים
        state.locked = true;
        disableAnswers();
        const right = el.answers.querySelector(`.answer-btn[data-index="${q.correct}"]`);
        right.classList.remove('is-dim');
        right.classList.add('is-correct', 'is-reveal');
        showFeedback('learn', 'התשובה הנכונה היא: ' + q.a[q.correct].text, q.explain);
        Sound.speak(['התשובה הנכונה היא', q.a[q.correct].text, q.explain], { gap: 300 });
        el.btnNext.hidden = false;
        el.btnNext.textContent = (state.index === state.topic.questions.length - 1)
          ? 'לסיום 🎉' : 'לשאלה הבאה ←';
      } else {
        const msg = TRY_AGAIN[Math.floor(Math.random() * TRY_AGAIN.length)];
        showFeedback('retry', msg, '');
        Sound.speak(msg);
      }
    }
  }

  function disableAnswers() {
    el.answers.querySelectorAll('.answer-btn').forEach(b => {
      b.disabled = true;
      if (!b.classList.contains('is-correct') && !b.classList.contains('is-wrong')) {
        b.classList.add('is-dim');
      }
    });
  }

  function showFeedback(kind, title, detail) {
    el.feedback.className = 'feedback is-visible feedback-' + kind;
    el.feedback.innerHTML = `<strong class="feedback-title">${title}</strong>` +
      (detail ? `<span class="feedback-detail">${detail}</span>` : '');
  }

  /* ---------- מעבר לשאלה הבאה / סיום ---------- */

  function nextQuestion() {
    Sound.sfx.pop();
    if (state.index < state.topic.questions.length - 1) {
      state.index++;
      renderQuestion();
    } else {
      finish();
    }
  }

  function finish() {
    const total = state.topic.questions.length;
    const stars = state.stars;
    saveBest(state.topic.id, stars);
    showScreen('done');

    const perfect = stars === total;
    const great = stars >= Math.ceil(total * 0.6);

    el.doneMedal.textContent = perfect ? '🏆' : great ? '🥇' : '🎈';
    el.doneTitle.textContent = perfect ? 'מושלם! מדען אלוף!' : great ? 'כל הכבוד!' : 'יופי שניסית!';
    el.doneText.textContent = `ענית נכון בפעם הראשונה על ${stars} מתוך ${total} שאלות בנושא ${state.topic.title}.`;
    el.doneStars.innerHTML = Array.from({ length: total }, (_, i) =>
      `<span class="done-star ${i < stars ? 'is-on' : ''}" style="--delay:${i * 0.12}s">⭐</span>`).join('');
    el.sticker.textContent = state.topic.sticker;

    Sound.sfx.tada();
    burstConfetti(60);
    Sound.speak([el.doneTitle.textContent, 'כל הכבוד! הרווחת מדבקה!'], { gap: 300 });
  }

  /* ---------- קונפטי ---------- */

  const CONFETTI_COLORS = ['#ff5d8f', '#ffd93d', '#4bb8f0', '#5ed17a', '#a98fff', '#ff8c2b'];

  function burstConfetti(count = 34) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.animationDelay = (Math.random() * 0.5) + 's';
      piece.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      if (i % 3 === 0) piece.style.borderRadius = '50%';
      frag.appendChild(piece);
    }
    el.confetti.appendChild(frag);
    setTimeout(() => { el.confetti.innerHTML = ''; }, 3600);
  }

  /* ---------- סרטון ---------- */

  function openVideo() {
    const video = getVideo(state.topic.id, state.index);
    if (!video) return;
    Sound.stopSpeaking();
    state.restoreMusic = Sound.duckMusic();

    el.videoTitle.textContent = video.title || 'סרטון הדגמה';
    if (video.youtube) {
      el.videoHolder.innerHTML =
        `<iframe src="https://www.youtube-nocookie.com/embed/${video.youtube}?rel=0&autoplay=1"
          title="${video.title || 'סרטון הדגמה'}" allow="autoplay; encrypted-media; picture-in-picture"
          allowfullscreen loading="lazy"></iframe>`;
    } else if (video.src) {
      el.videoHolder.innerHTML =
        `<video src="${video.src}" controls autoplay playsinline
          ${video.poster ? `poster="${video.poster}"` : ''}></video>`;
    }
    el.videoModal.hidden = false;
    el.body.classList.add('modal-open');
    el.btnCloseVideo.focus({ preventScroll: true });
  }

  function closeVideo() {
    el.videoHolder.innerHTML = '';
    el.videoModal.hidden = true;
    el.body.classList.remove('modal-open');
    if (state.restoreMusic) { state.restoreMusic(); state.restoreMusic = null; }
    el.btnVideo.focus({ preventScroll: true });
  }

  /* ---------- כפתורי שמע ---------- */

  function syncSoundButtons() {
    el.btnNarration.setAttribute('aria-pressed', String(Sound.narrationOn));
    el.btnNarration.classList.toggle('is-off', !Sound.narrationOn);
    el.btnNarration.querySelector('.icon-btn-emoji').textContent = Sound.narrationOn ? '🗣️' : '🔇';
    el.btnNarration.title = Sound.narrationOn ? 'השתקת הקריינות' : 'הפעלת הקריינות';
    el.btnNarration.setAttribute('aria-label', el.btnNarration.title);

    el.btnSound.setAttribute('aria-pressed', String(Sound.musicOn));
    el.btnSound.classList.toggle('is-off', !Sound.musicOn);
    el.btnSound.querySelector('.icon-btn-emoji').textContent = Sound.musicOn ? '🎵' : '🔕';
    el.btnSound.title = Sound.musicOn ? 'השתקת המוזיקה והצלילים' : 'הפעלת המוזיקה והצלילים';
    el.btnSound.setAttribute('aria-label', el.btnSound.title);
  }

  /* ---------- הודעה על מצב הקריינות ---------- */

  const SPEECH_HINT = {
    none: 'בדפדפן הזה אין הקראה קולית. אם פתחתם את החידון בתוך חלון מוטמע (למשל תצוגה מקדימה) — ' +
          'פתחו אותו בלשונית רגילה בכרום, ספארי או אדג\', ושם הקריינות תעבוד.',
    'no-hebrew': 'לא נמצא קול עברי מותקן במכשיר. החידון ינסה להקריא בכל זאת. ' +
          'להתקנה: אנדרואיד → הגדרות → ניהול כללי → טקסט לדיבור → הורדת עברית. ' +
          'אייפון → הגדרות → נגישות → תוכן מדובר → קולות → עברית.'
  };

  function updateSpeechHint() {
    const state = Sound.speechState();
    const msg = SPEECH_HINT[state];
    el.speechHint.hidden = !msg;
    el.speechHint.textContent = msg || '';
    el.voicePanel.hidden = (state === 'none');
    renderVoiceList();
  }

  /* רשימת הקריינים מתמלאת כשהקולות/המניפסט נטענים */
  function renderVoiceList() {
    const narrators = Sound.narrators();
    el.voiceSelectRow.hidden = narrators.length < 2;
    if (!narrators.length) return;

    const current = Sound.narratorId;
    const sig = narrators.map(n => n.id).join('|');
    if (el.voiceSelect.dataset.sig === sig && el.voiceSelect.value === current) return;

    el.voiceSelect.innerHTML = narrators.map((n, i) => {
      const bits = [];
      if (n.neural) bits.push('🌸 טבעי');
      if (n.female) bits.push('👩 נשי');
      if (i === 0) bits.push('⭐ מומלץ');
      else if (!n.neural) bits.push('מכשיר');
      const tag = bits.length ? ' — ' + bits.join(' · ') : '';
      const val = n.id.replace(/"/g, '&quot;');
      const label = n.label.replace(/</g, '&lt;');
      return `<option value="${val}">${label}${tag}</option>`;
    }).join('');
    el.voiceSelect.value = current;
    el.voiceSelect.dataset.sig = sig;
  }

  function sampleVoice() {
    Sound.unlock();
    if (!Sound.narrationOn) { Sound.toggleNarration(); syncSoundButtons(); }
    Sound.speak('שלום! אני אקריא לכם את השאלות. בואו נגלה ביחד איך העולם עובד.');
  }

  /* ---------- אתחול ---------- */

  function init() {
    renderLevels();
    renderHome();
    syncSoundButtons();
    showScreen('level');

    updateSpeechHint();
    Sound.onVoices(updateSpeechHint);

    // הפעלת שמע אחרי המגע הראשון (דרישת הדפדפנים)
    const unlock = () => {
      Sound.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock, { once: false });
    window.addEventListener('keydown', unlock, { once: false });

    el.btnNext.addEventListener('click', nextQuestion);

    el.btnReplay.addEventListener('click', () => {
      Sound.sfx.pop();
      narrateQuestion(true);
    });

    el.btnHome.addEventListener('click', () => {
      Sound.sfx.pop();
      Sound.stopSpeaking();
      renderHome();
      showScreen('home');
    });

    el.btnLevels.addEventListener('click', () => {
      Sound.sfx.pop();
      Sound.stopSpeaking();
      applyTheme(LEVELS[0].theme);
      showScreen('level');
    });

    el.btnRandom.addEventListener('click', () => {
      Sound.sfx.pop();
      const topics = (state.level || LEVELS[0]).topics;
      const t = topics[Math.floor(Math.random() * topics.length)];
      startTopic(t.id);
    });

    el.btnAgain.addEventListener('click', () => {
      Sound.sfx.pop();
      startTopic(state.topic.id);
    });

    el.btnTopics.addEventListener('click', () => {
      Sound.sfx.pop();
      Sound.stopSpeaking();
      renderHome();
      showScreen('home');
    });

    el.btnNarration.addEventListener('click', () => {
      const on = Sound.toggleNarration();
      syncSoundButtons();
      if (on) Sound.speak('הקריינות חזרה');
    });

    el.btnSound.addEventListener('click', () => {
      Sound.toggleMusic();
      syncSoundButtons();
      Sound.sfx.pop();
    });

    el.rateSelect.value = String(Sound.rate);

    el.btnTestVoice.addEventListener('click', sampleVoice);

    el.voiceSelect.addEventListener('change', () => {
      Sound.setNarrator(el.voiceSelect.value);
      sampleVoice();
    });

    el.rateSelect.addEventListener('change', () => {
      Sound.setRate(el.rateSelect.value);
      sampleVoice();
    });

    el.btnVideo.addEventListener('click', openVideo);
    el.btnCloseVideo.addEventListener('click', closeVideo);
    $$('[data-close-modal]').forEach(n => n.addEventListener('click', closeVideo));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !el.videoModal.hidden) { closeVideo(); return; }
      if (!el.screens.quiz.classList.contains('is-active')) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        // המקשים בוחרים לפי מיקום התשובה על המסך
        const pos = Number(e.key) - 1;
        const btns = el.answers.querySelectorAll('.answer-btn');
        const btn = btns[pos];
        if (btn && !btn.disabled) { btn.focus(); onAnswer(Number(btn.dataset.index)); }
      }
      if (e.key === 'Enter' && !el.btnNext.hidden && document.activeElement === document.body) {
        nextQuestion();
      }
    });

    // עצירת קריינות כשעוזבים את הלשונית
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) Sound.stopSpeaking();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
