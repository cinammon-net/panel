const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'panico',
    aliases: ['panic', 'emergencia', 'lockdown'],
    description: 'Protocolo de emergencia: apaga el servidor inmediatamente y asegura los puertos',
    options: [
        {
            name: 'id',
            description: 'ID del servidor',
            type: 4, // INTEGER
            required: true,
        },
    ],
    async execute({ options = [], user = {}, log } = {}) {
        let serverId = options.find((o) => o.name === 'id')?.value || options[0]?.value;

        if (!serverId) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Protocolo de Panico\nDebes especificar el ID del servidor a detener. Ejemplo: `/panico id:11` o `!panico 11`.'),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/panic`, 'POST');

            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Protocolo de Panico Activado · Servidor #${serverId}\nEl servidor ha sido apagado de emergencia.`),
                    v2Separator(true, 1),
                    v2Section([
                        `**Acciones ejecutadas:**\n` +
                        `• Proceso contenedor finalizado de forma inmediata (\`kill\`).\n` +
                        `• Conexiones activas de red interrumpidas.\n` +
                        `• Registro de auditoria asentado en el panel.\n\n` +
                        `Para volver a iniciarlo de forma segura, revisa tus archivos o usa \`/energia id:${serverId} accion:iniciar\`.`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ver Estado', custom_id: `metrics:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Mis Servidores', custom_id: 'btn:servidores', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Error en Protocolo de Panico\nNo se pudo ejecutar la accion en el servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
