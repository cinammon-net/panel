<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Markdown;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\View;

/**
 * Copia de cada correo enviado: plantilla + datos. Al abrirlo se vuelve a dibujar con la plantilla
 * actual, así que un correo antiguo se ve siempre con el diseño nuevo.
 * (Mismo archivo en panel y billing; solo cambia SOURCE.)
 */
class MailArchive extends Model
{
    public const SOURCE = 'panel';

    protected $table = 'mail_archive';

    protected $guarded = [];

    protected $casts = ['data' => 'array', 'sent_at' => 'datetime'];

    /** Todos los correos se abren desde el panel (allí está «Mis correos»). */
    public static function viewUrl(string $source, string $uuid): string
    {
        return 'https://panel.cinammon.net/correos/'.$source.'/'.$uuid;
    }

    public static function record(Mailable $mail): void
    {
        $view = $mail->content()->markdown ?? null;
        if (! $view || ! $mail->archiveUuid) {
            return;
        }
        $data = self::pack($mail->buildViewData());
        $subject = (string) ($mail->envelope()->subject ?? $mail->subject ?? '');
        foreach (collect($mail->to)->pluck('address')->filter()->unique()->values() as $n => $to) {
            self::create([
                'uuid' => $n === 0 ? $mail->archiveUuid : (string) \Illuminate\Support\Str::uuid(),
                'to' => mb_strtolower($to),
                'subject' => $subject,
                'view' => $view,
                'data' => $data,
                'sent_at' => now(),
            ]);
        }
    }

    /** Vuelve a dibujar el correo con la plantilla y el diseño de ahora. */
    public function html(): string
    {
        View::share('archiveUrl', null);

        return (string) app(Markdown::class)->render($this->view, self::unpack($this->data ?? []));
    }

    /** Modelos → referencia (se leen frescos al abrir), fechas → texto; lo demás tal cual. */
    public static function pack(mixed $v): mixed
    {
        return match (true) {
            // Con una copia de sus datos: si luego se borra (un ticket, una cuenta), el correo se sigue viendo
            $v instanceof Model => ['__model' => $v::class, 'id' => $v->getKey(), 'attrs' => self::safeAttrs($v)],
            $v instanceof \DateTimeInterface => ['__date' => $v->format(DATE_ATOM)],
            $v instanceof Collection => array_map([self::class, 'pack'], $v->all()),
            is_array($v) => array_map([self::class, 'pack'], array_filter($v, fn ($k) => ! str_starts_with((string) $k, '__laravel'), ARRAY_FILTER_USE_KEY)),
            is_scalar($v), $v === null => $v,
            default => null,
        };
    }

    /** Copia sin nada sensible (tokens de OAuth, claves, códigos...): solo lo que un correo puede enseñar. */
    private static function safeAttrs(Model $m): array
    {
        return array_filter($m->attributesToArray(), fn ($val, $key) => ! preg_match('/token|secret|password|two_factor|(^|_)(code|key|ip|hash|session|otp)(_|$)/i', (string) $key)
            && (is_scalar($val) || $val === null), ARRAY_FILTER_USE_BOTH);
    }

    public static function unpack(mixed $v): mixed
    {
        if (! is_array($v)) {
            return $v;
        }
        if (isset($v['__model'])) {
            $class = $v['__model'];

            if (! class_exists($class)) {
                return null;
            }

            return $class::find($v['id']) ?? (new $class)->forceFill(['id' => $v['id']] + ($v['attrs'] ?? []));
        }
        if (isset($v['__date'])) {
            return CarbonImmutable::parse($v['__date']);
        }

        return array_map([self::class, 'unpack'], $v);
    }
}
