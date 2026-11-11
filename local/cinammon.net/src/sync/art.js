/**
 * Banners de los canales y avatar del bot, dibujados con los colores de temporada de la web
 * (mismo tono que season.js: rosa/fucsia de marca girado según festivo o estación).
 */
const path = require('path');
const { createCanvas, loadImage, GlobalFonts, Path2D } = require('@napi-rs/canvas');
const ICONS = require('./icons');

const ASSETS = path.join(__dirname, '..', '..', 'assets');
GlobalFonts.registerFromPath(path.join(ASSETS, 'Orbitron.ttf'), 'Orbitron');

// [rosa, fucsia, morado, secundario] en tono OKLCH, como PALETTES de season.js.
const PALETTES = {
    christmas: [25, 15, 145, 85], new_years_eve: [85, 65, 300, 85], new_year: [85, 300, 290, 85], reyes: [85, 70, 295, 85],
    valentine: [0, 350, 10, 355], carnival: [330, 300, 280, 130], easter: [340, 300, 290, 145],
    halloween: [50, 40, 305, 135], muertos: [55, 340, 300, 80], thanksgiving: [45, 30, 20, 75],
    black_friday: [95, 85, 70, 95], gamer_day: [145, 300, 290, 145], star_wars: [25, 15, 260, 85],
    book_day: [20, 10, 340, 145], san_juan: [45, 35, 25, 70],
    winter: [275, 290, 300, 275], spring: [150, 130, 330, 145], summer: [75, 55, 30, 85], autumn: [48, 28, 5, 80],
};
const DEFAULT = [354, 322, 304, 215];

function oklch(L, C, H) {
    const h = (H * Math.PI) / 180;
    const a = C * Math.cos(h);
    const b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ].map((c) => {
        const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
        return Math.max(0, Math.min(255, Math.round(v * 255)));
    });
}

