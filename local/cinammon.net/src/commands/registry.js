const SLASH_COMMANDS = [
    {
        name: 'ping',
        description: 'Comprueba la latencia en vivo del Bot Node.js (Components V2), Cinammon Panel y Wings',
    },
    {
        name: 'estado',
        description: 'Muestra el panel interactivo Components V2 con el estado de nodos, servidores y facturación',
    },
    {
        name: 'servidores',
        description: 'Lista todos los servidores en un contenedor interactivo V2 con controles de energía',
    },
    {
        name: 'crear-servidor',
        description: 'Crea y despliega un nuevo servidor en Cinammon Panel desde Discord',
        options: [
            {
                name: 'nombre',
                description: 'Nombre del servidor (ej. Survival Clan, Bot Música)',
                type: 3,
                required: true,
            },
            {
                name: 'tipo',
                description: 'Motor / Egg del servidor a desplegar',
                type: 3,
                required: true,
                choices: [
                    { name: 'Minecraft Forge Modded (Java)', value: 'forge-modded' },
                    { name: 'PaperMC Java 25 (Minecraft)', value: 'starter-mc' },
                    { name: 'Minecraft Pro Network', value: 'pro-mc' },
                    { name: 'BungeeCord & Velocity Proxy Hub', value: 'bungee-hub' },
                    { name: 'Discord Bot (Node.js 24 LTS)', value: 'bot-v2' },
                    { name: 'Rust Survival Dedicated', value: 'rust-dedicated' },
                    { name: 'Source Engine (CS:GO / GarrysMod)', value: 'source-game' },
                    { name: 'TeamSpeak 3 & Mumble Voice Core', value: 'voice-core' },
                ],
            },
            {
                name: 'memoria_mb',
                description: 'Memoria RAM asignada en MiB (por defecto 1024 MiB)',
                type: 4,
                required: false,
            },
            {
                name: 'cpu',
                description: 'Límite de CPU en porcentaje (por defecto 100%)',
                type: 4,
                required: false,
            },
        ],
    },
    {
        name: 'energia',
        description: 'Controla el encendido, apagado o reinicio de un servidor directamente desde Discord',
        options: [
            {
                name: 'servidor_id',
                description: 'ID numérico o nombre del servidor',
                type: 3,
                required: true,
            },
            {
                name: 'accion',
                description: 'Acción de energía a ejecutar',
                type: 3,
                required: true,
                choices: [
                    { name: 'Iniciar (start)', value: 'start' },
                    { name: 'Reiniciar (restart)', value: 'restart' },
                    { name: 'Detener (stop)', value: 'stop' },
                    { name: 'Forzar apagado (kill)', value: 'kill' },
                ],
            },
        ],
    },
    {
        name: 'tienda',
        description: 'Abre el escaparate Components V2 de Cinammon Billing con compra en 1 clic',
    },
    {
        name: 'comprar',
        description: 'Adquiere un plan de Cinammon Billing y despliega el servidor automáticamente',
        options: [
            {
                name: 'plan_id',
                description: 'Identificador del plan comercial',
                type: 3,
                required: true,
                choices: [
                    { name: 'Minecraft Forge Modded (8.99€/mes)', value: 'forge-modded' },
                    { name: 'Discord Bot Node.js 24 (2.49€/mes)', value: 'bot-v2' },
                    { name: 'PaperMC Java 25 Starter (4.99€/mes)', value: 'starter-mc' },
                    { name: 'Cinammon Pro Network (11.99€/mes)', value: 'pro-mc' },
                    { name: 'BungeeCord & Velocity Proxy (3.99€/mes)', value: 'bungee-hub' },
                    { name: 'Rust Survival Dedicated (14.99€/mes)', value: 'rust-dedicated' },
                    { name: 'Source Engine Games (6.99€/mes)', value: 'source-game' },
                    { name: 'Voice Server TS3/Mumble (1.99€/mes)', value: 'voice-core' },
                    { name: 'Extreme Ryzen 9 Cluster (24.99€/mes)', value: 'ultra-ryzen' },
                ],
            },
            {
                name: 'nombre_servidor',
                description: 'Nombre para tu nuevo servidor al activar el plan',
                type: 3,
                required: true,
            },
            {
                name: 'metodo_pago',
                description: 'Pasarela de pago preferida',
                type: 3,
                required: false,
                choices: [
                    { name: 'Stripe Checkout (Tarjeta / Apple Pay)', value: 'stripe' },
                    { name: 'Discord V2 Instant Pay', value: 'discord_v2' },
                    { name: 'PayPal Express', value: 'paypal' },
                ],
            },
        ],
    },
    {
        name: 'colecta',
        description: 'Crea o aporta a un fondo compartido (Split-Pay) para pagar un servidor entre varios amigos',
        options: [
            {
                name: 'servidor',
                description: 'Nombre del fondo o servidor del clan',
                type: 3,
                required: true,
            },
            {
                name: 'aporte_eur',
                description: 'Cantidad a aportar en EUR (ej. 2.50)',
                type: 10,
                required: true,
            },
        ],
    },
    {
        name: 'eliminar-servidor',
        description: 'Elimina de forma permanente un servidor y libera sus recursos',
        options: [
            {
                name: 'servidor_id',
                description: 'ID o UUID del servidor a eliminar',
                type: 3,
                required: true,
            },
        ],
    },
    {
        name: 'plugins',
        description: 'Muestra los plugins de Cinammon Panel en diseño Components V2 con interruptores en vivo',
    },
    {
        name: 'ayuda',
        description: 'Muestra el centro de control interactivo en formato Discord Components V2',
    },
];

async function registerSlashCommands(token, appId, guildId, log) {
    const headers = {
        Authorization: `Bot ${token}`,
        'Content-Type': 'application/json',
    };
    const route = guildId
        ? `https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`
        : `https://discord.com/api/v10/applications/${appId}/commands`;

    const res = await fetch(route, {
        method: 'PUT',
        headers,
        body: JSON.stringify(SLASH_COMMANDS),
    });

    if (!res.ok && guildId) {
        await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(SLASH_COMMANDS),
        });
    }
    if (log) log(`Slash Commands V2 sincronizados (${SLASH_COMMANDS.length} comandos).`);
}

function getOption(options, name, fallback = null) {
    if (!Array.isArray(options)) return fallback;
    const found = options.find((o) => o.name === name);
    return found && found.value !== undefined ? found.value : fallback;
}

module.exports = {
    SLASH_COMMANDS,
    registerSlashCommands,
    getOption,
};

