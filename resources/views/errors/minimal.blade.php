@php
    $rawCode = trim($__env->yieldContent('code', isset($exception) && method_exists($exception, 'getStatusCode') ? (string) $exception->getStatusCode() : '500'));
    $statusCode = $rawCode !== '' ? $rawCode : '500';

    $meta = [
        '400' => ['title' => 'Solicitud incorrecta', 'subtitle' => 'La petición no es válida o faltan datos necesarios para procesarla.', 'icon' => 'alert'],
        '401' => ['title' => 'Sesión necesaria', 'subtitle' => 'Necesitas iniciar sesión para acceder a esta sección.', 'icon' => 'lock'],
        '402' => ['title' => 'Pago requerido', 'subtitle' => 'Es necesario activar un plan o completar el pago para continuar.', 'icon' => 'card'],
        '403' => ['title' => 'Acceso denegado', 'subtitle' => 'No tienes permisos para ver o modificar esta sección.', 'icon' => 'lock'],
        '404' => ['title' => 'Página no encontrada', 'subtitle' => 'No encontramos la ruta que buscas o ha cambiado de ubicación.', 'icon' => 'compass'],
        '405' => ['title' => 'Método no permitido', 'subtitle' => 'La acción solicitada no está permitida en esta dirección.', 'icon' => 'alert'],
        '419' => ['title' => 'Sesión caducada', 'subtitle' => 'Tu formulario ha caducado por seguridad. Recarga la página e inténtalo de nuevo.', 'icon' => 'clock'],
        '422' => ['title' => 'Datos no válidos', 'subtitle' => 'Algunos de los datos enviados no pasaron la validación.', 'icon' => 'alert'],
        '423' => ['title' => 'Recurso bloqueado', 'subtitle' => 'Este recurso está protegido o bloqueado temporalmente.', 'icon' => 'lock'],
        '429' => ['title' => 'Demasiadas peticiones', 'subtitle' => 'Has enviado muchas solicitudes seguidas. Espera unos segundos antes de reintentar.', 'icon' => 'clock'],
        '500' => ['title' => 'Error interno del servidor', 'subtitle' => 'Ha ocurrido un problema inesperado en el servidor. Inténtalo de nuevo en unos instantes.', 'icon' => 'server'],
        '502' => ['title' => 'Puerta de enlace incorrecta', 'subtitle' => 'Un servicio interno tardó demasiado o devolvió una respuesta no válida.', 'icon' => 'server'],
        '503' => ['title' => 'Servicio en mantenimiento', 'subtitle' => 'Estamos aplicando mejoras en el sistema. Volveremos a estar disponibles enseguida.', 'icon' => 'wrench'],
        '504' => ['title' => 'Tiempo de espera agotado', 'subtitle' => 'El servidor tardó demasiado en responder. Vuelve a intentarlo en unos segundos.', 'icon' => 'clock'],
    ];

    $info = $meta[$statusCode] ?? ['title' => 'Algo salió mal', 'subtitle' => 'No pudimos completar tu solicitud en este momento.', 'icon' => 'alert'];

    $rawMessage = isset($exception) ? trim((string) $exception->getMessage()) : trim($__env->yieldContent('message', ''));
    $generic = ['Forbidden', 'Not Found', 'Unauthorized', 'Page Expired', 'Too Many Requests', 'Server Error', 'Service Unavailable', 'Payment Required', 'Bad Request', 'Method Not Allowed', 'Locked'];
    $detail = ($rawMessage !== '' && ! in_array($rawMessage, $generic, true)) ? $rawMessage : null;

    $reqPath = parse_url(request()->fullUrl(), PHP_URL_PATH) ?: '/';
    $isReload = in_array($statusCode, ['419', '500', '502', '503', '504'], true);
    $isAuth = $statusCode === '401';
