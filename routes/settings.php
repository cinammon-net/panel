<?php

use App\Http\Controllers\Settings\PasswordController;
use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use App\Http\Controllers\Settings\ServerLockController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::redirect('settings', 'settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('settings/profile/avatar', [ProfileController::class, 'updateAvatar'])->name('profile.avatar.update');
    Route::delete('settings/profile/avatar', [ProfileController::class, 'destroyAvatar'])->name('profile.avatar.destroy');
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/password', [PasswordController::class, 'edit'])->name('password.edit');
    Route::put('settings/password', [PasswordController::class, 'update'])->name('password.update');

    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');
    Route::post('settings/security/logout-others', [SecurityController::class, 'logoutOtherSessions'])->name('security.logout-others');

    Route::post('settings/security/lock', [ServerLockController::class, 'store'])->name('server-lock.store');
    Route::post('settings/security/lock/enable', [ServerLockController::class, 'enable'])->name('server-lock.enable');
    Route::post('settings/security/lock/disable', [ServerLockController::class, 'disable'])->name('server-lock.disable');
    Route::put('settings/security/lock/code', [ServerLockController::class, 'changeCode'])->name('server-lock.code');
    Route::post('settings/security/lock/relock', [ServerLockController::class, 'relock'])->name('server-lock.relock');
    Route::get('security/unlock', [ServerLockController::class, 'unlockPage'])->name('server-lock.unlock');
    Route::post('security/unlock', [ServerLockController::class, 'unlock'])->name('server-lock.unlock.submit');

    Route::get('settings/appearance', function () {
        return Inertia::render('settings/appearance');
    })->name('appearance');
});
