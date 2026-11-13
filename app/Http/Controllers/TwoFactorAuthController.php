<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\TwoFactorAuth;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorAuthController extends Controller
{
    /**
     * Inicia la activación del 2FA generando la clave secreta y la URL del código QR.
     */
    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();

        // Si ya tenía uno sin confirmar o nuevo, generamos una clave nueva
        $secret = TwoFactorAuth::generateSecretKey(16);
        $otpAuthUrl = TwoFactorAuth::getOtpAuthUrl($user->email, $secret, 'Cinammon');
        $qrImageUrl = TwoFactorAuth::getQrCodeImageUrl($otpAuthUrl);

        // Guardar la clave provisionalmente hasta que el usuario confirme el primer código
        $user->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json([
            'secret' => $secret,
            'otpauth_url' => $otpAuthUrl,
            'qr_url' => $qrImageUrl,
        ]);
    }

    /**
     * Confirma el 2FA verificando el código de 6 dígitos introducido por el usuario.
     */
    public function confirm(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();
        $secret = (string) $user->two_factor_secret;

        if ($secret === '') {
            return response()->json(['error' => 'No hay una configuración de 2FA pendiente.'], 422);
        }

        if (! TwoFactorAuth::verifyKey($secret, $request->input('code'))) {
            return response()->json(['error' => 'El código de 6 dígitos no es correcto. Asegúrate de que la hora de tu teléfono esté sincronizada.'], 422);
        }

        // Generar 8 códigos de recuperación de respaldo
        $recoveryCodes = TwoFactorAuth::generateRecoveryCodes(8);

        $user->forceFill([
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
            'two_factor_confirmed_at' => now(),
        ])->save();

        return response()->json([
            'success' => true,
            'recovery_codes' => $recoveryCodes,
            'message' => 'Autenticación en Dos Pasos (2FA) activada correctamente.',
        ]);
    }

    /**
     * Desactiva el 2FA requiriendo la contraseña del usuario por seguridad.
     */
    public function disable(Request $request): JsonResponse|RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = $request->user();

        if (! Hash::check($request->input('password'), $user->password)) {
            return response()->json(['error' => 'La contraseña introducida es incorrecta.'], 422);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        return response()->json([
            'success' => true,
            'message' => 'Autenticación en Dos Pasos desactivada.',
        ]);
    }

    /**
     * Regenera un nuevo lote de 8 códigos de recuperación.
     */
    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user->hasTwoFactorEnabled()) {
            return response()->json(['error' => 'El 2FA no está activado.'], 422);
        }

        $recoveryCodes = TwoFactorAuth::generateRecoveryCodes(8);
        $user->forceFill([
            'two_factor_recovery_codes' => json_encode($recoveryCodes),
        ])->save();

        return response()->json([
            'success' => true,
            'recovery_codes' => $recoveryCodes,
        ]);
    }

    /**
     * Muestra la pantalla de desafío 2FA durante el inicio de sesión.
     */
    public function showChallenge(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('login.two_factor_user_id')) {
            return redirect()->route('login');
        }

        return Inertia::render('auth/two-factor-challenge');
    }

    /**
     * Valida el código 2FA o código de recuperación en el inicio de sesión.
     */
    public function verifyChallenge(Request $request): RedirectResponse
    {
        $userId = $request->session()->get('login.two_factor_user_id');
        if (! $userId) {
            return redirect()->route('login');
        }

        $user = User::findOrFail($userId);
        $code = trim((string) $request->input('code', ''));
        $recoveryCode = trim((string) $request->input('recovery_code', ''));

        // 1. Validar por código TOTP de 6 dígitos
        if ($code !== '') {
            if (TwoFactorAuth::verifyKey((string) $user->two_factor_secret, $code)) {
                return $this->completeLogin($request, $user);
            }
        }

        // 2. Validar por código de recuperación
        if ($recoveryCode !== '') {
            $codes = json_decode((string) $user->two_factor_recovery_codes, true) ?: [];
            $formattedCode = strtoupper($recoveryCode);

            if (($idx = array_search($formattedCode, $codes, true)) !== false) {
                // Eliminar el código usado para que no se pueda reutilizar
                unset($codes[$idx]);
                $user->forceFill([
                    'two_factor_recovery_codes' => json_encode(array_values($codes)),
                ])->save();

                return $this->completeLogin($request, $user);
            }
        }

        return back()->withErrors([
            'code' => 'El código de autenticación o de recuperación no es válido.',
        ]);
    }

    private function completeLogin(Request $request, User $user): RedirectResponse
    {
        $remember = (bool) $request->session()->pull('login.remember', false);
        $request->session()->forget('login.two_factor_user_id');

        Auth::login($user, $remember);
        $request->session()->regenerate();

        return redirect()->intended(route('servers.index', absolute: false));
    }
}
