const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'benchmark',
    aliases: ['bench', 'test-velocidad', 'rendimiento-nodo'],
    description: 'Muestra un reporte de velocidad de disco NVMe, latencia y rendimiento de nodo',
    options: [],
    async execute({ options = [], user = {}, log } = {}) {
        let stats = { servers: 0, nodes: 1 };
        try {
            const overview = await callPanelApi('/api/bot/overview');
            stats = overview?.stats || stats;
        } catch (err) {}

        return v2Container({
            accentColor: 0x06b6d4,
            children: [
                v2Text(`## Benchmark de Rendimiento · Cinammon Network\nInfraestructura en tiempo real optimizada para baja latencia:`),
                v2Separator(true, 1),
                v2Section([
                    `**Almacenamiento NVMe Gen4:**\n• Lectura secuencial: \`~5,200 MB/s\`\n• Escritura secuencial: \`~3,800 MB/s\`\n• IOPS aleatorio: \`>450,000 IOPS\`\n\n` +
                    `**Latencia de Red Promedio:**\n• España / Portugal: \`8 - 18 ms\`\n• Europa Central (Francia / Alemania): \`22 - 35 ms\`\n• America Latina (Este / Miami): \`95 - 125 ms\`\n\n` +
                    `**Proteccion y Hardware:**\n• Procesador: AMD Ryzen 9 / Intel Xeon Alta Frecuencia (4.5+ GHz)\n• Mitigacion DDoS: Game Shield Always-On con filtro L3/L4/L7`
                ]),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: 'Estado Global', custom_id: 'btn:estado', style: ButtonStyle.PRIMARY }),
                    v2Button({ label: 'Ver Planes Disponibles', custom_id: 'btn:tienda', style: ButtonStyle.SUCCESS }),
                ]),
            ],
        });
    },
};
