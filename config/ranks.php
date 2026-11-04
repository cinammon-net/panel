<?php

/*
| Rangos de Cinammon.
|
| - purchasable: rangos que se compran en la tienda (billing envía las ventajas al concederlos).
|   El nombre es el del rol en el panel. Las ventajas reales se aplican en el panel
|   (backups / bases de datos / puertos extra por servidor y soporte prioritario) y el
|   descuento en la tienda lo aplica billing.
| - auto: roles que el panel da y quita solo según lo que tiene contratado cada usuario.
| Members es el rol base que todo usuario conserva siempre; aquí no se gestiona.
*/

return [
    'purchasable' => [
        'chispa' => ['name' => 'Chispa', 'color' => '#f59e0b', 'icon' => 'sparkles'],
        'neon' => ['name' => 'Neón', 'color' => '#22d3ee', 'icon' => 'zap'],
        'synthwave' => ['name' => 'Synthwave', 'color' => '#d946ef', 'icon' => 'audio-waveform'],
        'cibercanela' => ['name' => 'Cibercanela', 'color' => '#fb7185', 'icon' => 'flame'],
        'leyenda' => ['name' => 'Leyenda Cinammon', 'color' => '#facc15', 'icon' => 'crown'],
        'arquitecto' => ['name' => 'Arquitecto de Mundos', 'color' => '#34d399', 'icon' => 'blocks'],
        'comandante' => ['name' => 'Comandante de Clan', 'color' => '#f97316', 'icon' => 'swords'],
        'creador' => ['name' => 'Creador de Contenido', 'color' => '#f43f5e', 'icon' => 'video'],
        'desarrollador' => ['name' => 'Desarrollador', 'color' => '#818cf8', 'icon' => 'code'],
        'mecenas' => ['name' => 'Mecenas', 'color' => '#eab308', 'icon' => 'gem'],
    ],

    // Clave => [nombre del rol, color, icono, cómo se consigue]
    'auto' => [
        'cliente' => ['name' => 'Cliente Cinammon', 'color' => '#a78bfa', 'icon' => 'badge-check', 'hint' => 'Tener al menos un servicio activo'],
        'minecraft' => ['name' => 'Constructor', 'color' => '#4ade80', 'icon' => 'box', 'hint' => 'Tener un servidor de Minecraft'],
        'games' => ['name' => 'Gamer', 'color' => '#f472b6', 'icon' => 'gamepad-2', 'hint' => 'Tener un servidor de juego'],
        'bots' => ['name' => 'Domador de Bots', 'color' => '#38bdf8', 'icon' => 'bot', 'hint' => 'Tener un bot o app genérica'],
        'database' => ['name' => 'Guardián de Datos', 'color' => '#c084fc', 'icon' => 'database', 'hint' => 'Tener una base de datos'],
        'voice' => ['name' => 'Voz de la Comunidad', 'color' => '#2dd4bf', 'icon' => 'mic', 'hint' => 'Tener un servidor de voz'],
        'web' => ['name' => 'Webmaster', 'color' => '#fbbf24', 'icon' => 'globe', 'hint' => 'Tener un hosting web'],
        'software' => ['name' => 'Tecnomante', 'color' => '#60a5fa', 'icon' => 'app-window', 'hint' => 'Tener una aplicación autoalojada'],
        'coleccionista' => ['name' => 'Coleccionista', 'color' => '#fb923c', 'icon' => 'layers', 'hint' => 'Tener 3 o más servicios a la vez'],
        'veterano' => ['name' => 'Veterano', 'color' => '#e879f9', 'icon' => 'medal', 'hint' => 'Ser cliente desde hace más de 6 meses'],
    ],
];
