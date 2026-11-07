#!/usr/bin/env node
/* ============================================================
   gen-voices.js — יוצר קובצי שמע לקריינות באמצעות Google Cloud TTS.
   ------------------------------------------------------------
   שימוש:
     GOOGLE_TTS_API_KEY=xxxxx  node tools/gen-voices.js
   (אפשר גם: node tools/gen-voices.js --key xxxxx)

   מה הוא עושה:
   - אוסף את כל המשפטים שהאפליקציה מקריאה (שאלות, תשובות, הסברים,
     עידוד ומשפטי מערכת) דרך js/narration.js — אותה לוגיקה כמו בדפדפן.
   - מייצר לכל אחד מ-3 הקריינים קובץ MP3 לכל משפט.
   - משפטים באנגלית (תשובות בנושא אנגלית) מוקראים בקול אנגלי תקין.
   - כותב assets/voices/<voice>/<key>.mp3 ו-assets/voices/manifest.json.
   - מריצה חוזרת מדלגת על קבצים שכבר קיימים (אפשר לעצור ולהמשיך).

   עלות: הטקסט כולו קטן בהרבה מהשכבה החינמית של Google (מיליון תווים
   לחודש ב-WaveNet). מפתח API נוצר ב-Google Cloud Console → APIs &
   Services → Credentials, עם Cloud Text-to-Speech API מופעל.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const { execFile } = require('child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'voices');
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';
const CONCURRENCY = 6;

/* 3 קריינות נשיות. he = קול עברי, en = קול אנגלי למילים באנגלית. */
const VOICES = [
  { id: 'noa',    name: 'נועה',  he: 'he-IL-Wavenet-A',  en: 'en-US-Wavenet-F' },
  { id: 'yael',   name: 'יעל',   he: 'he-IL-Wavenet-C',  en: 'en-US-Wavenet-C' },
  { id: 'michal', name: 'מיכל',  he: 'he-IL-Standard-C', en: 'en-US-Standard-C' }
];

function getKey() {
  const i = process.argv.indexOf('--key');
  if (i !== -1 && process.argv[i + 1]) return process.argv[i + 1];
  return process.env.GOOGLE_TTS_API_KEY || '';
}

/* טוען data.js + narration.js בהקשר משותף כדי להשתמש באותה לוגיקה */
function loadContext() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'narration.js'), 'utf8'), ctx);
  // הצהרות const לא נקשרות אוטומטית ל-context, אז חושפים אותן במפורש
  const dataSrc = fs.readFileSync(path.join(ROOT, 'js', 'data.js'), 'utf8') +
    '\nglobalThis.LEVELS = LEVELS; globalThis.PRAISE = PRAISE; globalThis.TRY_AGAIN = TRY_AGAIN;';
  vm.runInContext(dataSrc, ctx);
  return ctx;
}

function synth(key, voiceName, lang, text) {
  const body = JSON.stringify({
    input: { text },
    voice: { languageCode: lang === 'en' ? 'en-US' : 'he-IL', name: voiceName },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0.0 }
  });
  const tmp = path.join(os.tmpdir(), 'tts_' + Math.random().toString(36).slice(2) + '.json');
  fs.writeFileSync(tmp, body);
  return new Promise((resolve, reject) => {
    execFile('curl', ['-s', '-X', 'POST', '-H', 'Content-Type: application/json; charset=utf-8',
      '--data', '@' + tmp, `${ENDPOINT}?key=${key}`], { maxBuffer: 64 * 1024 * 1024 },
    (err, stdout) => {
      fs.unlink(tmp, () => {});
      if (err) return reject(err);
      let j;
      try { j = JSON.parse(stdout); } catch (e) { return reject(new Error('bad JSON: ' + stdout.slice(0, 200))); }
      if (j.error) return reject(new Error(j.error.message || JSON.stringify(j.error)));
      if (!j.audioContent) return reject(new Error('no audioContent: ' + stdout.slice(0, 200)));
      resolve(Buffer.from(j.audioContent, 'base64'));
    });
  });
}

async function withRetry(fn, tries = 3) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { last = e; await new Promise(r => setTimeout(r, 500 * (i + 1))); }
  }
  throw last;
}

async function pool(items, n, worker) {
  let idx = 0, done = 0, failed = 0;
  async function run() {
    while (idx < items.length) {
      const i = idx++;
      try { await worker(items[i]); }
      catch (e) { failed++; console.error('  ✗', items[i].label, '-', e.message); }
      done++;
      if (done % 25 === 0 || done === items.length) {
        process.stdout.write(`\r  ${done}/${items.length} (${failed} שגיאות)   `);
      }
    }
  }
  await Promise.all(Array.from({ length: n }, run));
  process.stdout.write('\n');
  return failed;
}

(async () => {
  const key = getKey();
  if (!key) {
    console.error('חסר מפתח API. הריצו:  GOOGLE_TTS_API_KEY=xxxxx node tools/gen-voices.js');
    process.exit(1);
  }
  const ctx = loadContext();
  const phrases = ctx.Narration.collectPhrases(ctx.LEVELS, ctx.PRAISE, ctx.TRY_AGAIN);
  console.log(`נאספו ${phrases.length} משפטים × ${VOICES.length} קריינים = ${phrases.length * VOICES.length} קבצים.`);

  for (const v of VOICES) {
    const dir = path.join(OUT, v.id);
    fs.mkdirSync(dir, { recursive: true });
    const jobs = phrases
      .map(p => ({ ...p, file: path.join(dir, p.key + '.mp3'), label: `${v.name}:${p.text.slice(0, 20)}` }))
      .filter(p => !fs.existsSync(p.file)); // דילוג על קיימים (המשך ריצה)
    console.log(`\n▶ ${v.name} (${v.id}): ${jobs.length} חדשים, ${phrases.length - jobs.length} קיימים`);
    await pool(jobs, CONCURRENCY, async (p) => {
      const voiceName = p.lang === 'en' ? v.en : v.he;
      const buf = await withRetry(() => synth(key, voiceName, p.lang, p.text));
      fs.writeFileSync(p.file, buf);
    });
  }

  // מניפסט: רשימת הקריינים וכל מפתחות הקליפים
  const clips = {};
  phrases.forEach(p => { clips[p.key] = true; });
  const manifest = {
    generated: new Date().toISOString(),
    voices: VOICES.map(v => ({ id: v.id, name: v.name, female: true })),
    clips
  };
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest));
  console.log(`\n✓ נכתב manifest.json עם ${Object.keys(clips).length} מפתחות ו-${VOICES.length} קריינים.`);
  console.log('עכשיו אפשר לפרסם — הקריינים הטבעיים יופיעו אוטומטית בבורר הקול.');
})();