@endphp
<!DOCTYPE html>
<html lang="es">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{{ $statusCode }} · {{ $info['title'] }} — Cinammon</title>

        @include('partials.favicon')

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />

        <style>
            :root {
                --err-hue: 350;
                --err-accent: oklch(0.79 0.16 var(--err-hue));
                --err-accent-strong: oklch(0.72 0.17 var(--err-hue));
                --err-soft: oklch(0.79 0.16 var(--err-hue) / 0.12);
                --err-border: oklch(0.79 0.16 var(--err-hue) / 0.34);
                --err-glow: oklch(0.79 0.16 var(--err-hue) / 0.18);
                --err-surface: rgba(14, 14, 18, 0.92);
            }

            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }

            body {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                background-color: #08080a;
                background-image:
                    radial-gradient(640px circle at 50% 18%, var(--err-glow), transparent 70%),
                    radial-gradient(rgba(255, 255, 255, 0.045) 1px, transparent 1px);
                background-size: auto, 22px 22px;
                color: #f4f4f5;
                font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
                -webkit-font-smoothing: antialiased;
            }

            .card {
                position: relative;
                width: 100%;
                max-width: 540px;
                overflow: hidden;
                border-radius: 18px;
                border: 1px solid var(--err-border);
                background: var(--err-surface);
                padding: 36px 30px 30px;
                text-align: center;
                box-shadow: 0 24px 70px rgba(0, 0, 0, 0.72), 0 0 42px var(--err-glow);
                backdrop-filter: blur(12px);
                animation: riseIn 0.35s ease-out;
            }

            .card::before {
                content: '';
                position: absolute;
                inset: 0 0 auto 0;
                height: 2px;
                background: linear-gradient(90deg, transparent, var(--err-accent), transparent);
            }

            .icon-ring {
                width: 64px;
                height: 64px;
                margin: 0 auto 18px;
                border-radius: 9999px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--err-border);
                background: var(--err-soft);
                color: var(--err-accent);
                box-shadow: 0 0 24px var(--err-glow);
            }

            .status-pill {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 4px 12px;
                border-radius: 9999px;
                border: 1px solid var(--err-border);
                background: var(--err-soft);
                color: var(--err-accent);
                font-family: 'Orbitron', sans-serif;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
            }

            .code {
                margin-top: 12px;
                font-family: 'Orbitron', sans-serif;
                font-size: clamp(50px, 10vw, 72px);
                font-weight: 800;
                line-height: 1;
                letter-spacing: 0.06em;
                color: var(--err-accent);
                text-shadow: 0 0 28px var(--err-glow);
            }

            h1 {
                margin-top: 10px;
                font-family: 'Orbitron', sans-serif;
                font-size: clamp(18px, 3.6vw, 23px);
                font-weight: 700;
                color: #ffffff;
                letter-spacing: 0.02em;
            }

            .subtitle {
                margin: 10px auto 0;
                max-width: 430px;
                font-size: 14px;
                line-height: 1.55;
                color: #a1a1aa;
            }

            .detail {
                margin: 16px auto 0;
                padding: 10px 14px;
                border-radius: 10px;
                border: 1px solid var(--err-border);
                background: rgba(255, 255, 255, 0.025);
                font-size: 13px;
                line-height: 1.45;
                color: #e4e4e7;
                word-break: break-word;
            }

            .path-badge {
                display: inline-block;
                margin-top: 14px;
                max-width: 100%;
                padding: 4px 10px;
                border-radius: 6px;
                border: 1px solid rgba(255, 255, 255, 0.08);
                background: rgba(255, 255, 255, 0.03);
                font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                font-size: 11.5px;
                color: #a1a1aa;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .actions {
                margin-top: 24px;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: 10px;
            }

            .btn {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 7px;
                padding: 10px 18px;
                border-radius: 9px;
                font-size: 13px;
                font-weight: 600;
                text-decoration: none;
                cursor: pointer;
                border: 1px solid transparent;
                transition: transform 0.15s ease, filter 0.15s ease, border-color 0.15s ease, background-color 0.15s ease;
            }

            .btn:hover {
                transform: translateY(-1px);
            }

            .btn-primary {
                background: var(--err-accent);
                color: #09090b;
                box-shadow: 0 6px 20px var(--err-glow);
            }

            .btn-primary:hover {
                filter: brightness(1.07);
            }

            .btn-ghost {
                border-color: rgba(255, 255, 255, 0.14);
                background: rgba(255, 255, 255, 0.04);
                color: #e4e4e7;
            }

            .btn-ghost:hover {
                border-color: var(--err-border);
                background: var(--err-soft);
                color: #ffffff;
            }

            @keyframes riseIn {
                from {
                    opacity: 0;
                    transform: translateY(8px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @media (max-width: 480px) {
                .card {
                    padding: 28px 20px 24px;
                }
                .actions {
                    flex-direction: column;
                }
                .btn {
                    width: 100%;
                }
            }
        </style>

        <script>
            (function () {
                var HUES = {
                    christmas: 25,
                    new_years_eve: 85,
                    new_year: 85,
                    reyes: 85,
                    valentine: 350,
                    carnival: 330,
                    easter: 340,
                    halloween: 50,
                    muertos: 55,
                    thanksgiving: 45,
                    black_friday: 85,
                    gamer_day: 145,
                    star_wars: 25,
                    book_day: 20,
                    san_juan: 45,
                    winter: 275,
                    spring: 150,
                    summer: 75,
                    autumn: 48
                };

                function applyHue(h) {
                    if (h == null || isNaN(Number(h))) return;
                    document.documentElement.style.setProperty('--err-hue', String(h));
                }

                function applyAccent(color) {
                    if (!color) return;
                    var root = document.documentElement.style;
                    root.setProperty('--err-accent', color);
                    root.setProperty('--err-accent-strong', color);
                    root.setProperty('--err-soft', 'color-mix(in oklab, ' + color + ' 13%, transparent)');
                    root.setProperty('--err-border', 'color-mix(in oklab, ' + color + ' 36%, transparent)');
                    root.setProperty('--err-glow', 'color-mix(in oklab, ' + color + ' 20%, transparent)');
                }

                function applyContext(ctx) {
                    if (!ctx) return false;
                    var key = (ctx.holiday && ctx.holiday.key) || (ctx.season && ctx.season.key);
                    if (key && HUES[key] != null) {
                        applyHue(HUES[key]);
                        return true;
                    }
                    return false;
                }

                // 1) Si viene dentro del modal iframe de Inertia, heredar al instante del documento padre.
                var applied = false;
                try {
                    if (window.top && window.top !== window.self) {
                        if (window.top.__SEASON__) {
                            applied = applyContext(window.top.__SEASON__);
                        }
                        if (!applied) {
                            var parentStyles = getComputedStyle(window.top.document.documentElement);
                            var parentAccent = parentStyles.getPropertyValue('--color-pink-400').trim() || parentStyles.getPropertyValue('--tw-c-pink-400').trim();
                            var oklchMatch = parentAccent.match(/oklch\([^)]+\s+([\d.]+)\)/i);
                            if (oklchMatch) {
                                applyHue(oklchMatch[1]);
                                applied = true;
                            } else if (parentAccent && CSS && CSS.supports && CSS.supports('color', 'color-mix(in oklab, red 50%, transparent)')) {
                                applyAccent(parentAccent);
                                applied = true;
                            }
                        }
                    }
                } catch (e) {}

                // 2) Cache local de sesion (compartida con season.js).
                if (!applied) {
                    try {
                        var cached = JSON.parse(sessionStorage.getItem('cin-season-ctx') || 'null');
                        if (cached && cached.v) applied = applyContext(cached.v);
                    } catch (e) {}
                }

                // 3) Si aun no se conocia (visita directa a error), consultar al endpoint publico de temporada.
                if (!applied) {
                    var url = @json(($seasonUrl = config('services.billing.url') ?: (config('panel.demo') ? 'https://billing.cinammon.net' : null)) ? rtrim($seasonUrl, '/').'/api/season' : null);
                    if (url) {
                        fetch(url, { credentials: 'omit' })
                            .then(function (r) { return r.ok ? r.json() : null; })
                            .then(function (v) {
                                if (!v) return;
                                try { sessionStorage.setItem('cin-season-ctx', JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
                                applyContext(v);
                            })
                            .catch(function () {});
                    }
                }
            })();
        </script>

        <script>
            window.__SEASON_COLORS_ONLY__ = true;
        </script>
        @include('partials.season')
    </head>
    <body>
        <main class="card" role="alert">
            <div class="icon-ring" aria-hidden="true">
                @switch($info['icon'])
                    @case('lock')
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        @break
                    @case('compass')
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
                        @break
                    @case('clock')
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        @break
                    @case('server')
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
                        @break
                    @case('wrench')
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                        @break
                    @case('card')
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
                        @break
                    @default
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                @endswitch
            </div>

            <span class="status-pill">Cinammon Network · HTTP {{ $statusCode }}</span>
            <div class="code">{{ $statusCode }}</div>
            <h1>{{ $info['title'] }}</h1>
            <p class="subtitle">{{ $info['subtitle'] }}</p>

            @if ($detail)
                <div class="detail">{{ $detail }}</div>
            @endif

            <div class="path-badge" title="{{ request()->fullUrl() }}">{{ $reqPath }}</div>

            <div class="actions">
                <button type="button" class="btn btn-ghost" onclick="if (window.top !== window.self) { window.top.history.back(); } else if (history.length > 1) { history.back(); } else { window.location.href = '/'; }">
                    Volver atrás
                </button>

                @if ($isAuth)
                    <a href="/login" target="_top" class="btn btn-primary">Iniciar sesión</a>
                @elseif ($isReload)
                    <button type="button" class="btn btn-primary" onclick="window.top ? window.top.location.reload() : window.location.reload()">Reintentar</button>
                @else
                    <a href="/" target="_top" class="btn btn-primary">Volver al inicio</a>
                @endif
            </div>
        </main>
    </body>
</html>
