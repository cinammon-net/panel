<?php

namespace App\Mail\Concerns;

use App\Models\MailArchive;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Str;

/**
 * Guarda cada correo enviado con sus datos (no con su HTML), para poder abrirlo después
 * con el diseño más nuevo: en el panel (Mis correos) y con «Ábrelo en el navegador».
 */
trait Archived
{
    public ?string $archiveUuid = null;

    public function send($mailer)
    {
        $this->archiveUuid ??= (string) Str::uuid();
        View::share('archiveUrl', MailArchive::viewUrl(MailArchive::SOURCE, $this->archiveUuid));
        try {
            $sent = parent::send($mailer);
        } finally {
            View::share('archiveUrl', null);
        }
        try {
            MailArchive::record($this);
        } catch (\Throwable $e) {
            report($e);
        }

        return $sent;
    }
}
