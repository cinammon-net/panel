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
        if (cmd) {
            try {
                responsePayload = await cmd.execute({
                    options: interaction.data?.options || [],
                    user,
                });
            } catch (err) {
                responsePayload = v2Container({
                    accentColor: 0xef4444,
                    children: [v2Text(`### ⚠️ Error en comando /${cmdName}\n${err.message}`)],
                });
            }
        }
    } else if (isButton) {
        const customId = interaction.data?.custom_id || '';
        log(`Botón: ${customId} por @${user.username}`);

        // Quick routes: btn:servidores, btn:estado, btn:tienda, btn:perfil, btn:ayuda, power:action:id
        if (customId === 'btn:servidores') {
            responsePayload = await commands.get('servidores')?.execute({ user });
        } else if (customId === 'btn:estado') {
            responsePayload = await commands.get('estado')?.execute({ user });
        } else if (customId === 'btn:tienda') {
            responsePayload = await commands.get('planes')?.execute({ user });
        } else if (customId === 'btn:perfil') {
            responsePayload = await commands.get('perfil')?.execute({ user });
        } else if (customId === 'btn:ayuda') {
            responsePayload = await commands.get('ayuda')?.execute({ user });
        } else if (customId.startsWith('power:')) {
            const [, action, sId] = customId.split(':');
            responsePayload = await commands.get('energia')?.execute({
                options: [
                    { name: 'servidor_id', value: Number(sId) },
                    { name: 'accion', value: action },
                ],
                user,
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
