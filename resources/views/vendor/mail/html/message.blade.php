<x-mail::layout>
{{-- Header --}}
<x-slot:header>
<x-mail::header :url="config('app.url')">
{{ config('app.name') }}
</x-mail::header>
</x-slot:header>

{{-- Body --}}
{{ $slot }}

{{-- Subcopy --}}
@isset($subcopy)
<x-slot:subcopy>
<x-mail::subcopy>
{{ $subcopy }}
</x-mail::subcopy>
</x-slot:subcopy>
@endisset

{{-- Footer --}}
<x-slot:footer>
<x-mail::footer>
Cinammon Network · [cinammon.net](https://cinammon.net) · [Panel](https://panel.cinammon.net) · [Tienda](https://billing.cinammon.net)

Recibes este correo por tu cuenta en Cinammon Network. Si tienes dudas, responde a este mensaje y te atenderemos.
</x-mail::footer>
</x-slot:footer>
</x-mail::layout>
