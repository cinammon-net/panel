const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'diario',
    aliases: ['daily', 'recompensa', 'premio-diario'],
    description: 'Recoge tu recompensa diaria de monedas Cinammon para canjear en la tienda',
    options: [],
    async execute({ user = {}, log } = {}) {
        if (!user.id) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Recompensa Diaria\nNo se pudo identificar tu cuenta de Discord. Asegurate de ejecutar el comando directamente en el servidor.'),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id}/checkin`, 'POST');
            const coins = res?.coins ?? res?.balance ?? 50;
            const streak = res?.streak ?? 1;

            return v2Container({
                accentColor: 0x10b981,
                children: [
                    v2Text(`## Recompensa Diaria Reclamada\nHas recibido tus monedas diarias de Cinammon Network.`),
                    v2Separator(true, 1),
                    v2Section([
                        `**Monedas conseguidas:** \`+${res?.awarded || 50} monedas\`\n` +
                        `**Racha actual:** \`${streak} dia(s) consecutivos\`\n` +
                        `**Saldo total:** \`${coins} monedas\`\n\n` +
                        `*Recuerda volver mañana para aumentar tu racha y ganar multiplicadores de monedas.*`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ver Mi Saldo', custom_id: 'btn:monedas', style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Tienda de Monedas', custom_id: 'btn:tienda', style: ButtonStyle.SUCCESS }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xf59e0b,
                children: [
                    v2Text(`## Recompensa Diaria\n${err.message.includes('already') || err.message.includes('ya') ? 'Ya has reclamado tu recompensa diaria hoy. Vuelve en unas horas.' : 'Para reclamar monedas debes tener tu cuenta de cinammon.net vinculada con Discord usando `/vincular`.'}`),
                    v2ActionRow([
                        v2Button({ label: 'Vincular Cuenta', custom_id: 'btn:perfil', style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Ver Monedas', custom_id: 'btn:monedas', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        }
    },
};
