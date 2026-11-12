<x-mail::message kicker="Mantenimiento">
# {{ $m->title }}

Vamos a realizar un mantenimiento en **Cinammon Network**.

- **Inicio:** {{ $m->starts_at->timezone(config('app.timezone'))->translatedFormat('l j \d\e F, H:i') }}
@if ($m->ends_at)
- **Fin previsto:** {{ $m->ends_at->timezone(config('app.timezone'))->translatedFormat('l j \d\e F, H:i') }}
@endif
- **Afecta a:** {{ $scopes }}

@if ($m->message)
{{ $m->message }}
@endif

@if ($m->block_access)
Durante el mantenimiento el panel no estará disponible.
@endif

Gracias por tu paciencia,<br>
El equipo de {{ config('app.name') }}
</x-mail::message>
