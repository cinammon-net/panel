const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'monedas',
    aliases: ['coins', 'saldo', 'balance', 'puntos'],
    description: 'Consulta tu saldo de monedas Cinammon y racha diaria',
    options: [],
    async execute({ user = {}, log } = {}) {
        if (!user.id) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Saldo de Monedas\nDebes ejecutar este comando desde tu cuenta de Discord.'),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id}/account`);
            const billing = res?.billing || {};
            const coins = billing.coins ?? 0;
            const streak = billing.streak ?? 0;

            return v2Container({
                accentColor: 0x06b6d4,
                children: [
                    v2Text(`## Billetera Cinammon · @${user.username}\nSaldo acumulado para canjear servicios gratuitos y mejoras:`),
                    v2Separator(true, 1),
                    v2Section([
                        `**Saldo disponible:** \`${coins} monedas\`\n` +
                        `**Racha de check-in:** \`${streak} dia(s) seguidos\`\n\n` +
                        `**Formas de conseguir mas monedas:**\n` +
                        `• Usa \`/diario\` cada 24 horas.\n` +
                        `• Participa en sorteos de la comunidad en #sorteos.\n` +
                        `• Invita amigos usando tu enlace de referido.`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Reclamar Diario', custom_id: 'btn:diario', style: ButtonStyle.SUCCESS }),
                        v2Button({ label: 'Canjear en Tienda', custom_id: 'btn:tienda', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xf59e0b,
                children: [
                    v2Text('## Saldo de Monedas\nNo se encontro tu cuenta vinculada. Usa `/vincular` para conectar tu cuenta de cinammon.net y ver tus monedas.'),
                    v2ActionRow([
                        v2Button({ label: 'Ver Planes', custom_id: 'btn:tienda', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        }
    },
};
