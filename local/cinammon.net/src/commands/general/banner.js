const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'banner',
    aliases: ['firma', 'tarjeta', 'status-card'],
    description: 'Genera una tarjeta interactiva en vivo del estado de tu servidor para compartir',
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
                    v2Text('## Tarjeta Banner del Servidor\nDebes especificar el ID de tu servidor.\nEjemplo: `/banner servidor_id:12` o `!banner 12`.'),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}`);
            const s = res.server || {};
            const isOnline = s.status === 1 || s.active;

            return v2Container({
                accentColor: isOnline ? 0x10b981 : 0x71717a,
                children: [
                    v2Text(`## ${s.name || `Servidor #${serverId}`} · Cinammon Network\n${isOnline ? 'Estado: En linea y operativo' : 'Estado: Apagado'}`),
                    v2Separator(true, 1),
                    v2Section([
                        `✦ Direccion de Conexion: \`${s.address || 'play.cinammon.net'}\`\n` +
                        `✦ Juego / Motor: **${s.egg?.name || 'Minecraft'}**\n` +
                        `✦ Recursos: **${s.memory || 0} MB RAM** · **${s.disk || 0} MB NVMe** · **${s.cpu || 100}% CPU**\n` +
                        `✦ Nodo: **${s.node?.name || 'Nodo Principal'}**\n\n` +
                        `Alojado en la infraestructura de alto rendimiento de Cinammon Network.`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Entrar al Servidor', url: `https://panel.cinammon.net/servers/${serverId}/console`, style: ButtonStyle.LINK }),
                        v2Button({ label: 'Ver Metricas', custom_id: `metrics:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Ver Jugadores', custom_id: `btn:players:${serverId}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Error al Generar Banner\nNo se pudo obtener la informacion del servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
