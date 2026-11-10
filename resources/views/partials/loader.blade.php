{{-- Pantalla de carga al abrir/recargar la página (no en la navegación interna de Inertia).
     Colores: los de acento de la web, así sigue la temporada. Mismo archivo en panel y billing. --}}
<div id="cin-loader" role="status" aria-label="Cargando" style="--ld-a: {{ $a ?? '#ec4899' }}; --ld-b: {{ $b ?? '#22d3ee' }}">
    <div class="cin-ld-box">
        <svg class="cin-ld-mark" viewBox="0 0 100 100" width="76" height="76" aria-hidden="true">
            <defs>
                <linearGradient id="cin-ld-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" style="stop-color: var(--ld-a)" />
                    <stop offset="1" style="stop-color: var(--ld-b)" />
                </linearGradient>
            </defs>
            <path class="cin-ld-core" fill="url(#cin-ld-grad)" fill-rule="evenodd" d="M50 5L90 30V70L50 95L10 70V30L50 5Z M50 20L25 35V65L50 80L75 65V35L50 20Z" />
            <path class="cin-ld-trace" fill="none" stroke="url(#cin-ld-grad)" stroke-width="2.5" stroke-linejoin="round" d="M50 5L90 30V70L50 95L10 70V30Z" />
        </svg>
        <span class="cin-ld-name">CINAMMON</span>
        <span class="cin-ld-bar"><i></i></span>
    </div>
</div>
<noscript><style>#cin-loader{display:none}</style></noscript>
<style>
    #cin-loader { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; background: #05060a; transition: opacity .45s ease, visibility .45s ease; }
    #cin-loader.cin-ld-out { opacity: 0; visibility: hidden; }
    #cin-loader .cin-ld-box { display: flex; flex-direction: column; align-items: center; gap: 16px; animation: cin-ld-in .35s ease-out both; }
    #cin-loader .cin-ld-mark { overflow: visible; filter: drop-shadow(0 0 14px color-mix(in oklab, var(--ld-a) 55%, transparent)); }
    #cin-loader .cin-ld-core { opacity: .9; transform-origin: 50% 50%; animation: cin-ld-pulse 1.6s ease-in-out infinite; }
    #cin-loader .cin-ld-trace { stroke-dasharray: 70 200; animation: cin-ld-trace 1.4s linear infinite; }
    #cin-loader .cin-ld-name { font: 600 11px/1 Orbitron, ui-sans-serif, system-ui, sans-serif; letter-spacing: .5em; padding-left: .5em; color: #a3a3a3; }
    #cin-loader .cin-ld-bar { position: relative; width: 150px; height: 2px; overflow: hidden; border-radius: 2px; background: rgba(255, 255, 255, .08); }
    #cin-loader .cin-ld-bar i { position: absolute; inset: 0 auto 0 0; width: 40%; border-radius: 2px; background: linear-gradient(90deg, var(--ld-a), var(--ld-b)); animation: cin-ld-bar 1.1s ease-in-out infinite; }
    @keyframes cin-ld-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
    @keyframes cin-ld-pulse { 0%, 100% { transform: scale(.94); opacity: .75; } 50% { transform: scale(1); opacity: 1; } }
    @keyframes cin-ld-trace { to { stroke-dashoffset: -270; } }
    @keyframes cin-ld-bar { 0% { transform: translateX(-110%); } 100% { transform: translateX(260%); } }
    @media (prefers-reduced-motion: reduce) {
        #cin-loader .cin-ld-core, #cin-loader .cin-ld-trace, #cin-loader .cin-ld-bar i, #cin-loader .cin-ld-box { animation: none; }
    }
</style>
<script>
    (function () {
        var el = document.getElementById('cin-loader');
        if (!el) return;
        var t0 = Date.now(), done = false;
        function hide() {
            if (done) return;
            done = true;
            // Un mínimo corto para que no "parpadee" en cargas muy rápidas.
            setTimeout(function () {
                el.classList.add('cin-ld-out');
                setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
            }, Math.max(0, 350 - (Date.now() - t0)));
        }
        if (document.readyState === 'complete') hide();
        else window.addEventListener('load', hide);
        setTimeout(hide, 4000); // nunca bloquea la web si algo tarda en cargar
    })();
</script>
