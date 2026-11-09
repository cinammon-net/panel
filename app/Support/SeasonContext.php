<?php

namespace App\Support;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Ambientación de temporada/festivo para el visitante. El calendario y los descuentos
 * viven en el billing (/api/season); aquí solo se pide por país y se cachea.
 */
class SeasonContext
{
    public static function forRequest(Request $request): ?array
    {
        if (config('panel.demo')) {
            // La demo no muestra ofertas reales de la tienda.
            return null;
        }

        $cc = strtoupper(trim((string) $request->header('CF-IPCountry')));
        $country = preg_match('/^[A-Z]{2}$/', $cc) && !in_array($cc, ['XX', 'T1'], true) ? $cc : 'ES';
        $base = rtrim((string) config('services.billing.url'), '/');

        if ($base === '') {
            return null;
        }

        // Si el billing no responde se guarda `false` 2 min para no esperar en cada página.
        $ctx = Cache::get("season:{$country}");
        if ($ctx === null) {
            try {
                $res = Http::timeout(2)->acceptJson()->get("{$base}/api/season", ['country' => $country]);
                $ctx = $res->successful() && is_array($res->json()) ? $res->json() : false;
            } catch (\Throwable) {
                $ctx = false;
            }
            Cache::put("season:{$country}", $ctx, $ctx === false ? 120 : 600);
        }

        return $ctx ?: null;
    }
}
