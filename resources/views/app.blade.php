<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark'=> ($appearance ?? 'system') == 'dark'])>

<head>
    <!-- 📄 Meta básico -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="description" content="Cinammon es una moderna plataforma open-source y autoalojada diseñada para comunidades que buscan una alternativa sólida, privada y personalizable a Discord. Con herramientas avanzadas de comunicación, gestión de usuarios y total control sobre tus datos, Cinammon te ofrece todo lo que necesitas para construir tu propia comunidad sin depender de servicios centralizados.">
    <meta name="keywords" content="Cinammon, autoalojado, open-source, alternativa a Discord, plataforma de comunidades, chat moderno, privacidad, servidor propio">
    <meta name="author" content="Cinammon Team">
    <meta name="theme-color" content="#ffffff">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="Cinammon">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="msapplication-TileColor" content="#ffffff">
    <meta name="msapplication-TileImage" content="/mstile-150x150.png">

    <!-- 🌐 Open Graph (Discord, WhatsApp, Facebook) -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Cinammon">
    <meta property="og:locale" content="{{ str_replace('_', '-', app()->getLocale()) }}">
    <meta property="og:title" content="Cinammon – Plataforma moderna y autoalojada para comunidades">
    <meta property="og:description" content="Cinammon es una moderna plataforma open-source y autoalojada diseñada para comunidades que buscan una alternativa sólida, privada y personalizable a Discord. Con herramientas avanzadas de comunicación, gestión de usuarios y total control sobre tus datos, Cinammon te ofrece todo lo que necesitas para construir tu propia comunidad sin depender de servicios centralizados.">
    <meta property="og:image" content="https://cinammon.net/assets/preview.png"> 
    <meta property="og:image:alt" content="Logo de Cinammon">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="https://cinammon.net/">

    <!-- 💬 Discord Tags (extra, no obligatorios) -->
    <meta name="discord:title" content="Cinammon – Plataforma moderna y autoalojada para comunidades">
    <meta name="discord:description" content="Cinammon es una moderna plataforma open-source y autoalojada diseñada para comunidades que buscan una alternativa sólida, privada y personalizable a Discord. Con herramientas avanzadas de comunicación, gestión de usuarios y total control sobre tus datos, Cinammon te ofrece todo lo que necesitas para construir tu propia comunidad sin depender de servicios centralizados.">
    <meta name="discord:image" content="https://cinammon.net/assets/preview.png">
    <meta name="discord:site_name" content="Cinammon">
    <meta name="discord:creator" content="@Cinammon">
    <meta name="discord:locale" content="{{ str_replace('_', '-', app()->getLocale()) }}">

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
    <link rel="icon" href="/favicon.ico" sizes="any">
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
</head>

<body class="font-sans antialiased">
    @inertia
</body>

</html>