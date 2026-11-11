<?php

namespace App\Mail;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Mail\Mailables\Headers;
use Illuminate\Queue\SerializesModels;

/**
 * Aviso de actividad en un ticket.
 *  - kind "opened": ticket nuevo, va al buzón de soporte.
 *  - kind "to_staff": el cliente ha escrito, va al buzón de soporte.
 *  - kind "to_client": el equipo ha respondido, va al dueño del ticket.
 */
class TicketActivity extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /** Clave única por aviso: el Worker de correo descarta correos idénticos en 24 h y dos avisos pueden coincidir. */
    public string $idempotencyKey;

    public function __construct(public Ticket $ticket, public string $kind, public string $author, public ?string $excerpt = null)
    {
        $this->idempotencyKey = 'ticket-'.$ticket->id.'-'.\Illuminate\Support\Str::uuid();
    }

    public function envelope(): Envelope
    {
        $subject = match ($this->kind) {
            'opened' => "Nuevo ticket #{$this->ticket->id}: {$this->ticket->subject}",
            'to_client' => "Respuesta a tu ticket #{$this->ticket->id}: {$this->ticket->subject}",
            default => "Mensaje nuevo en el ticket #{$this->ticket->id}: {$this->ticket->subject}",
        };

        return new Envelope(subject: $subject);
    }

    /** Todos los avisos de un mismo ticket se agrupan en la misma conversación del cliente de correo. */
    public function headers(): Headers
    {
        $root = "ticket-{$this->ticket->id}@cinammon.net";

        return new Headers(references: [$root], text: ['In-Reply-To' => "<{$root}>", 'X-Idempotency-Key' => $this->idempotencyKey]);
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.ticket', with: [
            'ticket' => $this->ticket,
            'kind' => $this->kind,
            'author' => $this->author,
            'excerpt' => $this->excerpt,
            'url' => route('tickets.show', $this->ticket),
        ]);
    }
}
