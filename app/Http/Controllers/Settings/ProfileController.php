<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
            // Cuentas vinculadas para entrar (proveedor => vinculado o no)
            'connections' => collect(\App\Http\Controllers\Auth\SocialAuthController::PROVIDERS)
                ->mapWithKeys(fn ($p, $key) => [$key => filled($request->user()->getAttributes()[$key.'_id'] ?? null)]),
            'birthday' => self::birthdayInfo($request->user()),
        ]);
    }

    public static function birthdayInfo(\App\Models\User $user): array
    {
        return [
            'day' => $user->birthday_day,
            'month' => $user->birthday_month,
            'public' => (bool) ($user->birthday_public ?? true),
            'label' => \App\Support\Birthday::label($user),
            'days_until' => \App\Support\Birthday::daysUntil($user),
            'gift' => \App\Support\Birthday::giftStatus($user),
            'preview' => \App\Support\Birthday::preview($user),
            'min_days' => \App\Support\Birthday::MIN_DAYS,
        ];
    }

    /** Guarda (o borra) el cumpleaños. */
    public function birthday(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'day' => 'nullable|integer|min:1|max:31',
            'month' => 'nullable|integer|min:1|max:12',
            'public' => 'boolean',
        ]);
        $day = $data['day'] ?? null;
        $month = $data['month'] ?? null;
        if (($day xor $month) || ($day && ! \App\Support\Birthday::valid($day, $month))) {
            return back()->withErrors(['birthday' => 'Esa fecha no existe.']);
        }
        \App\Support\Birthday::set($request->user(), $day, $month, (bool) ($data['public'] ?? true));

        return back()->with('success', $day ? 'Cumpleaños guardado.' : 'Cumpleaños borrado.');
    }

    /** El usuario ha abierto la sorpresa del día. */
    public function birthdaySeen(Request $request): RedirectResponse
    {
        \App\Support\Birthday::today($request->user())?->update(['seen_at' => now()]);

        return back();
    }

    /**
     * Update the user's profile settings.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return to_route('profile.edit');
    }

    /**
     * Sube o reemplaza la foto de perfil.
     */
    public function updateAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp,gif', 'max:2048'],
        ]);

        $user = $request->user();

        if ($user->avatar) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->forceFill(['avatar' => $path])->save();

        return to_route('profile.edit');
    }

    /**
     * Elimina la foto de perfil.
     */
    public function destroyAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->avatar) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar);
            $user->forceFill(['avatar' => null])->save();
        }

        return to_route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /** Código de un solo uso para vincular Discord con /vincular (no necesita OAuth). */
    public function discordCode(Request $request): RedirectResponse
    {
        $uid = $request->user()->id;
        if ($old = Cache::pull('discord-link-user:'.$uid)) {
            Cache::forget('discord-link:'.$old);
        }
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $code = '';
        for ($k = 0; $k < 8; $k++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }
        Cache::put('discord-link:'.$code, $uid, now()->addMinutes(15));
        Cache::put('discord-link-user:'.$uid, $code, now()->addMinutes(15));

        return back()->with('discordCode', $code);
    }
}
