<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ServerController;
use App\Http\Controllers\TicketController;
use App\Http\Controllers\NodeController;

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/servers', [ServerController::class, 'store']);
    Route::get('/tickets', [TicketController::class, 'index']);
    Route::post('/tickets', [TicketController::class, 'store']);
    Route::get('/nodes/cpu-data', [NodeController::class, 'getCpuData']);
    Route::get('/nodes/memory-data', [NodeController::class, 'getMemoryData']);
    Route::get('/nodes/storage-data', [NodeController::class, 'getStorageData']);
});