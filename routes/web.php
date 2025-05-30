<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
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

// ───────────────────────────────────────
// 🌐 Rutas públicas
// ───────────────────────────────────────

Route::get('/', [WelcomeController::class, 'index'])->name('home');
Route::view('/terms', 'legal.terms')->name('terms');
Route::view('/privacy', 'legal.privacy')->name('privacy');
Route::view('/sponsors', 'legal.sponsors')->name('sponsors');

// ───────────────────────────────────────
// 🔒 Rutas para el Daemon
// ───────────────────────────────────────

Route::middleware(['auth:sanctum'])->group(function () {
    // Mostrar configuración del daemon
    Route::get('/daemon/config', [NodeController::class, 'showConfig'])->name('daemon.config');

    // Guardar cambios en el archivo de configuración del daemon
    Route::post('/daemon/save-config', [NodeController::class, 'saveConfig'])->name('daemon.saveConfig');
});
// ───────────────────────────────────────
// 🔐 Rutas autenticadas y verificadas
// ───────────────────────────────────────

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', fn() => Inertia::render('dashboard'))->name('dashboard');
    Route::get('/settings/appearance', [SettingsController::class, 'appearance'])->name('settings.appearance');
});

// ───────────────────────────────────────
// 🔒 Rutas autenticadas (sin verificar email)
// ───────────────────────────────────────

Route::middleware(['auth'])->group(function () {
    // 🔘 Aceptación de términos
    Route::get('/terms/accept', [TermsController::class, 'show'])->name('terms.accept');
    Route::post('/terms/accept', [TermsController::class, 'accept'])->name('terms.accept.post');

    // 🔤 Fuente personalizada
    Route::post('/settings/font', function (Request $request) {
        $request->validate(['font' => 'required|string']);
        $request->user()->update(['font' => $request->font]);
        return back();
    })->name('settings.font');

    // 📝 Reviews
    Route::get('/reviews', [ReviewController::class, 'index'])->name('reviews.index');
    Route::get('/reviews/create', [ReviewController::class, 'create'])->name('reviews.create');
    Route::post('/reviews', [ReviewController::class, 'store'])->name('reviews.store');
    Route::get('/reviews/{review}/edit', [ReviewController::class, 'edit'])->name('reviews.edit');
    Route::put('/reviews/{review}', [ReviewController::class, 'update'])->name('reviews.update');
    Route::delete('/reviews/{review}', [ReviewController::class, 'destroy'])->name('reviews.destroy');

    // 📄 Posts
    Route::resource('posts', PostController::class);

    // 🎫 Tickets
    Route::resource('tickets', TicketController::class)->except(['create']);
    Route::post('/tickets/{ticket}/messages', [TicketController::class, 'storeMessage'])->name('tickets.message.store');
    //Route::get('/tickets/{id}/edit', [TicketController::class, 'edit'])->name('tickets.edit');
    //Route::put('/tickets/{id}/update', [TicketController::class, 'update'])->name('tickets.update');
    Route::delete('/tickets/{ticket}/messages/{message}', [TicketController::class, 'destroyMessage'])->name('tickets.messages.destroy');

    // 🥚 Eggs
    Route::get('/eggs', [EggController::class, 'index'])->name('eggs.index');
    Route::get('/eggs/create', [EggController::class, 'create'])->name('eggs.create');
    Route::post('/eggs', [EggController::class, 'store'])->name('eggs.store');
    Route::get('/eggs/{egg}/edit', [EggController::class, 'edit'])->name('eggs.edit');
    Route::put('/eggs/{egg}', [EggController::class, 'update'])->name('eggs.update');
    Route::delete('/eggs/{egg}', [EggController::class, 'destroy'])->name('eggs.destroy');
    Route::post('/eggs/import', [EggController::class, 'import'])->name('eggs.import');
    Route::delete('/egg-variables/{id}', [EggVariableController::class, 'destroy'])->name('egg-variables.destroy');

    // 🖧 Nodes
    Route::resource('nodes', NodeController::class);
    Route::get('/nodes/create', [NodeController::class, 'create'])->name('nodes.create');
    Route::post('/nodes', [NodeController::class, 'store'])->name('nodes.store');
    Route::get('/nodes/{node}/edit', [NodeController::class, 'edit'])->name('nodes.edit');
    //Route::put('/nodes/{id}', [NodeController::class, 'update'])->name('nodes.update');
    //Route::delete('/nodes/{id}', [NodeController::class, 'destroy'])->name('nodes.destroy');
    Route::get('/nodes/cpu-data', [NodeController::class, 'getCpuData']);
    Route::get('/nodes/memory-data', [NodeController::class, 'getMemoryData']);
    Route::get('/nodes/storage-data', [NodeController::class, 'getStorageData']);
    // 🖥️ Servers
    Route::resource('servers', ServerController::class);

    // 👤 Users
    Route::get('/users', [UserController::class, 'index'])->name('users.index');

    // 🛡 Roles
    Route::get('/roles', [RoleController::class, 'index'])->name('roles.index');
    Route::resource('roles', RoleController::class)->only(['index', 'create', 'store', 'edit', 'update', 'destroy']);
});

// ───────────────────────────────────────
// 🧩 Configuración adicional
// ───────────────────────────────────────

require __DIR__ . '/settings.php';
require __DIR__ . '/auth.php';
