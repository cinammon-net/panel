<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use App\Http\Controllers\ServerController;


// Rutas protegidas con Sanctum (las tuyas)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/servers', [App\Http\Controllers\ServerController::class, 'store']);
    Route::get('/tickets', [App\Http\Controllers\TicketController::class, 'index']);
    Route::post('/tickets', [App\Http\Controllers\TicketController::class, 'store']);
    Route::get('/nodes/cpu-data', [App\Http\Controllers\NodeController::class, 'getCpuData']);
    Route::get('/nodes/memory-data', [App\Http\Controllers\NodeController::class, 'getMemoryData']);
    Route::get('/nodes/storage-data', [App\Http\Controllers\NodeController::class, 'getStorageData']);
});

// 🔓 Rutas públicas para la galería
Route::post('/gallery/upload', function (Request $request) {
    $request->validate([
        'image' => 'required|image|max:4096',
    ]);

    $path = $request->file('image')->store('public/gallery');

    return response()->json(['path' => Storage::url($path)]);
});

Route::get('/gallery/list', function () {
    $files = Storage::files('public/gallery');

    $images = collect($files)->map(fn($file) => [
        'url' => Storage::url($file),
    ])->reverse()->values();

    return response()->json($images);
});

Route::middleware('auth:sanctum')->get('/remote/servers', [ServerController::class, 'index']);
