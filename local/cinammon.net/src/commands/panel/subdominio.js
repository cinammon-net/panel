const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'subdominio',
    aliases: ['subdomain', 'ip-custom', 'dominio', 'dns'],
    description: 'Consulta los subdominios cinammon.net vinculados a tu servidor',
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
                    v2Text('## Subdominios de Cinammon\nDebes indicar el ID del servidor. Ejemplo: `/subdominio id:11` o `!subdominio 11`.'),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/subdomains`);
            const s = res?.server || {};
            const list = res?.subdomains || [];

            const listText = list.length > 0
                ? list.map((d) => {
                    return `• **IP de conexion:** \`${d.domain}\`\nDestino: \`${d.target_ip}:${d.port}\``;
                }).join('\n\n')
                : 'No hay subdominios creados para este servidor. Puedes vincular uno gratis desde la pestaña Subdominios del panel.';

            return v2Container({
                accentColor: 0x06b6d4,
                children: [
                    v2Text(`## Subdominios Gratuitos · ${s.name || 'Servidor #' + serverId}\nAcceso facil para que tus jugadores entren sin memorizar puertos:`),
                    v2Separator(true, 1),
                    v2Section([listText]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ver Metricas', custom_id: `metrics:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Subdominios de Cinammon\nNo se pudieron consultar los subdominios del servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
