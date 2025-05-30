<?php

namespace App\Http\Controllers;

use Laravel\Socialite\Facades\Socialite; 
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class SocialAuthController extends Controller
{
    public function redirectToDiscord()
    {
        return Socialite::driver('discord')->redirect();
    }

    public function handleDiscordCallback()
    {
        $discordUser = Socialite::driver('discord')->user();

        $user = User::updateOrCreate(
            ['email' => $discordUser->getEmail()],
            [
                'name' => $discordUser->getName(),
                'oauth' => json_encode($discordUser),
            ]
        );

        Auth::login($user);

        return redirect('/dashboard');
    }
}