const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`;

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
}

function hslToRgb(h, s, l) {
    h = (((h % 360) + 360) % 360) / 360;
    if (s === 0) return [l, l, l].map((v) => Math.round(v * 255));
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const f = (t) => {
        t = (t + 1) % 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255));
}

/** Paleta de la temporada (respuesta de billing /api/season). */
function palette(season) {
    const key = season?.holiday && PALETTES[season.holiday.key] ? season.holiday.key : season?.season?.key;
    const h = PALETTES[key] || DEFAULT;
    return {
        key: PALETTES[key] ? key : 'default',
        primary: oklch(0.656, 0.241, h[0]),
        strong: oklch(0.591, 0.293, h[1]),
        deep: oklch(0.558, 0.288, h[2]),
        second: oklch(0.789, 0.154, h[3]),
    };
}

let wordmark = null;
const tinted = new Map();

/** Logo "cinammon" con el degradado magenta llevado al tono de la temporada. */
async function tintedWordmark(pal) {
    if (tinted.has(pal.key)) return tinted.get(pal.key);
    wordmark ??= await loadImage(path.join(ASSETS, 'wordmark.png'));
    const c = createCanvas(wordmark.width, wordmark.height);
    const x = c.getContext('2d');
    x.drawImage(wordmark, 0, 0);
    const img = x.getImageData(0, 0, c.width, c.height);
    const target = rgbToHsl(...pal.strong)[0];
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 8) continue;
        const [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
        if (s < 0.25) continue;
        const [r, g, b] = hslToRgb(h - 318 + target, s, l);
        d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    x.putImageData(img, 0, 0);
    tinted.set(pal.key, c);
    return c;
}

function background(x, w, h, pal) {
    x.fillStyle = '#07070a';
    x.fillRect(0, 0, w, h);
    let g = x.createRadialGradient(w * 0.82, h * 0.35, 0, w * 0.82, h * 0.35, w * 0.55);
    g.addColorStop(0, rgba(pal.primary, 0.38));
    g.addColorStop(1, rgba(pal.primary, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    g = x.createRadialGradient(w * 0.05, h * 1.05, 0, w * 0.05, h * 1.05, w * 0.45);
    g.addColorStop(0, rgba(pal.second, 0.18));
    g.addColorStop(1, rgba(pal.second, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,255,0.07)';
    for (let yy = 11; yy < h; yy += 22) for (let xx = 11; xx < w; xx += 22) {
        x.beginPath();
        x.arc(xx, yy, 1.1, 0, Math.PI * 2);
        x.fill();
    }
}

function drawIcon(x, name, cx, cy, size, color) {
    const node = ICONS[name];
    if (!node) return;
    const k = size / 24;
    x.save();
    x.translate(cx - size / 2, cy - size / 2);
    x.scale(k, k);
    x.strokeStyle = color;
    x.lineWidth = 2;
    x.lineCap = 'round';
    x.lineJoin = 'round';
    for (const [tag, a] of node) {
        const p = new Path2D();
        if (tag === 'path') p.addPath(new Path2D(a.d));
        else if (tag === 'rect') p.roundRect(+a.x, +a.y, +a.width, +a.height, +(a.rx || 0));
        else if (tag === 'circle') p.arc(+a.cx, +a.cy, +a.r, 0, Math.PI * 2);
        else if (tag === 'line') { p.moveTo(+a.x1, +a.y1); p.lineTo(+a.x2, +a.y2); }
        else if (tag === 'polyline' || tag === 'polygon') {
            const pts = a.points.trim().split(/[\s,]+/).map(Number);
            p.moveTo(pts[0], pts[1]);
            for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]);
            if (tag === 'polygon') p.closePath();
        }
        x.stroke(p);
    }
    x.restore();
}

/** Dibuja una imagen con halo (copia desenfocada debajo; shadowBlur en imágenes deja un recuadro). */
function glowImage(x, img, sx, sy, sw, sh, dx, dy, dw, dh, blur, alpha) {
    // Se copia el trozo a un lienzo con margen transparente: si no, el desenfoque estira los bordes.
    const P = blur * 3, k = dw / sw;
    const pad = createCanvas(Math.ceil(sw + P * 2), Math.ceil(sh + P * 2));
    pad.getContext('2d').drawImage(img, sx, sy, sw, sh, P, P, sw, sh);
    x.save();
    x.filter = `blur(${blur}px)`;
    x.globalAlpha = alpha;
    x.drawImage(pad, dx - P * k, dy - P * (dh / sh), pad.width * k, pad.height * (dh / sh));
    x.restore();
    x.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** Las dos rayas de velocidad del logo. */
function speedLines(x, left, y, len, color, thick = 9) {
    x.fillStyle = color;
    x.shadowColor = color;
    x.shadowBlur = 12;
    x.fillRect(left, y, len, thick);
    x.fillRect(left + len * 0.12, y + thick * 3.2, len * 0.82, thick);
    x.shadowBlur = 0;
}

/** Banner 1200x360 para la cabecera de un canal. */
async function banner({ title, subtitle, icon }, pal) {
    const W = 1200, H = 360;
    const c = createCanvas(W, H);
    const x = c.getContext('2d');
    background(x, W, H, pal);

    const wm = await tintedWordmark(pal);
    const wmH = 56;
    x.drawImage(wm, 64, 52, (wm.width * wmH) / wm.height, wmH);

    // Título con degradado de marca
    let size = 76;
    x.font = `900 ${size}px Orbitron`;
    while (x.measureText(title).width > 760 && size > 40) x.font = `900 ${(size -= 4)}px Orbitron`;
    const g = x.createLinearGradient(64, 0, 64 + x.measureText(title).width, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, hex(pal.primary));
    x.fillStyle = g;
    x.shadowColor = rgba(pal.primary, 0.55);
    x.shadowBlur = 24;
    x.fillText(title, 64, 200);
    x.shadowBlur = 0;

    if (subtitle) {
        x.font = '500 24px Orbitron';
        x.fillStyle = '#a1a1aa';
        x.fillText(subtitle, 66, 248);
    }
    speedLines(x, 64, 286, 300, hex(pal.second), 8);

    // Icono en tarjeta
    const bx = 900, by = 80, bs = 200;
    x.fillStyle = rgba(pal.primary, 0.1);
    x.strokeStyle = rgba(pal.primary, 0.55);
    x.lineWidth = 2;
    x.beginPath();
    x.roundRect(bx, by, bs, bs, 36);
    x.fill();
    x.stroke();
    x.shadowColor = hex(pal.primary);
    x.shadowBlur = 28;
    drawIcon(x, icon, bx + bs / 2, by + bs / 2, 112, hex(pal.primary));
    x.shadowBlur = 0;

    // Línea inferior
    const lg = x.createLinearGradient(0, 0, W, 0);
    lg.addColorStop(0, rgba(pal.second, 0));
    lg.addColorStop(0.5, hex(pal.strong));
    lg.addColorStop(1, rgba(pal.primary, 0));
    x.fillStyle = lg;
    x.fillRect(0, H - 4, W, 4);
    return c.toBuffer('image/png');
}

/** Avatar 512x512: la "c" del logo con el punto y las rayas, centrado para el recorte circular. */
async function avatar(pal) {
    const S = 512;
    const c = createCanvas(S, S);
    const x = c.getContext('2d');
    x.fillStyle = '#07070a';
    x.fillRect(0, 0, S, S);
    let g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S * 0.62);
    g.addColorStop(0, rgba(pal.primary, 0.42));
    g.addColorStop(1, rgba(pal.primary, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, S, S);
    x.fillStyle = 'rgba(255,255,255,0.08)';
    for (let yy = 8; yy < S; yy += 24) for (let xx = 8; xx < S; xx += 24) {
        x.beginPath();
        x.arc(xx, yy, 1.4, 0, Math.PI * 2);
        x.fill();
    }

    // La "c" es la primera letra del logo (las columnas 0-98 del recorte).
    const wm = await tintedWordmark(pal);
    const gw = 98, gy = 32, gh = wm.height - gy;
    const scale = 2.35;
    const dw = gw * scale, dh = gh * scale;
    const left = S / 2 - dw / 2 - 30, top = S / 2 - dh / 2 - 28;
    glowImage(x, wm, 0, gy, gw, gh, left, top, dw, dh, 26, 0.85);

    // Punto y rayas como en ".panel"
    const sec = hex(pal.second);
    x.fillStyle = sec;
    x.shadowColor = sec;
    x.shadowBlur = 18;
    x.fillRect(left + dw + 22, top + dh - 40, 40, 40);
    speedLines(x, left - 6, top + dh + 26, dw + 70, sec, 14);

    // Aro
    x.strokeStyle = rgba(pal.primary, 0.6);
    x.lineWidth = 6;
    x.beginPath();
    x.arc(S / 2, S / 2, S / 2 - 10, 0, Math.PI * 2);
    x.stroke();
    return c.toBuffer('image/png');
}

/** Banner del perfil del bot (relación 5:2). */
async function profileBanner(pal) {
    const W = 1500, H = 600;
    const c = createCanvas(W, H);
    const x = c.getContext('2d');
    background(x, W, H, pal);
    const wm = await tintedWordmark(pal);
    const wmW = 900;
    const wmH = (wm.height * wmW) / wm.width;
    glowImage(x, wm, 0, 0, wm.width, wm.height, (W - wmW) / 2, H / 2 - wmH / 2 - 40, wmW, wmH, 22, 0.7);
    x.font = '700 40px Orbitron';
    x.fillStyle = hex(pal.second);
    const t = 'NETWORK';
    x.fillText(t, W / 2 + wmW / 2 - x.measureText(t).width, H / 2 + wmH / 2 + 40);
    speedLines(x, (W - wmW) / 2, H / 2 + wmH / 2 + 4, 420, hex(pal.second), 10);
    return c.toBuffer('image/png');
}

/**
 * Tarjeta de bienvenida o despedida: avatar del miembro en un aro con el color de temporada.
 * kind = 'join' | 'leave'
 */
async function memberCard({ avatarUrl, name, kind, line }, pal) {
    const W = 1200, H = 420;
    const c = createCanvas(W, H);
    const x = c.getContext('2d');
    background(x, W, H, pal);
    const leave = kind === 'leave';
    const ring = leave ? [161, 161, 170] : pal.primary;

    // Avatar
    const cx = 230, cy = H / 2, r = 120;
    let img = null;
    try {
        const res = await fetch(avatarUrl, { signal: AbortSignal.timeout(8000) });
        if (res.ok) img = await loadImage(Buffer.from(await res.arrayBuffer()));
    } catch {}
    x.save();
    x.shadowColor = rgba(ring, 0.8);
    x.shadowBlur = 40;
    x.beginPath();
    x.arc(cx, cy, r + 10, 0, Math.PI * 2);
    x.fillStyle = hex(ring);
    x.fill();
    x.restore();
    x.save();
    x.beginPath();
    x.arc(cx, cy, r, 0, Math.PI * 2);
    x.clip();
    if (img) {
        if (leave) x.filter = 'grayscale(1)';
        x.drawImage(img, cx - r, cy - r, r * 2, r * 2);
    } else {
        x.fillStyle = '#18181b';
        x.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    x.restore();

    // Textos
    const wm = await tintedWordmark(pal);
    x.drawImage(wm, 420, 70, (wm.width * 40) / wm.height, 40);
    const title = leave ? 'HASTA PRONTO' : 'BIENVENIDA';
    x.font = '900 64px Orbitron';
    const g = x.createLinearGradient(420, 0, 420 + x.measureText(title).width, 0);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, leave ? '#a1a1aa' : hex(pal.primary));
    x.fillStyle = g;
    x.fillText(title, 420, 190);

    let size = 44;
    const shown = String(name || '').slice(0, 32);
    x.font = `700 ${size}px Orbitron`;
    while (x.measureText(shown).width > 720 && size > 22) x.font = `700 ${(size -= 2)}px Orbitron`;
    x.fillStyle = '#f4f4f5';
    x.fillText(shown, 420, 258);
    if (line) {
        x.font = '500 24px Orbitron';
        x.fillStyle = '#a1a1aa';
        x.fillText(line, 422, 304);
    }
    speedLines(x, 420, 334, 300, leave ? '#52525b' : hex(pal.second), 8);
    drawIcon(x, leave ? 'leave' : 'join', 1080, 110, 84, rgba(leave ? ring : pal.primary, 0.9));
    return c.toBuffer('image/png');
}

module.exports = { palette, banner, avatar, profileBanner, memberCard, hex };
