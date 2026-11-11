<?php

namespace App\Support;

use App\Models\BirthdayCelebration;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Cumpleaños: el usuario guarda día y mes (sin año) y ese día, a su medianoche local,
 * recibe un set de regalos (tienda) y le felicitan en el panel, en Discord y por correo.
 *
 * Para que nadie se ponga el cumpleaños "hoy" y se lleve el regalo, el regalo solo llega si la
 * fecha se guardó al menos MIN_DAYS días antes (cambiarla reinicia ese plazo). La felicitación
 * llega siempre.
 */
class Birthday
{
    public const MIN_DAYS = 14;
    public const DEFAULT_TZ = 'Europe/Madrid';

    public const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    /** Lo que se regala (lo aplica la tienda; aquí solo se describe para la web y el correo). */
    public const GIFTS = [
        'coins' => ['normal' => 200, 'vip' => 400],
        'discount' => ['normal' => 25, 'vip' => 30, 'days' => 7],
        'extra_days' => 3,
    ];

    public static function tz(User $user): string
    {
        $tz = (string) ($user->timezone ?: self::DEFAULT_TZ);

        return in_array($tz, timezone_identifiers_list(), true) ? $tz : self::DEFAULT_TZ;
    }

    public static function has(User $user): bool
    {
        return $user->birthday_day && $user->birthday_month;
    }

    public static function label(User $user): ?string
    {
        return self::has($user) ? $user->birthday_day.' de '.self::MONTHS[$user->birthday_month - 1] : null;
    }

    /** Fecha (en el año dado) en que se celebra. El 29 de febrero se celebra el 28 en años no bisiestos. */
    public static function dateIn(User $user, int $year): CarbonImmutable
    {
        $day = $user->birthday_day;
        if ($user->birthday_month === 2 && $day === 29 && ! checkdate(2, 29, $year)) {
            $day = 28;
        }

        return CarbonImmutable::create($year, $user->birthday_month, $day, 0, 0, 0, self::tz($user));
    }

    public static function isToday(User $user, ?CarbonImmutable $now = null): bool
    {
        if (! self::has($user)) {
            return false;
        }
        $local = ($now ?? CarbonImmutable::now())->setTimezone(self::tz($user));

        return self::dateIn($user, $local->year)->isSameDay($local);
    }

    /** Próxima celebración (hoy cuenta como próxima). */
    public static function next(User $user): ?CarbonImmutable
    {
        if (! self::has($user)) {
            return null;
        }
        $today = CarbonImmutable::now(self::tz($user))->startOfDay();
        $date = self::dateIn($user, $today->year);

        return $date->lt($today) ? self::dateIn($user, $today->year + 1) : $date;
    }

    public static function daysUntil(User $user): ?int
    {
        $next = self::next($user);

        return $next ? (int) CarbonImmutable::now(self::tz($user))->startOfDay()->diffInDays($next) : null;
    }

    /** Si el próximo cumpleaños tendrá regalo (o por qué no). */
    public static function giftStatus(User $user, ?CarbonImmutable $on = null): array
    {
        $on ??= self::next($user);
        if (! $on) {
            return ['eligible' => false, 'reason' => 'Aún no has guardado tu cumpleaños.'];
        }
        $limit = $on->subDays(self::MIN_DAYS);
        if (! $user->birthday_set_at || $user->birthday_set_at->gt($limit)) {
            return ['eligible' => false, 'reason' => 'La fecha se guardó hace menos de '.self::MIN_DAYS.' días: este año hay felicitación, y el regalo llega el próximo.'];
        }
        if ($user->created_at && $user->created_at->gt($limit)) {
            return ['eligible' => false, 'reason' => 'La cuenta tiene menos de '.self::MIN_DAYS.' días: este año hay felicitación, y el regalo llega el próximo.'];
        }

        return ['eligible' => true, 'reason' => null];
    }

    public static function isVip(User $user): bool
    {
        return (bool) (Ranks::perks($user)['priority'] ?? false) || $user->hasAnyRole(['Owner', 'Admin', 'Moderator', 'Moderador', 'Helper']);
    }

    /** Vista previa del set de regalos para la web. */
    public static function preview(User $user): array
    {
        $tier = self::isVip($user) ? 'vip' : 'normal';

        return [
            'coins' => self::GIFTS['coins'][$tier],
            'discount' => self::GIFTS['discount'][$tier],
            'discount_days' => self::GIFTS['discount']['days'],
            'extra_days' => self::GIFTS['extra_days'],
            'vip' => $tier === 'vip',
        ];
    }

    /** Guarda la fecha. Cambiarla reinicia el plazo del regalo. */
    public static function set(User $user, ?int $day, ?int $month, ?bool $public = null): void
    {
        $changed = $user->birthday_day !== $day || $user->birthday_month !== $month;
        $user->forceFill([
            'birthday_day' => $day,
            'birthday_month' => $month,
            'birthday_set_at' => $day ? ($changed ? now() : $user->birthday_set_at) : null,
            'birthday_public' => $public ?? $user->birthday_public ?? true,
        ])->save();
    }

