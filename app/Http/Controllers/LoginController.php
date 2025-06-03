<?php

namespace App\Http\Controllers;
use Inertia\Inertia;
use Illuminate\Support\Facades\Route;

use Illuminate\Http\Request;

class LoginController extends Controller
{
    public function showLoginForm()
    {
        $roleEmails = [
            'Owner' => 'owner@cinammon.net',
            'Admin' => 'admin@cinammon.net',
            'Moderator' => 'moderator@cinammon.net',
            'Helper' => 'helper@cinammon.net',
            'Sponsors' => 'sponsors@cinammon.net',
            'Members' => 'members@cinammon.net',
        ];
        
        return Inertia::render('Auth/Login', [
            'roleEmails' => $roleEmails,
            'loginUrl' => Route::currentRouteName() === 'login' ? route('login') : null,
        ]);
    }
}
