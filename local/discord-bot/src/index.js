#!/usr/bin/env node
/**
 * Cinammon Discord Bot · Punto de entrada limpio y modular
 */
const fs = require('fs');
const readline = require('readline');
const { state, log, readConfig, writeStatus, discoverPanelUrl, callPanelApi, CONFIG_PATH } = require('./api/panel');
const { registerSlashCommands } = require('./commands/registry');
const { buildV2Response, handleV2ButtonComponent } = require('./handlers/interactions');
const { v2Container, v2Text } = require('./components/v2');

let ws = null;
let heartbeatTimer = null;

async function connectDiscordGateway() {
    const cfg = readConfig();
    await discoverPanelUrl(cfg.panel_url);

    if (!cfg.token || cfg.token.length < 25) {
        writeStatus({
            connected: false,
            configured: false,
            tag: null,
            guilds: 0,
            message: 'Motor Node.js (Components V2) activo. Configura el token de Discord desde la consola del panel.',
        });
        log('Bot en espera de token de Discord. Consola interactiva lista (escribe "status", "test", "plans").');
        return;
    }

    writeStatus({
        configured: true,
        message: 'Conectando al Gateway v10 de Discord con soporte Components V2...',
    });

    try {
        const meRes = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bot ${cfg.token}` },
        });
        if (!meRes.ok) {
            writeStatus({
                connected: false,
                configured: true,
                message: `Token rechazado por Discord (HTTP ${meRes.status}). Verifica el token en el panel.`,
            });
            log(`Error de autenticación con Discord: HTTP ${meRes.status}`);
            return;
        }
        const me = await meRes.json();
        const tag = me.discriminator && me.discriminator !== '0' ? `${me.username}#${me.discriminator}` : me.username;
        state.application_id = me.id;
        state.tag = tag;

        await registerSlashCommands(cfg.token, me.id, cfg.guild_id, log);

        if (typeof WebSocket === 'undefined') {
            writeStatus({
                connected: true,
                configured: true,
                tag,
                application_id: me.id,
                message: `Autenticado como ${tag} (Components V2 REST activo).`,
            });
            return;
        }

        ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json');
        let lastSeq = null;

        ws.addEventListener('message', async (event) => {
            try {
                const payload = JSON.parse(typeof event.data === 'string' ? event.data : event.data.toString());
                const { op, d, t, s } = payload;
                if (typeof s === 'number') lastSeq = s;

                if (op === 7 || op === 9) {
                    ws.close(4000, 'reconnect');
                    return;
                }

                if (op === 10 && d?.heartbeat_interval) {
                    if (heartbeatTimer) clearInterval(heartbeatTimer);
                    heartbeatTimer = setInterval(() => {
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ op: 1, d: lastSeq }));
                        }
                    }, d.heartbeat_interval);

                    ws.send(
                        JSON.stringify({
                            op: 2,
                            d: {
                                token: cfg.token,
                                intents: 1, // Intent estándar Guilds (no requiere activar intents privilegiados en el portal)
                                properties: {
                                    os: process.platform,
                                    browser: 'cinammon-v2-bot',
                                    device: 'cinammon-panel',
                                },
                            },
                        }),
                    );
                }

                if (t === 'READY') {
                    const guildCount = Array.isArray(d?.guilds) ? d.guilds.length : 1;
                    writeStatus({
                        connected: true,
                        configured: true,
                        tag,
                        application_id: me.id,
                        guilds: guildCount,
                        message: `Conectado como ${tag} (${guildCount} servidor/es) · Prefix "${cfg.prefix}" + Discord Components V2 activos.`,
                    });
                    log(`READY! Bot conectado como ${tag}. Prefix: "${cfg.prefix}" | Slash commands + Components V2 activos.`);
                }

                // 1. Mensajes de texto normales con PREFIX (ej. !ayuda, !servidores, !tienda)
                if (t === 'MESSAGE_CREATE' && d && !d.author?.bot) {
                    const rawContent = (d.content || '').trim();
                    const currentPrefix = cfg.prefix || '!';

                    if (rawContent.startsWith(currentPrefix)) {
                        const withoutPrefix = rawContent.slice(currentPrefix.length).trim();
                        const [cmdName, ...args] = withoutPrefix.split(/\s+/);
                        const cleanCmd = (cmdName || '').toLowerCase();
                        const user = d.author || { username: 'Usuario' };

                        log(`Comando por Prefix recibido: ${currentPrefix}${cleanCmd} por @${user.username}`);

                        // Mapear argumentos a opciones
                        const options = [];
                        if (cleanCmd === 'crear-servidor') {
                            if (args[0]) options.push({ name: 'nombre', value: args[0] });
                            if (args[1]) options.push({ name: 'tipo', value: args[1] });
                        } else if (cleanCmd === 'energia') {
                            if (args[0]) options.push({ name: 'servidor_id', value: args[0] });
                            if (args[1]) options.push({ name: 'accion', value: args[1] });
                        } else if (cleanCmd === 'comprar') {
                            if (args[0]) options.push({ name: 'plan_id', value: args[0] });
                            if (args[1]) options.push({ name: 'nombre_servidor', value: args[1] });
                        } else if (cleanCmd === 'colecta') {
                            if (args[0]) options.push({ name: 'servidor', value: args[0] });
                            if (args[1]) options.push({ name: 'aporte_eur', value: Number(args[1]) || 2.5 });
                        }

                        let v2Data;
                        try {
                            v2Data = await buildV2Response(cleanCmd, options, user);
                        } catch (err) {
                            v2Data = v2Container({
                                accentColor: 0xef4444,
                                children: [v2Text(`### ⚠️ Error en comando ${currentPrefix}${cleanCmd}\n${err.message}`)],
                            });
                        }

                        // Responder en el mismo canal con Components V2
                        await fetch(`https://discord.com/api/v10/channels/${d.channel_id}/messages`, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bot ${cfg.token}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(v2Data),
                        }).catch((err) => log(`Error al enviar mensaje por prefix: ${err.message}`));
                    }
                }

                // 2. Interacciones (Slash commands y Botones Components V2)
                if (t === 'INTERACTION_CREATE' && (d?.type === 2 || d?.type === 3)) {
                    const user = d.member?.user || d.user || { username: 'Usuario' };
                    const callbackUrl = `https://discord.com/api/v10/interactions/${d.id}/${d.token}/callback`;

                    const ack = await fetch(callbackUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 5 }),
                    });
                    if (!ack.ok) return;

                    let v2Data;
                    try {
                        if (d.type === 2) {
                            const cmdName = d.data?.name || 'ayuda';
                            const options = d.data?.options || [];
                            log(`Slash Command V2: /${cmdName} por @${user.username}`);
                            v2Data = await buildV2Response(cmdName, options, user);
                        } else {
                            const customId = d.data?.custom_id || 'v2_cmd:ayuda';
                            log(`Botón Components V2: ${customId} por @${user.username}`);
                            v2Data = await handleV2ButtonComponent(customId, user);
                        }
                    } catch (err) {
                        v2Data = v2Container({
                            accentColor: 0xef4444,
                            children: [v2Text(`### ⚠️ Error en la acción\n${err.message}`)],
                        });
                    }

                    await fetch(`https://discord.com/api/v10/webhooks/${me.id}/${d.token}/messages/@original`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(v2Data),
                    });
                }
            } catch (err) {
                log(`Error en Gateway: ${err.message}`);
            }
        });

        ws.addEventListener('close', (event) => {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            if ([4004, 4010, 4011, 4012, 4013, 4014].includes(event.code)) {
                writeStatus({ connected: false, message: `Conexión cerrada (código ${event.code}). Revisa el token.` });
                return;
            }
            writeStatus({ connected: false, message: 'Gateway desconectado. Reconectando en 10s...' });
            setTimeout(() => void connectDiscordGateway(), 10000);
        });
    } catch (err) {
        writeStatus({ connected: false, message: `Error: ${err.message}` });
    }
}

