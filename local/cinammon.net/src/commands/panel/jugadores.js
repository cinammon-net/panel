const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'jugadores',
    aliases: ['players', 'query', 'quien-juega', 'online'],
    description: 'Consulta los jugadores conectados en tiempo real por protocolo Query',
    options: [
        {
            name: 'id',
            description: 'ID del servidor',
            type: 4, // INTEGER
            required: false,
        },
    ],
    async execute({ options = [], user = {}, log } = {}) {
        let serverId = options.find((o) => o.name === 'id')?.value || options[0]?.value;

        if (!serverId) {
            try {
                const overview = await callPanelApi('/api/bot/overview');
                if (overview?.servers?.length > 0) {
                    serverId = overview.servers[0].id;
                }
            } catch (err) {}
        }

        if (!serverId) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Jugadores en Linea\nDebes indicar el ID del servidor. Ejemplo: `/jugadores id:11` o `!jugadores 11`.'),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/players`);
            const s = res?.server || {};
            const q = res?.query || {};

            const isOnline = q.online;
            const pOnline = q.players?.online ?? 0;
            const pMax = q.players?.max ?? 0;
            const motd = q.motd || 'Servidor Cinammon';
            const latency = q.latency_ms ? `${q.latency_ms} ms` : 'Desconocida';
            const version = q.version || 'Version detectada';

            return v2Container({
                accentColor: isOnline ? 0x10b981 : 0xef4444,
                children: [
                    v2Text(`## Jugadores en Linea · ${s.name || 'Servidor #' + serverId}\nDireccion: \`${s.address || 'IP asignada'}\` · Latencia: \`${latency}\``),
                    v2Separator(true, 1),
                    v2Section([
                        `**Estado del Juego:** ${isOnline ? 'En linea y respondiendo' : 'Sin respuesta de jugadores'}\n` +
                        `**Jugadores conectados:** \`${pOnline} / ${pMax}\`\n` +
                        `**Version:** \`${version}\`\n` +
                        `**Descripcion (MOTD):**\n\`${motd}\``
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Actualizar Jugadores', custom_id: `players:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Metricas en Vivo', custom_id: `metrics:${serverId}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Jugadores en Linea\nNo se pudo consultar el estado de jugadores del servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
