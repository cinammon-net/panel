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
            if (request()->has('demo') || request()->session()->get('demo_mode')) {
                return true;
            }

            $demoHost = (string) config('panel.demo_host');
            if ($demoHost !== '' && strcasecmp(request()->getHost(), $demoHost) === 0) {
                return true;
            }
        }

        return false;
    }
}
