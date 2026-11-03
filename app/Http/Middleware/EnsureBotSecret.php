<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** API del bot de Discord: exige el secreto compartido (BOT_INTERNAL_SECRET) en la cabecera X-Cinammon-Bot-Secret. */
class EnsureBotSecret
{
    public function handle(Request $request, Closure $next): Response
    {
        $secret = (string) config('services.bot.secret');

        abort_if($secret === '', 503, 'La API del bot no está configurada.');
        abort_unless(hash_equals($secret, (string) $request->header('X-Cinammon-Bot-Secret')), 401, 'Secreto del bot no válido.');

        return $next($request);
    }
}
