<?php

namespace App\Mail;

use App\Models\Maintenance;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class MaintenanceScheduled extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels, Concerns\Archived;

    public function __construct(public Maintenance $maintenance)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Mantenimiento programado: ' . $this->maintenance->title);
    }

    public function content(): Content
    {
        $labels = ['panel' => 'Panel', 'store' => 'Tienda y facturación', 'servers' => 'Servidores de juego'];

        return new Content(markdown: 'emails.maintenance', with: [
            'm' => $this->maintenance,
            'scopes' => collect($this->maintenance->scope)->map(fn ($s) => $labels[$s] ?? $s)->implode(', '),
        ]);
    }
}
