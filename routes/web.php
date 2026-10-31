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
use App\Http\Controllers\AdvancedSectionController;
use Laravel\Socialite\Facades\Socialite;
use App\Models\User;
use App\Models\Server;
use App\Models\Node;
use App\Models\Egg;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// 🌐 Rutas públicas
Route::get('/', [WelcomeController::class, 'index'])->name('home');
Route::view('/terms', 'legal.terms')->name('terms');
Route::view('/privacy', 'legal.privacy')->name('privacy');
Route::view('/sponsors', 'legal.sponsors')->name('sponsors');

Route::get('api/nodes/{id}/config-yaml', [NodeController::class, 'configYaml'])->middleware('auth');
Route::get('nodes/{id}/config-yaml', [NodeController::class, 'configYaml'])->middleware('auth');
Route::get('api/application/nodes/{id}/configuration', [NodeController::class, 'configYaml'])->middleware('auth');
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

    return redirect('/servers');
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
    return redirect('/servers');
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
    return redirect('/servers');
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
    return redirect('/servers');
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
    return redirect('/servers');
});

// 🔐 Rutas autenticadas y verificadas
Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', function (Request $request) {
        $user = $request->user();
        $userRoles = $user ? $user->getRoleNames()->toArray() : [];
        $isOwner = in_array('Owner', $userRoles);
        $isAdmin = $isOwner || in_array('Admin', $userRoles);
        $isStaff = in_array('Moderator', $userRoles) || in_array('Helper', $userRoles);

        $labels = [];
        for ($i = 6; $i >= 0; $i--) {
            $labels[] = now()->subDays($i)->format('D');
        }

        $hasFailedJobs = Schema::hasTable('failed_jobs');
        $hasTickets = Schema::hasTable('tickets');

        if ($isAdmin) {
            $roleScope = 'admin';
            $installations = [];
            $newUsers = [];
            $errors = [];

            for ($i = 6; $i >= 0; $i--) {
                $dateStr = now()->subDays($i)->toDateString();
                $installations[] = Server::whereDate('created_at', $dateStr)->count();
                $newUsers[] = User::whereDate('created_at', $dateStr)->count();
                $errors[] = $hasFailedJobs
                    ? DB::table('failed_jobs')->whereDate('failed_at', $dateStr)->count()
                    : 0;
            }

            $stats = [
                'users' => User::count(),
                'servers' => Server::count(),
                'installations' => Egg::count(),
                'nodes' => Node::count(),
                'tickets' => $hasTickets ? \App\Models\Ticket::count() : 0,
            ];

            $weeklyActivity = [
                'labels' => $labels,
                'datasets' => [
                    [
                        'label' => 'Instalaciones (Servidores)',
                        'data' => $installations,
                        'backgroundColor' => 'rgba(180, 118, 255, 0.7)',
                    ],
                    [
                        'label' => 'Nuevos Usuarios',
                        'data' => $newUsers,
                        'backgroundColor' => 'rgba(90, 200, 250, 0.7)',
                    ],
                    [
                        'label' => 'Errores del Sistema',
                        'data' => $errors,
                        'backgroundColor' => 'rgba(255, 100, 130, 0.7)',
                    ],
                ],
            ];
        } elseif ($isStaff) {
            $roleScope = 'moderator';
            $ticketsActivity = [];
            $newUsers = [];

            for ($i = 6; $i >= 0; $i--) {
                $dateStr = now()->subDays($i)->toDateString();
                $newUsers[] = User::whereDate('created_at', $dateStr)->count();
                $ticketsActivity[] = $hasTickets
                    ? \App\Models\Ticket::whereDate('created_at', $dateStr)->count()
                    : 0;
            }

            $stats = [
                'openTickets' => $hasTickets ? \App\Models\Ticket::where('status', 'open')->count() : 0,
                'totalTickets' => $hasTickets ? \App\Models\Ticket::count() : 0,
                'users' => User::count(),
                'servers' => Server::count(),
            ];

            $weeklyActivity = [
                'labels' => $labels,
                'datasets' => [
                    [
                        'label' => 'Tickets Creados',
                        'data' => $ticketsActivity,
                        'backgroundColor' => 'rgba(245, 158, 11, 0.7)',
                    ],
                    [
                        'label' => 'Nuevos Usuarios',
                        'data' => $newUsers,
                        'backgroundColor' => 'rgba(90, 200, 250, 0.7)',
                    ],
                ],
            ];
        } else {
            $roleScope = 'client';
            $userId = $user->id;
            $myServersActivity = [];
            $myTicketsActivity = [];

            for ($i = 6; $i >= 0; $i--) {
                $dateStr = now()->subDays($i)->toDateString();
                $myServersActivity[] = Server::where('owner_id', $userId)->whereDate('created_at', $dateStr)->count();
                $myTicketsActivity[] = $hasTickets
                    ? \App\Models\Ticket::where('user_id', $userId)->whereDate('created_at', $dateStr)->count()
                    : 0;
            }

            $stats = [
                'myServers' => Server::where('owner_id', $userId)->count(),
                'sharedServers' => \App\Models\Subuser::where('user_id', $userId)->count(),
                'onlineServers' => Server::where('owner_id', $userId)->where('status', 'online')->count(),
                'myTickets' => $hasTickets ? \App\Models\Ticket::where('user_id', $userId)->count() : 0,
            ];

            $weeklyActivity = [
                'labels' => $labels,
                'datasets' => [
                    [
                        'label' => 'Mis Servidores',
                        'data' => $myServersActivity,
                        'backgroundColor' => 'rgba(34, 211, 238, 0.7)',
                    ],
                    [
                        'label' => 'Mis Tickets',
                        'data' => $myTicketsActivity,
                        'backgroundColor' => 'rgba(168, 85, 247, 0.7)',
                    ],
                ],
            ];
        }

        return Inertia::render('dashboard', [
            'roleScope' => $roleScope,
            'stats' => $stats,
            'weeklyActivity' => $weeklyActivity,
            'userRole' => $userRoles[0] ?? 'Member',
        ]);
    })->name('dashboard');
    Route::get('/api/dashboard-version', fn() => response()->json(['version' => config('app.version', '1.0.0')]));
    Route::get('/settings/appearance', [SettingsController::class, 'appearance'])->name('settings.appearance');
});

