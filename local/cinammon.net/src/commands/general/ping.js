const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { state, callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'ping',
    aliases: ['latencia', 'ms', 'p'],
    description: 'Comprueba la latencia en vivo del bot y del panel',
    async execute() {
        const start = Date.now();
        const overview = await callPanelApi('/api/bot/overview').catch(() => null);
        const rtt = Date.now() - start;

        return v2Container({
            accentColor: 0x06b6d4,
            children: [
                v2Text(`## ⚡ Cinammon Bot · Latencia\nConexión activa con latencia de red \`${rtt} ms\`.`),
                v2Separator(true, 1),
                v2Section(
                    [
                        `**Panel:** \`${state.panel_url}\`\n**Servidores Activos:** \`${overview?.stats?.servers ?? 0}\`\n**Runtime:** \`Node.js ${process.version}\``,
                    ],
                    v2Button({
                        label: 'Ver Estado',
                        custom_id: 'btn:estado',
                        style: ButtonStyle.PRIMARY,
                    })
                ),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: 'Servidores', custom_id: 'btn:servidores', style: ButtonStyle.SECONDARY }),
                    v2Button({ label: 'Planes', custom_id: 'btn:tienda', style: ButtonStyle.SUCCESS }),
                ]),
            ],
        });
    },
};
