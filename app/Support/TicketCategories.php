<?php

namespace App\Support;

/** Tipos de ticket: los mismos en la web y en Discord. */
class TicketCategories
{
    public const ALL = [
        'servidor' => ['label' => 'Mi servidor', 'hint' => 'No arranca, va lento, errores, archivos o configuración'],
        'pagos' => ['label' => 'Pagos y facturas', 'hint' => 'Cobros, facturas, renovaciones o monedas'],
        'cuenta' => ['label' => 'Cuenta y acceso', 'hint' => 'Contraseña, correo, Discord vinculado o rangos'],
        'reporte' => ['label' => 'Reportar a un usuario', 'hint' => 'Alguien incumple las normas o abusa del servicio'],
        'otro' => ['label' => 'Otra consulta', 'hint' => 'Cualquier otra cosa'],
    ];

    public static function keys(): array
    {
        return array_keys(self::ALL);
    }

    public static function label(?string $key): ?string
    {
        return $key ? (self::ALL[$key]['label'] ?? null) : null;
    }

    /** Para los formularios: [{key, label, hint}]. */
    public static function options(): array
    {
        return array_map(fn ($k, $v) => ['key' => $k] + $v, array_keys(self::ALL), self::ALL);
    }
}
