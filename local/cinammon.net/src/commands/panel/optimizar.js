const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');

module.exports = {
    name: 'optimizar',
    aliases: ['optimize', 'flags', 'rendimiento', 'aikar'],
    description: 'Genera flags de arranque optimizados de Java y consejos de rendimiento segun tu RAM',
    options: [
        {
            name: 'ram',
            description: 'Cantidad de RAM asignada en GB (ejemplo: 4, 6, 8, 12)',
            type: 4, // INTEGER
            required: false,
        },
    ],
    async execute({ options = [], user = {}, log } = {}) {
        const ramGb = options.find((o) => o.name === 'ram')?.value || options[0]?.value || 4;
        const ramMb = ramGb * 1024;

        const flags = `-Xms${ramMb}M -Xmx${ramMb}M -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:InitiatingHeapOccupancyPercent=15 -XX:G1MixedGCLiveThresholdPercent=90 -XX:G1RSetUpdatingPauseTimePercent=5 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem -XX:MaxTenuringThreshold=1`;

        return v2Container({
            accentColor: 0x06b6d4,
            children: [
                v2Text(`## Optimizacion de Servidor (${ramGb} GB RAM)\nArgumentos de arranque Aikar Flags recomendados para Paper/Purpur/Fabric:`),
                v2Separator(true, 1),
                v2Section([
                    `\`\`\`bash\n${flags}\n\`\`\`\n` +
                    `**Consejos Clave de Rendimiento:**\n` +
                    `• **Motor recomendado:** Utiliza Purpur o Paper en lugar de Spigot o Vanilla.\n` +
                    `• **View Distance:** Reduce la distancia de simulacion (\`simulation-distance\`) a 4 o 5 chunks.\n` +
                    `• **Entity Activation:** Limita las entidades pasivas en \`paper-world-defaults.yml\` para evitar picos de TPS.\n` +
                    `• **Precarga de Mundo:** Usa Chunky para precargar tu mapa y evitar generacion de chunks en vivo.`
                ]),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: 'Ver Planes con mas RAM', custom_id: 'btn:tienda', style: ButtonStyle.PRIMARY }),
                    v2Button({ label: 'Diagnostico de Servidor', custom_id: 'btn:estado', style: ButtonStyle.SECONDARY }),
                ]),
            ],
        });
    },
};
