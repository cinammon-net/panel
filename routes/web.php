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
use App\Http\Controllers\Admin\SocialProviderController;
use Laravel\Socialite\Facades\Socialite;
use App\Models\User;
use App\Models\Server;
use App\Models\Node;
use App\Models\Egg;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// 🛰️ Consola de Wings en su propio dominio (debe registrarse antes que la portada del panel)
if (($wingsHost = (string) config('panel.wings_host')) !== '') {
    Route::domain($wingsHost)->get('/api/wings/telemetry', [App\Http\Controllers\WingsPublicController::class, 'telemetry'])->middleware('throttle:120,1')->name('wings.telemetry');
}

// 🌐 Rutas públicas
Route::get('/', [WelcomeController::class, 'index'])->name('home');
Route::get('/demo', function (Request $request) {
    $demoHost = (string) config('panel.demo_host', 'demo.cinammon.net');
    if ($demoHost !== '' && strcasecmp($request->getHost(), $demoHost) !== 0) {
        return redirect()->away("https://{$demoHost}");
    }
    return redirect()->route('login');
})->name('demo');

// Comparativa interactiva con y sin código de seguridad (solo en el dominio demo, sin datos reales)
Route::get('/demo/seguridad', function () {
    abort_unless(\App\Support\Panel::demoMode(), 404);

    return Inertia::render('demo/security');
})->name('demo.security');

// 💳 Seamless SSO Handoff hacia Cinammon Billing
Route::get('/billing/redirect', function (Request $request) {
    $user = $request->user();
    if (!$user) {
        return redirect()->route('login');
    }

    // La demo no debe crear cuentas ni pedidos en el billing real.
    if (\App\Support\Panel::demoMode()) {
        return redirect('/servers')->with('error', 'La facturación no está disponible en la demo.');
    }

    $billingUrl = rtrim(config('services.billing.url') ?: env('BILLING_URL', 'http://localhost:8001'), '/');
    $secret = (string) (config('services.billing.token') ?: env('BILLING_API_TOKEN'));

    $payload = [
        'id' => $user->id,
        'email' => $user->email,
        'name' => $user->name,
        'exp' => time() + 120,
    ];

    $encoded = base64_encode(json_encode($payload));
    $sig = hash_hmac('sha256', $encoded, $secret);

    // Destino dentro del billing (lista cerrada): ?to=coins abre la página de monedas.
    $to = $request->query('to') === 'coins' ? '&to=coins' : '';

    return redirect("{$billingUrl}/sso?data={$encoded}&sig={$sig}{$to}");
})->middleware('auth')->name('billing.redirect');
Route::view('/terms', 'legal.terms')->name('terms');
Route::view('/privacy', 'legal.privacy')->name('privacy');
Route::view('/sponsors', 'legal.sponsors')->name('sponsors');
// Botón "Copiar enlace" del bot de Discord: Discord no deja copiar al portapapeles, esta página sí.
Route::get('/invitar/{code}', fn (string $code) => view('invite', ['code' => $code]))
    ->where('code', '[A-Za-z0-9-]{2,32}')->middleware('throttle:60,1')->name('discord.invite');

// El token de Wings solo lo ve (y rota) un administrador.
Route::middleware(['auth', 'admin'])->group(function () {
    Route::get('api/nodes/{id}/config-yaml', [NodeController::class, 'configYaml']);
    Route::get('nodes/{id}/config-yaml', [NodeController::class, 'configYaml']);
    Route::get('api/application/nodes/{id}/configuration', [NodeController::class, 'configYaml']);
    Route::post('api/nodes/{node}/reset', [NodeController::class, 'reset']);
});

// Entrar / registrarse / vincular con Discord, Google, Microsoft, GitHub, GitLab o Twitch
Route::get('/auth/{provider}/redirect', [App\Http\Controllers\Auth\SocialAuthController::class, 'redirect'])
    ->whereIn('provider', array_keys(App\Http\Controllers\Auth\SocialAuthController::PROVIDERS))->middleware('throttle:30,1')->name('social.redirect');
