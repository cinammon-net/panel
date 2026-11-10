<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark'=> ($appearance ?? 'system') == 'dark'])>

<head>
    <!-- 📄 Meta básico -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    
    <meta name="description" content="Cinammon.net — Plataforma moderna de alto rendimiento para el despliegue, gestión y orquestación de servidores de juegos en la nube. Panel intuitivo, daemon Wings, protección Anti-DDoS y hardware de última generación.">
    <meta name="keywords" content="Cinammon, hosting de servidores, servidores de juegos, panel de control, cloud gaming, Minecraft hosting, Wings daemon, nodos, bases de datos">
    <meta name="author" content="Cinammon Team">
    <meta name="theme-color" content="#0a0a0a">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Cinammon">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="msapplication-TileColor" content="#ff44cc">
    <meta name="msapplication-TileImage" content="/favicon.ico">

    <!-- 🌐 Open Graph (Discord, WhatsApp, Facebook, etc.) -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Cinammon.net">
    <meta property="og:locale" content="{{ str_replace('_', '-', app()->getLocale()) }}">
    <meta property="og:title" content="Cinammon.net — Tu red. Tu dominio. Tu juego.">
    <meta property="og:description" content="Despliega y administra tus servidores de juego con la mejor latencia, protección Anti-DDoS y panel de control en tiempo real.">
    <meta property="og:image" content="https://cinammon.net/favicon.ico">
    <meta property="og:image:alt" content="Logotipo de Cinammon">
    <meta property="og:url" content="https://cinammon.net">

    <!-- 🐦 Twitter Card -->
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="Cinammon.net — Tu red. Tu dominio. Tu juego.">
    <meta name="twitter:description" content="Plataforma de alto rendimiento para el despliegue y control de servidores de juegos en la nube.">
    <meta name="twitter:image" content="https://cinammon.net/favicon.ico">

    <!-- 🌙 Modo oscuro automático -->
    <script>
        (function() {
            const appearance = '{{ $appearance ?? "system" }}';
            if (appearance === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (prefersDark) {
                    document.documentElement.classList.add('dark');
                }
            }
        })();
    </script>

    <!-- 🎨 Estilo de fondo -->
    <style>
        html {
            background-color: oklch(1 0 0);
        }

        html.dark {
            background-color: oklch(0.145 0 0);
        }
    </style>

    <!-- 🏷️ Título -->
    <title inertia>{{ config('app.name', 'Cinammon') }}</title>

    <!-- 🖼️ Iconos -->
    @php
        // Logo según el subdominio (cinammon.panel, .demo, .store, .billing); el dominio principal usa el original (.net).
        $cinSub = explode('.', request()->getHost())[0];
        $cinLogo = in_array($cinSub, ['panel', 'demo', 'store', 'billing'], true) ? "/logos/cinammon-{$cinSub}.png" : '/favicon.ico';
    @endphp
    <link rel="icon" href="{{ $cinLogo }}" sizes="any">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">

    <!-- 🔤 Fuente Orbitron -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet">

    <!-- 🔗 Laravel + Inertia + React -->
    @routes
    @viteReactRefresh
    @vite('resources/js/app.tsx')
    @inertiaHead
    @include('partials.season')
</head>

<body class="font-sans antialiased">
    @include('partials.loader', ['a' => 'var(--color-pink-500, #ec4899)', 'b' => 'var(--color-cyan-400, #22d3ee)', 'logo' => $cinLogo])
    @inertia
</body>

</html>