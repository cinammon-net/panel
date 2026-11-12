<x-mail::message kicker="Bienvenida">
# Hola, {{ $user->name }}

Tu cuenta en **Cinammon Network** ya está lista. Desde el panel creas y gestionas tus servidores de juego, bots y webs.

<x-mail::button :url="route('servers.index')">
Ir al panel
</x-mail::button>

## Para empezar

- **Servidor gratis:** consigue monedas jugando y canjéalas en la [tienda](https://store.cinammon.net/coins).
- **Planes de pago:** míralos en [store.cinammon.net](https://store.cinammon.net/store).
- **Guías en vídeo:** paso a paso en el [panel]({{ url('/guias') }}).
- **Ayuda:** abre un [ticket de soporte]({{ route('tickets.index') }}) o responde a este correo.

Un saludo,<br>
El equipo de Cinammon Network
</x-mail::message>
