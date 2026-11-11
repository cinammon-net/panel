<x-mail::message>
# ¡Feliz cumpleaños, {{ $user->name }}!

Hoy es tu día y en Cinammon queríamos ser de los primeros en decírtelo. Gracias por estar con nosotros otro año más.

@if ($gifts && ($gifts['store'] ?? false))
## Tu set de regalo

<x-mail::panel>
**{{ $gifts['coins'] ?? 0 }} monedas** ya están en tu saldo. Úsalas para un servidor gratis o para alargarlo.

**{{ $gifts['discount'] ?? 0 }}% de descuento** en tu próximo pedido de la tienda, durante {{ $gifts['discount_days'] ?? 7 }} días. Se aplica solo al pedir.

@if (! empty($gifts['extended']))
**+{{ $gifts['extra_days'] ?? 3 }} días gratis** en {{ count($gifts['extended']) === 1 ? 'tu servicio' : 'tus servicios' }}: {{ implode(', ', $gifts['extended']) }}.
@endif

**Rol de Cumpleañero** en el Discord durante todo el día, con tu felicitación en el canal general.
</x-mail::panel>

<x-mail::button :url="$storeUrl.'/store'">
Usar mi descuento
</x-mail::button>
@elseif ($gifts && ! ($gifts['store'] ?? false))
Tu regalo de la tienda va asociado a una cuenta en {{ $storeUrl }} con este mismo correo, y todavía no tienes una. Hoy tienes el **rol de Cumpleañero** en Discord y la felicitación de toda la comunidad.
@else
{{ $reason }}

Hoy tienes igualmente el **rol de Cumpleañero** en Discord y la felicitación de toda la comunidad.
@endif

Esta noche te mandaremos otra carta con todas las felicitaciones que te deje la comunidad en Discord.

<x-mail::button :url="route('dashboard')" color="success">
Abrir mi sorpresa en el panel
</x-mail::button>

Que lo pases genial,<br>
El equipo de Cinammon Network
</x-mail::message>
