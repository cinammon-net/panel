#!/usr/bin/env node
/**
 * Cinammon Discord Bot · Arquitectura Modular y Limpia
 */
const fs = require('fs');
const readline = require('readline');
const { state, log, readConfig, writeStatus, discoverPanelUrl, callPanelApi, CONFIG_PATH } = require('./api/panel');
const { commands, uniqueCommands } = require('./commands/index');
const { onReady } = require('./events/ready');
const { onInteraction } = require('./events/interaction');
const { onMessage } = require('./events/message');

let ws = null;
let heartbeatTimer = null;

state.updatePresence = function (text) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
            JSON.stringify({
                op: 3,
                d: {
                    since: null,
                    activities: [
                        {
                            name: text,
                            type: 0,
                            state: text,
                        },
                    ],
                    status: 'online',
                    afk: false,
                },
            })
        );
    }
};

async function startBot() {
    const cfg = readConfig();
    await discoverPanelUrl(cfg.panel_url);

    if (!cfg.token || cfg.token.length < 25) {
        writeStatus({
            connected: false,
            configured: false,
            tag: null,
            message: 'Bot listo. Introduce el token en la consola del panel para conectar.',
        });
        log('Bot en espera de token de Discord. Consola interactiva lista (status, test, stop).');
        return;
    }

    try {
        const meRes = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bot ${cfg.token}` },
        });

        if (!meRes.ok) {
            writeStatus({
                connected: false,
                configured: true,
                message: `Token no válido (HTTP ${meRes.status}). Verifica el token en el panel.`,
            });
            log(`Error de autenticación con Discord: HTTP ${meRes.status}`);
            return;
        }

        const me = await meRes.json();
        const tag = me.discriminator && me.discriminator !== '0' ? `${me.username}#${me.discriminator}` : me.username;
        state.application_id = me.id;
        state.tag = tag;

        // Registrar slash commands
        await onReady({ user: me, token: cfg.token, guildId: cfg.guild_id, log });

        if (typeof WebSocket === 'undefined') {
            log('WebSocket no disponible en este entorno.');
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
                                intents: 1, // Guilds
                                properties: {
                                    os: 'android',
                                    browser: 'Discord VR',
                                    device: 'Discord VR',
                                },
                                presence: {
                                    since: null,
                                    activities: [
                                        {
                                            name: cfg.status_text || 'Cinammon Network 🥽',
                                            type: 0,
                                            state: cfg.status_text || 'Cinammon Network 🥽',
                                        },
                                    ],
                                    status: 'online',
                                    afk: false,
                                },
                            },
                        })
                    );
                }

                // Interacciones (Slash commands y Botones)
                if (t === 'INTERACTION_CREATE' && d) {
                    await onInteraction({
                        interaction: d,
                        token: cfg.token,
                        applicationId: me.id,
                        log,
                    });
                }

                // Mensajes de texto normales con Prefijo (!)
                if (t === 'MESSAGE_CREATE' && d) {
                    await onMessage({
                        message: d,
                        cfg,
                        log,
                    });
                }
            } catch (err) {
                // error en gateway
            }
        });

        ws.addEventListener('close', (event) => {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
            if ([4004, 4010, 4011, 4012, 4013, 4014].includes(event.code)) {
                writeStatus({ connected: false, message: `Conexión cerrada (código ${event.code}). Revisa el token.` });
                return;
            }
            writeStatus({ connected: false, message: 'Reconectando con Discord...' });
            setTimeout(() => void startBot(), 10000);
        });
    } catch (err) {
        writeStatus({ connected: false, message: `Error: ${err.message}` });
    }
}

async function handleConsoleCommand(rawLine) {
    const line = (rawLine || '').trim();
    if (!line) return;
    const command = line.toLowerCase();

    if (command === 'status' || command === 'estado') {
        const overview = await callPanelApi('/api/bot/overview').catch(() => null);
        log(`Estado: ${state.connected ? 'Conectado (' + state.tag + ')' : 'En espera'} | Servidores: ${overview?.stats?.servers ?? 0}`);
        return;
    }
    if (command === 'stop' || command === 'exit') {
        log('Deteniendo bot...');
        process.exit(0);
    }
    log('Comandos de consola disponibles: status | stop');
}

// Inicialización
log(`Iniciando Cinammon Bot en Node.js ${process.version}...`);
log(`${uniqueCommands.size} comandos cargados con soporte de alias.`);
writeStatus();
void startBot();

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
rl.on('line', (l) => void handleConsoleCommand(l));

try {
    fs.watchFile(CONFIG_PATH, { interval: 3000 }, () => {
        log('Configuración actualizada. Reiniciando conexión...');
        if (ws) {
            try { ws.close(); } catch {}
        }
        void startBot();
    });
} catch {}