// 🔒 Rutas autenticadas (sin verificar email)
Route::middleware(['auth'])->group(function () {
    // Secciones avanzadas del Sidebar
    Route::get('/health', [AdvancedSectionController::class, 'health'])->name('health.index');
    Route::get('/api-keys', [AdvancedSectionController::class, 'apiKeys'])->name('api-keys.index');
    Route::post('/api-keys', [AdvancedSectionController::class, 'storeApiKey'])->name('api-keys.store');
    Route::delete('/api-keys/{id}', [AdvancedSectionController::class, 'destroyApiKey'])->name('api-keys.destroy');

    Route::get('/database', [AdvancedSectionController::class, 'database'])->name('database.index');
    Route::post('/database', [AdvancedSectionController::class, 'storeDatabaseHost'])->name('database.store');
    Route::post('/database/query', [AdvancedSectionController::class, 'executeSqlQuery'])->name('database.query');
    Route::delete('/database/{id}', [AdvancedSectionController::class, 'destroyDatabaseHost'])->name('database.destroy');

    Route::get('/mounts', [AdvancedSectionController::class, 'mounts'])->name('mounts.index');
    Route::post('/mounts', [AdvancedSectionController::class, 'storeMount'])->name('mounts.store');
    Route::delete('/mounts/{id}', [AdvancedSectionController::class, 'destroyMount'])->name('mounts.destroy');

    Route::get('/webhooks', [AdvancedSectionController::class, 'webhooks'])->name('webhooks.index');
    Route::post('/webhooks', [AdvancedSectionController::class, 'storeWebhook'])->name('webhooks.store');
    Route::put('/webhooks/{id}', [AdvancedSectionController::class, 'updateWebhook'])->name('webhooks.update');
    Route::post('/webhooks/{id}/test', [AdvancedSectionController::class, 'testWebhook'])->name('webhooks.test');
    Route::delete('/webhooks/{id}', [AdvancedSectionController::class, 'destroyWebhook'])->name('webhooks.destroy');
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
    Route::post('/eggs/sync-repo', [EggController::class, 'syncRepo'])->name('eggs.syncRepo');
    Route::delete('/egg-variables/{id}', [EggVariableController::class, 'destroy'])->name('egg-variables.destroy');

    // Nodes
    Route::resource('nodes', NodeController::class)->except(['show']);
    Route::get('/nodes/cpu-data', [NodeController::class, 'getCpuData']);
    Route::get('/api/cpu-data', [NodeController::class, 'getCpuData']);
    Route::get('/nodes/memory-data', [NodeController::class, 'getMemoryData']);
    Route::get('/memory-data', [NodeController::class, 'getMemoryData']);
    Route::get('/nodes/storage-data', [NodeController::class, 'getStorageData']);
    Route::get('/storage-data', [NodeController::class, 'getStorageData']);
    Route::post('/nodes/{id}/heartbeat', [NodeController::class, 'heartbeat']);
    Route::post('/nodes/{id}/allocations', [NodeController::class, 'storeAllocation']);
    Route::delete('/nodes/{nodeId}/allocations/{allocationId}', [NodeController::class, 'destroyAllocation']);

    // Servers
    Route::get('/servers/{server}/files', [App\Http\Controllers\ServerFilesController::class, 'page'])->name('servers.files');
    Route::post('/servers/{server}/files/write', [App\Http\Controllers\ServerFilesController::class, 'write']);
    Route::post('/servers/{server}/files/upload', [App\Http\Controllers\ServerFilesController::class, 'upload']);
    Route::post('/servers/{server}/files/action', [App\Http\Controllers\ServerFilesController::class, 'action']);
    Route::get('/servers/{server}/files/download', [App\Http\Controllers\ServerFilesController::class, 'download']);
    Route::get('/servers/{server}/files/list', [App\Http\Controllers\ServerFilesController::class, 'listing']);
    Route::get('/servers/{server}/files/contents', [App\Http\Controllers\ServerFilesController::class, 'contents']);
    Route::get('/servers/{server}/console', [App\Http\Controllers\ServerRuntimeController::class, 'console'])->name('servers.console');
    Route::get('/servers/{server}/runtime', [App\Http\Controllers\ServerRuntimeController::class, 'snapshot']);
    Route::post('/servers/{server}/power', [App\Http\Controllers\ServerRuntimeController::class, 'power']);
    Route::post('/servers/{server}/command', [App\Http\Controllers\ServerRuntimeController::class, 'command']);
    Route::post('/servers/{server}/discord', [App\Http\Controllers\ServerRuntimeController::class, 'configureDiscord']);
    Route::post('/servers/{server}/eula', [App\Http\Controllers\ServerRuntimeController::class, 'acceptEula']);
    Route::post('/servers/{uuid}/toggle-install', [ServerController::class, 'toggleInstall']);
    Route::post('/servers/{uuid}/suspend', [ServerController::class, 'suspend']);
    Route::post('/servers/{uuid}/transfer', [ServerController::class, 'transfer']);
    Route::post('/servers/{uuid}/reinstall', [ServerController::class, 'reinstall']);
    Route::get('/servers/{server}/databases', [ServerController::class, 'databases'])->name('servers.databases');
    Route::post('/servers/{server}/databases', [ServerController::class, 'storeDatabase'])->name('servers.databases.store');
    Route::delete('/servers/{server}/databases/{dbId}', [ServerController::class, 'destroyDatabase'])->name('servers.databases.destroy');
    Route::post('/servers/{server}/banner', [ServerController::class, 'updateBanner'])->name('servers.banner.update');
    Route::get('/servers/{server}/subusers', [App\Http\Controllers\ServerSubusersController::class, 'index'])->name('servers.subusers');
    Route::post('/servers/{server}/subusers', [App\Http\Controllers\ServerSubusersController::class, 'store'])->name('servers.subusers.store');
    Route::put('/servers/{server}/subusers/{subuser}', [App\Http\Controllers\ServerSubusersController::class, 'update'])->name('servers.subusers.update');
    Route::delete('/servers/{server}/subusers/{subuser}', [App\Http\Controllers\ServerSubusersController::class, 'destroy'])->name('servers.subusers.destroy');
    Route::get('/servers/edit', fn() => redirect('/servers'));
    Route::resource('servers', ServerController::class)->except(['show']);
    Route::get('/servers/{server}/edit', [ServerController::class, 'edit'])->name('servers.edit');
    Route::post('/servers', [ServerController::class, 'store'])->name('servers.store');
    Route::put('/servers/{server}', [ServerController::class, 'update'])->name('servers.update');
    Route::delete('/servers/{uuid}', [ServerController::class, 'destroy'])->name('servers.destroy');
    Route::post('/servers/{server}/transfer-owner', [App\Http\Controllers\ServerSubusersController::class, 'transferOwner'])->name('servers.transfer_owner');

    // 🔄 Cambio Rápido de Cuenta / Switch User
    Route::get('/api/switchable-users', function () {
        return User::select('id', 'name', 'email', 'avatar')
            ->with('roles:id,name')
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'avatar' => $u->avatar,
                    'roles' => $u->roles->pluck('name')->toArray(),
                ];
            });
    });

    Route::post('/api/switch-user', function (Request $request) {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $targetUser = User::findOrFail($validated['user_id']);
        Auth::login($targetUser);
        $request->session()->regenerate();

        return back()->with('success', "Has cambiado a la cuenta de {$targetUser->name}.");
    })->name('user.switch');


    // Network
    Route::get('/api/ips', [NetworkController::class, 'getIps']);
    Route::get('/api/network/ips', [NetworkController::class, 'getIps']);

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
