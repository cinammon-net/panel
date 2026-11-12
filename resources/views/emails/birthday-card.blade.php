<x-mail::message kicker="Cumpleaños">
# Tu tarjeta de cumpleaños

{{ $user->name }}, hoy {{ count($wishes) === 1 ? 'una persona de la comunidad se ha acordado' : count($wishes).' personas de la comunidad se han acordado' }} de ti en Discord. Aquí tienes sus firmas:

<x-mail::panel>
{{ implode(' · ', array_slice($wishes, 0, 80)) }}@if (count($wishes) > 80) y {{ count($wishes) - 80 }} más @endif
</x-mail::panel>

Esperamos que hayas tenido un gran día. ¡Nos vemos el año que viene!

<x-mail::button :url="route('dashboard')">
Ir al panel
</x-mail::button>

Un abrazo,<br>
El equipo de Cinammon Network
</x-mail::message>
