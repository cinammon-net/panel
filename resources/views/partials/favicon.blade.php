@php
    // Favicon de cada subdominio (cinammon.panel, .demo, .store, .billing; el dominio principal usa .net),
    // ya coloreado con la temporada/festivo del visitante (lo genera el billing según el país).
    // En *.cinammon.net se sirve desde el mismo origen (/season-favicon.png) para que Safari y Chrome lo muestren igual.
    $favSub = explode('.', request()->getHost())[0];
    $favKnown = in_array($favSub, ['panel', 'demo', 'store', 'billing'], true);
    $favBase = config('services.billing.url') ?: (config('panel.demo') ? 'https://billing.cinammon.net' : null);
    $favVer = 'v=bf2&d='.now()->format('Ymd');
    $favHref = str_ends_with(request()->getHost(), 'cinammon.net')
        ? "/season-favicon.png?{$favVer}"
        : ($favBase ? rtrim($favBase, '/').'/api/season-favicon/'.($favKnown ? $favSub : 'net').".png?{$favVer}" : ($favKnown ? "/logos/cinammon-{$favSub}.png" : '/favicon.ico'));
@endphp
<link rel="icon" type="image/png" href="{{ $favHref }}">
<link rel="shortcut icon" type="image/png" href="{{ $favHref }}">
<link rel="apple-touch-icon" href="{{ $favHref }}">
