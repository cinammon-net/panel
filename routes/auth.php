<?php

use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\EmailVerificationNotificationController;
use App\Http\Controllers\Auth\EmailVerificationPromptController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\Auth\VerifyEmailController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');

    Route::post('register', [RegisteredUserController::class, 'store']);

    Route::get('login', [AuthenticatedSessionController::class, 'create'])
        ->name('login');

    Route::post('login', [AuthenticatedSessionController::class, 'store']);

    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->name('password.email');

    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])
        ->name('password.reset');

    Route::post('reset-password', [NewPasswordController::class, 'store'])
        ->name('password.store');

    // Desafío 2FA durante el login
    Route::get('two-factor-challenge', [\App\Http\Controllers\TwoFactorAuthController::class, 'showChallenge'])
        ->name('two-factor.challenge');
    Route::post('two-factor-challenge', [\App\Http\Controllers\TwoFactorAuthController::class, 'verifyChallenge'])
        ->name('two-factor.challenge.verify');
});

Route::middleware('auth')->group(function () {
    // Gestión del 2FA en ajustes
    Route::post('user/two-factor-authentication', [\App\Http\Controllers\TwoFactorAuthController::class, 'enable'])
        ->name('two-factor.enable');
    Route::post('user/confirmed-two-factor-authentication', [\App\Http\Controllers\TwoFactorAuthController::class, 'confirm'])
        ->name('two-factor.confirm');
    Route::delete('user/two-factor-authentication', [\App\Http\Controllers\TwoFactorAuthController::class, 'disable'])
        ->name('two-factor.disable');
    Route::post('user/two-factor-recovery-codes', [\App\Http\Controllers\TwoFactorAuthController::class, 'regenerateRecoveryCodes'])
        ->name('two-factor.recovery-codes');
    Route::get('verify-email', EmailVerificationPromptController::class)
        ->name('verification.notice');

    Route::get('verify-email/{id}/{hash}', VerifyEmailController::class)
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');

    Route::post('email/verification-notification', [EmailVerificationNotificationController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('verification.send');

    Route::get('confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('password.confirm');

    Route::post('confirm-password', [ConfirmablePasswordController::class, 'store']);

    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])
        ->name('logout');
});
