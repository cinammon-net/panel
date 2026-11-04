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
});


// 💳 API de integración con Cinammon Billing (token compartido)
Route::post('/billing/provision', [App\Http\Controllers\BillingApiController::class, 'provision']);
Route::post('/billing/servers/{externalId}/cancel', [App\Http\Controllers\BillingApiController::class, 'cancel']);
Route::post('/billing/roles/grant', [App\Http\Controllers\BillingApiController::class, 'grantRole']);
Route::post('/billing/roles/{externalId}/revoke', [App\Http\Controllers\BillingApiController::class, 'revokeRole']);

// Iconos de eggs y catálogo público (los consume el panel y la tienda; sin sesión)
Route::get('/egg-icons/{uuid}', [App\Http\Controllers\EggIconController::class, 'show'])
    ->where('uuid', '[0-9a-fA-F-]{36}')->middleware('throttle:600,1')->name('egg-icons.show');
Route::get('/eggs/catalog', [App\Http\Controllers\EggIconController::class, 'catalog'])->middleware('throttle:60,1');

// Estado de mantenimiento público (lo consume la tienda)
Route::get('/maintenance', [App\Http\Controllers\MaintenanceController::class, 'status'])->middleware('throttle:120,1');
