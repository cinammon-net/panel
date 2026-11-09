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
    var FAMS = {"pink":[[50,0.971,0.014],[100,0.948,0.028],[200,0.899,0.061],[300,0.823,0.12],[400,0.718,0.202],[500,0.656,0.241],[600,0.592,0.249],[700,0.525,0.223],[800,0.459,0.187],[900,0.408,0.153],[950,0.284,0.109]],"fuchsia":[[50,0.977,0.017],[100,0.952,0.037],[200,0.903,0.076],[300,0.833,0.145],[400,0.74,0.238],[500,0.667,0.295],[600,0.591,0.293],[700,0.518,0.253],[800,0.452,0.211],[900,0.401,0.17],[950,0.293,0.136]],"purple":[[50,0.977,0.014],[100,0.946,0.033],[200,0.902,0.063],[300,0.827,0.119],[400,0.714,0.203],[500,0.627,0.265],[600,0.558,0.288],[700,0.496,0.265],[800,0.438,0.218],[900,0.381,0.176],[950,0.291,0.149]],"cyan":[[50,0.984,0.019],[100,0.956,0.045],[200,0.917,0.08],[300,0.865,0.127],[400,0.789,0.154],[500,0.715,0.143],[600,0.609,0.126],[700,0.52,0.105],[800,0.45,0.085],[900,0.398,0.07],[950,0.302,0.056]]};
    var NEON = [0.887, 0.151];
    // [rosa, fucsia, morado, cian, ne\u00f3n]
    var PALETTES = {
        christmas: [25, 15, 145, 150, 150], new_year: [85, 300, 290, 230, 85], reyes: [85, 70, 295, 220, 85],
        valentine: [0, 350, 10, 355, 355], carnival: [330, 300, 280, 130, 95], easter: [340, 300, 290, 145, 145],
        halloween: [50, 40, 305, 135, 60], muertos: [55, 340, 300, 80, 75], thanksgiving: [45, 30, 20, 75, 75],
        black_friday: [95, 85, 85, 95, 95], gamer_day: [145, 300, 290, 200, 145], star_wars: [25, 15, 260, 240, 240],
        book_day: [20, 10, 340, 145, 145], san_juan: [45, 35, 25, 70, 70],
        winter: [250, 270, 280, 220, 215], spring: [150, 130, 330, 165, 150], summer: [75, 55, 30, 195, 190], autumn: [38, 22, 12, 65, 65],
    };
    var paletteKey = holiday ? (PALETTES[holiday.key] ? holiday.key : null) : (season && season.key);
    var colorStyle = null;
    function applyColors(on) {
        var pal = paletteKey && PALETTES[paletteKey];
        if (!pal) return;
        if (!on) { document.documentElement.removeAttribute('data-season-colors'); return; }
        if (!colorStyle) {
            var css = '';
            ['pink', 'fuchsia', 'purple', 'cyan'].forEach(function (fam, i) {
                FAMS[fam].forEach(function (v) {
                    var lch = v[1] + ' ' + v[2] + ' ' + pal[i];
                    css += '--color-' + fam + '-' + v[0] + ':oklch(' + lch + ');--tw-c-' + fam + '-' + v[0] + ':' + lch + ';';
                });
            });
            css += '--tw-c-neon:' + NEON[0] + ' ' + NEON[1] + ' ' + pal[4] + ';';
            colorStyle = document.createElement('style');
            colorStyle.setAttribute('data-season', paletteKey);
            colorStyle.textContent = ':root[data-season-colors]{' + css + '}';
            document.head.appendChild(colorStyle);
        }
        document.documentElement.setAttribute('data-season-colors', paletteKey);
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
