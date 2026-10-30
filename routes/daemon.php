<?php

use App\Http\Controllers\DaemonController;
use App\Http\Middleware\DaemonAuth;
use Illuminate\Support\Facades\Route;

Route::prefix('api/remote')->middleware(DaemonAuth::class)->group(function () {
    Route::get('/servers', [DaemonController::class, 'servers']);
    Route::post('/servers/reset', [DaemonController::class, 'reset']);
    Route::get('/servers/{uuid}', [DaemonController::class, 'configuration']);
    Route::get('/servers/{uuid}/install', [DaemonController::class, 'installScript']);
    Route::post('/servers/{uuid}/install', [DaemonController::class, 'installed']);
    Route::post('/servers/{uuid}/container/status', [DaemonController::class, 'state']);
    Route::post('/activity', [DaemonController::class, 'activity']);
});
