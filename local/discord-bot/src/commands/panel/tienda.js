const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'planes',
    description: 'Consulta los planes de hosting disponibles en Cinammon',
    async execute() {
        const overview = await callPanelApi('/api/bot/overview').catch(() => ({ plans: [] }));
        const plans = overview.plans || [
            { id: 'starter', name: 'Starter Node', memory: 1024, price_eur: 3.5 },
            { id: 'pro', name: 'Pro Gaming', memory: 4096, price_eur: 11.0 },
            { id: 'ultra', name: 'Ultra Cluster', memory: 8192, price_eur: 20.0 },
        ];

        const sections = plans.slice(0, 3).map((p) =>
            v2Section(
                [
                    `**${p.name}**\n• Memoria RAM: \`${p.memory} MiB\`\n• Precio estimado: \`${p.price_eur ?? 5} € / mes\``,
                ]
            )
        );

        const children = [
            v2Text(`## 🛒 Catálogo de Planes · Cinammon Network\nSelecciona el plan que mejor se adapte a tus necesidades:`),
            v2Separator(true, 1),
        ];

        sections.forEach((sec, idx) => {
            children.push(sec);
            if (idx < sections.length - 1) children.push(v2Separator(false, 1));
        });

        children.push(v2Separator(true, 1));
        children.push(
            v2ActionRow([
                v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                v2Button({ label: 'Estado del Panel', custom_id: 'btn:estado', style: ButtonStyle.SECONDARY }),
            ])
        );

        return v2Container({
            accentColor: 0x06b6d4,
            children,
        });
    },
};
