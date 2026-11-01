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

        $demoHost = (string) config('panel.demo_host');

        return ! app()->runningInConsole()
            && $demoHost !== ''
            && strcasecmp(request()->getHost(), $demoHost) === 0;
    }
}
