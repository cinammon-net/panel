<?php

namespace App\Support;

use Illuminate\Support\Str;

/**
 * Motor nativo de Autenticación de Doble Factor (TOTP - RFC 6238).
 * Sin dependencias externas, compatible con Google Authenticator, Authy, Microsoft Authenticator y 1Password.
 */
class TwoFactorAuth
{
    private static string $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

    /**
     * Genera una clave secreta aleatoria en Base32 (16 caracteres).
     */
    public static function generateSecretKey(int $length = 16): string
    {
        $secret = '';
        for ($i = 0; $i < $length; $i++) {
            $secret .= self::$base32Chars[random_int(0, 31)];
        }

        return $secret;
    }

    /**
     * Construye la URL estándar otpauth:// para escanear en apps de autenticación.
     */
    public static function getOtpAuthUrl(string $email, string $secret, string $issuer = 'Cinammon'): string
    {
        $label = rawurlencode($issuer) . ':' . rawurlencode($email);

        return "otpauth://totp/{$label}?secret={$secret}&issuer=" . rawurlencode($issuer) . '&algorithm=SHA1&digits=6&period=30';
    }

    /**
     * URL de imagen QR lista para mostrar en el navegador.
     */
    public static function getQrCodeImageUrl(string $otpAuthUrl): string
    {
        return 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' . urlencode($otpAuthUrl) . '&color=ff3388&bgcolor=09090b';
    }

    /**
     * Verifica si el código de 6 dígitos introducido es válido para la clave secreta.
     * Permite una discrepancia de ±1 intervalo de tiempo (30 segundos).
     */
    public static function verifyKey(string $secret, string $code, int $discrepancy = 1): bool
    {
        $code = trim($code);
        if (strlen($code) !== 6 || ! ctype_digit($code)) {
            return false;
        }

        $currentTimeSlice = (int) floor(time() / 30);

        for ($i = -$discrepancy; $i <= $discrepancy; $i++) {
            $calculatedCode = self::calculateCode($secret, $currentTimeSlice + $i);
            if (hash_equals($calculatedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Calcula el código TOTP para un intervalo de tiempo específico.
     */
    public static function calculateCode(string $secret, int $timeSlice): string
    {
        $secretKey = self::base32Decode($secret);
        if ($secretKey === '') {
            return '000000';
        }

        // Empaquetar el contador en 8 bytes en formato binario Big-Endian
        $time = pack('N*', 0, $timeSlice);
        $hm = hash_hmac('sha1', $time, $secretKey, true);

        // Truncado dinámico según RFC 4226
        $offset = ord(substr($hm, -1)) & 0x0F;
        $hashPart = substr($hm, $offset, 4);

        $value = unpack('N', $hashPart)[1] & 0x7FFFFFFF;
        $modulo = $value % 1000000;

        return str_pad((string) $modulo, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Decodifica una cadena Base32 a binario.
     */
    public static function base32Decode(string $b32): string
    {
        $b32 = strtoupper(trim($b32));
        if ($b32 === '') {
            return '';
        }

        $lookup = [];
        for ($i = 0; $i < 32; $i++) {
            $lookup[self::$base32Chars[$i]] = $i;
        }

        $buffer = 0;
        $bitsLeft = 0;
        $binary = '';

        $len = strlen($b32);
        for ($i = 0; $i < $len; $i++) {
            $ch = $b32[$i];
            if (! isset($lookup[$ch])) {
                continue;
            }

            $buffer = ($buffer << 5) | $lookup[$ch];
            $bitsLeft += 5;

            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $binary .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }

        return $binary;
    }

    /**
     * Genera 8 códigos de recuperación de un solo uso (ej: 8H7K2-9B4Z1).
     */
    public static function generateRecoveryCodes(int $count = 8): array
    {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $p1 = strtoupper(Str::random(5));
            $p2 = strtoupper(Str::random(5));
            $codes[] = "{$p1}-{$p2}";
        }

        return $codes;
    }
}