    public static function valid(int $day, int $month): bool
    {
        return $month >= 1 && $month <= 12 && $day >= 1 && checkdate($month, $day, 2024); // 2024: bisiesto, admite 29/2
    }

    /** Celebración de hoy, si la hay. */
    public static function today(User $user): ?BirthdayCelebration
    {
        if (! self::isToday($user)) {
            return null;
        }

        return BirthdayCelebration::where('user_id', $user->id)
            ->where('year', CarbonImmutable::now(self::tz($user))->year)->first();
    }

    /**
     * Celebra a quien cumpla hoy (a su hora local). Idempotente: una celebración por año.
     * Devuelve las celebraciones creadas.
     */
    public static function celebrateDue(): array
    {
        $now = CarbonImmutable::now();
        // Cualquier zona horaria está entre ayer y mañana en UTC.
        $dates = collect([-1, 0, 1])->map(fn ($d) => $now->utc()->addDays($d));
        $users = User::query()
            ->whereNotNull('birthday_day')
            ->where(function ($q) use ($dates) {
                foreach ($dates as $d) {
                    $q->orWhere(fn ($w) => $w->where('birthday_month', $d->month)->whereIn('birthday_day', $d->month === 2 && $d->day === 28 ? [28, 29] : [$d->day]));
                }
            })
            ->get();

        $done = [];
        foreach ($users as $user) {
            if (! self::isToday($user, $now) || (method_exists($user, 'trashed') && $user->trashed())) {
                continue;
            }
            $year = $now->setTimezone(self::tz($user))->year;
            if (BirthdayCelebration::where('user_id', $user->id)->where('year', $year)->exists()) {
                continue;
            }
            $done[] = self::celebrate($user, $year);
        }

        return $done;
    }

    public static function celebrate(User $user, int $year): BirthdayCelebration
    {
        $status = self::giftStatus($user, self::dateIn($user, $year));
        $gifts = null;
        $reason = $status['reason'];
        if ($status['eligible']) {
            $gifts = self::grantStoreGifts($user, $year);
            if ($gifts === null) {
                $reason = 'No hemos podido entregar el regalo de la tienda; el equipo lo revisará.';
            }
        }

        $celebration = BirthdayCelebration::create([
            'user_id' => $user->id,
            'year' => $year,
            'gifts' => $gifts,
            'no_gift_reason' => $gifts ? null : $reason,
            'wishes' => [],
        ]);

        if (filled($user->email) && ! Panel::demoMode()) {
            try {
                Mail::to($user->email)->queue(new \App\Mail\BirthdayMail($user, $celebration));
            } catch (\Throwable $e) {
                report($e);
            }
        }
        Log::info("Cumpleaños: {$user->name} ({$user->id}) ".($gifts ? 'con regalo' : 'sin regalo: '.$reason));

        return $celebration;
    }

    /** Pide a la tienda el set de regalos (monedas, descuento y días extra). Idempotente por año allí. */
    private static function grantStoreGifts(User $user, int $year): ?array
    {
        $base = rtrim((string) config('services.billing.url'), '/');
        $token = (string) config('services.billing.token');
        if ($base === '' || $token === '' || ! $user->email) {
            return null;
        }
        try {
            $ca = (string) config('services.billing.ca');
            $res = Http::withHeaders(['X-Billing-Token' => $token])->acceptJson()->timeout(15)
                ->when($ca !== '', fn ($h) => $h->withOptions(['verify' => $ca]))
                ->post($base.'/api/panel/bot/birthday', ['email' => $user->email, 'year' => $year, 'vip' => self::isVip($user)]);
            if ($res->status() === 404) {
                // Sin cuenta en la tienda con ese correo: hay felicitación y rol, pero no regalos de la tienda.
                return ['store' => false];
            }

            return $res->successful() ? ['store' => true] + (array) $res->json('gifts') : null;
        } catch (\Throwable $e) {
            report($e);

            return null;
        }
    }

    /** Felicitaciones de Discord: [{discord_id, name, at}], sin repetir. */
    public static function addWish(BirthdayCelebration $c, string $discordId, string $name): int
    {
        $wishes = collect($c->wishes ?? []);
        if (! $wishes->contains('discord_id', $discordId)) {
            $wishes->push(['discord_id' => $discordId, 'name' => mb_substr($name, 0, 60), 'at' => now()->toIso8601String()]);
            $c->update(['wishes' => $wishes->take(500)->values()->all()]);
        }

        return $wishes->count();
    }

    /** Datos para el panel (banner del día). */
    public static function forPanel(User $user): ?array
    {
        $c = self::today($user);
        if (! $c) {
            return null;
        }

        return [
            'id' => $c->id,
            'name' => $user->name,
            'gifts' => $c->gifts,
            'no_gift_reason' => $c->no_gift_reason,
            'wishes' => collect($c->wishes ?? [])->pluck('name')->take(60)->values(),
            'wish_count' => count($c->wishes ?? []),
            'seen' => (bool) $c->seen_at,
            'store_url' => rtrim((string) config('services.billing.url'), '/'),
        ];
    }
}
