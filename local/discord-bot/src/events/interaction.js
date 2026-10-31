const { commands } = require('../commands');
const { v2Container, v2Text } = require('../components/v2');
const { callPanelApi } = require('../api/panel');

async function onInteraction({ interaction, token, applicationId, log }) {
    const isSlash = interaction.type === 2;
    const isButton = interaction.type === 3;
    if (!isSlash && !isButton) return;

    const user = interaction.member?.user || interaction.user || { username: 'Usuario' };

    // Ack immediate
    const callbackUrl = `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`;
    await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 5 }), // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    }).catch(() => null);

    let responsePayload;

    if (isSlash) {
        const cmdName = interaction.data?.name;
        log(`Comando: /${cmdName} por @${user.username}`);
        const cmd = commands.get(cmdName);
        if (!cmd) {
            log(`[CMD ERROR] Comando desconocido: /${cmdName} (ejecutado por @${user.username})`);
            responsePayload = v2Container({
                accentColor: 0xef4444,
                children: [v2Text(`### ⚠️ Comando desconocido: \`/${cmdName}\``)],
            });
        } else {
            try {
                responsePayload = await cmd.execute({
                    options: interaction.data?.options || [],
                    user,
                    log,
                });
            } catch (err) {
                log(`[CMD ERROR] Error ejecutando /${cmdName} por @${user.username}: ${err.message}`);
                if (err.stack) {
                    const trace = err.stack.split('\n').slice(0, 3).map((l) => l.trim()).join(' | ');
                    log(`[CMD ERROR TRACE] ${trace}`);
                }
                responsePayload = v2Container({
                    accentColor: 0xef4444,
                    children: [v2Text(`### ⚠️ Error en comando /${cmdName}\n\`${err.message}\``)],
                });
            }
        }
    } else if (isButton) {
        const customId = interaction.data?.custom_id || '';
        log(`Botón: ${customId} por @${user.username}`);

        try {
            // Quick routes: btn:servidores, btn:estado, btn:tienda, btn:perfil, btn:ayuda, power:action:id
            if (customId === 'btn:servidores' || customId === 'v2_cmd:servidores') {
                responsePayload = await commands.get('servidores')?.execute({ user, log });
            } else if (customId === 'btn:estado' || customId === 'v2_cmd:estado') {
                responsePayload = await commands.get('estado')?.execute({ user, log });
            } else if (customId === 'btn:tienda' || customId === 'v2_cmd:tienda') {
                responsePayload = await commands.get('planes')?.execute({ user, log });
            } else if (customId === 'btn:perfil' || customId === 'v2_cmd:perfil') {
                responsePayload = await commands.get('perfil')?.execute({ user, log });
            } else if (customId === 'btn:ayuda' || customId === 'v2_cmd:ayuda') {
                responsePayload = await commands.get('ayuda')?.execute({ user, log });
            } else if (customId.startsWith('power:') || customId.startsWith('v2_power:')) {
                const parts = customId.split(':');
                const action = parts[1];
                const sId = parts[2];
                responsePayload = await commands.get('energia')?.execute({
                    options: [
                        { name: 'servidor_id', value: Number(sId) },
                        { name: 'accion', value: action },
                    ],
                    user,
                    log,
                });
            } else {
                log(`[CMD WARN] Botón sin manejador registrado: ${customId}`);
            }
        } catch (err) {
            log(`[CMD ERROR] Error al procesar botón "${customId}" por @${user.username}: ${err.message}`);
            if (err.stack) {
                const trace = err.stack.split('\n').slice(0, 3).map((l) => l.trim()).join(' | ');
                log(`[CMD ERROR TRACE] ${trace}`);
            }
            responsePayload = v2Container({
                accentColor: 0xef4444,
                children: [v2Text(`### ⚠️ Error en acción: \`${err.message}\``)],
            });
        }
    }

    if (!responsePayload) {
        responsePayload = v2Container({
            accentColor: 0x06b6d4,
            children: [v2Text(`Acción procesada correctamente.`)],
        });
    }

    // Edit deferred message
    await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${interaction.token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responsePayload),
    }).catch((err) => log(`Error al responder: ${err.message}`));
}

module.exports = { onInteraction };
