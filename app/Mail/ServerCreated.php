<?php

namespace App\Mail;

use App\Models\Server;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/** Aviso al dueño de que tiene un servidor nuevo (compra, gratis, Amigo, admin o Discord). */
class ServerCreated extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, Concerns\Archived;

    public function __construct(public Server $server)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Tu servidor «{$this->server->name}» está creado");
    }

    public function content(): Content
    {
        $s = $this->server->loadMissing(['owner:id,name', 'egg:id,name', 'allocation']);
        $size = fn (int $mb) => $mb <= 0 ? 'Sin límite' : ($mb >= 1024 ? rtrim(rtrim(number_format($mb / 1024, 1, ',', ''), '0'), ',').' GB' : $mb.' MB');

        // Datos sueltos (no el modelo): así el correo se puede volver a dibujar aunque el servidor ya no exista.
        return new Content(markdown: 'emails.server-created', with: [
            'name' => (string) $s->name,
            'ownerName' => (string) ($s->owner?->name ?? ''),
            'type' => $s->egg?->name,
            'ram' => $size((int) $s->memory),
            'disk' => $size((int) $s->disk),
            'cpu' => (int) $s->cpu > 0 ? ((int) $s->cpu).' %' : 'Sin límite',
            'address' => $s->allocation?->publicAddress(),
            'url' => url('/servers/'.$s->id.'/console'),
        ]);
    }
}
