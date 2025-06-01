<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Laravel\Socialite\Facades\Socialite;
use SocialiteProviders\Discord\Provider as DiscordProvider;

class AuthServiceProvider extends ServiceProvider
{
    public function register()
    {
        // No es necesario agregar nada aquí
    }

    public function boot()
    {
        // Registrar el driver de Discord
        Socialite::extend('discord', function ($app) {
            $config = $app['config']['services.discord'];
            return new DiscordProvider(
                $app['request'],
                $config['client_id'],
                $config['client_secret'],
                $config['redirect']
            );
        });
    }
}
