<?php

namespace App\Providers;

use App\Listeners\RecordLogin;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Contraseñas sencillas (4+ caracteres, sin exigir mayúsculas ni símbolos); siempre se guardan cifradas con bcrypt.
        \Illuminate\Validation\Rules\Password::defaults(fn () => \Illuminate\Validation\Rules\Password::min(4));

        Event::listen(Login::class, RecordLogin::class);

        // Solo la instalación de demo (PANEL_DEMO_MODE=true) tiene un nodo simulado.
        if (config('panel.demo')) {
            \App\Support\DemoWings::register();
        }

        Inertia::share([
            'auth' => function () {
                $user = Auth::user();

                /** @var \App\Models\User $user */
                return [
                    'user' => $user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'avatar' => $user->avatar_url,
                        'roles' => $user->load('roles')->roles->pluck('name')->toArray(), // ESTA LÍNEA ES LA CLAVE
                    ] : null,
                ];
            },
        ]);
    }
}
