/* ============================================================
   narration.js — לוגיקה משותפת לקריינות, לדפדפן ולסקריפט היצירה.
   חשוב: הקובץ הזה נטען גם בדפדפן (window) וגם ב-tools/gen-voices.js
   (דרך vm), כדי ש"מפתח" הקליפ יהיה זהה בשני הצדדים.
   ============================================================ */

(function (root) {
  'use strict';

  /* ניקוי טקסט לפני הקראה — אמוג'י, מקפים ושלוש-נקודות נשמעים מוזר ב-TTS */
  function normalizeForSpeech(text) {
    return String(text)
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}]/gu, ' ')
      .replace(/…/g, ',')
      .replace(/־/g, ' ')
      .replace(/\s*—\s*/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([,.!?])/g, '$1')
      .replace(/([.!?])\s*,/g, '$1')
      .replace(/,\s*,/g, ',')
      .trim();
  }

  /* האם הטקסט (אחרי ניקוי) עברי או לטיני (לבחירת קול עברי/אנגלי ביצירה) */
  function phraseLang(normalized) {
    if (/[֐-׿]/.test(normalized)) return 'he';
    if (/[A-Za-z]/.test(normalized)) return 'en';
    return 'he';
  }

  /* djb2 — hash יציב וקצר לשם קובץ השמע */
  function narrationHash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = (((h << 5) + h) + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* המפתח של טקסט = hash של הצורה המנוקה. זהה בדפדפן וביצירה. */
  function narrationKey(text) {
    return narrationHash(normalizeForSpeech(text));
  }

  /* משפטים קבועים שהאפליקציה מקריאה (מעבר לשאלות/תשובות/הסברים) */
  const UI_PHRASES = [
    'התשובה הנכונה היא',
    'מושלם! מדען אלוף!',
    'כל הכבוד!',
    'יופי שניסית!',
    'כל הכבוד! הרווחת מדבקה!',
    'שלום! אני אקריא לכם את השאלות. בואו נגלה ביחד איך העולם עובד.',
    'הקריינות חזרה'
  ];

  /* אוסף כל המשפטים הייחודיים להקראה, עם מפתח ושפה */
  function collectPhrases(levels, praise, tryAgain) {
    const byKey = new Map();
    const add = (raw) => {
      const norm = normalizeForSpeech(raw);
      if (!norm) return;
      const key = narrationHash(norm);
      if (!byKey.has(key)) byKey.set(key, { key, text: norm, lang: phraseLang(norm) });
    };
    (levels || []).forEach(l => (l.topics || []).forEach(tp => (tp.questions || []).forEach(q => {
      add(q.q);
      (q.a || []).forEach(a => add(a.text));
      if (q.explain) add(q.explain);
    })));
    (praise || []).forEach(add);
    (tryAgain || []).forEach(add);
    UI_PHRASES.forEach(add);
    return [...byKey.values()];
  }

  root.Narration = {
    normalizeForSpeech, phraseLang, narrationHash, narrationKey, collectPhrases, UI_PHRASES
  };
})(typeof window !== 'undefined' ? window : globalThis);
