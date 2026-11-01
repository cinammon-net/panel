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
        Event::listen(Login::class, RecordLogin::class);

        Inertia::share([
            'auth' => function () {
                $user = Auth::user();

                /** @var \App\Models\User $user */
                return [
                    'user' => $user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'avatar' => $user->avatar ? \Illuminate\Support\Facades\Storage::url($user->avatar) : null,
                        'roles' => $user->load('roles')->roles->pluck('name')->toArray(), // ESTA LÍNEA ES LA CLAVE
                    ] : null,
                ];
            },
        ]);
    }
}