Route::get('/auth/{provider}/callback', [App\Http\Controllers\Auth\SocialAuthController::class, 'callback'])
    ->whereIn('provider', array_keys(App\Http\Controllers\Auth\SocialAuthController::PROVIDERS))->middleware('throttle:30,1')->name('social.callback');
Route::delete('/auth/{provider}', [App\Http\Controllers\Auth\SocialAuthController::class, 'unlink'])
    ->whereIn('provider', array_keys(App\Http\Controllers\Auth\SocialAuthController::PROVIDERS))->middleware('auth')->name('social.unlink');

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

        // Las estadísticas solo cuentan a los miembros: fuera los Owner y sus servidores.
        $members = fn () => User::members();
        $memberServers = fn () => Server::ofMembers();

        if ($isAdmin) {
            $roleScope = 'admin';
            $installations = [];
            $newUsers = [];
            $errors = [];

            for ($i = 6; $i >= 0; $i--) {
                $dateStr = now()->subDays($i)->toDateString();
                $installations[] = $memberServers()->whereDate('created_at', $dateStr)->count();
                $newUsers[] = $members()->whereDate('created_at', $dateStr)->count();
                $errors[] = $hasFailedJobs
                    ? DB::table('failed_jobs')->whereDate('failed_at', $dateStr)->count()
                    : 0;
            }

            $stats = [
                'users' => $members()->count(),
                'servers' => $memberServers()->count(),
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
                $newUsers[] = $members()->whereDate('created_at', $dateStr)->count();
                $ticketsActivity[] = $hasTickets
                    ? \App\Models\Ticket::whereDate('created_at', $dateStr)->count()
                    : 0;
            }

            $stats = [
                'openTickets' => $hasTickets ? \App\Models\Ticket::where('status', 'open')->count() : 0,
                'totalTickets' => $hasTickets ? \App\Models\Ticket::count() : 0,
                'users' => $members()->count(),
                'servers' => $memberServers()->count(),
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
            'birthday' => \App\Support\Birthday::forPanel($request->user()),
            'roleScope' => $roleScope,
            'stats' => $stats,
            'weeklyActivity' => $weeklyActivity,
            'userRole' => $userRoles[0] ?? 'Member',
            // Gestor de actualizaciones embebido en el dashboard (solo admins)
            'updateStatus' => $roleScope === 'admin' ? \App\Support\UpdateChecker::status() : null,
            // Infraestructura en vivo: estado de cada nodo Wings (cache 30 s)
            'liveNodes' => $roleScope === 'admin'
                ? \Illuminate\Support\Facades\Cache::remember('dashboard:live-nodes', now()->addSeconds(30), function () {
                    return \App\Models\Node::withCount('servers')->get()->map(function ($node) {
                        $scheme = $node->scheme ?: 'http';
                        $port = $node->daemon_listen ?? 8080;
                        $online = false;
                        $latency = null;
                        $version = null;
                        $start = microtime(true);
                        try {
                            $resp = \Illuminate\Support\Facades\Http::withHeaders([
                                'Authorization' => 'Bearer ' . $node->daemon_token,
                                'Accept' => 'application/json',
                            ])->timeout(2)->get("{$scheme}://{$node->fqdn}:{$port}/api/system");
                            if ($resp->successful() || in_array($resp->status(), [401, 403])) {
                                $online = true;
                                $latency = round((microtime(true) - $start) * 1000, 1);
                                $version = $resp->json('version');
                            }
                        } catch (\Throwable) {
                        }

                        return [
                            'id' => $node->id,
                            'name' => $node->name,
                            'online' => $online,
                            'latency_ms' => $latency,
                            'version' => $version,
                            'servers_count' => $node->servers_count,
                            // status es 1/0 (lo sincroniza nodes:check-status con Wings); nunca vale 'online'
                            'running' => \App\Models\Server::where('node_id', $node->id)->where('status', 1)->count(),
                            'maintenance' => (bool) $node->maintenance_mode,
                        ];
                    })->values();
                })
                : null,
        ]);
    })->name('dashboard');
    Route::get('/api/dashboard-version', fn() => response()->json(['version' => config('panel.version', config('app.version', '1.0.0'))]));
    Route::get('/settings/appearance', [SettingsController::class, 'appearance'])->name('settings.appearance');
});

