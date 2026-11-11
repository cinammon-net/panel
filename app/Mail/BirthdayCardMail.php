<?php

namespace App\Mail;

use App\Models\BirthdayCelebration;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BirthdayCardMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public BirthdayCelebration $celebration)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Tu tarjeta de cumpleaños: '.count($this->celebration->wishes ?? []).' felicitaciones');
    }

    public function content(): Content
    {
        return new Content(markdown: 'emails.birthday-card', with: [
            'user' => $this->user,
            'gifts' => $this->celebration->gifts,
            'reason' => $this->celebration->no_gift_reason,
            'wishes' => collect($this->celebration->wishes ?? [])->pluck('name')->all(),
            'storeUrl' => rtrim((string) config('services.billing.url'), '/') ?: 'https://billing.cinammon.net',
        ]);
    }
}
