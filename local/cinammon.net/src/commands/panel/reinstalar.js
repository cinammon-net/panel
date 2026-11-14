const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'reinstalar',
    aliases: ['reinstall', 'rebuild', 'limpiar-sv'],
    description: 'Solicita la reinstalacion asistida del servidor con confirmacion de seguridad',
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
                    v2Text('## Reinstalacion de Servidor\nDebes indicar el ID del servidor a reinstalar. Ejemplo: `/reinstalar id:11` o `!reinstalar 11`.'),
                ],
            });
        }

        return v2Container({
            accentColor: 0xf59e0b,
            children: [
                v2Text(`## Confirmacion de Reinstalacion · Servidor #${serverId}\nAtencion: Esta accion descargara nuevamente los archivos base del motor y restablecera la configuracion inicial.`),
                v2Separator(true, 1),
                v2Section([
                    `Se recomienda crear una copia de seguridad previa con \`/backups id:${serverId}\` antes de continuar.\n\n` +
                    `Presiona el boton inferior para confirmar la reinstalacion inmediata:`
                ]),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: 'Confirmar Reinstalacion', custom_id: `reinstall:confirm:${serverId}`, style: ButtonStyle.DANGER }),
                    v2Button({ label: 'Crear Backup Primero', custom_id: `backup:create:${serverId}`, style: ButtonStyle.PRIMARY }),
                    v2Button({ label: 'Cancelar', custom_id: 'btn:servidores', style: ButtonStyle.SECONDARY }),
                ]),
            ],
        });
    },
};
