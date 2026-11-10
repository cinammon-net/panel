{{-- Pantalla de carga al abrir/recargar la página (no en la navegación interna de Inertia).
     Muestra el logo de la web (season.js lo recolorea según la temporada). Mismo archivo en panel y billing. --}}
<div id="cin-loader" role="status" aria-label="Cargando" style="--ld-a: {{ $a ?? '#ec4899' }}; --ld-b: {{ $b ?? '#22d3ee' }}">
    <div class="cin-ld-box">
        <span class="cin-ld-logo">
            <img src="/favicon.ico" alt="Cinammon.net Logo" width="866" height="258" draggable="false" decoding="sync" fetchpriority="high" />
            <i class="cin-ld-shine" aria-hidden="true"></i>
        </span>
        <span class="cin-ld-bar"><i></i></span>
    </div>
</div>
<noscript><style>#cin-loader{display:none}</style></noscript>
<style>
    #cin-loader { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; background: #05060a; transition: opacity .6s ease, visibility .6s ease; }
    #cin-loader::before { content: ''; position: absolute; left: 50%; top: 50%; width: 520px; height: 320px; max-width: 90vw; transform: translate(-50%, -50%); background: radial-gradient(closest-side, color-mix(in oklab, var(--ld-a) 22%, transparent), transparent); opacity: 0; transition: opacity .6s ease; pointer-events: none; }
    #cin-loader.cin-ld-ready::before { opacity: 1; animation: cin-ld-glow 2.4s ease-in-out infinite; }
    #cin-loader.cin-ld-out { opacity: 0; visibility: hidden; }
    #cin-loader .cin-ld-box { position: relative; display: flex; flex-direction: column; align-items: center; gap: 26px; opacity: 0; }
    #cin-loader.cin-ld-ready .cin-ld-box { opacity: 1; animation: cin-ld-in .6s cubic-bezier(.2, .7, .2, 1) both; }
    #cin-loader .cin-ld-logo { position: relative; display: block; width: min(260px, 70vw); aspect-ratio: 866 / 258; animation: cin-ld-float 2.4s ease-in-out infinite; }
    #cin-loader .cin-ld-logo img { display: block; width: 100%; height: 100%; user-select: none; filter: drop-shadow(0 0 18px color-mix(in oklab, var(--ld-a) 45%, transparent)); }
    /* Brillo que recorre el logo (recortado con la forma del propio logo) */
    #cin-loader .cin-ld-shine { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(105deg, transparent 35%, rgba(255, 255, 255, .75) 50%, transparent 65%) no-repeat; background-size: 250% 100%; background-position: 150% 0; -webkit-mask: url(/favicon.ico) center / contain no-repeat; mask: url(/favicon.ico) center / contain no-repeat; mix-blend-mode: overlay; animation: cin-ld-shine 2.2s ease-in-out .3s infinite; }
    #cin-loader .cin-ld-bar { position: relative; width: min(200px, 55vw); height: 2px; overflow: hidden; border-radius: 2px; background: rgba(255, 255, 255, .08); }
    #cin-loader .cin-ld-bar i { position: absolute; inset: 0 auto 0 0; width: 40%; border-radius: 2px; background: linear-gradient(90deg, var(--ld-a), var(--ld-b)); animation: cin-ld-bar 1.3s ease-in-out infinite; }
    @keyframes cin-ld-in { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
    @keyframes cin-ld-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
    @keyframes cin-ld-glow { 0%, 100% { opacity: .7; } 50% { opacity: 1; } }
    @keyframes cin-ld-shine { 0% { background-position: 150% 0; } 60%, 100% { background-position: -50% 0; } }
    @keyframes cin-ld-bar { 0% { transform: translateX(-110%); } 100% { transform: translateX(260%); } }
    @media (prefers-reduced-motion: reduce) {
        #cin-loader .cin-ld-logo, #cin-loader .cin-ld-shine, #cin-loader .cin-ld-bar i, #cin-loader .cin-ld-box, #cin-loader::before { animation: none; }
        #cin-loader .cin-ld-shine { display: none; }
    }
</style>
<script>
    (function () {
        var el = document.getElementById('cin-loader');
        if (!el) return;
        var img = el.querySelector('img');
        var SHOW = 1800; // tiempo mínimo que se ve el logo
        var t0 = Date.now(), done = false, ready = false, readyAt = 0;
        // El logo aparece cuando ya está recoloreado con la temporada (o al cargar, si no hay temporada), sin saltos de color.
        function setReady() {
            if (ready) return;
            ready = true; readyAt = Date.now();
            el.classList.add('cin-ld-ready');
        }
        function check() {
            if (img.getAttribute('data-season-logo')) return setReady();
            // Sin temporada activa: el logo original vale en cuanto haya cargado.
            if (!document.documentElement.hasAttribute('data-season-colors') && Date.now() - t0 > 700 && img.complete && img.naturalWidth) setReady();
        }
        if (window.MutationObserver) new MutationObserver(check).observe(img, { attributes: true, attributeFilter: ['data-season-logo', 'src'] });
        var iv = setInterval(function () { check(); if (ready) clearInterval(iv); }, 100);
        setTimeout(setReady, 1500);
        function hide() {
            if (done) return;
            if (!ready) { setTimeout(hide, 100); return; }
            done = true;
            var wait = Math.max(0, readyAt + SHOW - Date.now());
            setTimeout(function () {
                el.classList.add('cin-ld-out');
                setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 650);
            }, wait);
        }
        if (document.readyState === 'complete') hide();
        else window.addEventListener('load', hide);
        setTimeout(function () { setReady(); hide(); }, 7000); // nunca bloquea la web si algo tarda en cargar
    })();
</script>
