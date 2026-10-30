<?php

namespace App\Providers;

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
        Inertia::share([
            'auth' => function () {
                $user = Auth::user();

                /** @var \App\Models\User $user */
                return [
                    'user' => $user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'roles' => $user->load('roles')->roles->pluck('name')->toArray(), // ESTA LÍNEA ES LA CLAVE
                    ] : null,
                ];
            },
        ]);
    }
}
