const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'boost-evento',
    aliases: ['boostevento', 'overclock', 'boost-temp'],
    description: 'Activa un boost temporal de recursos (+2 GB RAM y +100% CPU) para torneos o eventos',
    options: [
        {
            name: 'servidor_id',
            description: 'ID o numero de tu servidor',
            type: 4, // INTEGER
            required: true,
        },
    ],
    async execute({ options = [], user = {}, log } = {}) {
        let serverId = options.find((o) => o.name === 'servidor_id')?.value || options[0]?.value;

        if (!serverId) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Boost Temporal para Eventos\nDebes especificar el ID de tu servidor.\nEjemplo: `/boost-evento servidor_id:12` o `!boost-evento 12`.'),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/boost-event`, 'POST', {});

            if (!res.success) {
                return v2Container({
                    accentColor: 0xf59e0b,
                    children: [
                        v2Text(`## Boost de Evento · Servidor #${serverId}\n${res.message}`),
                    ],
                });
            }

            return v2Container({
                accentColor: 0xec4899,
                children: [
                    v2Text(`## Boost de Evento Activado con Exito · Servidor #${serverId}\n¡Modo Torneo y Rendimiento Maximo en Linea!`),
                    v2Separator(true, 1),
                    v2Section([
                        `Se han aplicado los siguientes recursos adicionales:\n` +
                        `✦ Nueva Memoria RAM: **${res.server.memory} MB** (+2048 MB)\n` +
                        `✦ Nueva Capacidad de CPU: **${res.server.cpu}%** (+100%)\n` +
                        `✦ Duracion activa: **3 Horas** (hasta ${res.server.boost_until.substring(11, 16)} UTC)\n\n` +
                        `Ideal para transmisiones en vivo, torneos comunitarios o picos masivos de jugadores.`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ver Metricas', custom_id: `metrics:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Consola', custom_id: `btn:consola:${serverId}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Error al Activar Boost de Evento\nNo se pudo activar el boost en el servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
