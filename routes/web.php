<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

use App\Http\Controllers\EggController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\NodeController;
use App\Http\Controllers\ServerController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\TermsController;
use App\Http\Controllers\ReviewController;
use App\Http\Controllers\WelcomeController;
use App\Http\Controllers\EggVariableController;
use App\Http\Controllers\NetworkController;
use Laravel\Socialite\Facades\Socialite;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

// 🌐 Rutas públicas
Route::get('/', [WelcomeController::class, 'index'])->name('home');
Route::view('/terms', 'legal.terms')->name('terms');
Route::view('/privacy', 'legal.privacy')->name('privacy');
Route::view('/sponsors', 'legal.sponsors')->name('sponsors');

Route::get('api/nodes/{id}/config-yaml', [NodeController::class, 'configYaml']);
Route::get('api/application/nodes/{id}/configuration', [NodeController::class, 'configYaml']);
Route::post('api/nodes/{node}/reset', [NodeController::class, 'reset']);

// 🔗 Socialtie
Route::get('/auth/github/redirect', function () {
    return Socialite::driver('github')->redirect();
});

Route::get('/auth/github/callback', function () {
    $githubUser = Socialite::driver('github')->user();

    $user = User::updateOrCreate([
        'github_id' => $githubUser->id,
        'email' => $githubUser->email,

    ], [
        'name' => $githubUser->name,
        'email' => $githubUser->email,
        'github_token' => $githubUser->token,
        'github_refresh_token' => $githubUser->refreshToken,
    ]);

    Auth::login($user);

    return redirect('/dashboard');
});

Route::get('/auth/discord/redirect', function () {
    return Socialite::driver('discord')->redirect();
});

Route::get('/auth/discord/callback', function () {
    $discordUser = Socialite::driver('discord')->user();

    $user = User::updateOrCreate([
        'discord_id' => $discordUser->id,
        'email' => $discordUser->email,
    ], [
        'name' => $discordUser->name,
        'email' => $discordUser->email,
        'discord_token' => $discordUser->token,
        'discord_refresh_token' => $discordUser->refreshToken,
    ]);

    Auth::login($user);
    return redirect('/dashboard');
});

Route::get('/auth/gitlab/redirect', function () {
    return Socialite::driver('gitlab')->redirect();
});
Route::get('/auth/gitlab/callback', function () {
    $gitlabUser = Socialite::driver('gitlab')->user();

    $user = User::updateOrCreate([
        'gitlab_id' => $gitlabUser->id,
        'email' => $gitlabUser->email,
    ], [
        'name' => $gitlabUser->name,
        'email' => $gitlabUser->email,
        'gitlab_token' => $gitlabUser->token,
        'gitlab_refresh_token' => $gitlabUser->refreshToken,
    ]);

    Auth::login($user);
    return redirect('/dashboard');
});
Route::get('/auth/google/redirect', function () {
    return Socialite::driver('google')->redirect();
});
Route::get('/auth/google/callback', function () {
    $googleUser = Socialite::driver('google')->user();

    $user = User::updateOrCreate([
        'google_id' => $googleUser->id,
        'email' => $googleUser->email,
    ], [
        'name' => $googleUser->name,
        'email' => $googleUser->email,
        'google_token' => $googleUser->token,
        'google_refresh_token' => $googleUser->refreshToken,
    ]);

    Auth::login($user);
    return redirect('/dashboard');
});
Route::get('/auth/apple/redirect', function () {
    return Socialite::driver('apple')->redirect();
});
Route::get('/auth/apple/callback', function () {
    $appleUser = Socialite::driver('apple')->user();

    $user = User::updateOrCreate([
        'apple_id' => $appleUser->id,
        'email' => $appleUser->email,
    ], [
        'name' => $appleUser->name,
        'email' => $appleUser->email,
        'apple_token' => $appleUser->token,
        'apple_refresh_token' => $appleUser->refreshToken,
    ]);

    Auth::login($user);
    return redirect('/dashboard');
});

// 🔐 Rutas autenticadas y verificadas
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', fn() => Inertia::render('dashboard'))->name('dashboard');
    Route::get('/settings/appearance', [SettingsController::class, 'appearance'])->name('settings.appearance');
});

