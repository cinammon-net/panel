@unless (config('panel.demo') || ! config('services.billing.url'))
    <!-- Ambientación de temporada / festivos: el navegador la pide al billing (país vía Cloudflare) -->
    <script>window.__SEASON_URL__ = @json(rtrim(config('services.billing.url'), '/').'/api/season');</script>
    <script src="/season/season.js?v=6" defer></script>
@endunless
