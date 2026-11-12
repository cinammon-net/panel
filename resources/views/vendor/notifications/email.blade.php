{{-- Notificaciones con MailMessage (p. ej. restablecer contraseña), con el diseño de Cinammon y en español. --}}
<x-mail::message kicker="Tu cuenta">
{{-- Saludo --}}
@if (! empty($greeting))
# {{ $greeting }}
@elseif ($level === 'error')
# Vaya
@else
# Hola
@endif

{{-- Texto antes del botón --}}
@foreach ($introLines as $line)
{{ $line }}

@endforeach

{{-- Botón --}}
@isset($actionText)
<x-mail::button :url="$actionUrl">
{{ $actionText }}
</x-mail::button>
@endisset

{{-- Texto después del botón --}}
@foreach ($outroLines as $line)
{{ $line }}

@endforeach

{{-- Despedida --}}
@if (! empty($salutation))
{{ $salutation }}
@else
El equipo de Cinammon Network
@endif

{{-- Enlace por si el botón no funciona --}}
@isset($actionText)
<x-slot:subcopy>
Si el botón «{{ $actionText }}» no funciona, copia este enlace en tu navegador: <span class="break-all">[{{ $displayableActionUrl }}]({{ $actionUrl }})</span>
</x-slot:subcopy>
@endisset
</x-mail::message>
