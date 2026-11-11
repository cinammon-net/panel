<x-mail::message>
@if ($kind === 'opened')
# Nuevo ticket #{{ $ticket->id }}

**{{ $author }}** ha abierto un ticket: **{{ $ticket->subject }}**
@elseif ($kind === 'to_client')
# Tienes una respuesta

**{{ $author }}** ha respondido a tu ticket **#{{ $ticket->id }} · {{ $ticket->subject }}**.
@else
# Mensaje nuevo en el ticket #{{ $ticket->id }}

**{{ $author }}** ha escrito en **{{ $ticket->subject }}**.
@endif

@if (filled($excerpt))
<x-mail::panel>
{{ \Illuminate\Support\Str::limit(strip_tags($excerpt), 600) }}
</x-mail::panel>
@endif

<x-mail::button :url="$url">
Abrir el ticket
</x-mail::button>

<span class="muted">Responde desde el panel para que la conversación quede guardada en el ticket.</span>
</x-mail::message>
