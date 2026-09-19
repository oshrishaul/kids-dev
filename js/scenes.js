/* ============================================================
   scenes.js — אנימציות SVG מקוריות לכל שאלה
   כל סצנה מחזירה קוד SVG. האנימציות מוגדרות ב-css/style.css
   (מחלקות a-*). כל הסצנות באותו יחס: viewBox="0 0 300 200".

   כלל חשוב לתחזוקה:
   אלמנט עם class של אנימציה לא יקבל גם transform="translate(...)"
   (ה-CSS דורס את התכונה) — לכן תמיד עוטפים: <g class="a-x"><g transform=...>
   ============================================================ */

/* ---------- חלקים שחוזרים ---------- */

function sky(id, from, to) {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${from}"/><stop offset="100%" stop-color="${to}"/>
  </linearGradient></defs>
  <rect width="300" height="200" fill="url(#${id})"/>`;
}

function stars(n, seed) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = ((i * 53 + seed * 17) % 280) + 10;
    const y = ((i * 37 + seed * 29) % 130) + 10;
    const r = 1.2 + ((i * 7) % 3) * 0.6;
    out += `<circle class="a-twinkle" style="--delay:${(i % 6) * 0.35}s" cx="${x}" cy="${y}" r="${r}" fill="#fff8d6"/>`;
  }
  return out;
}

function ground(color = '#7ed37e', y = 160) {
  return `<path d="M0 ${y} Q 75 ${y - 12} 150 ${y} T 300 ${y} L300 200 L0 200 Z" fill="${color}"/>`;
}

function sun(x = 250, y = 45, r = 22) {
  let rays = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    rays += `<line x1="${(x + Math.cos(a) * (r + 5)).toFixed(1)}" y1="${(y + Math.sin(a) * (r + 5)).toFixed(1)}"
      x2="${(x + Math.cos(a) * (r + 14)).toFixed(1)}" y2="${(y + Math.sin(a) * (r + 14)).toFixed(1)}"
      stroke="#ffcf3f" stroke-width="5" stroke-linecap="round"/>`;
  }
  return `<g class="a-spin-slow">${rays}</g>
    <circle cx="${x}" cy="${y}" r="${r}" fill="#ffd93d"/>
    <circle cx="${x - 7}" cy="${y - 2}" r="2.6" fill="#8a6200"/>
    <circle cx="${x + 7}" cy="${y - 2}" r="2.6" fill="#8a6200"/>
    <path d="M${x - 7} ${y + 7} Q ${x} ${y + 14} ${x + 7} ${y + 7}" stroke="#8a6200" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
}

function cloud(x, y, s = 1, fill = '#ffffff', delay = 0) {
  return `<g class="a-drift" style="--delay:${delay}s"><g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="26" ry="16" fill="${fill}"/>
    <ellipse cx="-20" cy="6" rx="18" ry="12" fill="${fill}"/>
    <ellipse cx="20" cy="6" rx="18" ry="12" fill="${fill}"/>
    <ellipse cx="0" cy="10" rx="30" ry="11" fill="${fill}"/>
  </g></g>`;
}

function smileFace(x, y, s = 1, color = '#3b2a5a') {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <circle cx="-6" cy="-2" r="2.4" fill="${color}"/>
    <circle cx="6" cy="-2" r="2.4" fill="${color}"/>
    <path d="M-6 5 Q0 11 6 5" stroke="${color}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  </g>`;
}

/* כותרת פרח: עלי כותרת מסודרים במעגל.
   חשוב: כל עלה נעטף ב-g עם translate+rotate ולא ב-rotate(a cx cy),
   כי transform-box:fill-box מזיז מרכזי סיבוב שנכתבים בקואורדינטות מוחלטות. */
function petals(cx, cy, r, color, n = 8, rx = 9, ry = 13) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const deg = (i * 360) / n;
    const rad = (deg * Math.PI) / 180;
    const px = (cx + Math.cos(rad) * r).toFixed(1);
    const py = (cy + Math.sin(rad) * r).toFixed(1);
    out += `<g transform="translate(${px} ${py}) rotate(${deg})">
      <ellipse rx="${ry}" ry="${rx}" fill="${color}"/></g>`;
  }
  return out;
}

/* פרח שלם עם גבעול שמתנדנד ברוח */
function flower(x, baseY, petal = '#ff8fd0', h = 52) {
  const top = baseY - h;
  return `<g class="a-sway"><g>
    <path d="M${x} ${baseY} V${top}" stroke="#3fa25e" stroke-width="6" stroke-linecap="round"/>
    <path d="M${x} ${baseY - 20} q-20-4-22-16 q20-2 22 16z" fill="#57c37a"/>
    ${petals(x, top, 16, petal, 7, 8, 12)}
    <circle cx="${x}" cy="${top}" r="10" fill="#ffd93d"/>
  </g></g>`;
}

/* ---------- אוסף הסצנות ---------- */

