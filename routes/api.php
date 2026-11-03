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
