const { getSlashCommandData } = require('../commands');
const { writeStatus } = require('../api/panel');

async function onReady({ user, token, guildId, log }) {
    const tag = user.discriminator && user.discriminator !== '0' ? `${user.username}#${user.discriminator}` : user.username;
    // Los comandos los registra ahora src/sync (registerCommands).
    const slashData = [];

    writeStatus({
        connected: true,
        configured: true,
        tag,
        application_id: user.id,
        message: `Conectado como ${tag} · Comandos listos.`,
    });

    setInterval(() => {
        writeStatus({
            connected: true,
            configured: true,
            tag,
            application_id: user.id,
            message: `Conectado como ${tag} · Comandos listos.`,
        });
    }, 15000);

    log(`READY! Bot conectado exitosamente como ${tag}.`);
}

module.exports = { onReady };

