const { getSlashCommandData } = require('../commands');
const { writeStatus } = require('../api/panel');

async function onReady({ user, token, guildId, log }) {
    const tag = user.discriminator && user.discriminator !== '0' ? `${user.username}#${user.discriminator}` : user.username;
    const slashData = getSlashCommandData();

    try {
        const headers = {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
        };

        const endpoint = guildId
            ? `https://discord.com/api/v10/applications/${user.id}/guilds/${guildId}/commands`
            : `https://discord.com/api/v10/applications/${user.id}/commands`;

        const res = await fetch(endpoint, {
            method: 'PUT',
            headers,
            body: JSON.stringify(slashData),
        });

        if (res.ok) {
            log(`Slash commands sincronizados (${slashData.length} comandos).`);
        }
    } catch (err) {
        log(`Aviso al registrar comandos: ${err.message}`);
    }

    writeStatus({
        connected: true,
        configured: true,
        tag,
        application_id: user.id,
        message: `Conectado como ${tag} · Comandos listos.`,
    });

    log(`READY! Bot conectado exitosamente como ${tag}.`);
}

module.exports = { onReady };
