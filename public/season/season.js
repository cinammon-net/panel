/*
 * Cinammon \u00b7 ambientaci\u00f3n de temporada y festivos.
 * Lee window.__SEASON__ = { season, holiday, discount, promotion, store_url } (lo inyecta el servidor
 * seg\u00fan el pa\u00eds del visitante) y pinta part\u00edculas ligeras + un aviso peque\u00f1o con la oferta.
 * Mismo archivo en panel y billing (public/season/season.js).
 */
(function () {
    'use strict';
    if (window.top !== window.self || window.__cinSeasonLoaded) return;
    window.__cinSeasonLoaded = true;

    // Sin contexto incrustado (panel/portada): se pide al billing desde el navegador del visitante.
    if (!window.__SEASON__ && window.__SEASON_URL__) {
        var CK = 'cin-season-ctx';
        try {
            var c = JSON.parse(sessionStorage.getItem(CK) || 'null');
            if (c && c.t > Date.now() - 600000) { window.__SEASON__ = c.v; }
        } catch (e) { /* sin almacenamiento */ }
        if (!window.__SEASON__) {
            fetch(window.__SEASON_URL__, { credentials: 'omit' })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (v) {
                    if (!v) return;
                    try { sessionStorage.setItem(CK, JSON.stringify({ t: Date.now(), v: v })); } catch (e) { /* nada */ }
                    window.__SEASON__ = v;
                    run();
                })
                .catch(function () { /* sin decoraci\u00f3n */ });
            return;
        }
    }
    run();

    function run() {
    var S = window.__SEASON__;
    if (!S) return;

    var store = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } },
    };

    var holiday = S.holiday;
    var season = S.season;
    var theme = (holiday && holiday.theme) || (season && season.theme);
    if (!theme) return;
    document.documentElement.setAttribute('data-season', theme);

    // Part\u00edculas por tema: glifos (emoji) o formas dibujadas.
    var THEMES = {
        snow: { glyphs: ['\u2744', '\u2745', '\u2022'], color: '#e0f2fe', dir: 1, speed: [0.4, 1.1], size: [8, 16], sway: 1 },
        petals: { glyphs: ['\ud83c\udf38', '\ud83c\udf38', '\ud83d\udcae'], dir: 1, speed: [0.4, 0.9], size: [12, 18], sway: 1.4 },
        sun: { glyphs: ['\u2726', '\u2727', '\u00b7'], color: '#fde68a', dir: -1, speed: [0.2, 0.5], size: [8, 14], sway: 0.6 },
        leaves: { glyphs: ['\ud83c\udf42', '\ud83c\udf41', '\ud83c\udf43'], dir: 1, speed: [0.5, 1.2], size: [14, 20], sway: 1.8 },
        confetti: { confetti: true, dir: 1, speed: [0.8, 1.8], size: [5, 9], sway: 1.2 },
        stars: { glyphs: ['\u2728', '\u2b50', '\u2726'], color: '#fde047', dir: 1, speed: [0.3, 0.8], size: [10, 16], sway: 0.8 },
        hearts: { glyphs: ['\ud83d\udc96', '\ud83d\udc95', '\ud83d\udc98'], dir: -1, speed: [0.4, 0.9], size: [12, 20], sway: 1.2 },
        spooky: { glyphs: ['\ud83c\udf83', '\ud83e\udd87', '\ud83d\udc7b', '\ud83d\udd78'], dir: 1, speed: [0.4, 1.0], size: [14, 22], sway: 1.6 },
        marigold: { glyphs: ['\ud83c\udf3c', '\ud83d\udc80', '\ud83d\udd6f'], dir: 1, speed: [0.4, 0.9], size: [12, 18], sway: 1.3 },
        roses: { glyphs: ['\ud83c\udf39', '\ud83d\udcd6', '\ud83c\udf39'], dir: 1, speed: [0.4, 0.9], size: [12, 18], sway: 1.2 },
        sparks: { glyphs: ['\u2726', '\u2727', '\u2022'], color: '#f0abfc', dir: -1, speed: [0.5, 1.2], size: [7, 13], sway: 0.7 },
    };
    var CONFETTI = ['#f472b6', '#22d3ee', '#a78bfa', '#facc15', '#34d399', '#fb7185'];
    var cfg = THEMES[theme] || THEMES.stars;

    var FX_KEY = 'cin-season-fx';
    var fxOn = store.get(FX_KEY) !== 'off';
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Part\u00edculas ----------
    var canvas = null, ctx = null, parts = [], raf = 0, W = 0, H = 0, dpr = 1;
    var rnd = function (a, b) { return a + Math.random() * (b - a); };

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = W * dpr; canvas.height = H * dpr;
        canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(initial) {
        return {
            x: rnd(0, W),
            y: initial ? rnd(0, H) : (cfg.dir > 0 ? -20 : H + 20),
            v: rnd(cfg.speed[0], cfg.speed[1]),
            s: rnd(cfg.size[0], cfg.size[1]),
            g: cfg.glyphs ? cfg.glyphs[(Math.random() * cfg.glyphs.length) | 0] : null,
            c: CONFETTI[(Math.random() * CONFETTI.length) | 0],
            p: rnd(0, Math.PI * 2),
            r: rnd(0, Math.PI * 2),
            vr: rnd(-0.04, 0.04),
            a: rnd(0.45, 0.9),
        };
    }
    function frame() {
        ctx.clearRect(0, 0, W, H);
        for (var i = 0; i < parts.length; i++) {
            var p = parts[i];
            p.p += 0.012; p.r += p.vr;
            p.y += p.v * cfg.dir;
            p.x += Math.sin(p.p) * 0.35 * cfg.sway;
            if (p.y > H + 30 || p.y < -30) parts[i] = spawn(false);
            ctx.globalAlpha = p.a;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
            if (cfg.confetti) {
                ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
            } else {
                ctx.font = p.s + 'px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
                ctx.fillStyle = cfg.color || '#fff';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(p.g, 0, 0);
            }
            ctx.restore();
        }
        ctx.globalAlpha = 1;
        raf = requestAnimationFrame(frame);
    }
    function startFx() {
        if (reduced || canvas) return;
        canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:30';
        document.body.appendChild(canvas);
        ctx = canvas.getContext('2d');
        resize();
        var n = Math.round((holiday ? 26 : 14) * (W < 640 ? 0.55 : 1));
        parts = [];
        for (var i = 0; i < n; i++) parts.push(spawn(true));
        window.addEventListener('resize', resize);
        raf = requestAnimationFrame(frame);
    }
    function stopFx() {
        if (!canvas) return;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        canvas.remove(); canvas = null; parts = [];
    }
    document.addEventListener('visibilitychange', function () {
        if (!canvas) return;
        if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(frame);
    });


    // ---------- Colores de marca por festivo/estaci\u00f3n ----------
    // Se cambia solo el tono (H) de las familias de acento; luminosidad y croma se mantienen
    // (mismo contraste). Panel: variables de Tailwind 4 (--color-*). Billing: --tw-c-* (Tailwind 3).
    var FAMS = {"pink":[[50,0.971,0.014],[100,0.948,0.028],[200,0.899,0.061],[300,0.823,0.12],[400,0.718,0.202],[500,0.656,0.241],[600,0.592,0.249],[700,0.525,0.223],[800,0.459,0.187],[900,0.408,0.153],[950,0.284,0.109]],"fuchsia":[[50,0.977,0.017],[100,0.952,0.037],[200,0.903,0.076],[300,0.833,0.145],[400,0.74,0.238],[500,0.667,0.295],[600,0.591,0.293],[700,0.518,0.253],[800,0.452,0.211],[900,0.401,0.17],[950,0.293,0.136]],"purple":[[50,0.977,0.014],[100,0.946,0.033],[200,0.902,0.063],[300,0.827,0.119],[400,0.714,0.203],[500,0.627,0.265],[600,0.558,0.288],[700,0.496,0.265],[800,0.438,0.218],[900,0.381,0.176],[950,0.291,0.149]],"cyan":[[50,0.984,0.019],[100,0.956,0.045],[200,0.917,0.08],[300,0.865,0.127],[400,0.789,0.154],[500,0.715,0.143],[600,0.609,0.126],[700,0.52,0.105],[800,0.45,0.085],[900,0.398,0.07],[950,0.302,0.056]],"blue":[[50,0.97,0.014],[100,0.932,0.032],[200,0.882,0.059],[300,0.809,0.105],[400,0.707,0.165],[500,0.623,0.214],[600,0.546,0.245],[700,0.488,0.243],[800,0.424,0.199],[900,0.379,0.146],[950,0.282,0.091]],"sky":[[50,0.977,0.013],[100,0.951,0.026],[200,0.901,0.058],[300,0.828,0.111],[400,0.746,0.16],[500,0.685,0.169],[600,0.588,0.158],[700,0.5,0.134],[800,0.443,0.11],[900,0.391,0.09],[950,0.293,0.066]],"indigo":[[50,0.962,0.018],[100,0.93,0.034],[200,0.87,0.065],[300,0.785,0.115],[400,0.673,0.182],[500,0.585,0.233],[600,0.511,0.262],[700,0.457,0.24],[800,0.398,0.195],[900,0.359,0.144],[950,0.257,0.09]],"violet":[[50,0.969,0.016],[100,0.943,0.029],[200,0.894,0.057],[300,0.811,0.111],[400,0.702,0.183],[500,0.606,0.25],[600,0.541,0.281],[700,0.491,0.27],[800,0.432,0.232],[900,0.38,0.189],[950,0.283,0.141]],"emerald":[[50,0.979,0.021],[100,0.95,0.052],[200,0.905,0.093],[300,0.845,0.143],[400,0.765,0.177],[500,0.696,0.17],[600,0.596,0.145],[700,0.508,0.118],[800,0.432,0.095],[900,0.378,0.077],[950,0.262,0.051]],"orange":[[50,0.98,0.016],[100,0.954,0.038],[200,0.901,0.076],[300,0.837,0.128],[400,0.75,0.183],[500,0.705,0.213],[600,0.646,0.222],[700,0.553,0.195],[800,0.47,0.157],[900,0.408,0.123],[950,0.266,0.079]],"amber":[[50,0.987,0.022],[100,0.962,0.059],[200,0.924,0.12],[300,0.879,0.169],[400,0.828,0.189],[500,0.769,0.188],[600,0.666,0.179],[700,0.555,0.163],[800,0.473,0.137],[900,0.414,0.112],[950,0.279,0.077]],"yellow":[[50,0.987,0.026],[100,0.973,0.071],[200,0.945,0.129],[300,0.905,0.182],[400,0.852,0.199],[500,0.795,0.184],[600,0.681,0.162],[700,0.554,0.135],[800,0.476,0.114],[900,0.421,0.095],[950,0.286,0.066]],"lime":[[50,0.986,0.031],[100,0.967,0.067],[200,0.938,0.127],[300,0.897,0.196],[400,0.841,0.238],[500,0.768,0.233],[600,0.648,0.2],[700,0.532,0.157],[800,0.453,0.124],[900,0.405,0.101],[950,0.274,0.072]],"green":[[50,0.982,0.018],[100,0.962,0.044],[200,0.925,0.084],[300,0.871,0.15],[400,0.792,0.209],[500,0.723,0.219],[600,0.627,0.194],[700,0.527,0.154],[800,0.448,0.119],[900,0.393,0.095],[950,0.266,0.065]],"teal":[[50,0.984,0.014],[100,0.953,0.051],[200,0.91,0.096],[300,0.855,0.138],[400,0.777,0.152],[500,0.704,0.14],[600,0.6,0.118],[700,0.511,0.096],[800,0.437,0.078],[900,0.386,0.063],[950,0.277,0.046]]};
    var NEON = [0.887, 0.151];
    // [rosa, fucsia, morado, cian, ne\u00f3n]
    var PALETTES = {
        christmas: [25, 15, 145, 150, 150], new_year: [85, 300, 290, 230, 85], reyes: [85, 70, 295, 220, 85],
        valentine: [0, 350, 10, 355, 355], carnival: [330, 300, 280, 130, 95], easter: [340, 300, 290, 145, 145],
        halloween: [50, 40, 305, 135, 60], muertos: [55, 340, 300, 80, 75], thanksgiving: [45, 30, 20, 75, 75],
        black_friday: [95, 85, 85, 95, 95], gamer_day: [145, 300, 290, 200, 145], star_wars: [25, 15, 260, 240, 240],
        book_day: [20, 10, 340, 145, 145], san_juan: [45, 35, 25, 70, 70],
        winter: [250, 270, 280, 220, 215], spring: [150, 130, 330, 165, 150], summer: [75, 55, 30, 195, 190], autumn: [48, 28, 5, 80, 85],
    };
    // Color de "online" (verde esmeralda de los servidores) por estaci\u00f3n/festivo. Nunca cerca del rojo
    // (apagado, ~25) ni del \u00e1mbar (arrancando, ~70) para que el estado se siga entendiendo.
    var ONLINE = {
        winter: 200, spring: 145, summer: 185, autumn: 130,
        christmas: 145, new_year: 200, reyes: 200, valentine: 330, carnival: 130, easter: 145, halloween: 300, muertos: 300,
        thanksgiving: 130, black_friday: 195, gamer_day: 145, star_wars: 240, book_day: 145, san_juan: 195,
    };
    // Tono "dorado" (VIP, avisos, naranjas/amarillos): separado del online y del rojo de error.
    var GOLD = {
        winter: 275, spring: 330, summer: 85, autumn: 70,
        christmas: 85, new_year: 85, reyes: 85, valentine: 60, carnival: 95, easter: 95, halloween: 60, muertos: 70,
        thanksgiving: 70, black_friday: 95, gamer_day: 300, star_wars: 85, book_day: 70, san_juan: 70,
    };
    Object.keys(PALETTES).forEach(function (k) { PALETTES[k][5] = ONLINE[k]; PALETTES[k][6] = GOLD[k]; });
    var paletteKey = holiday ? (PALETTES[holiday.key] ? holiday.key : null) : (season && season.key);
    var colorStyle = null;
    var sheetStyle = null;
    var ATTR = ':root[data-season-colors]';
    // Familia de Tailwind -> \u00edndice de la paleta (azules siguen al cian, \u00edndigo/violeta al morado).
    var IDX = { pink: 0, fuchsia: 1, purple: 2, cyan: 3, blue: 3, sky: 3, indigo: 2, violet: 2, emerald: 5, green: 5, teal: 5, lime: 6, yellow: 6, amber: 6, orange: 6 };

    // rgb (0-255) -> [L, C, H] en OKLCH
    function toOklch(r, g, b) {
        function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
        r = lin(r); g = lin(g); b = lin(b);
        var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        var L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
        var A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
        var B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
        var H = Math.atan2(B, A) * 180 / Math.PI;
        return [L, Math.sqrt(A * A + B * B), H < 0 ? H + 360 : H];
    }
    // Qu\u00e9 tono de la paleta toca a cada color; null = no tocar (grises y el rojo de error).
    function slot(h, c) {
        if (c < 0.06) return null;
        if (h >= 330 || h < 10) return 0;   // rosa
        if (h >= 312) return 1;             // fucsia
        if (h >= 262) return 2;             // morado / violeta / \u00edndigo
        if (h >= 180) return 3;             // cian / azul
        if (h >= 140) return 5;             // verdes / turquesa (online)
        if (h >= 40) return 6;              // naranja / \u00e1mbar / amarillo / lima (dorado)
        return null;                        // rojo: se queda (apagado / errores)
    }
    function recolorValue(v, pal) {
        if (v.indexOf('rgb') < 0 && v.indexOf('#') < 0) return null;
        var hit = false;
        // #rgb / #rrggbb / #rrggbbaa (p.ej. --tw-gradient-to: #30d5f6) -> rgb() para tratarlo igual
        v = v.replace(/#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi, function (all, hx) {
            if (hx.length < 5) hx = hx.replace(/./g, '$&$&');
            var n = function (i) { return parseInt(hx.substr(i, 2), 16); };
            return 'rgb(' + n(0) + ' ' + n(2) + ' ' + n(4) + (hx.length === 8 ? ' / ' + (n(6) / 255).toFixed(3) : '') + ')';
        });
        var out = v.replace(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?|var\([^()]*\)))?\s*\)/g, function (all, r, g, b, a) {
            if (+r === 88 && +g === 101 && +b === 242) return all; // Discord (#5865F2): color de su marca, solo ese exacto
            var o = toOklch(+r, +g, +b), i = slot(o[2], o[1]);
            if (i === null || pal[i] == null) return all;
            hit = true;
            return 'oklch(' + o[0].toFixed(3) + ' ' + o[1].toFixed(3) + ' ' + pal[i] + (a !== undefined ? ' / ' + a : '') + ')';
        });
        return hit ? out : null;
    }
    function splitSel(sel) {
        var parts = [], depth = 0, cur = '';
        for (var i = 0; i < sel.length; i++) {
            var ch = sel[i];
            if (ch === '(') depth++; else if (ch === ')') depth--;
            if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
        }
        parts.push(cur);
        return parts.map(function (p) { p = p.trim(); return /^:root\b|^html\b/.test(p) ? p.replace(/^(:root|html)/, ATTR) : ATTR + ' ' + p; }).join(',');
    }
    // Recorre las reglas CSS (con @media/@supports/@layer y anidamiento) y devuelve solo las que cambian.
    function walk(rules, pal, nested) {
        var css = '';
        for (var i = 0; i < rules.length; i++) {
            var r = rules[i], inner = '';
            try {
                if (r.style && r.selectorText !== undefined) {
                    var decl = '';
                    for (var k = 0; k < r.style.length; k++) {
                        var prop = r.style[k];
                        if (prop.indexOf('--') === 0 && prop.indexOf('--tw-') !== 0) continue;
                        var nv = recolorValue(r.style.getPropertyValue(prop), pal);
                        if (nv) decl += prop + ':' + nv + (r.style.getPropertyPriority(prop) ? ' !important' : '') + ';';
                    }
                    if (r.cssRules && r.cssRules.length) inner = walk(r.cssRules, pal, true);
                    if (decl || inner) css += (nested ? r.selectorText : splitSel(r.selectorText)) + '{' + decl + inner + '}';
                } else if (r.cssRules) {
                    inner = walk(r.cssRules, pal, nested);
                    if (!inner) continue;
                    if (r.media) css += '@media ' + r.media.mediaText + '{' + inner + '}';
                    else if (r.conditionText !== undefined) css += '@supports ' + r.conditionText + '{' + inner + '}';
                    else css += inner; // @layer: fuera de capa para que gane
                }
            } catch (e) { /* regla rara: se ignora */ }
        }
        return css;
    }
    var seen = [];
    function scanSheets(pal) {
        for (var i = 0; i < document.styleSheets.length; i++) {
            var sh = document.styleSheets[i];
            if (seen.indexOf(sh) >= 0 || sh.ownerNode === colorStyle || sh.ownerNode === sheetStyle) continue;
            var rules;
            try { rules = sh.cssRules; } catch (e) { seen.push(sh); continue; } // otra web (fuentes): no se puede leer
            if (!rules) continue;
            seen.push(sh);
            sheetStyle.textContent += walk(rules, pal, false);
        }
    }
    // ---------- Logos (im\u00e1genes): se recolorean p\u00edxel a p\u00edxel con la misma paleta ----------
    function fromOklch(L, C, H) {
        var h = H * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
        var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
        var m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
        var s = Math.pow(L - 0.0894841775 * a - 1.291485548 * b, 3);
        function g(x) { x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(x * 255))); }
        return [g(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), g(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), g(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)];
    }
    var LOGO_SEL = 'img[src*="logo" i],img[alt*="logo" i],img[src*="favicon" i]';
    var logoCache = {};
    function recolorLogo(img, pal) {
        if (img.getAttribute('data-season-logo')) return;
        var orig = img.getAttribute('src');
        if (!orig || orig.indexOf('data:') === 0) return;
        var done = function (url) { img.setAttribute('data-season-logo', orig); img.src = url; };
        if (logoCache[orig]) return done(logoCache[orig]);
        // Se usa la propia imagen de la p\u00e1gina (mismo dominio); si a\u00fan no carg\u00f3, se espera a que lo haga.
        if (!img.complete || !img.naturalWidth) { img.addEventListener('load', function () { recolorLogo(img, pal); }, { once: true }); return; }
        var src = img;
        var cross = /^https?:/i.test(orig) && orig.indexOf(location.origin) !== 0;
        if (cross && !img.__seasonCors) {
            // Otro dominio (p.ej. iconos de icons8): copia con CORS para poder leer los p\u00edxeles.
            var cimg = new Image();
            cimg.crossOrigin = 'anonymous';
            cimg.onload = function () { img.__seasonCors = cimg; recolorLogo(img, pal); };
            cimg.onerror = function () { img.setAttribute('data-season-logo', 'x'); };
            cimg.src = orig;
            return;
        }
        if (cross) src = img.__seasonCors;
        (function () {
            try {
                var w = src.naturalWidth, h = src.naturalHeight;
                if (!w || !h || w * h > 4000000) return;
                var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
                var cx = cv.getContext('2d'); cx.drawImage(src, 0, 0);
                var d = cx.getImageData(0, 0, w, h), px = d.data, memo = {};
                for (var i = 0; i < px.length; i += 4) {
                    if (!px[i + 3]) continue;
                    var key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2], o = memo[key];
                    if (o === undefined) {
                        var c = toOklch(px[i], px[i + 1], px[i + 2]), sl = slot(c[2], c[1]);
                        o = memo[key] = (sl === null || pal[sl] == null) ? null : fromOklch(c[0], c[1], pal[sl]);
                    }
                    if (o) { px[i] = o[0]; px[i + 1] = o[1]; px[i + 2] = o[2]; }
                }
                cx.putImageData(d, 0, 0);
                done(logoCache[orig] = cv.toDataURL('image/png'));
            } catch (e) { img.setAttribute('data-season-logo', 'x'); } // imagen de otro dominio: se deja igual
        })();
    }
    function logosOn(pal) {
        // Iconos de icons8 (flechas, etc.): se recolorean p\u00edxel a p\u00edxel; el de Discord se deja con su marca.
        var icons = document.querySelectorAll('img[src*="icons8.com"]:not([alt="Discord" i])');
        for (var j = 0; j < icons.length; j++) recolorLogo(icons[j], pal);
        var list = document.querySelectorAll(LOGO_SEL);
        for (var i = 0; i < list.length; i++) recolorLogo(list[i], pal);
    }
    function logosOff() {
        var list = document.querySelectorAll('img[data-season-logo]');
        for (var i = 0; i < list.length; i++) {
            var o = list[i].getAttribute('data-season-logo');
            if (o !== 'x') list[i].src = o;
            list[i].removeAttribute('data-season-logo');
        }
    }
    var logoObs = null;
    function applyColors(on) {
        var pal = paletteKey && PALETTES[paletteKey];
        if (!pal) return;
        if (!on) {
            document.documentElement.removeAttribute('data-season-colors');
            logosOff();
            if (logoObs) { logoObs.disconnect(); logoObs = null; }
            return;
        }
        if (!colorStyle) {
            var css = '';
            Object.keys(IDX).forEach(function (fam) {
                if (pal[IDX[fam]] == null) return;
                FAMS[fam].forEach(function (v) {
                    var lch = v[1] + ' ' + v[2] + ' ' + pal[IDX[fam]];
                    css += '--color-' + fam + '-' + v[0] + ':oklch(' + lch + ');--tw-c-' + fam + '-' + v[0] + ':' + lch + ';';
                });
            });
            css += '--tw-c-neon:' + NEON[0] + ' ' + NEON[1] + ' ' + pal[4] + ';';
            colorStyle = document.createElement('style');
            colorStyle.setAttribute('data-season', paletteKey);
            colorStyle.textContent = ATTR + '{' + css + '}';
            // Logos: las im\u00e1genes giran de tono (el rosa de marca pasa al color principal de la paleta);
            // el hex\u00e1gono SVG de la tienda cambia su parada rosa.
            colorStyle.textContent += ATTR + ' stop[stop-color="#ff4da6" i]{stop-color:oklch(0.69 0.21 ' + pal[0] + ')}'
                + ATTR + ' .cyber-border::before{background:conic-gradient(from 0deg,oklch(0.68 0.26 ' + pal[0] + '),oklch(0.47 0.29 ' + pal[2] + '),oklch(0.79 0.13 ' + pal[3] + '),oklch(0.68 0.26 ' + pal[0] + '))}';
            document.head.appendChild(colorStyle);
            // Colores escritos a mano en el CSS (#00f7ff, rgba(255,0,150,..), degradados...): se recolorean leyendo las hojas.
            sheetStyle = document.createElement('style');
            sheetStyle.setAttribute('data-season-sheets', paletteKey);
            document.head.appendChild(sheetStyle);
            var rescan = function () { scanSheets(pal); };
            rescan();
            window.addEventListener('load', rescan);
            document.addEventListener('load', function (e) { if (e.target && e.target.tagName === 'LINK') rescan(); }, true);
            if (window.MutationObserver) new MutationObserver(function () { setTimeout(rescan, 50); }).observe(document.head, { childList: true });
        }
        document.documentElement.setAttribute('data-season-colors', paletteKey);
        var go = function () { if (document.body) logosOn(pal); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
        if (!logoObs && window.MutationObserver) {
            var t = null;
            logoObs = new MutationObserver(function () { clearTimeout(t); t = setTimeout(go, 120); });
            var watch = function () { logoObs && logoObs.observe(document.body, { childList: true, subtree: true }); };
            if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
        }
    }

    // ---------- Aviso (abajo a la izquierda) ----------
    var PILL_KEY = 'cin-season-pill:' + (holiday ? holiday.key + ':' + (holiday.ends || '') : 'season:' + season.key);
    function pill() {
        var el = document.createElement('div');
        el.setAttribute('role', 'status');
        el.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:45;max-width:calc(100% - 24px);display:flex;align-items:center;gap:8px;' +
            'padding:7px 8px 7px 12px;border-radius:999px;border:1px solid rgba(244,114,182,.45);background:rgba(10,10,20,.88);' +
            'backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);color:#fce7f3;font:600 12px/1.3 system-ui,-apple-system,"Segoe UI",sans-serif;' +
            'box-shadow:0 0 18px rgba(236,72,153,.25)';

        var hidden = store.get(PILL_KEY) === 'hidden';
        var label = document.createElement('span');
        label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
        var name = holiday ? holiday.emoji + ' ' + holiday.name : season.emoji + ' ' + season.name;
        label.textContent = name;
        el.appendChild(label);

        if (S.discount > 0 && S.store_url) {
            var a = document.createElement('a');
            a.href = S.store_url;
            a.textContent = '-' + S.discount + '% en la tienda';
            a.style.cssText = 'flex-shrink:0;padding:3px 9px;border-radius:999px;background:linear-gradient(90deg,#ec4899,#a855f7);color:#fff;text-decoration:none;font-weight:800';
            el.appendChild(a);
        }

        var fx = document.createElement('button');
        fx.type = 'button';
        fx.title = 'Efectos y colores de temporada';
        fx.setAttribute('aria-label', 'Activar o desactivar efectos de temporada');
        fx.style.cssText = 'flex-shrink:0;width:24px;height:24px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:transparent;color:inherit;cursor:pointer;font-size:12px;line-height:1';
        var paint = function () { fx.textContent = fxOn ? '\u2728' : '\u25cb'; fx.style.opacity = fxOn ? '1' : '.6'; };
        paint();
        fx.onclick = function () {
            fxOn = !fxOn; store.set(FX_KEY, fxOn ? 'on' : 'off'); paint();
            applyColors(fxOn);
            if (fxOn) startFx(); else stopFx();
        };
        el.appendChild(fx);

        var close = document.createElement('button');
        close.type = 'button';
        close.textContent = '\u00d7';
        close.title = 'Ocultar';
        close.setAttribute('aria-label', 'Ocultar aviso de temporada');
        close.style.cssText = 'flex-shrink:0;width:24px;height:24px;border-radius:999px;border:0;background:transparent;color:#f9a8d4;cursor:pointer;font-size:16px;line-height:1';
        el.appendChild(close);

        // Plegado: solo un bot\u00f3n redondo con el emoji (no tapa contenido). Se abre al pulsarlo.
        var mini = document.createElement('button');
        mini.type = 'button';
        mini.title = name + (S.discount > 0 ? ' \u00b7 -' + S.discount + '%' : '');
        mini.setAttribute('aria-label', 'Mostrar aviso de temporada: ' + mini.title);
        mini.textContent = holiday ? holiday.emoji : season.emoji;
        mini.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:45;width:40px;height:40px;border-radius:999px;border:1px solid rgba(244,114,182,.5);' +
            'background:rgba(10,10,20,.88);font-size:18px;line-height:1;cursor:pointer;box-shadow:0 0 14px rgba(236,72,153,.3);display:none';
        if (S.discount > 0) {
            var badge = document.createElement('span');
            badge.textContent = '-' + S.discount + '%';
            badge.style.cssText = 'position:absolute;top:-6px;right:-10px;padding:1px 5px;border-radius:999px;background:#ec4899;color:#fff;font:800 9px/1.4 system-ui,sans-serif';
            mini.appendChild(badge);
        }
        var collapse = function () { el.style.display = 'none'; mini.style.display = 'block'; };
        var expand = function () { mini.style.display = 'none'; el.style.display = 'flex'; };
        mini.onclick = function () { expand(); setTimeout(collapse, 8000); };
        close.onclick = function () { store.set(PILL_KEY, 'hidden'); el.remove(); mini.remove(); };

        // Sin festivo ni oferta, el aviso de la estaci\u00f3n solo se ve una vez.
        if (!hidden && (holiday || S.discount > 0 || store.get(PILL_KEY) !== 'seen')) {
            document.body.appendChild(el);
            document.body.appendChild(mini);
            if (!holiday) store.set(PILL_KEY, 'seen');
            // Abierto solo la primera vez en la sesi\u00f3n; luego plegado.
            var seenKey = 'cin-season-open:' + PILL_KEY;
            var seen = false;
            try { seen = sessionStorage.getItem(seenKey) === '1'; sessionStorage.setItem(seenKey, '1'); } catch (e) { /* sin almacenamiento */ }
            if (seen) collapse(); else setTimeout(collapse, window.innerWidth < 640 ? 5000 : 9000);
        }
    }

    function init() {
        pill();
        if (fxOn) startFx();
    }
    // Los colores se aplican cuanto antes (antes de pintar) para evitar el parpadeo.
    applyColors(fxOn);
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    }
})();
