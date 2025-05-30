<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function appearance()
    {
        return Inertia::render('Settings/Appearance', [
            'availableFonts' => config('fonts'),
        ]);
    }

    // Puedes añadir aquí métodos como:
    // public function profile() { ... }
    // public function password() { ... }
}
