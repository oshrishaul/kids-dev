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
      home: $('#screen-home'),
      quiz: $('#screen-quiz'),
      done: $('#screen-done')
    },
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
    videoModal: $('#video-modal'),
    videoHolder: $('#video-holder'),
    videoTitle: $('#video-title'),
    btnCloseVideo: $('#btn-close-video')
  };

  const state = {
    topic: null,
    index: 0,
    stars: 0,
    attempts: 0,
    locked: false,
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
    el.btnHome.hidden = (name === 'home');
    el.progressWrap.hidden = (name !== 'quiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- מסך הבית ---------- */

  function renderHome() {
    const best = loadBest();
    el.topicGrid.innerHTML = TOPICS.map(t => {
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
    const topic = TOPICS.find(t => t.id === topicId);
    if (!topic) return;
    state.topic = topic;
    state.index = 0;
    state.stars = 0;
    applyTheme(topic);
    showScreen('quiz');
    renderQuestion();
  }

  function applyTheme(topic) {
    const root = document.documentElement;
    root.style.setProperty('--main', topic.theme.main);
    root.style.setProperty('--soft', topic.theme.soft);
    root.style.setProperty('--deep', topic.theme.deep);
    root.style.setProperty('--accent', topic.theme.accent);
  }

  /* ---------- שאלה ---------- */

  function currentQuestion() {
    return state.topic.questions[state.index];
  }

  function renderQuestion() {
    const q = currentQuestion();
    state.attempts = 0;
    state.locked = false;

    // אנימציה
    el.stage.innerHTML = renderScene(q.scene);
    el.stage.classList.remove('stage-pop');
    void el.stage.offsetWidth;
    el.stage.classList.add('stage-pop');

    // שאלה
    el.question.textContent = q.q;

    // תשובות
    el.answers.innerHTML = q.a.map((ans, i) => `
      <div class="answer" data-index="${i}">
        <button class="answer-btn" type="button" data-index="${i}">
          <span class="answer-emoji" aria-hidden="true">${ans.emoji}</span>
          <span class="answer-text">${ans.text}</span>
          <span class="answer-mark" aria-hidden="true"></span>
        </button>
        <button class="speak-btn answer-speak" type="button" data-speak="${i}"
          aria-label="הקריאו לי: ${ans.text}"><span aria-hidden="true">🔊</span></button>
      </div>`).join('');

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
      q.a.forEach(a => parts.push(a.text));
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
      Sound.speak([praise.replace(/[^֐-׿\s!?.,]/g, '').trim(), q.explain], {
        gap: 260,
        onend: () => { /* סיום הקראה */ }
      });

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
        Sound.speak(['התשובה הנכונה היא ' + q.a[q.correct].text, q.explain], { gap: 300 });
        el.btnNext.hidden = false;
        el.btnNext.textContent = (state.index === state.topic.questions.length - 1)
          ? 'לסיום 🎉' : 'לשאלה הבאה ←';
      } else {
        const msg = TRY_AGAIN[Math.floor(Math.random() * TRY_AGAIN.length)];
        showFeedback('retry', msg, '');
        Sound.speak(msg.replace(/[^֐-׿\s!?.,]/g, '').trim());
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
    Sound.speak([
      el.doneTitle.textContent,
      `ענית נכון על ${stars} מתוך ${total} שאלות. קיבלת מדבקה!`
    ], { gap: 300 });
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

  /* ---------- אתחול ---------- */

  function init() {
    renderHome();
    syncSoundButtons();
    showScreen('home');

    if (!Sound.speechSupported) {
      el.speechHint.hidden = false;
      el.speechHint.textContent = 'טיפ: הדפדפן הזה לא תומך בהקראה קולית. בכרום או בספארי תשמעו גם קריינות בעברית.';
    }

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

    el.btnRandom.addEventListener('click', () => {
      Sound.sfx.pop();
      const t = TOPICS[Math.floor(Math.random() * TOPICS.length)];
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

    el.btnVideo.addEventListener('click', openVideo);
    el.btnCloseVideo.addEventListener('click', closeVideo);
    $$('[data-close-modal]').forEach(n => n.addEventListener('click', closeVideo));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !el.videoModal.hidden) { closeVideo(); return; }
      if (!el.screens.quiz.classList.contains('is-active')) return;
      if (['1', '2', '3'].includes(e.key)) {
        const i = Number(e.key) - 1;
        const btn = el.answers.querySelector(`.answer-btn[data-index="${i}"]`);
        if (btn && !btn.disabled) { btn.focus(); onAnswer(i); }
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
