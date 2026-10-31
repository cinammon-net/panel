const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'estado',
    aliases: ['status', 'info', 'stats', 'panel'],
    description: 'Muestra el estado global de nodos, servidores y recursos',
    async execute({ log } = {}) {
        let overview;
        try {
            overview = await callPanelApi('/api/bot/overview');
        } catch (err) {
            if (typeof log === 'function') log(`[CMD ERROR] /estado fallo consultando overview: ${err.message}`);
            overview = { stats: { servers: 0, nodes: 1, users: 1 } };
        }
        return v2Container({
            accentColor: 0x10b981,
            children: [
                v2Text(`## 📊 Estado de la Infraestructura\nSincronización en vivo con Cinammon Panel.`),
                v2Separator(true, 1),
                v2Section(
                    [
                        `### 🖥️ Servidores y Nodos\n• **Servidores Registrados:** \`${overview.stats?.servers ?? 0}\`\n• **Nodos Activos:** \`${overview.stats?.nodes ?? 1}\`\n• **Usuarios:** \`${overview.stats?.users ?? 1}\``,
                    ],
                    v2Button({
                        label: 'Servidores',
                        custom_id: 'btn:servidores',
                        style: ButtonStyle.PRIMARY,
                    })
                ),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: 'Actualizar', custom_id: 'btn:estado', style: ButtonStyle.SECONDARY }),
                    v2Button({ label: 'Ver Planes', custom_id: 'btn:tienda', style: ButtonStyle.SUCCESS }),
                ]),
            ],
        });
    },
};
