const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'canjear',
    aliases: ['redeem', 'cupon', 'codigo'],
    description: 'Canjea un codigo promocional o cupon de descuento en la tienda',
    options: [
        {
            name: 'codigo',
            description: 'Codigo del cupon o promocion',
            type: 3, // STRING
            required: true,
        },
    ],
    async execute({ options = [], user = {}, log } = {}) {
        let code = options.find((o) => o.name === 'codigo')?.value || options[0]?.value;

        if (!code) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Canjear Codigo\nDebes especificar el codigo a canjear. Ejemplo: `/canjear codigo:CINAMMON2026` o `!canjear CINAMMON2026`.'),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/redeem`, 'POST', { code });

            return v2Container({
                accentColor: 0x10b981,
                children: [
                    v2Text(`## Codigo Canjeado con Exito\nCodigo: \`${code.toUpperCase()}\``),
                    v2Separator(true, 1),
                    v2Section([
                        `Tu codigo promocional ha sido validado correctamente.\n` +
                        `Puedes aplicar los beneficios en tus compras desde la tienda de Cinammon Network.`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ir a la Tienda', custom_id: 'btn:tienda', style: ButtonStyle.SUCCESS }),
                        v2Button({ label: 'Ver Monedas', custom_id: 'btn:monedas', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Canjear Codigo\nNo se pudo validar el codigo \`${code}\`.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
