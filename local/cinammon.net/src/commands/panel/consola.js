const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'consola',
    aliases: ['cmd', 'console', 'comando-sv'],
    description: 'Envia un comando a la consola de tu servidor de juegos',
    options: [
        {
            name: 'id',
            description: 'ID del servidor',
            type: 4, // INTEGER
            required: true,
        },
        {
            name: 'comando',
            description: 'Comando a ejecutar en la consola (sin la barra diagonal)',
            type: 3, // STRING
            required: true,
        },
    ],
    async execute({ options = [], user = {}, log } = {}) {
        let serverId = options.find((o) => o.name === 'id')?.value || options[0]?.value;
        let commandStr = options.find((o) => o.name === 'comando')?.value || options.slice(1).map(o => o.value).join(' ');

        if (!serverId || !commandStr) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Enviar Comando a Consola\nDebes especificar el ID del servidor y el comando.\nEjemplo: `/consola id:11 comando:say Hola a todos` o `!consola 11 say Hola`.'),
                ],
            });
        }

        try {
            await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/command`, 'POST', {
                command: commandStr,
            });

            return v2Container({
                accentColor: 0x10b981,
                children: [
                    v2Text(`## Comando Enviado a Consola\nServidor: **#${serverId}**`),
                    v2Separator(true, 1),
                    v2Section([
                        `**Comando ejecutado:**\n\`\`\`bash\n${commandStr}\n\`\`\`\n` +
                        `El comando ha sido procesado por el servidor en tiempo real.`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ver Metricas', custom_id: `metrics:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Diagnostico', custom_id: `diag:${serverId}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Error en Consola\nNo se pudo ejecutar el comando en el servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
