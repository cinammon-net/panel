{{-- Pantalla de carga al abrir/recargar la página (no en la navegación interna de Inertia).
     Muestra el logo de la web (season.js lo recolorea según la temporada); todo lo demás usa --ld-a / --ld-b,
     que son los colores de acento de la web, así sigue la temporada. Mismo archivo en panel y billing. --}}
@php($ldLogo = $logo ?? '/favicon.ico')
<div id="cin-loader" role="status" aria-label="Cargando" style="--ld-a: {{ $a ?? '#ec4899' }}; --ld-b: {{ $b ?? '#22d3ee' }}; --ld-logo: url('{{ $ldLogo }}')">
    <i class="cin-ld-aura cin-ld-aura-a" aria-hidden="true"></i>
    <i class="cin-ld-aura cin-ld-aura-b" aria-hidden="true"></i>
    <i class="cin-ld-grid" aria-hidden="true"></i>
    <span class="cin-ld-dots" aria-hidden="true"></span>
    <div class="cin-ld-box">
        <span class="cin-ld-orbit" aria-hidden="true"><i></i><i></i></span>
        <span class="cin-ld-logo">
            <img src="{{ $ldLogo }}" alt="Cinammon Logo" width="866" height="{{ $ldLogo === '/favicon.ico' ? 258 : 282 }}" draggable="false" decoding="sync" fetchpriority="high" />
            <i class="cin-ld-shine" aria-hidden="true"></i>
        </span>
        <span class="cin-ld-progress">
            <span class="cin-ld-bar"><i></i></span>
            <span class="cin-ld-meta"><span class="cin-ld-txt">Cargando</span><b class="cin-ld-pct">0%</b></span>
        </span>
    </div>