// 🔒 Rutas autenticadas (sin verificar email)
Route::middleware(['auth', 'server.lock'])->group(function () {
    // Secciones avanzadas del Sidebar
    // Secciones avanzadas (salud, API keys, bases de datos, montajes, webhooks): solo Owner/Admin
    Route::middleware('admin')->group(function () {
        Route::get('/health', [AdvancedSectionController::class, 'health'])->name('health.index');

        // Actualizaciones del panel y de Wings
        Route::get('/updates', [\App\Http\Controllers\UpdateController::class, 'index'])->name('updates.index');
        Route::post('/updates/check', [\App\Http\Controllers\UpdateController::class, 'check'])->name('updates.check');
        Route::post('/updates/run', [\App\Http\Controllers\UpdateController::class, 'run'])->name('updates.run');
        Route::get('/updates/runner-status', [\App\Http\Controllers\UpdateController::class, 'runnerStatus'])->name('updates.runner');

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

        Route::get('/auth-providers', [SocialProviderController::class, 'index'])->name('social-providers.index');
        Route::put('/auth-providers/{provider}', [SocialProviderController::class, 'update'])->name('social-providers.update');
    });
    // Aceptación de términos
    Route::get('/terms/accept', [TermsController::class, 'show'])->name('terms.accept');
    Route::post('/terms/accept', [TermsController::class, 'accept'])->name('terms.accept.post');

    // Fuente personalizada
    Route::post('/settings/font', function (Request $request) {
        $request->validate(['font' => 'required|string']);
        $request->user()->update(['font' => $request->font]);
        return back();
    })->name('settings.font');

    // Mis correos: los correos de Cinammon (panel y tienda) con el diseño actual
    Route::get('/correos', [App\Http\Controllers\MailArchiveController::class, 'index'])->name('mails.index');
    Route::get('/correos/{source}/{uuid}', [App\Http\Controllers\MailArchiveController::class, 'show'])
        ->whereIn('source', ['panel', 'billing'])->whereUuid('uuid')->middleware('throttle:60,1')->name('mails.show');

    // Guías en vídeo (grabadas en el panel real; la guía completa vive en el foro #guias de Discord)
    Route::get('/guias', fn () => Inertia::render('Guides'))->name('guides.index');

    // Reviews
    Route::resource('reviews', ReviewController::class)->except(['show']);

    // Rincón de Amigos (rol "Amigo de Cinammon" y Owner; el controlador comprueba el acceso)
    Route::controller(App\Http\Controllers\FriendCornerController::class)->prefix('/amigos')->group(function () {
        Route::get('/', 'index')->name('friends.index');
        Route::middleware('throttle:20,1')->group(function () {
            Route::post('/notas', 'storeNote')->name('friends.notes.store');
            Route::post('/deseos', 'storeWish')->name('friends.wishes.store');
            Route::delete('/posts/{post}', 'destroy')->name('friends.posts.destroy');
            Route::patch('/deseos/{post}', 'grant')->name('friends.wishes.grant');
            Route::put('/dedicatoria/{user}', 'dedication')->name('friends.dedication');
            Route::post('/servidor', 'createServer')->middleware('throttle:3,1')->name('friends.server.store');
        });
    });

    // Posts: lectura para usuarios autenticados; creación/edición/borrado solo Owner/Admin
    Route::get('/posts', [PostController::class, 'index'])->name('posts.index');
    Route::middleware('admin')->group(function () {
        Route::resource('posts', PostController::class)->except(['index', 'show']);
    });
    Route::get('/posts/{post}', [PostController::class, 'show'])->whereNumber('post')->name('posts.show');

    // Tickets
    Route::resource('tickets', TicketController::class)->except(['create']);
    Route::post('/tickets/{ticket}/messages', [TicketController::class, 'storeMessage'])->name('tickets.message.store');
    Route::delete('/tickets/{ticket}/messages/{message}', [TicketController::class, 'destroyMessage'])->name('tickets.messages.destroy');

    // Eggs
    // Eggs: solo Owner/Admin
    Route::middleware('admin')->group(function () {
        Route::get('/eggs', [EggController::class, 'index'])->name('eggs.index');
        Route::get('/eggs/create', [EggController::class, 'create'])->name('eggs.create');
        Route::post('/eggs', [EggController::class, 'store'])->name('eggs.store');
        Route::get('/eggs/{egg}/edit', [EggController::class, 'edit'])->name('eggs.edit');
        Route::put('/eggs/{egg}', [EggController::class, 'update'])->name('eggs.update');
        Route::delete('/eggs/{egg}', [EggController::class, 'destroy'])->name('eggs.destroy');
        Route::post('/eggs/import', [EggController::class, 'import'])->name('eggs.import');
        Route::post('/eggs/sync-repo', [EggController::class, 'syncRepo'])->name('eggs.syncRepo');

        // Mantenimientos programados (aviso a usuarios y bloqueo opcional)
        Route::get('/maintenance', [App\Http\Controllers\MaintenanceController::class, 'index'])->name('maintenance.index');
        Route::post('/maintenance', [App\Http\Controllers\MaintenanceController::class, 'store'])->name('maintenance.store');
        Route::put('/maintenance/{maintenance}', [App\Http\Controllers\MaintenanceController::class, 'update'])->name('maintenance.update');
        Route::post('/maintenance/{maintenance}/start', [App\Http\Controllers\MaintenanceController::class, 'start'])->name('maintenance.start');
        Route::post('/maintenance/{maintenance}/finish', [App\Http\Controllers\MaintenanceController::class, 'finish'])->name('maintenance.finish');
        Route::delete('/maintenance/{maintenance}', [App\Http\Controllers\MaintenanceController::class, 'destroy'])->name('maintenance.destroy');

        // Anuncios: ofertas y novedades en la landing, el panel y la tienda
        Route::get('/announcements', [App\Http\Controllers\AnnouncementController::class, 'index'])->name('announcements.index');
        Route::post('/announcements', [App\Http\Controllers\AnnouncementController::class, 'store'])->name('announcements.store');
        Route::put('/announcements/{announcement}', [App\Http\Controllers\AnnouncementController::class, 'update'])->name('announcements.update');
        Route::post('/announcements/{announcement}/toggle', [App\Http\Controllers\AnnouncementController::class, 'toggle'])->name('announcements.toggle');
        Route::delete('/announcements/{announcement}', [App\Http\Controllers\AnnouncementController::class, 'destroy'])->name('announcements.destroy');
        Route::delete('/egg-variables/{id}', [EggVariableController::class, 'destroy'])->name('egg-variables.destroy');
    });

    // Nodes
    // Consola y estado de Wings: Owner/Admin ven todo y Moderator/Helper lo operativo (WingsEvents filtra por rol)
    Route::middleware(['admin:Moderator,Helper', 'throttle:120,1'])->group(function () {
        Route::get('/wings', [App\Http\Controllers\WingsMonitorController::class, 'index'])->name('wings.index');
    });

    // Eventos de Wings: cualquier persona con sesión, pero WingsEvents devuelve solo lo que su rol permite
    Route::get('/wings/log', [App\Http\Controllers\WingsLogController::class, 'adminEvents'])->middleware('throttle:120,1')->name('wings.log');

    // Nodos: solo Owner/Admin
    Route::middleware('admin')->group(function () {
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
    });

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
    Route::get('/servers/{server}/usage', [App\Http\Controllers\ServerRuntimeController::class, 'usage'])->middleware('throttle:240,1');
    Route::post('/servers/{server}/power', [App\Http\Controllers\ServerRuntimeController::class, 'power']);
    Route::post('/servers/{server}/command', [App\Http\Controllers\ServerRuntimeController::class, 'command']);
    Route::post('/servers/{server}/discord', [App\Http\Controllers\ServerRuntimeController::class, 'configureDiscord']);
    Route::post('/servers/{server}/eula', [App\Http\Controllers\ServerRuntimeController::class, 'acceptEula']);
    Route::get('/servers/{server}/players', [App\Http\Controllers\ServerPlayersController::class, 'index'])->middleware('throttle:120,1');
    Route::post('/servers/{server}/players', [App\Http\Controllers\ServerPlayersController::class, 'action'])->middleware('throttle:60,1');
    Route::get('/servers/{server}/players/online', [App\Http\Controllers\ServerPlayersController::class, 'online'])->middleware('throttle:120,1');
    Route::get('/servers/{server}/gta-players', [App\Http\Controllers\ServerGtaController::class, 'page'])->name('servers.gta.players');
    Route::get('/servers/{server}/gta-mods', [App\Http\Controllers\ServerGtaController::class, 'page'])->name('servers.gta.mods');
    Route::get('/servers/{server}/gta/online', [App\Http\Controllers\ServerGtaController::class, 'online'])->middleware('throttle:120,1');
    Route::get('/servers/{server}/gta/mods', [App\Http\Controllers\ServerGtaController::class, 'mods'])->middleware('throttle:60,1');
    Route::get('/servers/{server}/gta/mod-icon', [App\Http\Controllers\ServerGtaController::class, 'icon'])->middleware('throttle:600,1');
    Route::post('/servers/{server}/gta/mods/toggle', [App\Http\Controllers\ServerGtaController::class, 'toggle'])->middleware('throttle:60,1');
    Route::post('/servers/{server}/gta/mods/upload', [App\Http\Controllers\ServerGtaController::class, 'upload'])->middleware('throttle:30,1');
    Route::post('/servers/{server}/gta/mods/delete', [App\Http\Controllers\ServerGtaController::class, 'remove'])->middleware('throttle:60,1');
    Route::post('/servers/{server}/gta/players', [App\Http\Controllers\ServerGtaController::class, 'action'])->middleware('throttle:60,1');
    Route::get('/servers/{server}/people', [App\Http\Controllers\ServerPlayersController::class, 'page'])->name('servers.people');
    Route::get('/servers/{server}/players/roster', [App\Http\Controllers\ServerPlayersController::class, 'roster'])->middleware('throttle:60,1');
    Route::get('/servers/{server}/game', [App\Http\Controllers\ServerGameController::class, 'page'])->name('servers.game');
    Route::get('/servers/{server}/game/settings', [App\Http\Controllers\ServerGameController::class, 'show']);
    Route::put('/servers/{server}/game/settings', [App\Http\Controllers\ServerGameController::class, 'update'])->middleware('throttle:30,1');
    Route::post('/servers/{server}/game/icon', [App\Http\Controllers\ServerGameController::class, 'uploadIcon'])->middleware('throttle:20,1');
    Route::delete('/servers/{server}/game/icon', [App\Http\Controllers\ServerGameController::class, 'deleteIcon']);
    Route::get('/servers/{server}/game/schedule', [App\Http\Controllers\ServerGameController::class, 'schedule']);
    Route::put('/servers/{server}/game/schedule', [App\Http\Controllers\ServerGameController::class, 'saveSchedule'])->middleware('throttle:30,1');
    Route::middleware('admin')->group(function () {
        Route::post('/servers/{uuid}/toggle-install', [ServerController::class, 'toggleInstall']);
        Route::post('/servers/{uuid}/suspend', [ServerController::class, 'suspend']);
        Route::post('/servers/{uuid}/transfer', [ServerController::class, 'transfer']);
    });
    Route::post('/servers/{uuid}/reinstall', [ServerController::class, 'reinstall']);
    Route::get('/servers/{server}/databases', [ServerController::class, 'databases'])->name('servers.databases');
    Route::post('/servers/{server}/databases', [ServerController::class, 'storeDatabase'])->name('servers.databases.store');
    Route::post('/servers/{server}/databases/{dbId}/rotate', [ServerController::class, 'rotateDatabasePassword'])->name('servers.databases.rotate');
    Route::delete('/servers/{server}/databases/{dbId}', [ServerController::class, 'destroyDatabase'])->name('servers.databases.destroy');

    // Módulos del Servidor (Red, Backups, Mounts, Webhooks, Subdominios, Actividad)
    Route::get('/servers/{server}/network', [App\Http\Controllers\ServerModulesController::class, 'network'])->name('servers.network');
    Route::post('/servers/{server}/network', [App\Http\Controllers\ServerModulesController::class, 'assignNetwork'])->name('servers.network.assign');
    Route::post('/servers/{server}/network/primary', [App\Http\Controllers\ServerModulesController::class, 'setPrimaryNetwork'])->name('servers.network.primary');
    Route::delete('/servers/{server}/network/{allocation}', [App\Http\Controllers\ServerModulesController::class, 'destroyNetwork'])->name('servers.network.destroy');

    Route::get('/servers/{server}/backups', [App\Http\Controllers\ServerModulesController::class, 'backups'])->name('servers.backups');
    Route::post('/servers/{server}/backups', [App\Http\Controllers\ServerModulesController::class, 'storeBackup'])->name('servers.backups.store');
    Route::post('/servers/{server}/backups/{backupId}/lock', [App\Http\Controllers\ServerModulesController::class, 'toggleBackupLock'])->name('servers.backups.lock');
    Route::delete('/servers/{server}/backups/{backupId}', [App\Http\Controllers\ServerModulesController::class, 'destroyBackup'])->name('servers.backups.destroy');

    Route::get('/servers/{server}/mounts', [App\Http\Controllers\ServerModulesController::class, 'mounts'])->name('servers.mounts');

    Route::get('/servers/{server}/webhooks', [App\Http\Controllers\ServerModulesController::class, 'webhooks'])->name('servers.webhooks');
    Route::post('/servers/{server}/webhooks', [App\Http\Controllers\ServerModulesController::class, 'storeWebhook'])->name('servers.webhooks.store');
    Route::post('/servers/{server}/webhooks/{webhookId}/test', [App\Http\Controllers\ServerModulesController::class, 'testWebhook'])->name('servers.webhooks.test');
    Route::delete('/servers/{server}/webhooks/{webhookId}', [App\Http\Controllers\ServerModulesController::class, 'destroyWebhook'])->name('servers.webhooks.destroy');

    // Dominios propios (solo servidores de pago) con conexión automática a Cloudflare
    Route::get('/servers/{server}/subdomains', [App\Http\Controllers\ServerDomainsController::class, 'page'])->name('servers.subdomains');
    Route::post('/servers/{server}/subdomains', [App\Http\Controllers\ServerDomainsController::class, 'store'])->middleware('throttle:15,1')->name('servers.subdomains.store');
    Route::post('/servers/{server}/subdomains/{subdomain}/verify', [App\Http\Controllers\ServerDomainsController::class, 'verify'])->middleware('throttle:30,1')->name('servers.subdomains.verify');
    Route::delete('/servers/{server}/subdomains/{subdomain}', [App\Http\Controllers\ServerDomainsController::class, 'destroy'])->middleware('throttle:15,1')->name('servers.subdomains.destroy');
    Route::post('/cloudflare/connection', [App\Http\Controllers\ServerDomainsController::class, 'connect'])->middleware('throttle:10,1')->name('cloudflare.connect');
    Route::delete('/cloudflare/connection', [App\Http\Controllers\ServerDomainsController::class, 'disconnect'])->name('cloudflare.disconnect');

    Route::get('/servers/{server}/activity', [App\Http\Controllers\ServerModulesController::class, 'activity'])->name('servers.activity');
    Route::get('/servers/{server}/addons', [App\Http\Controllers\ServerAddonsController::class, 'page'])->name('servers.addons');
    Route::get('/servers/{server}/addons/list', [App\Http\Controllers\ServerAddonsController::class, 'listing']);
    Route::get('/servers/{server}/addons/meta', [App\Http\Controllers\ServerAddonsController::class, 'meta'])->middleware('throttle:120,1');
    Route::post('/servers/{server}/addons/toggle', [App\Http\Controllers\ServerAddonsController::class, 'toggle']);
    Route::post('/servers/{server}/addons/delete', [App\Http\Controllers\ServerAddonsController::class, 'destroy']);
    Route::post('/servers/{server}/addons/upload', [App\Http\Controllers\ServerAddonsController::class, 'upload']);
    Route::get('/servers/{server}/addons/browse', [App\Http\Controllers\ServerAddonsController::class, 'browse'])->middleware('throttle:60,1');
    Route::post('/servers/{server}/addons/install', [App\Http\Controllers\ServerAddonsController::class, 'install'])->middleware('throttle:30,1');
    Route::get('/servers/{server}/addons/updates', [App\Http\Controllers\ServerAddonsController::class, 'updates'])->middleware('throttle:30,1');
    Route::post('/servers/{server}/addons/update', [App\Http\Controllers\ServerAddonsController::class, 'update'])->middleware('throttle:30,1');
    Route::get('/servers/{server}/startup', [App\Http\Controllers\ServerModulesController::class, 'startup'])->name('servers.startup');
    Route::put('/servers/{server}/startup/variables', [App\Http\Controllers\ServerModulesController::class, 'updateStartupVariables'])->name('servers.startup.variables');
    Route::put('/servers/{server}/startup/image', [App\Http\Controllers\ServerModulesController::class, 'updateStartupImage'])->name('servers.startup.image');
    Route::get('/servers/{server}/wings-log', [App\Http\Controllers\WingsLogController::class, 'serverPage'])->name('servers.wings-log');
    Route::get('/servers/{server}/wings-log/events', [App\Http\Controllers\WingsLogController::class, 'serverEvents'])->middleware('throttle:120,1')->name('servers.wings-log.events');
    // WordPress con un clic (hosting web)
    Route::get('/servers/{server}/apps', [App\Http\Controllers\ServerAppsController::class, 'page'])->name('servers.apps');
    Route::get('/servers/{server}/apps/status', [App\Http\Controllers\ServerAppsController::class, 'status'])->middleware('throttle:60,1')->name('servers.apps.status');
    Route::post('/servers/{server}/apps/step', [App\Http\Controllers\ServerAppsController::class, 'step'])->middleware('throttle:120,1')->name('servers.apps.step');
    Route::get('/servers/{server}/wordpress', [App\Http\Controllers\ServerAppsController::class, 'legacy']);
    Route::get('/servers/{server}/sftp', [App\Http\Controllers\ServerSftpController::class, 'show'])->name('servers.sftp');
    Route::post('/servers/{server}/sftp/rotate', [App\Http\Controllers\ServerSftpController::class, 'rotate'])->name('servers.sftp.rotate');
    Route::delete('/servers/{server}/sftp', [App\Http\Controllers\ServerSftpController::class, 'revoke'])->name('servers.sftp.revoke');
    Route::post('/servers/{server}/banner', [ServerController::class, 'updateBanner'])->name('servers.banner.update');
    Route::get('/servers/{server}/subusers', [App\Http\Controllers\ServerSubusersController::class, 'index'])->name('servers.subusers');
    Route::post('/servers/{server}/subusers', [App\Http\Controllers\ServerSubusersController::class, 'store'])->name('servers.subusers.store');
    Route::put('/servers/{server}/subusers/{subuser}', [App\Http\Controllers\ServerSubusersController::class, 'update'])->name('servers.subusers.update');
    Route::delete('/servers/{server}/subusers/{subuser}', [App\Http\Controllers\ServerSubusersController::class, 'destroy'])->name('servers.subusers.destroy');
    Route::get('/servers/edit', fn() => redirect('/servers'));
    // Crear, configurar y borrar servidores (nodo, propietario, recursos): solo Owner/Admin.
    Route::get('/servers', [ServerController::class, 'index'])->name('servers.index');
    Route::middleware('admin')->group(function () {
        // Sin nombres repetidos (si no, `php artisan route:cache` falla). Son las mismas rutas que respondían antes.
        Route::resource('servers', ServerController::class)->only(['create', 'destroy']);
        Route::get('/servers/{server}/edit', [ServerController::class, 'edit'])->name('servers.edit');
        Route::post('/servers', [ServerController::class, 'store'])->name('servers.store');
        Route::match(['put', 'patch'], '/servers/{server}', [ServerController::class, 'update'])->name('servers.update');
    });
    Route::post('/servers/{server}/transfer-owner', [App\Http\Controllers\ServerSubusersController::class, 'transferOwner'])->name('servers.transfer_owner');

    // 🔄 Cambio Rápido de Cuenta / Switch User
    Route::get('/api/switchable-users', function (Request $request) {
        $isDemo = \App\Support\Panel::demoMode();
        abort_unless($isDemo || $request->user()->hasAnyRole(['Owner', 'Admin']), 403);

        return User::select('id', 'name', 'email', 'avatar')
            ->with('roles:id,name')
            ->when(
                $isDemo,
                fn ($query) => $query->whereIn('email', config('panel.demo_emails', [])),
                fn ($query) => $query->whereNotIn('email', config('panel.demo_emails', []))
            )
            ->get()
            ->map(function ($u) {
                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'avatar' => $u->avatar_url,
                    'roles' => $u->roles->pluck('name')->toArray(),
                ];
            });
    });

    Route::post('/api/switch-user', function (Request $request) {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $targetUser = User::findOrFail($validated['user_id']);
        $isDemo = \App\Support\Panel::demoMode();

        // Fuera de la demo, solo los administradores pueden suplantar a otra cuenta.
        abort_unless($isDemo || $request->user()->hasAnyRole(['Owner', 'Admin']), 403, 'No tienes permiso para cambiar de cuenta.');

        // En la demo solo se puede saltar entre cuentas de demostración; fuera de ella, nunca a una de demostración.
        $targetIsDemo = in_array(strtolower($targetUser->email), config('panel.demo_emails', []), true);
        if ($isDemo !== $targetIsDemo) {
            abort(403, $isDemo
                ? 'En la demo solo puedes cambiar entre cuentas de demostración.'
                : 'No se puede cambiar a cuentas de demostración en producción.');
        }

        Auth::login($targetUser);
        \App\Http\Middleware\EnsureServerUnlocked::forgetUnlocked($request->session());
        $request->session()->regenerate();

        return back()->with('success', "Has cambiado a la cuenta de {$targetUser->name}.");
    })->name('user.switch');


    // Network
    // IPs del anfitrión: solo Owner/Admin
    Route::middleware('admin')->group(function () {
        Route::get('/api/ips', [NetworkController::class, 'getIps']);
        Route::get('/api/network/ips', [NetworkController::class, 'getIps']);
    });

    // Galería
    Route::get('/gallery', fn() => Inertia::render('Gallery'))->name('gallery.index');
    // Subir a la galería: solo Owner/Admin
    Route::middleware('admin')->group(function () {
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
    });

    Route::get('/gallery/list', function () {
        $files = Storage::disk('public')->files('gallery');

        $images = collect($files)->map(fn($file) => [
            'url' => Storage::url($file),
            'name' => basename($file),
        ])->reverse()->values();

        return response()->json($images);
    })->name('gallery.list');

    // Borrar de la galería: solo Owner/Admin
    Route::middleware('admin')->group(function () {
        Route::delete('/gallery/delete/{filename}', function ($filename) {
            $path = storage_path('app/public/gallery/' . $filename);

            if (file_exists($path)) {
                unlink($path);
                return response()->json(['success' => true]);
            }

            return response()->json(['error' => 'Archivo no encontrado'], 404);
        })->name('gallery.delete');
    });


    // Users
    Route::get('/users', [UserController::class, 'index'])->middleware('admin:Moderator,Helper')->name('users.index');
    Route::middleware('admin')->group(function () {
        Route::resource('users', UserController::class)->except(['show', 'index']);
        Route::put('/users/{user}/security-lock', [UserController::class, 'updateSecurityLock'])->name('users.security-lock');
    });

    // Roles
    Route::middleware('admin')->group(function () {
        Route::resource('roles', RoleController::class)->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);
    });
});

// Configuración adicional
require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';

Route::get('/dev-autologin', function (Request $request) {
    if (!app()->environment('local')) {
        abort(403);
    }
    $user = User::where('email', 'nini@cinammon.net')->first() ?? User::first();
    if ($user) {
        Auth::login($user);
        $request->session()->regenerate();
    }
    $to = $request->query('to', '/dashboard');
    return redirect($to);
});
