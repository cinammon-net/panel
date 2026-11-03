<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Middleware\EnsureServerUnlocked;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ServerLockController extends Controller
{
    private const MAX_ATTEMPTS = 5;
    private const DECAY_SECONDS = 900;

    // Un código de 4 dígitos solo tiene 10.000 combinaciones: además del límite por IP hay uno por cuenta.
    private const MAX_ACCOUNT_ATTEMPTS = 10;
    private const ACCOUNT_DECAY_SECONDS = 3600;

    public function unlockPage(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user->securityLockActive() || EnsureServerUnlocked::isUnlocked($request->session())) {
            return redirect()->to($request->session()->pull(EnsureServerUnlocked::INTENDED_KEY, '/servers'));
        }

        return Inertia::render('security/unlock');
    }

    public function unlock(Request $request): RedirectResponse
    {
        $request->validate(['code' => ['required', 'string']]);
        $this->verifyCode($request, $request->user(), 'code');

        EnsureServerUnlocked::markUnlocked($request->session());

        return redirect()->to($request->session()->pull(EnsureServerUnlocked::INTENDED_KEY, '/servers'));
    }

    /** Primera vez: el cliente crea su código y el bloqueo se activa durante un mes. */
    public function store(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasSecurityCode()) {
            throw ValidationException::withMessages(['code' => 'Ya tienes un código. Para cambiarlo usa «Cambiar código».']);
        }

        $data = $request->validate(['code' => ['required', 'string', 'min:4', 'max:32', 'confirmed']]);

        $user->forceFill([
            'lock_code' => Hash::make($data['code']),
            'lock_code_set_at' => now(),
            'lock_enabled_until' => now()->addMonth(),
        ])->save();

        EnsureServerUnlocked::markUnlocked($request->session());

        return redirect()->to($request->session()->pull(EnsureServerUnlocked::INTENDED_KEY, route('security.edit')))
            ->with('status', 'server-lock-created');
    }

    /** Reactiva el bloqueo un mes más (se apaga solo al terminar). */
    public function enable(Request $request): RedirectResponse
    {
        $user = $request->user();
        $request->validate(['code' => ['required', 'string']]);
        $this->verifyCode($request, $user, 'code');

        $user->forceFill(['lock_enabled_until' => now()->addMonth()])->save();
        EnsureServerUnlocked::markUnlocked($request->session());

        return back()->with('status', 'server-lock-enabled');
    }

    public function disable(Request $request): RedirectResponse
    {
        $user = $request->user();
        $request->validate(['code' => ['required', 'string']]);
        $this->verifyCode($request, $user, 'code');

        $user->forceFill(['lock_enabled_until' => null])->save();
        $request->session()->forget(EnsureServerUnlocked::SESSION_KEY);

        return back()->with('status', 'server-lock-disabled');
    }

    public function changeCode(Request $request): RedirectResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'current_code' => ['required', 'string'],
            'code' => ['required', 'string', 'min:4', 'max:32', 'confirmed', 'different:current_code'],
        ]);
        $this->verifyCode($request, $user, 'current_code');

        $user->forceFill(['lock_code' => Hash::make($data['code']), 'lock_code_set_at' => now()])->save();

        return back()->with('status', 'server-lock-code-changed');
    }

    /** Cierra el desbloqueo de esta sesión sin esperar a que caduque. */
    public function relock(Request $request): RedirectResponse
    {
        $request->session()->forget(EnsureServerUnlocked::SESSION_KEY);

        return back()->with('status', 'server-lock-relocked');
    }

    private function verifyCode(Request $request, User $user, string $field): void
    {
        $key = 'server-lock:'.$user->id.'|'.$request->ip();
        $accountKey = 'server-lock-account:'.$user->id;

        if (RateLimiter::tooManyAttempts($accountKey, self::MAX_ACCOUNT_ATTEMPTS)) {
            $minutes = (int) ceil(RateLimiter::availableIn($accountKey) / 60);
            Log::warning("Server lock: cuenta {$user->id} bloqueada por demasiados intentos fallidos (último desde {$request->ip()})");

            throw ValidationException::withMessages([$field => "Demasiados intentos fallidos en esta cuenta. Vuelve a probar en {$minutes} min."]);
        }

        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            $minutes = (int) ceil(RateLimiter::availableIn($key) / 60);
            Log::warning("Server lock: demasiados intentos para el usuario {$user->id} desde {$request->ip()}");

            throw ValidationException::withMessages([$field => "Demasiados intentos. Vuelve a probar en {$minutes} min."]);
        }

        if (! $user->hasSecurityCode() || ! Hash::check((string) $request->input($field), $user->lock_code)) {
            RateLimiter::hit($key, self::DECAY_SECONDS);
            RateLimiter::hit($accountKey, self::ACCOUNT_DECAY_SECONDS);

            throw ValidationException::withMessages([$field => 'El código no es correcto.']);
        }

        RateLimiter::clear($key);
        RateLimiter::clear($accountKey);
    }
}
