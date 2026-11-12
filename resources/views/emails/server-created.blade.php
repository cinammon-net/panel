<x-mail::message kicker="Servidor nuevo">
# Tu servidor está creado

Hola{{ $ownerName ? ', '.$ownerName : '' }}. Ya tienes **{{ $name }}** en tu cuenta de Cinammon Network. Se está instalando: en unos minutos lo podrás encender desde el panel.

<x-mail::table>
| Tipo | RAM | Disco | CPU |
|:-----|:----|:------|:----|
| {{ $type ?: 'Servidor' }} | {{ $ram }} | {{ $disk }} | {{ $cpu }} |
</x-mail::table>

@if ($address)
<x-mail::panel>
**Dirección:** {{ $address }}<br>
Es la que tiene que poner la gente para entrar (en Minecraft: Multijugador → Añadir servidor).
</x-mail::panel>
@endif

<x-mail::button :url="$url">
Abrir mi servidor
</x-mail::button>

¿Primera vez? Tienes las [guías en vídeo]({{ url('/guias') }}) paso a paso. Si algo no va bien, abre un [ticket de soporte]({{ url('/tickets') }}) o responde a este correo.

Un saludo,<br>
El equipo de Cinammon Network
</x-mail::message>