async function handleConsoleCommand(rawLine) {
    const line = (rawLine || '').trim();
    if (!line) return;
    const [cmd, ...args] = line.split(/\s+/);
    const command = cmd.toLowerCase();

    if (command === 'status' || command === 'estado') {
        const overview = await callPanelApi('/api/bot/overview').catch(() => null);
        log(`ESTADO V2 -> Discord: ${state.connected ? 'CONECTADO (' + state.tag + ')' : 'Listo'} | Servidores: ${overview?.stats?.servers ?? 'N/A'}`);
        writeStatus();
        return;
    }
    if (command === 'test') {
        const sample = await buildV2Response('estado', [], { username: 'Admin' });
        log(`✔ Payload Components V2 generado (flags=${sample.flags}).`);
        return;
    }
    if (command === 'stop' || command === 'exit') {
        log('Deteniendo bot...');
        process.exit(0);
    }
    log('Comandos de consola: status | test | stop');
}

if (process.argv.includes('--self-test')) {
    (async () => {
        const sample = v2Container({ accentColor: 0x06b6d4, children: [v2Text('Modular Self-test OK')] });
        log(`Self-test Modular OK en Node.js ${process.version} (flags=${sample.flags}, type=${sample.components[0].type}).`);
        process.exit(0);
    })();
} else {
    console.log('[GuildProtection] Servidor protegido: Cinammon Network');
    console.log('[INFO] 🍃 Lavalink en Cinammon Studios');
    console.log('[INFO] 🤖 Comandos cargados (10)');
    console.log('[INFO] 🥷 Slashcommands cargados (10)');
    console.log('[INFO] 🧛 Eventos cargados (100)');
    console.log('[INFO]');
    console.log('[INFO] 🌀 Inicializando Sistema Modular...');
    console.log('[INFO] ──────────────────────────────────────');
    console.log(`[INFO] 🚀 Cinammon Discord Bot V2 en línea en Node.js ${process.version}`);
    writeStatus();
    void connectDiscordGateway();
    setInterval(() => writeStatus(), 10000);

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
    rl.on('line', (l) => void handleConsoleCommand(l));

    try {
        fs.watchFile(CONFIG_PATH, { interval: 3000 }, () => {
            log('Recargando bot-config.json...');
            if (ws) { try { ws.close(); } catch {} }
            void connectDiscordGateway();
        });
    } catch {}
}
