const { commands } = require('../commands');
const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../components/v2');
const { state } = require('../api/panel');

async function onMessage({ message, cfg, log }) {
    if (!message || message.author?.bot) return;
    const content = (message.content || '').trim();
    const prefix = cfg.prefix || '!';
    const botId = state.application_id;
    const user = message.author || { username: 'Usuario' };

    // 1. Detección de Mención Directa al Bot (@Bot)
    const isDirectMention = botId && (
        content === `<@${botId}>` ||
        content === `<@!${botId}>` ||
        content === `<@${botId}> ` ||
        content === `<@!${botId}> `
    );

    if (isDirectMention) {
        log(`Mención recibida por @${user.username}`);
        const mentionResponse = v2Container({
            accentColor: 0x06b6d4,
            children: [
                v2Text(`## 👋 ¡Hola, @${user.username}!\nSoy **${state.tag || 'Cinammon Bot'}**, el bot oficial de Cinammon Network.\n\n• **Prefijo para comandos:** \`${prefix}\`\n• **Comandos con barra:** Activos con \`/\`\n• **Alias soportados:** Nombres cortos (ej: \`${prefix}sv\`, \`${prefix}status\`, \`${prefix}perfil\`)`),
                v2Separator(true, 1),
                v2Section(
                    [
                        `### ⚙️ Perfil y Personalización\nPuedes consultar o modificar el nombre y prefijo del bot con \`/perfil\`.`,
                    ],
                    v2Button({
                        label: 'Ver Perfil',
                        custom_id: 'btn:perfil',
                        style: ButtonStyle.PRIMARY,
                    })
                ),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: '📖 Guía de Comandos', custom_id: 'btn:ayuda', style: ButtonStyle.SECONDARY }),
                    v2Button({ label: '🖥️ Servidores', custom_id: 'btn:servidores', style: ButtonStyle.SECONDARY }),
                    v2Button({ label: '🌐 Abrir Panel', url: cfg.panel_url || 'http://localhost:8000', style: ButtonStyle.LINK }),
                ]),
            ],
        });

        await fetch(`https://discord.com/api/v10/channels/${message.channel_id}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bot ${cfg.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(mentionResponse),
        }).catch((err) => log(`Error al responder mención: ${err.message}`));
        return;
    }

    // 2. Detección de Comandos por Prefijo (ej: !ayuda, !sv, !perfil)
    let isCommand = false;
    let cleanContent = '';

    if (content.startsWith(prefix)) {
        isCommand = true;
        cleanContent = content.slice(prefix.length).trim();
    } else if (botId && (content.startsWith(`<@${botId}>`) || content.startsWith(`<@!${botId}>`))) {
        // También permite ejecutar comandos mencionando: @Bot ayuda
        isCommand = true;
        cleanContent = content.replace(new RegExp(`^<@!?${botId}>`), '').trim();
    }

    if (!isCommand || !cleanContent) return;

    const [rawCmd, ...args] = cleanContent.split(/\s+/);
    const cmdName = (rawCmd || '').toLowerCase();

    // Buscar en comandos registrados y sus alias
    const cmd = commands.get(cmdName);
    if (!cmd) return;

    log(`Comando por prefijo: ${prefix}${cmdName} por @${user.username}`);

    try {
        const payload = await cmd.execute({
            options: args.map((val, i) => ({ name: `arg${i}`, value: val })),
            user,
        });

        await fetch(`https://discord.com/api/v10/channels/${message.channel_id}/messages`, {
            method: 'POST',
            headers: {
                Authorization: `Bot ${cfg.token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
    } catch (err) {
        log(`Error en prefijo ${cmdName}: ${err.message}`);
    }
}

module.exports = { onMessage };
