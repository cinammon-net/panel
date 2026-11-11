<x-mail::message>
# Hola, {{ $user->name }}

Tu cuenta en **Cinammon Network** ya está lista. Desde el panel puedes crear y gestionar tus servidores de juego, bots y webs.

<x-mail::button :url="route('servers.index')">
Ir al panel
</x-mail::button>

**Para empezar:**

- Consigue un servidor gratuito con monedas en la [tienda](https://billing.cinammon.net/coins).
- Mira los planes de pago en [billing.cinammon.net](https://billing.cinammon.net).
- Si necesitas ayuda, abre un [ticket de soporte]({{ route('tickets.index') }}) o responde a este correo.

Un saludo,<br>
El equipo de Cinammon Network
</x-mail::message>
