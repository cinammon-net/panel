@php($__season = \App\Support\SeasonContext::forRequest(request()))
@if ($__season)
    <!-- Ambientación de temporada / festivos según el país del visitante -->
    <script>window.__SEASON__ = @json($__season);</script>
    <script src="/season/season.js?v=2" defer></script>
@endif
