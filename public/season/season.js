/*
 * Cinammon · ambientación de temporada y festivos.
 * Lee window.__SEASON__ = { season, holiday, discount, promotion, store_url } (lo inyecta el servidor
 * según el país del visitante) y pinta partículas ligeras + un aviso pequeño con la oferta.
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

    // Partículas por tema: glifos (emoji) o formas dibujadas.
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

    // ---------- Partículas ----------
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
        fx.title = 'Efectos de temporada';
        fx.setAttribute('aria-label', 'Activar o desactivar efectos de temporada');
        fx.style.cssText = 'flex-shrink:0;width:24px;height:24px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:transparent;color:inherit;cursor:pointer;font-size:12px;line-height:1';
        var paint = function () { fx.textContent = fxOn ? '\u2728' : '\u25cb'; fx.style.opacity = fxOn ? '1' : '.6'; };
        paint();
        fx.onclick = function () {
            fxOn = !fxOn; store.set(FX_KEY, fxOn ? 'on' : 'off'); paint();
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

        // Plegado: solo un botón redondo con el emoji (no tapa contenido). Se abre al pulsarlo.
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

        // Sin festivo ni oferta, el aviso de la estación solo se ve una vez.
        if (!hidden && (holiday || S.discount > 0 || store.get(PILL_KEY) !== 'seen')) {
            document.body.appendChild(el);
            document.body.appendChild(mini);
            if (!holiday) store.set(PILL_KEY, 'seen');
            // Abierto solo la primera vez en la sesión; luego plegado.
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
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    }
})();
