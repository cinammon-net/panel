<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'apple' => [
        'client_id' => env('APPLE_CLIENT_ID'),
        'client_secret' => env('APPLE_CLIENT_SECRET'),
        'redirect' => env('APPLE_REDIRECT_URI'),
    ],

    'discord' => [
        'client_id' => env('DISCORD_CLIENT_ID'), 
        'client_secret' => env('DISCORD_CLIENT_SECRET'),
        'redirect' => env('DISCORD_REDIRECT_URI'),
    ],

    'github' => [
        'client_id' => env('GITHUB_CLIENT_ID'),
        'client_secret' => env('GITHUB_CLIENT_SECRET'),
        'redirect' => env('GITHUB_REDIRECT_URI'),
    ],

    'gitlab' => [
        'client_id' => env('GITLAB_CLIENT_ID'),
        'client_secret' => env('GITLAB_CLIENT_SECRET'),
        'redirect' => env('GITLAB_REDIRECT_URI'),
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI'),
    ],

    'bot' => [
        'secret' => env('BOT_INTERNAL_SECRET'),
    ],

    'billing' => [
        'token' => env('BILLING_API_TOKEN'),
        'url' => env('BILLING_URL', 'http://localhost:8001'),
        // Certificado (o CA) para validar la conexión con la tienda cuando se sirve con uno propio.
        'ca' => env('BILLING_CA_BUNDLE'),
    ],
    // Correo saliente: se manda al Worker cinammon-mail (mail/), que envía con Cloudflare Email Sending.
    'cloudflare_mail' => [
        'url' => env('CLOUDFLARE_MAIL_URL'), // https://cinammon-mail.<subdominio>.workers.dev/relay/send (no *.cinammon.net: en el VPS apunta a 127.0.0.1)
        'secret' => env('CLOUDFLARE_MAIL_SECRET'),
        // Buzón del equipo: recibe los avisos de tickets y pagos, y es el "Responder a" de los correos.
        'support' => env('MAIL_SUPPORT_ADDRESS', 'soporte@cinammon.net'),
    ],
];
