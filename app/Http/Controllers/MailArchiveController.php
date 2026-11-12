<?php

namespace App\Http\Controllers;

use App\Models\MailArchive;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

/**
 * «Mis correos»: los correos que te ha enviado Cinammon (panel y tienda), siempre con el diseño actual.
 * Cada uno se vuelve a dibujar al abrirlo a partir de sus datos guardados (ver MailArchive).
 */
class MailArchiveController extends Controller
{
    private const LABELS = [
        'emails.welcome' => 'Bienvenida', 'emails.ticket' => 'Soporte', 'emails.birthday' => 'Cumpleaños',
        'emails.birthday-card' => 'Cumpleaños', 'emails.maintenance' => 'Mantenimiento', 'emails.server-created' => 'Servidor nuevo',
        'emails.invoice-created' => 'Pedido', 'emails.payment-received' => 'Pago confirmado', 'emails.payment-rejected' => 'Pago',
        'emails.payment-review' => 'Pagos', 'emails.free-expiring' => 'Servidor gratis', 'emails.free-suspended' => 'Servidor gratis',
    ];

    public function index(Request $request)
    {
        $emails = $this->mailboxes($request);
        $row = fn ($m, string $source) => [
            'source' => $source,
            'uuid' => $m['uuid'],
            'to' => $m['to'],
            'subject' => $m['subject'],
            'label' => self::LABELS[$m['view']] ?? 'Aviso',
            'sent_at' => $m['sent_at'],
            'url' => "/correos/{$source}/{$m['uuid']}",
        ];
        $panel = MailArchive::whereIn('to', $emails)->latest('sent_at')->limit(200)->get()
            ->map(fn ($m) => $row(['uuid' => $m->uuid, 'to' => $m->to, 'subject' => $m->subject, 'view' => $m->view, 'sent_at' => $m->sent_at?->toIso8601String()], 'panel'));
        $res = $this->billing('mails', ['emails' => $emails]);
        $store = collect($res['mails'] ?? [])->map(fn ($m) => $row($m, 'billing'));

        return Inertia::render('Mails', [
            'mails' => $panel->concat($store)->sortByDesc('sent_at')->values(),
            'mailboxes' => $emails,
            'storeOnline' => $res !== null,
        ]);
    }

    public function show(Request $request, string $source, string $uuid)
    {
        $emails = $this->mailboxes($request);
        if ($source === 'panel') {
            $mail = MailArchive::where('uuid', $uuid)->whereIn('to', $emails)->firstOrFail();
            try {
                $html = $mail->html();
            } catch (\Throwable $e) {
                report($e);
                abort(410, 'Este correo ya no se puede mostrar.');
            }
        } elseif ($source === 'billing') {
            $res = $this->billing('mails/show', ['emails' => $emails, 'uuid' => $uuid]);
            abort_unless(isset($res['html']), 404);
            $html = $res['html'];
        } else {
            abort(404);
        }

        // Barra fina para volver a la lista (solo en la web, no en el correo)
        $bar = '<div style="position:sticky;top:0;z-index:10;background:#0d0a17;padding:10px 16px;font:600 13px -apple-system,Segoe UI,Roboto,sans-serif">'
            .'<a href="/correos" style="color:#f0abfc;text-decoration:none">&larr; Mis correos</a></div>';

        return response(preg_replace('/<body([^>]*)>/i', '<body$1>'.$bar, $html, 1))
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('X-Robots-Tag', 'noindex')
            ->header('Cache-Control', 'private, no-store');
    }

    /**
     * Para el webmail (mail.cinammon.net, con el secreto del relay): el correo dibujado con el diseño actual.
     * Solo si era para alguno de los buzones que dice `to`, así una cabecera falsa no enseña correos ajenos.
     */
    public function fresh(Request $request, string $source, string $uuid)
    {
        $secret = (string) config('services.cloudflare_mail.secret');
        abort_if($secret === '' || ! hash_equals($secret, (string) $request->bearerToken()), 401);
        $emails = collect(explode(',', (string) $request->query('to')))
            ->map(fn ($e) => mb_strtolower(trim($e)))->filter(fn ($e) => str_contains($e, '@'))->take(20)->values()->all();
        abort_if($emails === [], 422);

        if ($source === 'panel') {
            $mail = MailArchive::where('uuid', $uuid)->whereIn('to', $emails)->firstOrFail();
            try {
                $html = $mail->html();
            } catch (\Throwable $e) {
                report($e);
                abort(410);
            }
        } else {
            $res = $this->billing('mails/show', ['emails' => $emails, 'uuid' => $uuid]);
            abort_unless(isset($res['html']), 404);
            $html = $res['html'];
        }

        return response($html)->header('Content-Type', 'text/html; charset=UTF-8')->header('Cache-Control', 'no-store');
    }

    /** Buzones que puede ver: el suyo y, si es Owner o Admin, también el del equipo de soporte. */
    private function mailboxes(Request $request): array
    {
        $user = $request->user();
        $list = [mb_strtolower((string) $user->email)];
        if ($user->hasAnyRole(['Owner', 'Admin'])) {
            $list[] = mb_strtolower((string) config('services.cloudflare_mail.support'));
        }

        return array_values(array_unique(array_filter($list)));
    }

    private function billing(string $action, array $body): ?array
    {
        $base = rtrim((string) config('services.billing.url'), '/');
        $token = (string) config('services.billing.token');
        if ($base === '' || $token === '') {
            return null;
        }
        try {
            $ca = (string) config('services.billing.ca');
            $res = Http::withHeaders(['X-Billing-Token' => $token])->acceptJson()->timeout(10)
                ->when($ca !== '', fn ($h) => $h->withOptions(['verify' => $ca]))
                ->post($base.'/api/panel/'.$action, $body);

            return $res->successful() ? $res->json() : null;
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }
}
