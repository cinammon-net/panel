<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        if ($this->onWingsHost($request)) {
            return redirect('/');
        }

        return Inertia::render('auth/login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => $request->session()->get('status'),
            'demoMode' => \App\Support\Panel::demoMode(),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $user = Auth::user();
        if ($user && $user->hasTwoFactorEnabled()) {
            $remember = $request->boolean('remember');
            Auth::guard('web')->logout();
            $request->session()->put('login.two_factor_user_id', $user->id);
            $request->session()->put('login.remember', $remember);

            return redirect()->route('two-factor.challenge');
        }

        $request->session()->regenerate();

        if ($this->onWingsHost($request)) {
            return redirect('/');
        }

        return redirect()->intended(route('servers.index', absolute: false));
    }

    private function onWingsHost(Request $request): bool
    {
        $host = (string) config('panel.wings_host');

        return $host !== '' && strcasecmp($request->getHost(), $host) === 0;
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
