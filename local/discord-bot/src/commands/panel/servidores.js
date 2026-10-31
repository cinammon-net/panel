const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'servidores',
    aliases: ['servers', 'sv', 'lista', 'mis-servidores', 'servs'],
    description: 'Lista los servidores con controles interactivos de energía',
    async execute({ log } = {}) {
        let overview;
        try {
            overview = await callPanelApi('/api/bot/overview');
        } catch (err) {
            if (typeof log === 'function') log(`[CMD ERROR] /servidores fallo consultando overview: ${err.message}`);
            overview = { servers: [] };
        }
        const servers = (overview.servers || []).slice(0, 5);

        if (servers.length === 0) {
            return v2Container({
                accentColor: 0x06b6d4,
                children: [
                    v2Text(`## 🖥️ Servidores de Cinammon\nNo se encontraron servidores registrados en el panel.`),
                    v2ActionRow([
                        v2Button({ label: 'Actualizar', custom_id: 'btn:servidores', style: ButtonStyle.SECONDARY }),
                        v2Button({ label: 'Ver Planes', custom_id: 'btn:tienda', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        }

        const sections = servers.map((s) => {
            const isOnline = s.status === 'running' || s.status === 'starting';
            return v2Section(
                [
                    `**#${s.id} · ${s.name}** (${isOnline ? '🟢 En línea' : '🔴 Detenido'})\nMotor: \`${s.egg}\` · RAM: \`${s.memory} MiB\` · CPU: \`${s.cpu || 100}%\``,
                ],
                v2Button({
                    label: isOnline ? 'Reiniciar' : 'Iniciar',
                    custom_id: isOnline ? `power:restart:${s.id}` : `power:start:${s.id}`,
                    style: isOnline ? ButtonStyle.SECONDARY : ButtonStyle.SUCCESS,
                })
            );
        });

        const children = [
            v2Text(`## 🖥️ Servidores Registrados (${servers.length})\nSelecciona una acción rápida en cada servidor:`),
            v2Separator(true, 1),
        ];

        sections.forEach((sec, idx) => {
            children.push(sec);
            if (idx < sections.length - 1) children.push(v2Separator(false, 1));
        });

        children.push(v2Separator(true, 1));
        children.push(
            v2ActionRow([
                v2Button({ label: 'Actualizar Lista', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                v2Button({ label: 'Estado Global', custom_id: 'btn:estado', style: ButtonStyle.SECONDARY }),
            ])
        );

        return v2Container({
            accentColor: 0x06b6d4,
            children,
        });
    },
};
