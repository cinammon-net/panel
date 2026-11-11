<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Settings\ProfileController;
use App\Models\BirthdayCelebration;
use App\Models\User;
use App\Support\Birthday;
use Illuminate\Http\Request;

/** Cumpleaños desde el bot de Discord (protegido por bot.secret). */
class BotBirthdayController extends Controller
{
    /** Celebraciones de las últimas 30 h con Discord vinculado: el bot las anuncia y da el rol. */
    public static function today(): array
    {
        return BirthdayCelebration::with('user:id,name,discord_id,birthday_public,timezone,birthday_day,birthday_month')
            ->where('created_at', '>=', now()->subHours(30))
            ->get()
            ->filter(fn (BirthdayCelebration $c) => $c->user?->discord_id)
            ->map(fn (BirthdayCelebration $c) => [
                'id' => $c->id,
                'discord_id' => (string) $c->user->discord_id,
                'name' => $c->user->name,
                'public' => (bool) ($c->user->birthday_public ?? true),
                'active' => Birthday::isToday($c->user),
                'gifts' => $c->gifts,
                'no_gift_reason' => $c->no_gift_reason,
                'wish_count' => count($c->wishes ?? []),
            ])->values()->all();
    }

    public function wish(Request $request, BirthdayCelebration $celebration)
    {
        $data = $request->validate(['discord_id' => 'required|string|max:32', 'name' => 'required|string|max:100']);
        abort_if((string) $celebration->user?->discord_id === $data['discord_id'], 422, 'self');
        abort_unless($celebration->user && Birthday::isToday($celebration->user), 410, 'over');
        $count = Birthday::addWish($celebration, $data['discord_id'], $data['name']);

        return response()->json([
            'count' => $count,
            'recent' => collect($celebration->fresh()->wishes)->pluck('name')->reverse()->take(8)->values(),
        ]);
    }

    public function show(string $discordId)
    {
        $user = User::where('discord_id', $discordId)->firstOrFail();

        return response()->json(['name' => $user->name] + ProfileController::birthdayInfo($user));
    }

    public function update(Request $request, string $discordId)
    {
        $user = User::where('discord_id', $discordId)->firstOrFail();
        $data = $request->validate(['day' => 'required|integer|min:1|max:31', 'month' => 'required|integer|min:1|max:12', 'public' => 'nullable|boolean']);
        abort_unless(Birthday::valid($data['day'], $data['month']), 422, 'Esa fecha no existe.');
        Birthday::set($user, $data['day'], $data['month'], $data['public'] ?? null);

        return response()->json(['name' => $user->name] + ProfileController::birthdayInfo($user->fresh()));
    }

    /** Próximos cumpleaños públicos de gente con Discord vinculado. */
    public function upcoming()
    {
        $list = User::whereNotNull('birthday_day')->whereNotNull('discord_id')->where('birthday_public', true)
            ->get(['id', 'name', 'discord_id', 'birthday_day', 'birthday_month', 'timezone'])
            ->map(fn (User $u) => ['discord_id' => (string) $u->discord_id, 'label' => Birthday::label($u), 'days' => Birthday::daysUntil($u)])
            ->sortBy('days')->take(10)->values();

        return response()->json(['upcoming' => $list]);
    }
}