// 🔒 Rutas autenticadas (sin verificar email)
Route::middleware(['auth'])->group(function () {
    // Aceptación de términos
    Route::get('/terms/accept', [TermsController::class, 'show'])->name('terms.accept');
    Route::post('/terms/accept', [TermsController::class, 'accept'])->name('terms.accept.post');

    // Fuente personalizada
    Route::post('/settings/font', function (Request $request) {
        $request->validate(['font' => 'required|string']);
        $request->user()->update(['font' => $request->font]);
        return back();
    })->name('settings.font');

    // Reviews
    Route::resource('reviews', ReviewController::class)->except(['show']);

    // Posts
    Route::resource('posts', PostController::class);

    // Tickets
    Route::resource('tickets', TicketController::class)->except(['create']);
    Route::post('/tickets/{ticket}/messages', [TicketController::class, 'storeMessage'])->name('tickets.message.store');
    Route::delete('/tickets/{ticket}/messages/{message}', [TicketController::class, 'destroyMessage'])->name('tickets.messages.destroy');

    // Eggs
    Route::get('/eggs', [EggController::class, 'index'])->name('eggs.index');
    Route::get('/eggs/create', [EggController::class, 'create'])->name('eggs.create');
    Route::post('/eggs', [EggController::class, 'store'])->name('eggs.store');
    Route::get('/eggs/{egg}/edit', [EggController::class, 'edit'])->name('eggs.edit');
    Route::put('/eggs/{egg}', [EggController::class, 'update'])->name('eggs.update');
    Route::delete('/eggs/{egg}', [EggController::class, 'destroy'])->name('eggs.destroy');
    Route::post('/eggs/import', [EggController::class, 'import'])->name('eggs.import');
    Route::delete('/egg-variables/{id}', [EggVariableController::class, 'destroy'])->name('egg-variables.destroy');

    // Nodes
    Route::resource('nodes', NodeController::class)->except(['show']);
    Route::get('/nodes/cpu-data', [NodeController::class, 'getCpuData']);
    Route::get('/nodes/memory-data', [NodeController::class, 'getMemoryData']);
    Route::get('/nodes/storage-data', [NodeController::class, 'getStorageData']);
    Route::post('/nodes/{id}/heartbeat', [NodeController::class, 'heartbeat']);

    // Servers
    Route::resource('servers', ServerController::class)->except(['show']);
    Route::get('/remote/servers', [ServerController::class, 'index']);
    // Network
    Route::get('/api/ips', [NetworkController::class, 'getIps']);
    Route::get('/api/network/ips', function () {
        $ips = [];

        foreach (explode("\n", shell_exec("ip -o -f inet addr show | awk '/scope global/ {print \$4}'")) as $line) {
            if (filter_var($line, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $ips[] = explode('/', $line)[0];
            }
        }

        foreach (explode("\n", shell_exec("ip -o -f inet6 addr show | awk '/scope global/ {print \$4}'")) as $line) {
            if (filter_var($line, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                $ips[] = explode('/', $line)[0];
            }
        }

        return response()->json(array_values(array_unique($ips)));
    });

    // Galería
    Route::get('/gallery', fn() => Inertia::render('Gallery'))->name('gallery.index');
    Route::post('/gallery/upload', function (Request $request) {
        $request->validate([
            'image' => 'required|image|max:4096',
        ]);

        $directory = storage_path('app/public/gallery');
        if (!file_exists($directory)) {
            mkdir($directory, 0775, true);
        }

        $file = $request->file('image');
        $name = $file->getClientOriginalName();
        $path = $file->storeAs('gallery', $name, 'public');

        return response()->json(['path' => Storage::url($path)]);
    })->name('gallery.upload');

    Route::get('/gallery/list', function () {
        $files = Storage::disk('public')->files('gallery');

        $images = collect($files)->map(fn($file) => [
            'url' => Storage::url($file),
            'name' => basename($file),
        ])->reverse()->values();

        return response()->json($images);
    })->name('gallery.list');

    Route::delete('/gallery/delete/{filename}', function ($filename) {
        $path = storage_path('app/public/gallery/' . $filename); 
    
        if (file_exists($path)) {
            unlink($path);
            return response()->json(['success' => true]);
        }
    
        return response()->json(['error' => 'Archivo no encontrado'], 404);
    })->name('gallery.delete');
    

    // Users
    Route::resource('users', UserController::class)->except(['show']);

    // Roles
    Route::resource('roles', RoleController::class)->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);
});

// Configuración adicional
require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
