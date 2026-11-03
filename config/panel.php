<?php

return [
    /*
     * Marca esta instalación como la DEMO (carpeta, base de datos y usuario propios):
     * muestra el selector de cuentas de demostración y simula el nodo. En el panel
     * real debe estar en false.
     */
    'demo' => env('PANEL_DEMO_MODE', false),

    /*
     * Dominio de la demo. Déjalo vacío en el panel real para que ninguna petición
     * pueda activar el modo demo allí.
     */
    'demo_host' => env('PANEL_DEMO_HOST', 'demo.localhost'),

    // Dominio de la consola pública de Wings (vacío = desactivada). Comparte aplicación con el panel real.
    'wings_host' => env('PANEL_WINGS_HOST', ''),
    'wings_demo_url' => env('PANEL_WINGS_DEMO_URL', 'https://demo.cinammon.net/wings'),

    // Cuentas de demostración que solo pueden iniciar sesión y usarse en modo demo
    'demo_emails' => [
        'demo-owner@cinammon.net',
        'demo-admin@cinammon.net',
        'demo-moderator@cinammon.net',
        'demo-helper@cinammon.net',
        'demo-sponsors@cinammon.net',
        'demo-members@cinammon.net',
    ],
];
