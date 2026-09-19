#!/usr/bin/env node
/* ============================================================
   build-standalone.js — יוצר קובץ HTML אחד שמכיל הכול
   שימוש:  node tools/build-standalone.js
   התוצאה: dist/מדענים-קטנים.html — קובץ בודד שאפשר לשלוח
   בוואטסאפ, לשמור במכשיר ולפתוח גם בלי אינטרנט.
   ============================================================ */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

let html = read('index.html');

// הטמעת גיליון הסגנון
html = html.replace(
  /<link rel="stylesheet" href="(css\/[^"]+)">/g,
  (_, href) => `<style>\n${read(href)}\n</style>`
);

// הטמעת קובצי הסקריפט לפי הסדר שבו הם מופיעים
html = html.replace(
  /<script src="(js\/[^"]+)"><\/script>/g,
  (_, src) => `<script>\n${read(src)}\n</script>`
);

const outDir = path.join(root, 'dist');
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'מדענים-קטנים.html');
fs.writeFileSync(outFile, html, 'utf8');

const kb = (fs.statSync(outFile).size / 1024).toFixed(0);
console.log(`נוצר: ${path.relative(root, outFile)}  (${kb}KB)`);
