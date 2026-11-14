const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'afiliado',
    aliases: ['referidos', 'afiliados', 'invitar-amigos'],
    description: 'Consulta tu enlace de referido, amigos invitados y comisiones en Cinammon Network',
    options: [],
    async execute({ user = {}, log } = {}) {
        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/affiliates`);

            const topList = (res.top_referrers || [])
                .map((t, idx) => `${idx + 1}. **${t.name}** - ${t.count} amigos`)
                .join('\n');

            return v2Container({
                accentColor: 0x8b5cf6,
                children: [
                    v2Text(`## Programa de Afiliados · Cinammon Network\nComparte tu enlace y gana recompensas por cada amigo que cree o contrate un servidor:`),
                    v2Separator(true, 1),
                    v2Section([
                        `✦ Tu Codigo: \`${res.code}\`\n` +
                        `✦ Enlace Personal: \`${res.url}\`\n\n` +
                        `✦ Amigos Invitados: **${res.referred_users}**\n` +
                        `✦ Recompensa: **${res.reward_per_invite}**`
                    ]),
                    v2Separator(true, 1),
                    v2Section([
                        `**Top Referidores de la Comunidad:**\n${topList}`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Abrir Tienda', custom_id: 'btn:tienda', style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Mis Monedas', custom_id: 'btn:monedas', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Programa de Afiliados\nNo se pudo consultar la informacion de referidos.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
