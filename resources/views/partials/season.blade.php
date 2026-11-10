@php
    // La demo no tiene billing propio: para la ambientación usa la API pública (solo lectura) del billing real.
    $seasonBilling = config('services.billing.url') ?: (config('panel.demo') ? 'https://billing.cinammon.net' : null);
@endphp
@if ($seasonBilling)
    <!-- Ambientación de temporada / festivos: el navegador la pide al billing (país vía Cloudflare) -->
    <script>window.__SEASON_URL__ = @json(rtrim($seasonBilling, '/').'/api/season');</script>
    <script src="/season/season.js?v=8" defer></script>
@endif
