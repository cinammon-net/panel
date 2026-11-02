<?php

namespace App\Support;

/**
 * Resuelve si la petición actual debe comportarse en modo demo.
 */
class Panel
{
    public static function demoMode(): bool
    {
        if (config('panel.demo')) {
            return true;
        }

        if (! app()->runningInConsole()) {
            $demoHost = (string) config('panel.demo_host', 'demo.cinammon.net');
            if ($demoHost !== '' && strcasecmp(request()->getHost(), $demoHost) === 0) {
                return true;
            }
        }

        return false;
    }
}
