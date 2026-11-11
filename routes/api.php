<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\ServerController;


// Rutas protegidas con Sanctum (las tuyas)
Route::middleware(['auth:sanctum', 'admin'])->group(function () {
    Route::post('/servers', [App\Http\Controllers\ServerController::class, 'store']);
    Route::get('/tickets', [App\Http\Controllers\TicketController::class, 'index']);
    Route::post('/tickets', [App\Http\Controllers\TicketController::class, 'store']);
    Route::get('/nodes/cpu-data', [App\Http\Controllers\NodeController::class, 'getCpuData']);
    Route::get('/nodes/memory-data', [App\Http\Controllers\NodeController::class, 'getMemoryData']);
    Route::get('/nodes/storage-data', [App\Http\Controllers\NodeController::class, 'getStorageData']);
});

// 🔓 Ruta pública de solo lectura para la galería (subir y borrar exige sesión de administrador en /gallery)
Route::get('/gallery/list', function () {
    $files = Storage::files('public/gallery');

    $images = collect($files)->map(fn($file) => [
        'url' => Storage::url($file),
    ])->reverse()->values();

    return response()->json($images);
});

// 🤖 API para Cinammon Discord Bot
Route::middleware('bot.secret')->group(function () {
    Route::get('/bot/overview', [App\Http\Controllers\BotApiController::class, 'overview']);
    Route::post('/servers/{server}/power', [App\Http\Controllers\BotApiController::class, 'power']);
    Route::get('/bot/sync', [App\Http\Controllers\BotSyncController::class, 'sync']);
    Route::post('/bot/tickets', [App\Http\Controllers\BotSyncController::class, 'open']);
    Route::get('/bot/tickets/{ticket}/messages', [App\Http\Controllers\BotSyncController::class, 'messages']);
    Route::post('/bot/tickets/{ticket}/messages', [App\Http\Controllers\BotSyncController::class, 'reply']);
    Route::post('/bot/tickets/{ticket}/status', [App\Http\Controllers\BotSyncController::class, 'status']);
    Route::post('/bot/tickets/{ticket}/claim', [App\Http\Controllers\BotSyncController::class, 'claim']);
    Route::post('/bot/tickets/{ticket}/rating', [App\Http\Controllers\BotSyncController::class, 'rate']);
    Route::post('/bot/birthdays/{celebration}/wish', [App\Http\Controllers\BotBirthdayController::class, 'wish'])->middleware('throttle:120,1');
    Route::get('/bot/birthdays/upcoming', [App\Http\Controllers\BotBirthdayController::class, 'upcoming']);
    Route::get('/bot/discord/{discordId}/birthday', [App\Http\Controllers\BotBirthdayController::class, 'show'])->where('discordId', '[0-9]{5,25}');
    Route::put('/bot/discord/{discordId}/birthday', [App\Http\Controllers\BotBirthdayController::class, 'update'])->where('discordId', '[0-9]{5,25}')->middleware('throttle:10,1');
    // Sanciones sobre servidores desde Discord (staff vinculado)
    Route::get('/bot/discord/{staffId}/moderation/{targetId}', [App\Http\Controllers\BotModerationController::class, 'show'])
        ->where(['staffId' => '[0-9]{5,25}', 'targetId' => '[0-9]{5,25}']);
    Route::post('/bot/discord/{staffId}/moderation/{targetId}/servers', [App\Http\Controllers\BotModerationController::class, 'servers'])
        ->where(['staffId' => '[0-9]{5,25}', 'targetId' => '[0-9]{5,25}'])->middleware('throttle:20,1');

    // Lo que cada usuario puede hacer desde Discord (solo sobre su cuenta vinculada)
    Route::prefix('/bot/discord/{discordId}')->where(['discordId' => '[0-9]{5,25}'])->controller(App\Http\Controllers\BotAccountController::class)->group(function () {
        Route::get('/account', 'account');
        Route::post('/profile', 'profile');
        Route::get('/tickets', 'tickets');
        Route::post('/checkin', 'checkin');
        Route::post('/link', 'link')->middleware('throttle:10,1');
        Route::get('/servers/{server}', 'server');
        Route::post('/servers/{server}/power', 'power');
        Route::post('/servers/{server}/command', 'command');
        Route::post('/servers/{server}/info', 'info');
        Route::get('/servers/{server}/game', 'game');
        Route::put('/servers/{server}/game', 'game');
        Route::post('/announcements', 'announce');
        Route::post('/maintenances', 'maintenance');
    });
    // Administración desde Discord (Owner/Admin)
    Route::prefix('/bot/discord/{discordId}/admin')->where(['discordId' => '[0-9]{5,25}'])->controller(App\Http\Controllers\BotAdminController::class)->group(function () {
        Route::get('/friends', 'friends');
        Route::post('/friends', 'friend');
        Route::get('/eggs', 'eggs');
        Route::get('/nodes', 'nodes');
        Route::post('/nodes', 'createNode');
        Route::post('/nodes/{node}/maintenance', 'nodeMaintenance');
        Route::post('/servers', 'createServer');
        Route::post('/servers/{server}/action', 'serverAction');
    });
});


// 💳 API de integración con Cinammon Billing (token compartido)
Route::post('/billing/provision', [App\Http\Controllers\BillingApiController::class, 'provision']);
Route::post('/billing/servers/{externalId}/cancel', [App\Http\Controllers\BillingApiController::class, 'cancel']);
Route::post('/billing/roles/grant', [App\Http\Controllers\BillingApiController::class, 'grantRole']);
Route::post('/billing/roles/{externalId}/revoke', [App\Http\Controllers\BillingApiController::class, 'revokeRole']);
Route::get('/billing/avatar', [App\Http\Controllers\BillingApiController::class, 'avatar'])->middleware('throttle:120,1');

// Iconos de eggs y catálogo público (los consume el panel y la tienda; sin sesión)
Route::get('/egg-icons/{uuid}', [App\Http\Controllers\EggIconController::class, 'show'])
    ->where('uuid', '[0-9a-fA-F-]{36}')->middleware('throttle:600,1')->name('egg-icons.show');
Route::get('/eggs/catalog', [App\Http\Controllers\EggIconController::class, 'catalog'])->middleware('throttle:60,1');

// Estado de mantenimiento público (lo consume la tienda)
Route::get('/maintenance', [App\Http\Controllers\MaintenanceController::class, 'status'])->middleware('throttle:120,1');

// Anuncios públicos (ofertas y novedades) y contador de clics; ?place=web|panel|store
Route::get('/announcements', [App\Http\Controllers\AnnouncementController::class, 'feed'])->middleware('throttle:120,1');
Route::post('/announcements/{announcement}/click', [App\Http\Controllers\AnnouncementController::class, 'click'])
    ->whereNumber('announcement')->middleware('throttle:30,1');
