const { v2Container, v2Text, v2ActionRow, v2Button, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'energia',
    aliases: ['power', 'reiniciar', 'apagar', 'encender', 'reboot'],
    description: 'Controla el encendido, reinicio o apagado de un servidor',
    options: [
        {
            name: 'servidor_id',
            description: 'ID numérico del servidor',
            type: 4,
            required: true,
        },
        {
            name: 'accion',
            description: 'Acción a ejecutar',
            type: 3,
            required: true,
            choices: [
                { name: 'Iniciar', value: 'start' },
                { name: 'Reiniciar', value: 'restart' },
                { name: 'Detener', value: 'stop' },
            ],
        },
    ],
    async execute({ options }) {
        let serverId = options?.find((o) => o.name === 'servidor_id' || o.name === 'arg0')?.value;
        let action = options?.find((o) => o.name === 'accion' || o.name === 'arg1')?.value || 'restart';

        if (!serverId && options?.[0]) serverId = options[0].value;

        try {
            await callPanelApi(`/api/servers/${serverId}/power`, 'POST', { action });
            return v2Container({
                accentColor: 0x10b981,
                children: [
                    v2Text(`## ⚡ Control de Energía\nAcción \`${action.toUpperCase()}\` ejecutada en el servidor **#${serverId}**.`),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## ⚠️ Error al enviar comando\nNo se pudo ejecutar la acción en el servidor **#${serverId}**:\n\`${err.message}\``),
                ],
            });
        }
    },
};
