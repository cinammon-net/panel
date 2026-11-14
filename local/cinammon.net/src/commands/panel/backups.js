const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'backups',
    aliases: ['copias', 'respaldos', 'backup'],
    description: 'Consulta las copias de seguridad de tu servidor o solicita una nueva',
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
                    v2Text('## Copias de Seguridad\nDebes indicar el ID del servidor. Ejemplo: `/backups id:11` o `!backups 11`.'),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/backups`);
            const s = res?.server || {};
            const backups = res?.backups || [];

            const listText = backups.length > 0
                ? backups.map((b) => {
                    const sizeMb = (b.size / 1048576).toFixed(1);
                    const date = b.completed_at ? b.completed_at.slice(0, 10) : 'Completado';
                    return `• **${b.name}**\nTamaño: \`${sizeMb} MB\` · Fecha: \`${date}\` · ID: \`${b.id}\``;
                }).join('\n\n')
                : 'No hay copias de seguridad registradas para este servidor.';

            return v2Container({
                accentColor: 0x06b6d4,
                children: [
                    v2Text(`## Copias de Seguridad · ${s.name || 'Servidor #' + serverId}\nLimite de respaldos permitidos: **${s.backup_limit || 3}**`),
                    v2Separator(true, 1),
                    v2Section([listText]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Crear Respaldo Ahora', custom_id: `backup:create:${serverId}`, style: ButtonStyle.SUCCESS }),
                        v2Button({ label: 'Actualizar Lista', custom_id: `backup:list:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Metricas', custom_id: `metrics:${serverId}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Copias de Seguridad\nNo se pudieron obtener las copias de seguridad del servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
