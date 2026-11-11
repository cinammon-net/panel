<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/** Enlace de invitación al Discord de la comunidad y sus contadores públicos. */
class Discord
{
    public static function invite(): string
    {
        return (string) config('services.discord.invite', 'https://discord.gg/U5EaDJerhZ');
    }

    /** Miembros y conectados según la invitación (API pública de Discord, caché 10 min). */
    public static function stats(): ?array
    {
        $code = basename(parse_url(self::invite(), PHP_URL_PATH) ?: '');
        if ($code === '') {
            return null;
        }

        return Cache::remember('discord.invite.stats.'.$code, 600, function () use ($code) {
            try {
                $res = Http::timeout(4)->acceptJson()->get("https://discord.com/api/v10/invites/{$code}", ['with_counts' => 'true']);
                if (! $res->successful()) {
                    return null;
                }

                return [
                    'members' => (int) $res->json('approximate_member_count'),
                    'online' => (int) $res->json('approximate_presence_count'),
                ];
            } catch (\Throwable) {
                return null;
            }
        });
    }
}