</div>
<noscript><style>#cin-loader{display:none}</style></noscript>
<style>
    #cin-loader { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; overflow: hidden; background: #05060a; transition: opacity .7s ease, visibility .7s ease, filter .7s ease; }
    #cin-loader.cin-ld-out { opacity: 0; visibility: hidden; filter: blur(6px); }
    #cin-loader > i, #cin-loader .cin-ld-dots { position: absolute; pointer-events: none; }

    /* Fondo: dos auroras con los colores de la temporada + rejilla sutil */
    #cin-loader .cin-ld-aura { width: 60vmax; height: 60vmax; border-radius: 50%; filter: blur(80px); opacity: 0; transition: opacity 1s ease; }
    #cin-loader .cin-ld-aura-a { left: -15vmax; top: -20vmax; background: radial-gradient(closest-side, color-mix(in oklab, var(--ld-a) 38%, transparent), transparent); animation: cin-ld-drift-a 9s ease-in-out infinite alternate; }
    #cin-loader .cin-ld-aura-b { right: -18vmax; bottom: -22vmax; background: radial-gradient(closest-side, color-mix(in oklab, var(--ld-b) 30%, transparent), transparent); animation: cin-ld-drift-b 11s ease-in-out infinite alternate; }
    #cin-loader.cin-ld-ready .cin-ld-aura { opacity: 1; }
    #cin-loader .cin-ld-grid { inset: 0; background-image: linear-gradient(rgba(255, 255, 255, .035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, .035) 1px, transparent 1px); background-size: 44px 44px; -webkit-mask: radial-gradient(ellipse 55% 50% at 50% 50%, #000 20%, transparent 75%); mask: radial-gradient(ellipse 55% 50% at 50% 50%, #000 20%, transparent 75%); animation: cin-ld-grid 6s linear infinite; }

    /* Partículas que suben */
    #cin-loader .cin-ld-dots { inset: 0; }
    #cin-loader .cin-ld-dots i { position: absolute; bottom: -10px; width: var(--s); height: var(--s); border-radius: 50%; background: var(--c); box-shadow: 0 0 8px var(--c); opacity: 0; animation: cin-ld-rise var(--d) linear var(--w) infinite; }

    /* Contenido */
    #cin-loader .cin-ld-box { position: relative; display: flex; flex-direction: column; align-items: center; gap: 46px; opacity: 0; }
    #cin-loader.cin-ld-ready .cin-ld-box { opacity: 1; animation: cin-ld-in .8s cubic-bezier(.2, .8, .2, 1) both; }
    #cin-loader.cin-ld-out .cin-ld-box { transform: scale(1.06); transition: transform .7s ease; }

    /* Órbita elíptica alrededor del logo, con dos chispas */
    #cin-loader .cin-ld-orbit { position: absolute; left: 50%; top: calc(min(290px, 72vw) * 258 / 866 / 2); width: min(400px, 94vw); aspect-ratio: 1; transform: translate(-50%, -50%) scaleY(.38); border-radius: 50%; border: 1px solid color-mix(in oklab, var(--ld-a) 25%, transparent); }
    #cin-loader .cin-ld-orbit i { position: absolute; inset: -1px; border-radius: 50%; border: 2px solid transparent; border-top-color: var(--ld-a); filter: drop-shadow(0 0 5px var(--ld-a)); -webkit-mask: linear-gradient(90deg, transparent 15%, #000 50%, transparent 85%); mask: linear-gradient(90deg, transparent 15%, #000 50%, transparent 85%); animation: cin-ld-spin 2.2s linear infinite; }
    #cin-loader .cin-ld-orbit i + i { border-top-color: transparent; border-bottom-color: var(--ld-b); filter: drop-shadow(0 0 6px var(--ld-b)); animation-duration: 3.1s; animation-direction: reverse; }

    #cin-loader .cin-ld-logo { position: relative; display: block; width: min(290px, 72vw); filter: drop-shadow(0 0 20px color-mix(in oklab, var(--ld-a) 55%, transparent)); }
    #cin-loader.cin-ld-ready .cin-ld-logo { animation: cin-ld-breathe 2.6s ease-in-out 1.1s infinite; }
    #cin-loader .cin-ld-logo img { display: block; width: 100%; height: auto; user-select: none; clip-path: inset(0 100% 0 0); }
    #cin-loader.cin-ld-ready .cin-ld-logo img { animation: cin-ld-reveal .9s cubic-bezier(.65, 0, .35, 1) .15s forwards; }
    #cin-loader .cin-ld-shine { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .85) 50%, transparent 65%) no-repeat; background-size: 250% 100%; background-position: 150% 0; -webkit-mask: var(--ld-logo) center / contain no-repeat; mask: var(--ld-logo) center / contain no-repeat; mix-blend-mode: overlay; }
    #cin-loader.cin-ld-ready .cin-ld-shine { animation: cin-ld-shine 2.4s ease-in-out 1s infinite; }

    #cin-loader .cin-ld-progress { display: flex; flex-direction: column; gap: 10px; width: min(240px, 62vw); }
    #cin-loader .cin-ld-bar { position: relative; height: 3px; overflow: hidden; border-radius: 3px; background: rgba(255, 255, 255, .07); }
    #cin-loader .cin-ld-bar i { position: absolute; inset: 0; border-radius: 3px; transform-origin: 0 50%; transform: scaleX(var(--p, 0)); background: linear-gradient(90deg, var(--ld-a), var(--ld-b)); box-shadow: 0 0 12px color-mix(in oklab, var(--ld-a) 70%, transparent); }
    #cin-loader .cin-ld-bar i::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, .55), transparent); background-size: 50% 100%; background-repeat: no-repeat; animation: cin-ld-sweep 1.2s linear infinite; }
    #cin-loader .cin-ld-meta { display: flex; justify-content: space-between; font: 500 10px/1 ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: .28em; text-transform: uppercase; color: rgba(255, 255, 255, .45); }
    #cin-loader .cin-ld-txt::after { content: ''; display: inline-block; width: 1.4em; text-align: left; animation: cin-ld-ellipsis 1.2s steps(4) infinite; }
    #cin-loader .cin-ld-pct { font-weight: 700; letter-spacing: .08em; color: var(--ld-a); font-variant-numeric: tabular-nums; }

    @keyframes cin-ld-in { from { opacity: 0; transform: translateY(14px) scale(.95); } to { opacity: 1; transform: none; } }
    @keyframes cin-ld-reveal { to { clip-path: inset(0 0 0 0); } }
    @keyframes cin-ld-breathe { 0%, 100% { filter: drop-shadow(0 0 16px color-mix(in oklab, var(--ld-a) 40%, transparent)); } 50% { filter: drop-shadow(0 0 30px color-mix(in oklab, var(--ld-a) 75%, transparent)); } }
    @keyframes cin-ld-shine { 0% { background-position: 150% 0; } 55%, 100% { background-position: -50% 0; } }
    @keyframes cin-ld-spin { to { transform: rotate(360deg); } }
    @keyframes cin-ld-sweep { from { background-position: -100% 0; } to { background-position: 250% 0; } }
    @keyframes cin-ld-drift-a { to { transform: translate(10vmax, 8vmax) scale(1.1); } }
    @keyframes cin-ld-drift-b { to { transform: translate(-9vmax, -7vmax) scale(1.15); } }
    @keyframes cin-ld-grid { to { background-position: 0 44px, 44px 0; } }
    @keyframes cin-ld-rise { 0% { opacity: 0; transform: translate(0, 0); } 10% { opacity: .9; } 85% { opacity: .6; } 100% { opacity: 0; transform: translate(var(--x), -105vh); } }
    @keyframes cin-ld-ellipsis { 0% { content: ''; } 25% { content: '.'; } 50% { content: '..'; } 75% { content: '...'; } }
    @media (prefers-reduced-motion: reduce) {
        #cin-loader *, #cin-loader *::after { animation: none !important; }
        #cin-loader .cin-ld-logo img { clip-path: none; }
        #cin-loader .cin-ld-dots, #cin-loader .cin-ld-shine { display: none; }
    }
