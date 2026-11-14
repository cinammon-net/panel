const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'basedatos',
    aliases: ['db', 'databases', 'mysql', 'sql'],
    description: 'Consulta las bases de datos MySQL vinculadas a tu servidor',
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
                    v2Text('## Bases de Datos MySQL\nDebes indicar el ID del servidor. Ejemplo: `/basedatos id:11` o `!basedatos 11`.'),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/databases`);
            const s = res?.server || {};
            const dbs = res?.databases || [];

            const listText = dbs.length > 0
                ? dbs.map((d) => {
                    return `• **Base de Datos:** \`${d.name}\`\nHost: \`${d.host}:${d.port || 3306}\` · Usuario: \`${d.user}\` · Gestor: \`${d.driver || 'mysql'}\``;
                }).join('\n\n')
                : 'No hay bases de datos creadas para este servidor. Puedes crear una desde la seccion Bases de Datos del panel.';

            return v2Container({
                accentColor: 0x06b6d4,
                children: [
                    v2Text(`## Bases de Datos MySQL · ${s.name || 'Servidor #' + serverId}\nAcceso seguro para tus plugins, mods o sistemas web:`),
                    v2Separator(true, 1),
                    v2Section([listText]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Actualizar', custom_id: `db:list:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Bases de Datos MySQL\nNo se pudieron consultar las bases de datos del servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
