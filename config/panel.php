<?php

return [
    // Versión instalada del panel. El instalador/actualizador la fija en .env.
    'version' => env('PANEL_VERSION', '1.0.0'),

    /*
     * Actualizaciones automáticas estilo Pelican: el panel consulta los releases
     * de GitHub y, cuando el admin pulsa "Actualizar", deja una petición en
     * update_request_path que ejecuta el updater privilegiado del host
     * (deploy/updater/cinammon-update.sh vía systemd path unit).
     */
    'updates' => [
        'panel_repo' => env('PANEL_UPDATE_REPO', 'cinammon-net/panel'),
        'wings_repo' => env('PANEL_WINGS_UPDATE_REPO', 'cinammon-net/wings'),
        'github_token' => env('PANEL_UPDATE_GITHUB_TOKEN'),
        'request_path' => env('PANEL_UPDATE_REQUEST_PATH', '/run/cinammon-update/request.json'),
        'status_path' => env('PANEL_UPDATE_STATUS_PATH', '/run/cinammon-telemetry/update-status.json'),
        'cache_minutes' => (int) env('PANEL_UPDATE_CACHE_MINUTES', 30),
    ],

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
