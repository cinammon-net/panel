@props(['kicker' => null])
<x-mail::layout :kicker="$kicker">
{{-- Cabecera --}}
<x-slot:header>
<x-mail::header :url="config('app.url')">
{{ config('app.name') }}
</x-mail::header>
</x-slot:header>

{{-- Cuerpo --}}
{{ $slot }}

{{-- Texto pequeño --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{{ $subcopy }}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Pie --}}
<x-slot:footer>
<x-mail::footer>
[Panel](https://panel.cinammon.net) &nbsp;·&nbsp; [Tienda](https://store.cinammon.net) &nbsp;·&nbsp; [Discord](https://discord.gg/U5EaDJerhZ) &nbsp;·&nbsp; [cinammon.net](https://cinammon.net)

Recibes este correo por tu cuenta en Cinammon Network. Si tienes cualquier duda, responde a este mensaje y te contestamos.
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