const SCENES = {

  /* ===== חלל ===== */

  solarSystem() {
    const orbit = (r, dur, size, color, delay) => `
      <circle cx="150" cy="100" r="${r}" fill="none" stroke="#ffffff33" stroke-width="1.5"/>
      <g class="a-orbit" style="--d:${dur}s; --delay:-${delay}s">
        <circle cx="150" cy="100" r="${r + size}" fill="none"/>
        <g transform="translate(${150 + r} 100)">
          <circle r="${size}" fill="${color}"/>
          <circle r="${size * 0.45}" cy="${-size * 0.3}" fill="#ffffff44"/>
        </g>
      </g>`;
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('sp1', '#1a1250', '#3b2a8c')}
      ${stars(16, 3)}
      ${orbit(44, 7, 6, '#7fd1ff', 0)}
      ${orbit(66, 11, 9, '#ff9e6d', 2)}
      ${orbit(88, 16, 7, '#c59bff', 4)}
      <defs><radialGradient id="sunGlow">
        <stop offset="52%" stop-color="#ffd93d" stop-opacity=".55"/>
        <stop offset="100%" stop-color="#ffd93d" stop-opacity="0"/>
      </radialGradient></defs>
      <circle class="a-glowring" cx="150" cy="100" r="46" fill="url(#sunGlow)"/>
      <circle cx="150" cy="100" r="25" fill="#ffd93d"/>
      ${smileFace(150, 100, 1, '#8a6200')}
    </svg>`;
  },

  dayNight() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('sp2', '#151033', '#2f2470')}
      ${stars(12, 1)}
      ${sun(256, 100, 19)}
      <g class="a-spin-med">
        <circle cx="110" cy="100" r="44" fill="#3aa0e8"/>
        <path d="M84 78 q16-8 30 2 t22 4 l-6 16 q-18 6-30-2 t-20-6z" fill="#5ed17a"/>
        <path d="M92 124 q18-10 34 0 l-8 12 q-14 6-26-2z" fill="#5ed17a"/>
      </g>
      <defs><linearGradient id="nightSide" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#0b0730" stop-opacity=".82"/>
        <stop offset="45%" stop-color="#0b0730" stop-opacity=".45"/>
        <stop offset="80%" stop-color="#0b0730" stop-opacity="0"/>
      </linearGradient></defs>
      <circle cx="110" cy="100" r="44" fill="url(#nightSide)"/>
      <text x="110" y="184" text-anchor="middle" font-size="14" fill="#cdd6ff">🌙 הצד החשוך = לילה</text>
      <text x="256" y="142" text-anchor="middle" font-size="14" fill="#ffe7a1">כאן יום</text>
    </svg>`;
  },

  moon() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('sp3', '#0e0a30', '#2a1f63')}
      ${stars(20, 5)}
      <g class="a-bob" style="--d:6s"><g>
        <circle cx="205" cy="62" r="34" fill="#fdf6d8"/>
        <circle cx="196" cy="52" r="6" fill="#e6dcb4"/>
        <circle cx="216" cy="76" r="8" fill="#e6dcb4"/>
        <circle cx="220" cy="50" r="4" fill="#e6dcb4"/>
        ${smileFace(203, 66, 1.1, '#a2966a')}
      </g></g>
      ${ground('#241a52', 150)}
      <rect x="46" y="108" width="72" height="46" rx="6" fill="#4a3b8f"/>
      <path d="M40 110 L82 82 L124 110 Z" fill="#6a56c4"/>
      <rect class="a-glow" x="68" y="122" width="24" height="20" rx="4" fill="#ffd93d"/>
      <text x="150" y="190" text-anchor="middle" font-size="13" fill="#cdd6ff">הירח מחזיר אלינו את אור השמש</text>
    </svg>`;
  },

  rocket() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('sp4', '#1b1450', '#4a63c8')}
      ${stars(14, 2)}
      ${cloud(62, 150, 0.7, '#ffffff55', 0)}
      ${cloud(238, 166, 0.6, '#ffffff44', 1.5)}
      <g class="a-launch"><g transform="translate(150 112)">
        <path d="M0 -46 q16 20 16 44 h-32 q0-24 16-44z" fill="#ffffff"/>
        <path d="M-16 -2 q-14 8-16 26 l16-8z" fill="#ff5d5d"/>
        <path d="M16 -2 q14 8 16 26 l-16-8z" fill="#ff5d5d"/>
        <path d="M-16 -2 h32 v10 h-32z" fill="#ff8fa3"/>
        <circle cx="0" cy="-14" r="9" fill="#7fd1ff" stroke="#3b6fd4" stroke-width="3"/>
        <g class="a-flame"><g>
          <path d="M-11 20 q11 28 11 28 t11-28 q-11 8-22 0z" fill="#ffb03a"/>
          <path d="M-6 20 q6 18 6 18 t6-18 q-6 6-12 0z" fill="#fff07a"/>
        </g></g>
      </g></g>
      <text x="150" y="190" text-anchor="middle" font-size="14" fill="#e8ecff">3… 2… 1… שיגור! 🚀</text>
    </svg>`;
  },

  astronaut() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('sp5', '#100a38', '#33246e')}
      ${stars(22, 7)}
      <circle cx="40" cy="170" r="42" fill="#3aa0e8"/>
      <path d="M10 152 q22-10 40 2 t28 2 l-10 22 q-30 10-58-4z" fill="#5ed17a"/>
      <path d="M58 150 Q 118 138 146 106" stroke="#ffffff77" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="a-float"><g transform="translate(172 96)">
        <g transform="translate(-30 21) rotate(-18)"><rect x="-10" y="-17" width="20" height="34" rx="10" fill="#f2f4ff"/></g>
        <g transform="translate(30 21) rotate(18)"><rect x="-10" y="-17" width="20" height="34" rx="10" fill="#f2f4ff"/></g>
        <rect x="-20" y="42" width="18" height="30" rx="9" fill="#f2f4ff"/>
        <rect x="2" y="42" width="18" height="30" rx="9" fill="#f2f4ff"/>
        <rect x="-26" y="-4" width="52" height="52" rx="20" fill="#f7f8ff"/>
        <rect x="-9" y="10" width="18" height="13" rx="4" fill="#ffd93d"/>
        <circle cx="0" cy="-18" r="26" fill="#fbfcff"/>
        <path d="M-19 -24 a20 20 0 0 1 38 -3 a21 21 0 0 1 -38 3z" fill="#2b2360"/>
        <path d="M-12 -28 a13 13 0 0 1 15 -6" stroke="#7fd1ff" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g></g>
    </svg>`;
  },

  /* ===== גוף האדם ===== */

  heart() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('bd1', '#fff0f5', '#ffdce9')}
      <path class="a-dash" d="M8 118 h62 l10-26 l12 54 l14-70 l12 42 h30" stroke="#ff7aa8" stroke-width="4"
        fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <g class="a-beat"><g>
        <path d="M192 152 C 128 110 136 60 168 60 c 13 0 21 9 24 17 c 3-8 11-17 24-17 c 32 0 40 50-24 92z" fill="#ff4d79"/>
        <path d="M172 82 c 6-6 15-4 17 2" stroke="#ffffff99" stroke-width="5" fill="none" stroke-linecap="round"/>
        ${smileFace(192, 106, 1.3, '#8c0f34')}
      </g></g>
      <text x="150" y="188" text-anchor="middle" font-size="15" fill="#a82352">בום־בום… בום־בום… ❤️</text>
    </svg>`;
  },

  lungs() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('bd2', '#eefaff', '#d8f1ff')}
      <rect x="146" y="38" width="8" height="42" rx="4" fill="#ff9bb8"/>
      <path d="M124 76 h52" stroke="#ff9bb8" stroke-width="8" stroke-linecap="round"/>
      <g class="a-breathe"><g>
        <path d="M140 76 c-42 8-52 46-42 76 c 5 16 36 13 42-6z" fill="#ff8fb0"/>
        <path d="M160 76 c42 8 52 46 42 76 c-5 16-36 13-42-6z" fill="#ff8fb0"/>
        <path d="M128 100 q-8 18-4 34" stroke="#ffffff99" stroke-width="4" fill="none" stroke-linecap="round"/>
        <path d="M172 100 q8 18 4 34" stroke="#ffffff99" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g></g>
      <g class="a-rise" style="--delay:0s"><circle cx="92" cy="86" r="6" fill="#7fd1ff" opacity=".8"/></g>
      <g class="a-rise" style="--delay:1.1s"><circle cx="212" cy="80" r="8" fill="#7fd1ff" opacity=".7"/></g>
      <g class="a-rise" style="--delay:2s"><circle cx="70" cy="104" r="5" fill="#7fd1ff" opacity=".6"/></g>
      <text x="150" y="190" text-anchor="middle" font-size="15" fill="#13698f">שואפים… ונושפים 🫁</text>
    </svg>`;
  },

  teeth() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('bd3', '#fff7e8', '#ffe6d1')}
      <ellipse cx="150" cy="112" rx="82" ry="56" fill="#ff7f9c"/>
      <ellipse cx="150" cy="124" rx="64" ry="38" fill="#c8305a"/>
      <g fill="#ffffff">
        <rect x="94" y="92" width="22" height="24" rx="6"/><rect x="119" y="88" width="22" height="26" rx="6"/>
        <rect x="144" y="86" width="22" height="26" rx="6"/><rect x="169" y="88" width="22" height="26" rx="6"/>
        <rect x="194" y="92" width="20" height="24" rx="6"/>
        <rect x="106" y="140" width="20" height="22" rx="6"/><rect x="129" y="144" width="22" height="22" rx="6"/>
        <rect x="154" y="144" width="22" height="22" rx="6"/><rect x="179" y="140" width="20" height="22" rx="6"/>
      </g>
      <g class="a-scrub"><g>
        <rect x="120" y="58" width="52" height="15" rx="7" fill="#4bb8f0"/>
        <rect x="120" y="73" width="52" height="8" rx="4" fill="#eaf6ff"/>
        <g transform="translate(197 62) rotate(-14)"><rect x="-29" y="-5.5" width="58" height="11" rx="5" fill="#2f8fd0"/></g>
      </g></g>
      <g class="a-twinkle" style="--delay:.2s"><text x="56" y="62" font-size="22">✨</text></g>
      <g class="a-twinkle" style="--delay:1s"><text x="222" y="70" font-size="20">✨</text></g>
    </svg>`;
  },

  eye() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('bd4', '#eef3ff', '#dbe6ff')}
      <ellipse cx="150" cy="100" rx="84" ry="50" fill="#ffffff" stroke="#3b4a8c" stroke-width="5"/>
      <g class="a-look"><g>
        <circle cx="150" cy="100" r="33" fill="#39a0e0"/>
        <circle cx="150" cy="100" r="28" fill="#2b7fc4"/>
        <circle cx="150" cy="100" r="14" fill="#161b3d"/>
        <circle cx="141" cy="91" r="6.5" fill="#ffffff"/>
        <circle cx="158" cy="110" r="3.4" fill="#ffffffaa"/>
      </g></g>
      <ellipse class="a-blink" cx="150" cy="100" rx="84" ry="50" fill="#ffc9a8"/>
      <path d="M66 100 q84-62 168 0" fill="none" stroke="#3b4a8c" stroke-width="6" stroke-linecap="round"/>
      <g class="a-twinkle" style="--delay:.4s"><text x="30" y="58" font-size="22">🌈</text></g>
      <g class="a-twinkle" style="--delay:1.2s"><text x="238" y="60" font-size="22">🎨</text></g>
    </svg>`;
  },

  bones() {
    // כל עצם מצוירת פעמיים: קו מתאר כהה מאחור ולבן מלמעלה — ככה השלד בולט
    const body = (col, w) => `
      <path d="M126 92 h48 M124 106 h52 M128 120 h44" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>
      <path d="M180 92 q26 8 32 28" stroke="${col}" stroke-width="${w + 1}" fill="none" stroke-linecap="round"/>
      <path d="M146 130 q-10 24-12 42 M154 130 q10 24 12 42" stroke="${col}" stroke-width="${w + 1}" fill="none" stroke-linecap="round"/>`;
    const arm = (col, w) => `<path d="M120 92 q-26 8-32 28" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('bd5', '#cdc4f5', '#a99ceb')}
      <g class="a-bob" style="--d:3.4s"><g>
        ${body('#6f61b8', 13)}
        ${body('#fdfdff', 9)}
        <rect x="143" y="76" width="14" height="56" rx="7" fill="#fdfdff" stroke="#6f61b8" stroke-width="2.5"/>
        <circle cx="214" cy="122" r="9" fill="#fdfdff" stroke="#6f61b8" stroke-width="2.5"/>
        <g class="a-wave"><g>
          ${arm('#6f61b8', 14)}${arm('#fdfdff', 10)}
          <circle cx="86" cy="122" r="9" fill="#fdfdff" stroke="#6f61b8" stroke-width="2.5"/>
        </g></g>
        <circle cx="150" cy="52" r="27" fill="#fdfdff" stroke="#6f61b8" stroke-width="3"/>
        <circle cx="141" cy="48" r="5.5" fill="#4a4370"/><circle cx="159" cy="48" r="5.5" fill="#4a4370"/>
        <path d="M138 62 h24" stroke="#4a4370" stroke-width="3" stroke-linecap="round"/>
        <path d="M144 62 v6 M150 62 v6 M156 62 v6" stroke="#4a4370" stroke-width="2"/>
      </g></g>
      <text x="150" y="192" text-anchor="middle" font-size="13" fill="#f2eeff">בגוף שלנו יותר מ־200 עצמות 🦴</text>
    </svg>`;
  },

  /* ===== בעלי חיים ===== */

  butterfly() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('an1', '#eafff0', '#d4f8e4')}
      ${ground('#8fe0a4', 168)}
      <path d="M220 112 h54" stroke="#7a5b2e" stroke-width="5" stroke-linecap="round"/>
      <g class="a-inch"><g transform="translate(246 104)">
        <circle cx="-18" cy="0" r="9" fill="#8fd94f"/><circle cx="-6" cy="0" r="9" fill="#a5e26a"/>
        <circle cx="6" cy="0" r="9" fill="#8fd94f"/><circle cx="18" cy="-2" r="10" fill="#6fc63a"/>
        <circle cx="15" cy="-5" r="2" fill="#213"/><circle cx="22" cy="-5" r="2" fill="#213"/>
      </g></g>
      <text x="246" y="144" font-size="13" fill="#2f6b3f">זחל 🐛</text>
      <text x="198" y="106" font-size="17">⬅️</text>
      <path d="M126 62 h48" stroke="#7a5b2e" stroke-width="5" stroke-linecap="round"/>
      <g class="a-wiggle"><g transform="translate(150 64)">
        <path d="M0 0 c 16 0 22 18 16 34 c-5 14-27 14-32 0 c-6-16 0-34 16-34z" fill="#c9a25e"/>
        <path d="M-8 14 q8 6 16 0 M-10 26 q10 7 20 0" stroke="#a5813f" stroke-width="2.5" fill="none"/>
      </g></g>
      <text x="150" y="144" font-size="13" fill="#2f6b3f">גולם 🤎</text>
      <text x="100" y="106" font-size="17">⬅️</text>
      <g class="a-flutter"><g transform="translate(52 92)">
        <g class="a-wings"><g>
          <path d="M-4 0 c-26-28-40-4-28 12 c 8 10 22 6 28-2z" fill="#ff8fd0"/>
          <path d="M4 0 c26-28 40-4 28 12 c-8 10-22 6-28-2z" fill="#ff8fd0"/>
          <path d="M-6 6 c-18 16-8 28 4 20z" fill="#ffb3e0"/>
          <path d="M6 6 c18 16 8 28-4 20z" fill="#ffb3e0"/>
        </g></g>
        <rect x="-3" y="-12" width="6" height="30" rx="3" fill="#4a3b6b"/>
        <path d="M-2 -12 q-6-10-12-12 M2 -12 q6-10 12-12" stroke="#4a3b6b" stroke-width="2" fill="none" stroke-linecap="round"/>
      </g></g>
      <text x="52" y="144" font-size="13" fill="#2f6b3f">פרפר 🦋</text>
    </svg>`;
  },

  fish() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('an2', '#8ddcf7', '#1f7fc4')}
      <path d="M0 176 q40-14 76 0 t76 0 t76 0 t72 0 V200 H0Z" fill="#f4e0a8"/>
      <g class="a-sway"><g><path d="M60 178 q-10-32 2-48 q10 20 8 48z" fill="#3fbf7f"/></g></g>
      <g class="a-sway" style="--delay:.8s"><g><path d="M242 178 q12-36-2-54 q-12 24-8 54z" fill="#35a86f"/></g></g>
      <g class="a-swim"><g transform="translate(150 96)">
        <path d="M-40 0 l-28-18 v36z" fill="#ff7a1c"/>
        <ellipse cx="0" cy="0" rx="42" ry="26" fill="#ff9838"/>
        <path d="M6 -24 q-10-16-22-4z" fill="#ff7a1c"/>
        <circle cx="20" cy="-6" r="6.5" fill="#fff"/><circle cx="21" cy="-6" r="3.2" fill="#20344a"/>
        <path d="M34 6 q-8 8-16 2" stroke="#c75d00" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M-6 -14 q6 14 0 28 M-20 -10 q5 10 0 20" stroke="#ffcf9a" stroke-width="3" fill="none"/>
      </g></g>
      <g class="a-rise" style="--delay:.2s"><circle cx="186" cy="88" r="5" fill="#ffffffaa"/></g>
      <g class="a-rise" style="--delay:1.4s"><circle cx="176" cy="80" r="7" fill="#ffffff99"/></g>
      <g class="a-rise" style="--delay:2.4s"><circle cx="196" cy="96" r="4" fill="#ffffffaa"/></g>
      <text x="150" y="28" text-anchor="middle" font-size="14" fill="#04395e">הזימים נושמים מתוך המים</text>
    </svg>`;
  },

  bird() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('an3', '#bfe9ff', '#7cc8f5')}
      ${cloud(66, 46, 0.8, '#ffffff', 0)}
      ${cloud(232, 70, 0.6, '#ffffffcc', 2)}
      ${ground('#7ed37e', 172)}
      <g class="a-fly"><g transform="translate(150 96)">
        <g class="a-flap2"><g><path d="M0 -2 q16-22 38-17 q-6 18-27 25z" fill="#3f6fd0"/></g></g>
        <path d="M22 6 l26 7 l-24 9z" fill="#4a7ad8"/>
        <ellipse cx="0" cy="4" rx="26" ry="18" fill="#6fa0ff"/>
        <circle cx="-22" cy="-8" r="13" fill="#7fb0ff"/>
        <circle cx="-26" cy="-11" r="3" fill="#18234a"/>
        <path d="M-34 -6 l-14 4 l14 5z" fill="#ffb03a"/>
        <g class="a-flap"><g><path d="M-2 -6 q16-24 40-19 q-6 20-28 27z" fill="#5b8dee"/></g></g>
      </g></g>
      <g class="a-fall" style="--delay:1.2s; --d:5s"><text x="106" y="74" font-size="18">🪶</text></g>
    </svg>`;
  },

  bee() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('an4', '#fffbe6', '#ffeeb8')}
      ${ground('#8fe0a4', 166)}
      ${flower(62, 168, '#ff8fd0', 56)}
      <g transform="translate(236 132)">
        <path d="M-26 28 q26-64 52 0z" fill="#e4a23c"/>
        <rect x="-28" y="22" width="56" height="12" rx="6" fill="#c9832a"/>
        <text x="-10" y="16" font-size="16">🍯</text>
      </g>
      <g class="a-buzz"><g transform="translate(150 74)">
        <ellipse cx="0" cy="0" rx="22" ry="16" fill="#ffd93d"/>
        <path d="M-8 -14 v28 M6 -15 v30" stroke="#3b2a1a" stroke-width="7"/>
        <circle cx="-20" cy="-4" r="11" fill="#3b2a1a"/>
        <circle cx="-24" cy="-7" r="2.6" fill="#fff"/>
        <path d="M-18 -14 q-2-10-8-12 M-24 -13 q-4-8-10-8" stroke="#3b2a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M22 0 l10-6 v12z" fill="#3b2a1a"/>
        <g class="a-wings2"><g>
          <g transform="translate(-8 -20) rotate(-20)"><ellipse rx="14" ry="8" fill="#ffffffcc"/></g>
          <g transform="translate(8 -20) rotate(20)"><ellipse rx="14" ry="8" fill="#ffffffcc"/></g>
        </g></g>
      </g></g>
    </svg>`;
  },

  penguin() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('an5', '#dff3ff', '#a9dcf7')}
      <rect x="0" y="150" width="300" height="50" fill="#8fd0ef"/>
      <path d="M36 150 l34-26 l36 26z" fill="#ffffff"/>
      <path d="M200 150 l40-32 l46 32z" fill="#f2fbff"/>
      <ellipse cx="150" cy="160" rx="96" ry="18" fill="#ffffff"/>
      <g class="a-waddle"><g transform="translate(150 104)">
        <ellipse cx="0" cy="12" rx="36" ry="44" fill="#2b2f45"/>
        <ellipse cx="0" cy="18" rx="24" ry="34" fill="#ffffff"/>
        <path d="M-34 4 q-14 20-4 34 q10-6 10-24z" fill="#232739"/>
        <path d="M34 4 q14 20 4 34 q-10-6-10-24z" fill="#232739"/>
        <path d="M-16 54 l-14 6 l16 4z" fill="#ffab3d"/>
        <path d="M16 54 l14 6 l-16 4z" fill="#ffab3d"/>
        <circle cx="0" cy="-26" r="26" fill="#2b2f45"/>
        <ellipse cx="0" cy="-18" rx="18" ry="16" fill="#ffffff"/>
        <circle cx="-8" cy="-28" r="4.5" fill="#fff"/><circle cx="8" cy="-28" r="4.5" fill="#fff"/>
        <circle cx="-8" cy="-28" r="2.4" fill="#12172b"/><circle cx="8" cy="-28" r="2.4" fill="#12172b"/>
        <path d="M-7 -16 l7 8 l7-8z" fill="#ffab3d"/>
      </g></g>
      ${[0, 1, 2, 3, 4, 5].map(i =>
        `<g class="a-fall" style="--delay:${i * 0.9}s; --d:${5 + (i % 3)}s"><text x="${24 + i * 48}" y="4" font-size="16">❄️</text></g>`).join('')}
    </svg>`;
  },

  /* ===== צמחים ===== */

  seed() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('pl1', '#eafff2', '#d7f7e3')}
      ${sun(258, 40, 18)}
      <rect x="0" y="150" width="300" height="50" fill="#8a5a33"/>
      <rect x="0" y="150" width="300" height="9" fill="#6f4526"/>
      <ellipse cx="150" cy="172" rx="9" ry="7" fill="#c98a4b"/>
      <g class="a-grow"><g>
        <path d="M150 152 V82" stroke="#3fa25e" stroke-width="8" stroke-linecap="round"/>
        <path d="M150 128 q-30-6-34-26 q30-2 34 26z" fill="#57c37a"/>
        <path d="M150 110 q30-6 34-26 q-30-2-34 26z" fill="#57c37a"/>
        <g class="a-bloom"><g>
          ${petals(150, 80, 19, '#ff8fd0', 8, 10, 13)}
          <circle cx="150" cy="80" r="13" fill="#ffd93d"/>
          ${smileFace(150, 80, 0.85, '#8a6200')}
        </g></g>
      </g></g>
      <g class="a-fall" style="--delay:.4s; --d:3s"><text x="86" y="34" font-size="16">💧</text></g>
      <g class="a-fall" style="--delay:1.6s; --d:3s"><text x="196" y="26" font-size="16">💧</text></g>
    </svg>`;
  },

  sunPlant() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('pl2', '#fffdf0', '#e8f9e6')}
      ${sun(54, 46, 22)}
      ${ground('#8a5a33', 158)}
      <g class="a-ray"><g><path d="M82 62 L122 96" stroke="#ffcf3f" stroke-width="5" stroke-linecap="round" stroke-dasharray="9 9"/></g></g>
      <g class="a-ray" style="--delay:.7s"><g><path d="M84 82 L120 108" stroke="#ffcf3f" stroke-width="5" stroke-linecap="round" stroke-dasharray="9 9"/></g></g>
      <path d="M150 158 V96" stroke="#3fa25e" stroke-width="9" stroke-linecap="round"/>
      <g class="a-sway"><g>
        <path d="M150 128 q-38-6-44-30 q38-4 44 30z" fill="#57c37a"/>
        <path d="M150 112 q38-6 44-30 q-38-4-44 30z" fill="#4fb56f"/>
      </g></g>
      <g class="a-bob" style="--d:3s"><g>
        ${petals(150, 72, 18, '#ff8fd0', 8, 9, 12)}
        <circle cx="150" cy="72" r="15" fill="#ffd93d"/>${smileFace(150, 72, 1, '#8a6200')}
      </g></g>
      <g class="a-rise" style="--delay:.3s"><text x="196" y="152" font-size="18">💧</text></g>
      <g class="a-rise" style="--delay:1.5s"><text x="216" y="160" font-size="14">💧</text></g>
      <text x="150" y="192" text-anchor="middle" font-size="14" fill="#2f6b3f">שמש ☀️ + מים 💧 = צמח שמח 🌱</text>
    </svg>`;
  },

  roots() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('pl3', '#eaf7ff', '#dff0ff')}
      <rect x="0" y="96" width="300" height="104" fill="#a06a3c"/>
      <rect x="0" y="96" width="300" height="9" fill="#6f4526"/>
      <path d="M150 96 V50" stroke="#3fa25e" stroke-width="8" stroke-linecap="round"/>
      <g class="a-sway"><g>
        <path d="M150 70 q-30-4-34-22 q30-2 34 22z" fill="#57c37a"/>
        <path d="M150 58 q30-4 34-22 q-30-2-34 22z" fill="#57c37a"/>
      </g></g>
      <g stroke="#e0c08a" stroke-width="6" stroke-linecap="round" fill="none">
        <path d="M150 100 v54"/><path d="M150 116 q-30 10-46 38"/><path d="M150 116 q30 10 46 38"/>
        <path d="M150 138 q-18 12-24 34"/><path d="M150 138 q18 12 24 34"/>
      </g>
      <g class="a-up" style="--delay:0s"><circle cx="126" cy="172" r="6" fill="#4bb8f0"/></g>
      <g class="a-up" style="--delay:1s"><circle cx="176" cy="182" r="6" fill="#4bb8f0"/></g>
      <g class="a-up" style="--delay:2s"><circle cx="150" cy="188" r="6" fill="#4bb8f0"/></g>
      <text x="150" y="28" text-anchor="middle" font-size="14" fill="#2f6b3f">השורשים שותים מים מהאדמה ⬆️</text>
    </svg>`;
  },

  autumnTree() {
    const leaves = [0, 1, 2, 3, 4, 5, 6].map(i =>
      `<g class="a-leaf" style="--delay:${i * 0.8}s; --d:${4 + (i % 3)}s; --x:${(i % 2 ? 1 : -1) * (16 + i * 4)}px">
        <text x="${84 + i * 22}" y="72" font-size="18">${['🍂', '🍁', '🍂'][i % 3]}</text></g>`).join('');
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('pl4', '#fff6e6', '#ffe7c2')}
      ${ground('#c7a86a', 166)}
      <path d="M143 170 v-58 q-2-16 7-16 q9 0 7 16 v58z" fill="#8a5a33"/>
      <circle cx="150" cy="86" r="46" fill="#e8913a"/>
      <circle cx="112" cy="100" r="30" fill="#f0a94f"/>
      <circle cx="188" cy="100" r="30" fill="#d9792c"/>
      <circle cx="150" cy="70" r="30" fill="#f5bf6a"/>
      ${leaves}
    </svg>`;
  },

  pollination() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('pl5', '#fffbe8', '#eafce9')}
      ${ground('#8fe0a4', 162)}
      ${flower(66, 164, '#ff8fd0', 54)}
      ${flower(234, 164, '#a98fff', 54)}
      <g class="a-twinkle" style="--delay:.3s"><circle cx="118" cy="96" r="3" fill="#ffd93d"/></g>
      <g class="a-twinkle" style="--delay:.9s"><circle cx="150" cy="88" r="3" fill="#ffd93d"/></g>
      <g class="a-twinkle" style="--delay:1.5s"><circle cx="182" cy="96" r="3" fill="#ffd93d"/></g>
      <g class="a-travel"><g>
        <ellipse cx="0" cy="0" rx="16" ry="12" fill="#ffd93d"/>
        <path d="M-6 -10 v20 M4 -11 v22" stroke="#3b2a1a" stroke-width="5"/>
        <circle cx="-15" cy="-3" r="8" fill="#3b2a1a"/><circle cx="-18" cy="-5" r="2" fill="#fff"/>
        <g class="a-wings2"><g>
          <ellipse cx="-6" cy="-14" rx="10" ry="6" fill="#ffffffcc"/>
          <ellipse cx="6" cy="-14" rx="10" ry="6" fill="#ffffffcc"/>
        </g></g>
      </g></g>
    </svg>`;
  },

  /* ===== מזג אוויר ===== */

  rainCloud() {
    const drops = [0, 1, 2, 3, 4, 5, 6].map(i =>
      `<g class="a-rain" style="--delay:${(i * 0.28).toFixed(2)}s"><ellipse cx="${104 + i * 15}" cy="104" rx="3.4" ry="7" fill="#4bb8f0"/></g>`).join('');
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('we1', '#cfe6f5', '#9fc9e6')}
      ${cloud(60, 40, 0.7, '#ffffffcc', 1)}
      <g class="a-bob" style="--d:5s"><g transform="translate(150 64) scale(1.5)">
        <ellipse cx="0" cy="0" rx="26" ry="16" fill="#8f9fb8"/>
        <ellipse cx="-20" cy="6" rx="18" ry="12" fill="#9fafc8"/>
        <ellipse cx="20" cy="6" rx="18" ry="12" fill="#9fafc8"/>
        <ellipse cx="0" cy="10" rx="30" ry="11" fill="#adbcd4"/>
        ${smileFace(0, 4, 1, '#3f4a60')}
      </g></g>
      ${drops}
      ${ground('#7ed37e', 170)}
      <ellipse cx="150" cy="182" rx="58" ry="10" fill="#7fc7ee"/>
      <ellipse cx="150" cy="180" rx="38" ry="6" fill="#a9dcf7"/>
    </svg>`;
  },

  puddle() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('we2', '#e8f6ff', '#bfe4f7')}
      ${sun(54, 44, 22)}
      ${cloud(226, 50, 0.9, '#ffffff', 0.5)}
      ${ground('#e2c887', 166)}
      <g class="a-shrink"><g>
        <ellipse cx="150" cy="178" rx="62" ry="12" fill="#4bb8f0"/>
        <ellipse cx="150" cy="176" rx="42" ry="7" fill="#7fd1ff"/>
      </g></g>
      <g class="a-up" style="--delay:0s"><text x="112" y="162" font-size="16">💨</text></g>
      <g class="a-up" style="--delay:1s"><text x="146" y="168" font-size="14">💨</text></g>
      <g class="a-up" style="--delay:2s"><text x="182" y="160" font-size="16">💨</text></g>
      <text x="150" y="28" text-anchor="middle" font-size="13" fill="#0d4f73">המים מתאדים, עולים למעלה ובונים ענן ☁️</text>
    </svg>`;
  },

  rainbow() {
    const cols = ['#ff5d5d', '#ffa53a', '#ffd93d', '#5ed17a', '#4bb8f0', '#8f7bff'];
    const arcs = cols.map((c, i) =>
      `<path class="a-draw" style="--delay:${(i * 0.18).toFixed(2)}s"
        d="M${34 + i * 11} 174 A ${116 - i * 11} ${116 - i * 11} 0 0 1 ${266 - i * 11} 174"
        stroke="${c}" stroke-width="11" fill="none" stroke-linecap="round"/>`).join('');
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('we3', '#dff1ff', '#b6e1f7')}
      ${arcs}
      ${sun(258, 38, 16)}
      ${cloud(56, 58, 0.8, '#ffffff', 0)}
      ${[0, 1, 2, 3].map(i => `<g class="a-rain" style="--delay:${(i * 0.4).toFixed(2)}s"><ellipse cx="${40 + i * 14}" cy="84" rx="3" ry="6" fill="#4bb8f0"/></g>`).join('')}
      ${ground('#7ed37e', 176)}
    </svg>`;
  },

  snow() {
    const flakes = [0, 1, 2, 3, 4, 5, 6, 7].map(i =>
      `<g class="a-fall" style="--delay:${(i * 0.7).toFixed(2)}s; --d:${5 + (i % 4)}s"><text x="${16 + i * 36}" y="2" font-size="${14 + (i % 3) * 4}">❄️</text></g>`).join('');
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('we4', '#e9f4ff', '#c3ddf2')}
      ${ground('#ffffff', 156)}
      <g class="a-bob" style="--d:4s"><g>
        <circle cx="150" cy="142" r="34" fill="#ffffff" stroke="#d8e6f2" stroke-width="2"/>
        <circle cx="150" cy="100" r="24" fill="#ffffff" stroke="#d8e6f2" stroke-width="2"/>
        <circle cx="142" cy="96" r="3.4" fill="#2b2f45"/><circle cx="158" cy="96" r="3.4" fill="#2b2f45"/>
        <path d="M150 102 l11 4 l-11 4z" fill="#ff8c2b"/>
        <path d="M140 112 q10 8 20 0" stroke="#2b2f45" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <circle cx="150" cy="132" r="3.4" fill="#2b2f45"/><circle cx="150" cy="148" r="3.4" fill="#2b2f45"/>
        <path d="M118 132 l-26-12 M182 132 l26-12" stroke="#a06a3c" stroke-width="4" stroke-linecap="round"/>
        <rect x="130" y="74" width="40" height="9" rx="3" fill="#5b8dee"/>
        <rect x="137" y="56" width="26" height="20" rx="3" fill="#5b8dee"/>
      </g></g>
      ${flakes}
    </svg>`;
  },

  kite() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('we5', '#d8f0ff', '#9ed4f5')}
      ${cloud(66, 42, 0.7, '#ffffffcc', 0)}
      ${cloud(240, 64, 0.6, '#ffffffbb', 1.8)}
      ${ground('#7ed37e', 170)}
      <g class="a-kite"><g>
        <path d="M188 132 q-34 22-56 32" stroke="#6b5b8a" stroke-width="2" fill="none"/>
        <path d="M188 42 L218 82 L188 132 L158 82 Z" fill="#ff5d8f"/>
        <path d="M188 42 V132 M158 82 H218" stroke="#ffffffaa" stroke-width="3"/>
        <path d="M188 132 q10 14-4 22 q14 6 6 20" stroke="#ffd93d" stroke-width="4" fill="none" stroke-linecap="round"/>
      </g></g>
      <g transform="translate(112 150)">
        <circle cx="0" cy="-26" r="11" fill="#ffd0a8"/>
        <path d="M-9 -30 q9-11 18 0 q-9-5-18 0z" fill="#5a3a22"/>
        <circle cx="-3" cy="-27" r="1.6" fill="#3b2a1a"/><circle cx="3" cy="-27" r="1.6" fill="#3b2a1a"/>
        <path d="M-4 -22 q4 4 8 0" stroke="#3b2a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M0 -14 v22" stroke="#4bb8f0" stroke-width="14" stroke-linecap="round"/>
        <path d="M0 -10 q14-6 20-12" stroke="#ffd0a8" stroke-width="6" fill="none" stroke-linecap="round"/>
        <path d="M-4 8 v14 M6 8 v14" stroke="#3b6fd4" stroke-width="6" stroke-linecap="round"/>
      </g>
      <g class="a-wind" style="--delay:0s"><g><path d="M18 76 q24-10 44 0" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round"/></g></g>
      <g class="a-wind" style="--delay:1.2s"><g><path d="M28 102 q24-10 44 0" stroke="#ffffffcc" stroke-width="4" fill="none" stroke-linecap="round"/></g></g>
    </svg>`;
  },

  /* ===== חומרים ===== */

  iceMelt() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('mt1', '#eafcff', '#c9f0f7')}
      ${sun(252, 40, 20)}
      <rect x="0" y="164" width="300" height="36" fill="#dcb98a"/>
      <g class="a-puddle-grow"><g>
        <ellipse cx="150" cy="170" rx="70" ry="11" fill="#4bb8f0"/>
        <ellipse cx="150" cy="168" rx="48" ry="6" fill="#7fd1ff"/>
      </g></g>
      <g class="a-melt"><g>
        <rect x="116" y="104" width="68" height="60" rx="10" fill="#9fe6f7" stroke="#6fd0e8" stroke-width="3"/>
        <path d="M124 112 h22 M124 124 h12" stroke="#ffffffcc" stroke-width="5" stroke-linecap="round"/>
        ${smileFace(150, 140, 1.1, '#2e7d92')}
      </g></g>
      <text x="150" y="192" text-anchor="middle" font-size="14" fill="#07605a">קרח 🧊 ⬅️ מים 💧</text>
    </svg>`;
  },

  steamPot() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('mt2', '#f2fbff', '#dbf1f7')}
      <g class="a-rise" style="--delay:0s"><text x="112" y="78" font-size="22">💨</text></g>
      <g class="a-rise" style="--delay:1s"><text x="146" y="66" font-size="26">💨</text></g>
      <g class="a-rise" style="--delay:2s"><text x="182" y="80" font-size="20">💨</text></g>
      <rect x="62" y="102" width="34" height="9" rx="4.5" fill="#5f6b80"/>
      <rect x="204" y="102" width="34" height="9" rx="4.5" fill="#5f6b80"/>
      <rect x="96" y="104" width="108" height="56" rx="10" fill="#7f8ca3"/>
      <rect x="88" y="98" width="124" height="14" rx="7" fill="#9aa8bf"/>
      <g class="a-boil"><g><path d="M102 118 q13 10 26 0 t26 0 t26 0 t18 0 v12 H102z" fill="#4bb8f0"/></g></g>
      <circle class="a-bubble" style="--delay:.2s" cx="124" cy="144" r="4" fill="#ffffff99"/>
      <circle class="a-bubble" style="--delay:1s" cx="158" cy="148" r="5" fill="#ffffff99"/>
      <circle class="a-bubble" style="--delay:1.7s" cx="186" cy="144" r="4" fill="#ffffff99"/>
      <rect x="104" y="160" width="92" height="10" rx="5" fill="#3b4354"/>
      <g class="a-flicker"><g>
        <path d="M128 188 q8-18 16-22 q-2 10 4 14 q6-6 6-14 q10 10 10 22z" fill="#ff8c2b"/>
        <path d="M138 188 q6-12 10-14 q4 6 8 14z" fill="#ffd93d"/>
      </g></g>
    </svg>`;
  },

  magnet() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('mt3', '#f2fff9', '#dff7ef')}
      <g transform="translate(80 96)">
        <path d="M-18 40 v-40 a34 34 0 0 1 68 0 v40 h-22 v-40 a12 12 0 0 0 -24 0 v40z" fill="#e33b3b"/>
        <rect x="-18" y="34" width="22" height="16" rx="3" fill="#dfe6ee"/>
        <rect x="28" y="34" width="22" height="16" rx="3" fill="#dfe6ee"/>
      </g>
      <g class="a-pulse"><g>
        <path d="M136 92 q26 28 0 56" stroke="#0fb3a6" stroke-width="3" fill="none" stroke-dasharray="6 7"/>
        <path d="M154 82 q34 38 0 76" stroke="#0fb3a6" stroke-width="3" fill="none" stroke-dasharray="6 7" opacity=".6"/>
      </g></g>
      <g class="a-attract" style="--delay:0s"><text x="238" y="78" font-size="24">🔩</text></g>
      <g class="a-attract" style="--delay:.9s"><text x="252" y="116" font-size="22">📎</text></g>
      <g class="a-attract" style="--delay:1.8s"><text x="234" y="152" font-size="22">🔑</text></g>
      <text x="212" y="188" font-size="20">📄</text>
      <text x="152" y="192" font-size="11" fill="#07605a">נייר לא נמשך למגנט</text>
    </svg>`;
  },

  floatSink() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('mt4', '#f0fbff', '#dff2fb')}
      <rect x="44" y="40" width="212" height="146" rx="12" fill="#bfe6f7" stroke="#8fcbe8" stroke-width="4"/>
      <rect x="48" y="78" width="204" height="104" rx="8" fill="#5ec2f0"/>
      <g class="a-sink" style="--delay:.2s"><g><circle cx="186" cy="84" r="11" fill="#ffd93d" stroke="#e0a800" stroke-width="3"/></g></g>
      <g class="a-sink" style="--delay:1.4s"><g><text x="206" y="92" font-size="18">🗝️</text></g></g>
      <g class="a-wave-water"><g><path d="M40 80 q26-10 52 0 t52 0 t52 0 t52 0 t52 0 v8 H40z" fill="#8fd9f7"/></g></g>
      <g class="a-bob" style="--d:3s"><g>
        <circle cx="106" cy="78" r="22" fill="#ff5d5d"/>
        <circle cx="106" cy="78" r="10" fill="#bfe6f7"/>
        <path d="M84 78 a22 22 0 0 1 44 0" stroke="#ffffff" stroke-width="6" fill="none"/>
      </g></g>
      <text x="150" y="30" text-anchor="middle" font-size="14" fill="#07605a">מה צף ומה שוקע?</text>
    </svg>`;
  },

  colorMix() {
    return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">
      ${sky('mt5', '#ffffff', '#f0f7ff')}
      <g class="a-mix-a"><g><circle cx="92" cy="84" r="36" fill="#3b6fd4" opacity=".85"/></g></g>
      <g class="a-mix-b"><g><circle cx="208" cy="84" r="36" fill="#ffd93d" opacity=".85"/></g></g>
      <g class="a-mix-c"><g><circle cx="150" cy="84" r="36" fill="#31a95a"/>${smileFace(150, 84, 1.2, '#ffffff')}</g></g>
      <text x="150" y="146" text-anchor="middle" font-size="18">➕</text>
      <text x="90" y="156" text-anchor="middle" font-size="16" fill="#3b6fd4">כחול</text>
      <text x="210" y="156" text-anchor="middle" font-size="16" fill="#c9a000">צהוב</text>
      <text x="150" y="182" text-anchor="middle" font-size="19" fill="#31a95a">= ירוק!</text>
    </svg>`;
  }
};

/** מחזיר SVG לפי שם סצנה; אם אין — ברירת מחדל */
function renderScene(name) {
  const fn = SCENES[name];
  if (typeof fn === 'function') return fn();
  return `<svg viewBox="0 0 300 200" role="img" aria-hidden="true">${sky('df', '#eef2ff', '#dde6ff')}
    <text x="150" y="122" text-anchor="middle" font-size="64">🔬</text></svg>`;
}
