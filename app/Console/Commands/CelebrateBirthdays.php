<?php

namespace App\Console\Commands;

use App\Mail\BirthdayCardMail;
use App\Models\BirthdayCelebration;
use App\Support\Birthday;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

/**
 * Cada hora: felicita a quien cumpla años (a su medianoche local) y, ya por la noche,
 * le manda por correo la "tarjeta" con todas las felicitaciones que recibió en Discord.
 */
class CelebrateBirthdays extends Command
{
    protected $signature = 'birthdays:celebrate';

    protected $description = 'Felicita y regala a quien cumple años hoy, y envía la tarjeta de felicitaciones';

    public function handle(): int
    {
        foreach (Birthday::celebrateDue() as $c) {
            $this->info("Felicitado: {$c->user->name}");
        }

        // Tarjeta: a partir de las 20:00 de su día (hora local), si alguien le felicitó.
        BirthdayCelebration::with('user')->whereNull('card_sent_at')->where('created_at', '>=', now()->subDays(2))->get()
            ->each(function (BirthdayCelebration $c) {
                $user = $c->user;
                if (! $user || ! count($c->wishes ?? [])) {
                    return;
                }
                $local = now()->setTimezone(Birthday::tz($user));
                $ended = ! Birthday::isToday($user);
                if (! $ended && $local->hour < 20) {
                    return;
                }
                $c->update(['card_sent_at' => now()]);
                if (filled($user->email)) {
                    Mail::to($user->email)->queue(new BirthdayCardMail($user, $c));
                }
            });

        return self::SUCCESS;
    }
}
