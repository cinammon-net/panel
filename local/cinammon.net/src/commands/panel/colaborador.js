const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'colaborador',
    aliases: ['subuser', 'colaboradores', 'equipo', 'subusuarios'],
    description: 'Consulta los colaboradores con acceso a tu servidor en el panel',
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
                    v2Text('## Colaboradores de Servidor\nDebes indicar el ID del servidor. Ejemplo: `/colaborador id:11` o `!colaborador 11`.'),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/subusers`);
            const s = res?.server || {};
            const subs = res?.subusers || [];

            const listText = subs.length > 0
                ? subs.map((sub) => {
                    const perms = Array.isArray(sub.permissions) && sub.permissions.length ? sub.permissions.join(', ') : 'Acceso general';
                    return `• **${sub.user_name}** (\`${sub.user_email}\`)\nPermisos: \`${perms}\``;
                }).join('\n\n')
                : 'No hay colaboradores asignados a este servidor. Puedes invitar amigos desde la seccion Usuarios del panel.';

            return v2Container({
                accentColor: 0x06b6d4,
                children: [
                    v2Text(`## Colaboradores · ${s.name || 'Servidor #' + serverId}\nUsuarios autorizados para gestionar este servidor:`),
                    v2Separator(true, 1),
                    v2Section([listText]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Metricas', custom_id: `metrics:${serverId}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Colaboradores de Servidor\nNo se pudo consultar el equipo del servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
