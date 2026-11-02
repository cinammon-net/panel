<?php

return [
    /*
     * Modo demo global: muestra el selector de cuentas de demostración en el
     * login y permite entrar con ellas. En producción debe estar en false.
     */
    'demo' => env('PANEL_DEMO_MODE', false),

    /*
     * Dominio que fuerza el modo demo aunque el flag global esté en false.
     * Así demo y producción conviven: producción en el dominio principal y
     * demo en este subdominio.
     */
    'demo_host' => env('PANEL_DEMO_HOST', 'demo.localhost'),

    // Cuentas de demostración que solo pueden iniciar sesión y usarse en modo demo
    'demo_emails' => [
        'owner@cinammon.net',
        'demo-admin@cinammon.net',
        'moderator@cinammon.net',
        'helper@cinammon.net',
        'sponsors@cinammon.net',
        'members@cinammon.net',
    ],
];
