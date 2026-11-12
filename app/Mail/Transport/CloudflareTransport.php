<?php

namespace App\Mail\Transport;

use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\Exception\TransportException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\MessageConverter;

/**
 * Envía el correo a través del Worker cinammon-mail (Cloudflare Email Sending).
 *
 * El Worker descarta un correo idéntico (mismo remitente, destinatarios, asunto y
 * contenido) enviado en las últimas 24 h, así que los reintentos de la cola o de
 * la petición HTTP nunca llegan dos veces al cliente.
 */
class CloudflareTransport extends AbstractTransport
{
    public function __construct(
        private readonly string $url,
        private readonly string $secret,
        private readonly string $source,
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        if ($this->url === '' || $this->secret === '') {
            throw new TransportException('Falta CLOUDFLARE_MAIL_URL o CLOUDFLARE_MAIL_SECRET en .env');
        }

        $email = MessageConverter::toEmail($message->getOriginalMessage());
        $addr = fn (array $list) => array_map(fn (Address $a) => $a->getAddress(), $list);

        $to = $addr($email->getTo());
        $cc = $addr($email->getCc());
        $bcc = $addr($email->getBcc());
        // Destinatarios del sobre que no estén en las cabeceras (p. ej. Mail::alwaysTo) van en copia oculta.
        foreach ($message->getEnvelope()->getRecipients() as $r) {
            if (! in_array($r->getAddress(), [...$to, ...$cc, ...$bcc], true)) {
                $bcc[] = $r->getAddress();
            }
        }

        $from = $email->getFrom()[0] ?? $message->getEnvelope()->getSender();
        $body = fn ($b) => is_resource($b) ? stream_get_contents($b) : $b;

        $payload = [
            'source' => $this->source,
            'from' => ['email' => $from->getAddress(), 'name' => $from->getName() ?: null],
            'to' => $to,
            'cc' => $cc,
            'bcc' => $bcc,
            'reply_to' => $addr($email->getReplyTo())[0] ?? null,
            'subject' => (string) $email->getSubject(),
            'html' => $body($email->getHtmlBody()),
            'text' => $body($email->getTextBody()),
            'idempotency_key' => $email->getHeaders()->get('X-Idempotency-Key')?->getBodyAsString(),
            'headers' => array_filter(['X-Cinammon-Archive' => $email->getHeaders()->get('X-Cinammon-Archive')?->getBodyAsString()]),
            'attachments' => array_map(fn ($part) => [
                'filename' => $part->getFilename() ?? 'adjunto',
                'type' => $part->getMediaType().'/'.$part->getMediaSubtype(),
                'content' => base64_encode($part->getBody()),
                'disposition' => $part->getDisposition() === 'inline' ? 'inline' : 'attachment',
                'content_id' => $part->getDisposition() === 'inline' ? $part->getContentId() : null,
            ], $email->getAttachments()),
        ];

        $response = Http::withToken($this->secret)
            ->acceptJson()
            ->timeout(20)
            ->retry(2, 1000, throw: false)
            ->post($this->url, $payload);

        if (! $response->successful()) {
            throw new TransportException('cinammon-mail: '.($response->json('error') ?? 'HTTP '.$response->status()));
        }
    }

    public function __toString(): string
    {
        return 'cloudflare';
    }
}
