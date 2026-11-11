const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');

module.exports = {
    name: 'ayuda',
    aliases: ['help', 'comandos', 'menu', 'h'],
    description: 'Muestra la lista de comandos disponibles, alias y accesos rápidos',
    async execute() {
        return v2Container({
            accentColor: 0x06b6d4,
            children: [
                v2Text(`## 📖 Guía de Comandos · Cinammon Network\nPuedes usar comandos con barra diagonal (\`/\`) o con prefijo (\`!\`):\n*(Ej: \`!ayuda\`, \`!sv\`, \`!servers\`, \`!status\`, \`!ping\`)*`),
                v2Separator(true, 1),
                v2Section(
                    [
                        `**Comandos Disponibles y Alias:**\n• \`/servidores\` *(alias: !sv, !servers, !lista)* — Lista tus servidores con botones interactivos\n• \`/estado\` *(alias: !status, !info, !stats)* — Estado global del panel y recursos\n• \`/energia <id> <accion>\` *(alias: !power, !reiniciar)* — Control de energía de servidores\n• \`/planes\` *(alias: !tienda, !precios, !shop)* — Catálogo de planes y hosting\n• \`/ping\` *(alias: !ms, !latencia)* — Latencia en vivo del bot`,
                    ]
                ),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    v2Button({ label: 'Estado Global', custom_id: 'btn:estado', style: ButtonStyle.SECONDARY }),
                    v2Button({ label: 'Ver Planes', custom_id: 'btn:tienda', style: ButtonStyle.SUCCESS }),
                ]),
            ],
        });
    },
};