</style>
<script>
    (function () {
        var el = document.getElementById('cin-loader');
        if (!el) return;
        var img = el.querySelector('.cin-ld-logo img'), bar = el.querySelector('.cin-ld-bar i'), pctEl = el.querySelector('.cin-ld-pct');
        var SHOW = 2000; // tiempo mínimo que se ve el logo
        var t0 = Date.now(), loaded = false, done = false, ready = false, readyAt = 0, p = 0;

        // Partículas con los colores de la temporada
        var dots = el.querySelector('.cin-ld-dots'), html = '';
        for (var k = 0; k < 22; k++) {
            html += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;--s:' + (1.5 + Math.random() * 3).toFixed(1) + 'px;--c:var(--ld-' + (k % 2 ? 'a' : 'b') +
                ');--d:' + (5 + Math.random() * 6).toFixed(1) + 's;--w:' + (-Math.random() * 8).toFixed(1) + 's;--x:' + ((Math.random() - .5) * 120).toFixed(0) + 'px"></i>';
        }
        dots.innerHTML = html;

        // El logo aparece cuando ya está recoloreado con la temporada (o al cargar, si no hay temporada), sin saltos de color.
        function setReady() {
            if (ready) return;
            ready = true; readyAt = Date.now();
            el.classList.add('cin-ld-ready');
        }
        function check() {
            if (img.getAttribute('data-season-logo')) return setReady();
            if (!document.documentElement.hasAttribute('data-season-colors') && Date.now() - t0 > 700 && img.complete && img.naturalWidth) setReady();
        }
        if (window.MutationObserver) new MutationObserver(check).observe(img, { attributes: true, attributeFilter: ['data-season-logo', 'src'] });
        setTimeout(setReady, 1500);

        // Progreso: avanza poco a poco hasta ~90% mientras carga; al terminar llega a 100% y se cierra.
        function tick() {
            if (!ready) check();
            var target = loaded && ready && Date.now() - readyAt > SHOW - 500 ? 100 : 92;
            var speed = target === 100 ? .14 : (ready ? .022 : .01);
            p += (target - p) * speed;
            if (target === 100 && p > 99.5) p = 100;
            bar.style.setProperty('--p', (p / 100).toFixed(4));
            pctEl.textContent = Math.round(p) + '%';
            if (p === 100) return finish();
            requestAnimationFrame(tick);
        }
        function finish() {
            if (done) return;
            done = true;
            setTimeout(function () {
                el.classList.add('cin-ld-out');
                setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 750);
            }, 250);
        }
        requestAnimationFrame(tick);
        if (document.readyState === 'complete') loaded = true;
        else window.addEventListener('load', function () { loaded = true; });
        setTimeout(function () { setReady(); loaded = true; }, 6000);
        setTimeout(finish, 9000); // nunca bloquea la web si algo tarda en cargar
    })();
</script>
