const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'diagnostico',
    aliases: ['diag', 'analizar', 'salud', 'doctor'],
    description: 'Analiza el estado del servidor, consumo y logs en busca de problemas conocidos',
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
                    v2Text('## Diagnostico del Servidor\nDebes indicar el ID del servidor. Ejemplo: `/diagnostico id:11` o `!diagnostico 11`.'),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/diagnostics`);
            const s = res?.server || {};
            const items = res?.diagnostics || [];

            const isAllOk = items.every((i) => i.severity === 'ok');

            const content = items.map((i) => {
                const prefix = i.severity === 'critico' ? '[CRITICO]' : i.severity === 'alto' ? '[ADVERTENCIA]' : '[ESTABLE]';
                return `**${prefix} ${i.title}**\n${i.solution}`;
            }).join('\n\n');

            return v2Container({
                accentColor: isAllOk ? 0x10b981 : 0xf59e0b,
                children: [
                    v2Text(`## Diagnostico de Salud · ${s.name || 'Servidor #' + serverId}\nEstado del contenedor: **${s.state || 'activo'}**`),
                    v2Separator(true, 1),
                    v2Section([content]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Volver a Analizar', custom_id: `diag:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Ver Metricas', custom_id: `metrics:${serverId}`, style: ButtonStyle.SECONDARY }),
                        v2Button({ label: 'Reiniciar Servidor', custom_id: `power:restart:${serverId}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Diagnostico del Servidor\nNo se pudo completar el analisis del servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
