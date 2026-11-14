const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'actividad',
    aliases: ['activity', 'auditoria', 'logs-panel', 'historial'],
    description: 'Consulta los registros recientes de auditoria e inicio de sesion del servidor',
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
                    v2Text('## Auditoria de Actividad\nDebes indicar el ID del servidor. Ejemplo: `/actividad id:11` o `!actividad 11`.'),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/activity`);
            const s = res?.server || {};
            const act = res?.activity || [];

            const listText = act.length > 0
                ? act.slice(0, 5).map((a) => {
                    const date = a.created_at ? a.created_at.slice(0, 16).replace('T', ' ') : '-';
                    return `• **${a.action || 'Accion'}** por \`${a.user_name || 'Sistema'}\`\n${a.description || '-'}\nFecha: \`${date}\``;
                }).join('\n\n')
                : 'No se encontraron registros de auditoria recientes para este servidor.';

            return v2Container({
                accentColor: 0x06b6d4,
                children: [
                    v2Text(`## Auditoria y Actividad · ${s.name || 'Servidor #' + serverId}\nUltimos eventos registrados en el panel:`),
                    v2Separator(true, 1),
                    v2Section([listText]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Actualizar', custom_id: `activity:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Metricas', custom_id: `metrics:${serverId}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Auditoria de Actividad\nNo se pudo consultar el historial del servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
