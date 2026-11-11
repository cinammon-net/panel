@php
    // Página a la que lleva el botón "Copiar enlace" del bot: Discord no deja copiar al portapapeles,
    // la web sí. El código es una invitación pública de Discord (solo letras, números y guiones).
    $url = 'https://discord.gg/'.$code;
@endphp
<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="robots" content="noindex, nofollow" />
        <title>Tu invitación · Cinammon</title>

        @include('partials.favicon')

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

        <style>
            :root {
                --accent: oklch(0.72 0.2 350);
                --accent-soft: oklch(0.72 0.2 350 / 0.12);
                --accent-border: oklch(0.72 0.2 350 / 0.38);
                --glow: oklch(0.72 0.2 350 / 0.2);
                --ok: oklch(0.78 0.17 160);
            }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px 16px;
                background-color: #08080a;
                background-image:
                    radial-gradient(640px circle at 50% 18%, var(--glow), transparent 70%),
                    radial-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px);
                background-size: auto, 22px 22px;
                color: #f4f4f5;
                font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
                -webkit-font-smoothing: antialiased;
            }
            .card {
                position: relative;
                width: 100%;
                max-width: 480px;
                overflow: hidden;
                border-radius: 18px;
                border: 1px solid var(--accent-border);
                background: rgba(14, 14, 18, 0.92);
                padding: 34px 26px 28px;
                text-align: center;
                box-shadow: 0 24px 70px rgba(0, 0, 0, 0.72), 0 0 42px var(--glow);
            }
            .card::before {
                content: '';
                position: absolute;
                inset: 0 0 auto 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, var(--accent), transparent);
            }
            .icon {
                width: 60px; height: 60px; margin: 0 auto 16px;
                border-radius: 9999px;
                display: flex; align-items: center; justify-content: center;
                border: 1px solid var(--accent-border);
                background: var(--accent-soft);
                color: var(--accent);
                box-shadow: 0 0 24px var(--glow);
            }
            h1 { font-family: 'Orbitron', sans-serif; font-size: 21px; letter-spacing: 0.04em; margin-bottom: 8px; }
            p.sub { color: #a1a1aa; font-size: 14px; line-height: 1.55; margin-bottom: 22px; }
            .link {
                display: block;
                width: 100%;
                padding: 14px 16px;
                border-radius: 12px;
                border: 1px dashed var(--accent-border);
                background: rgba(255, 255, 255, 0.03);
                color: #f4f4f5;
                font: 600 16px ui-monospace, SFMono-Regular, Menlo, monospace;
                text-align: center;
                word-break: break-all;
                user-select: all;
                -webkit-user-select: all;
                margin-bottom: 16px;
            }
            .actions { display: flex; gap: 10px; }
            button {
                flex: 1;
                display: inline-flex; align-items: center; justify-content: center; gap: 8px;
                padding: 14px 18px;
                border-radius: 12px;
                border: 1px solid transparent;
                font: 700 15px 'Plus Jakarta Sans', sans-serif;
                cursor: pointer;
                transition: transform 0.12s ease, background 0.2s ease, border-color 0.2s ease;
            }
            button:active { transform: scale(0.98); }
            .primary { background: var(--accent); color: #0b0b0e; }
            .primary.done { background: var(--ok); }
            .secondary { background: transparent; color: #f4f4f5; border-color: rgba(255, 255, 255, 0.16); }
            .secondary[hidden] { display: none; }
            .status { min-height: 20px; margin-top: 14px; font-size: 13px; color: #a1a1aa; }
            .status.ok { color: var(--ok); }
            .foot { margin-top: 18px; font-size: 12px; color: #71717a; line-height: 1.5; }
        </style>
    </head>
    <body>
        <main class="card">
            <div class="icon" aria-hidden="true">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            </div>
            <h1>Tu invitación</h1>
            <p class="sub">Comparte este enlace al servidor de Discord de Cinammon. Cada persona que entre con él cuenta para ti.</p>

            <div class="link" id="link">{{ $url }}</div>

            <div class="actions">
                <button type="button" class="primary" id="copy">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    <span>Copiar</span>
                </button>
                <button type="button" class="secondary" id="share" hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
                    <span>Compartir</span>
                </button>
            </div>
            <div class="status" id="status" role="status" aria-live="polite"></div>

            <p class="foot">Si quien entra se crea cuenta en cinammon.net y la vincula, también es tu referido en la tienda y ganáis monedas los dos.</p>
        </main>

        <script>
            (function () {
                var url = @json($url);
                var btn = document.getElementById('copy');
                var label = btn.querySelector('span');
                var status = document.getElementById('status');

                function done(ok) {
                    if (ok) {
                        btn.classList.add('done');
                        label.textContent = 'Copiado';
                        status.className = 'status ok';
                        status.textContent = 'Enlace copiado. Ya puedes pegarlo donde quieras.';
                    } else {
                        status.className = 'status';
                        status.textContent = 'No se pudo copiar solo: mantén pulsado el enlace de arriba y cópialo.';
                        selectLink();
                    }
                }
                function selectLink() {
                    var range = document.createRange();
                    range.selectNodeContents(document.getElementById('link'));
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);
                }
                function legacyCopy() {
                    var ta = document.createElement('textarea');
                    ta.value = url;
                    ta.setAttribute('readonly', '');
                    ta.style.position = 'fixed';
                    ta.style.opacity = '0';
                    document.body.appendChild(ta);
                    ta.select();
                    var ok = false;
                    try { ok = document.execCommand('copy'); } catch (e) {}
                    document.body.removeChild(ta);
                    return ok;
                }
                function copy() {
                    if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(legacyCopy()); });
                    } else {
                        done(legacyCopy());
                    }
                }
                btn.addEventListener('click', copy);

                if (navigator.share) {
                    var share = document.getElementById('share');
                    share.hidden = false;
                    share.addEventListener('click', function () {
                        navigator.share({ title: 'Cinammon en Discord', text: 'Únete al servidor de Cinammon:', url: url }).catch(function () {});
                    });
                }

                // Algunos navegadores dejan copiar nada más abrir (vienes de pulsar un botón); si no, queda el botón.
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(url).then(function () { done(true); }, function () {});
                }
            })();
        </script>
    </body>
</html>
