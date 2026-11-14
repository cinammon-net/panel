<?php

return [
    // Versión instalada del panel. El instalador/actualizador la fija en .env.
    'version' => env('PANEL_VERSION', '1.0.0'),

    /*
     * Actualizaciones automáticas: el panel consulta los releases
     * de GitHub y, cuando el admin pulsa "Actualizar", deja una petición en
     * update_request_path que ejecuta el updater privilegiado del host
     * (deploy/updater/cinammon-update.sh vía systemd path unit).
     */
    'updates' => [
        'panel_repo' => env('PANEL_UPDATE_REPO', 'cinammon-net/panel'),
        'wings_repo' => env('PANEL_WINGS_UPDATE_REPO', 'cinammon-net/wings'),
        'billing_repo' => env('PANEL_BILLING_UPDATE_REPO', 'cinammon-net/billing'),
        // .env del billing del que se lee BILLING_VERSION (vacío = sin billing en esta máquina).
        'billing_env_path' => env('PANEL_BILLING_ENV_PATH', '/var/www/cinammon-billing/.env'),
        'github_token' => env('PANEL_UPDATE_GITHUB_TOKEN'),
        'request_path' => env('PANEL_UPDATE_REQUEST_PATH', '/run/cinammon-update/request.json'),
        'status_path' => env('PANEL_UPDATE_STATUS_PATH', '/run/cinammon-telemetry/update-status.json'),
        'output_path' => env('PANEL_UPDATE_OUTPUT_PATH', '/run/cinammon-telemetry/update-output.log'),
        'history_path' => env('PANEL_UPDATE_HISTORY_PATH', '/var/lib/cinammon/update-history.jsonl'),
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

    /*
     * Dominio que ven los clientes en lugar de la IP real del nodo (consola, red,
     * bot de Discord, tienda). Debe ser un registro DNS "solo DNS" (nube gris) que
     * apunte al nodo, p. ej. play.cinammon.net. Vacío = se muestra la IP.
     */
    'public_host' => env('PANEL_PUBLIC_HOST', ''),

    /*
     * Dominio para las webs de los servidores de hosting web (huevo de categoría "web"):
     * cada una se publica como <nombre>-<uuid4>.<dominio> a través de Cloudflare (registro
     * comodín * con proxy) y su puerto directo se bloquea en el nodo. Vacío = desactivado.
     */
    'sites_domain' => env('PANEL_SITES_DOMAIN', ''),

    /*
     * Bases de datos de los clientes (MariaDB del propio VPS). host_for_servers es la IP con la que
     * los contenedores llegan a MariaDB (la del puente de Docker de Wings); remote, desde dónde se
     * permite conectar a esos usuarios. Sin DB_PROVISION_* configurado no se crean bases reales.
     */
    'server_databases' => [
        'host_for_servers' => env('PANEL_SERVER_DB_HOST', '172.18.0.1'),
        'port' => (int) env('PANEL_SERVER_DB_PORT', 3306),
        'remote' => env('PANEL_SERVER_DB_REMOTE', '172.18.%'),
        'phpmyadmin_url' => env('PANEL_PHPMYADMIN_URL', 'https://database.cinammon.net'),
    ],

    // Dominio de la consola pública de Wings (vacío = desactivada). Comparte aplicación con el panel real.
    'wings_host' => env('PANEL_WINGS_HOST', ''),
    'wings_demo_url' => env('PANEL_WINGS_DEMO_URL', 'https://demo.cinammon.net/wings'),

    // Dominio de la página de estado pública de la red
    'status_host' => env('PANEL_STATUS_HOST', 'status.cinammon.net'),

    // Dominio del periódico digital y noticias oficiales
    'news_host' => env('PANEL_NEWS_HOST', 'news.cinammon.net'),

    // Dominio de documentación técnica oficial
    'docs_host' => env('PANEL_DOCS_HOST', 'docs.cinammon.net'),

    // Cuentas de demostración que solo pueden iniciar sesión y usarse en modo demo
    'demo_emails' => [
        'demo-owner@cinammon.net',
        'demo-admin@cinammon.net',
        'demo-moderator@cinammon.net',
        'demo-helper@cinammon.net',
        'demo-sponsors@cinammon.net',
        'demo-members@cinammon.net',
        // Cuentas de prueba que sembraba la versión antigua del seeder: no son personas reales
        'moderator@cinammon.net',
        'helper@cinammon.net',
        'sponsors@cinammon.net',
        'members@cinammon.net',
    ],
];
