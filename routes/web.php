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

// 🤖 API Universal del Bot de Discord (Node.js · Components V2 · Local & VPS)
Route::prefix('api/bot')->group(function () {
    Route::get('/overview', [AdvancedSectionController::class, 'botOverview']);
    Route::post('/servers/create', [AdvancedSectionController::class, 'botCreateServer']);
    Route::post('/servers/power', [AdvancedSectionController::class, 'botServerPower']);
    Route::post('/billing/checkout', [AdvancedSectionController::class, 'botBillingCheckout']);
    Route::post('/billing/split-pay', [AdvancedSectionController::class, 'botBillingSplitPay']);
    Route::post('/plugins/toggle', [AdvancedSectionController::class, 'botPluginToggle']);
});

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
    Route::get('/dashboard', function () {
        $labels = [];
        $installations = [];
        $newUsers = [];
        $errors = [];

        $hasFailedJobs = Schema::hasTable('failed_jobs');
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dateStr = $date->toDateString();
            $labels[] = $date->format('D');
            $installations[] = Server::whereDate('created_at', $dateStr)->count();
            $newUsers[] = User::whereDate('created_at', $dateStr)->count();
            $errors[] = $hasFailedJobs
                ? DB::table('failed_jobs')->whereDate('failed_at', $dateStr)->count()
                : 0;
        }

        return Inertia::render('dashboard', [
            'stats' => [
                'users' => User::count(),
                'servers' => Server::count(),
                'installations' => Egg::count(),
                'nodes' => Node::count(),
            ],
            'weeklyActivity' => [
                'labels' => $labels,
                'installations' => $installations,
                'newUsers' => $newUsers,
                'errors' => $errors,
            ],
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

    // 💳 Monetización & Billing (cinammon-es/billing)
    Route::get('/billing', [AdvancedSectionController::class, 'billing'])->name('billing.index');
    Route::post('/billing/plans', [AdvancedSectionController::class, 'storeBillingPlan'])->name('billing.plans.store');
    Route::post('/billing/checkout', [AdvancedSectionController::class, 'checkoutBillingPlan'])->name('billing.checkout');
    Route::post('/billing/split-pay', [AdvancedSectionController::class, 'createSplitPayPool'])->name('billing.split-pay.store');
    Route::post('/billing/split-pay/{id}/contribute', [AdvancedSectionController::class, 'contributeSplitPayPool'])->name('billing.split-pay.contribute');

    // 🧩 Sistema de Plugins (Compatible con Pelican + Exclusivos Cinammon)
    Route::get('/plugins', [AdvancedSectionController::class, 'plugins'])->name('plugins.index');
    Route::post('/plugins/toggle', [AdvancedSectionController::class, 'togglePlugin'])->name('plugins.toggle');
    Route::post('/plugins/install', [AdvancedSectionController::class, 'installPlugin'])->name('plugins.install');
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
    Route::post('/servers/{server}/databases', [ServerController::class, 'storeDatabase']);
    Route::delete('/servers/{server}/databases/{dbId}', [ServerController::class, 'destroyDatabase']);
    Route::resource('servers', ServerController::class)->except(['show']);
    Route::get('/servers/{server}/edit', [ServerController::class, 'edit'])->name('servers.edit');
    Route::post('/servers', [ServerController::class, 'store'])->name('servers.store');
    Route::put('/servers/{server}', [ServerController::class, 'update'])->name('servers.update');
    Route::delete('/servers/{uuid}', [ServerController::class, 'destroy'])->name('servers.destroy');


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
