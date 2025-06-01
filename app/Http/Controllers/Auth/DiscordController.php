<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Laravel\Socialite\Facades\Socialite;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class DiscordController extends Controller
{
    public function redirectToDiscord()
    {
        return Socialite::driver('discord')->redirect();
    }

    public function handleDiscordCallback()
    {
        try {
            $discordUser = Socialite::driver('discord')->user();
        } catch (\Exception $e) {
            return redirect()->route('login');
        }

        // Aquí puedes registrar o autenticar al usuario
        $user = User::firstOrCreate([
            'discord_id' => $discordUser->getId(),
        ], [
            'name' => $discordUser->getName(),
            'email' => $discordUser->getEmail(),
            'avatar' => $discordUser->getAvatar(),
        ]);

        Auth::login($user, true);

        return redirect()->route('home');
    }
}