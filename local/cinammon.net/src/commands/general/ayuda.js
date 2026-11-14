const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');

module.exports = {
    name: 'ayuda',
    aliases: ['help', 'comandos', 'menu', 'h'],
    description: 'Guia completa de comandos y herramientas de Cinammon Network',
    async execute() {
        return v2Container({
            accentColor: 0x06b6d4,
            children: [
                v2Text(`## Guia de Comandos · Cinammon Network\nPuedes usar comandos con barra diagonal (\`/\`) o con prefijo (\`!\`):`),
                v2Separator(true, 1),
                v2Section([
                    `**Gestion de Servidores:**\n` +
                    `• \`/servidores\` *(alias: !sv, !servers)* - Lista tus servidores con botones interactivos\n` +
                    `• \`/metricas [id]\` *(alias: !recursos, !uso)* - Consumo en tiempo real de CPU, RAM, disco y red\n` +
                    `• \`/energia <id> <accion>\` *(alias: !power)* - Iniciar, detener o reiniciar contenedor\n` +
                    `• \`/consola <id> <comando>\` *(alias: !cmd)* - Ejecutar ordenes directamente en el servidor\n` +
                    `• \`/backups [id]\` *(alias: !copias)* - Ver respaldos existentes y crear nuevos\n` +
                    `• \`/diagnostico [id]\` *(alias: !diag)* - Deteccion de caidas y analisis de salud\n` +
                    `• \`/basedatos [id]\` *(alias: !db, !mysql)* - Credenciales de bases de datos asociadas\n` +
                    `• \`/subdominio [id]\` *(alias: !ip)* - Direccion de conexion personalizada gratis\n` +
                    `• \`/optimizar [ram]\` *(alias: !flags)* - Argumentos Aikar y consejos para evitar lag\n` +
                    `• \`/benchmark\` *(alias: !bench)* - Reporte de latencia y velocidad NVMe de los nodos`
                ]),
                v2Separator(false, 1),
                v2Section([
                    `**Economia y Tienda:**\n` +
                    `• \`/diario\` *(alias: !daily)* - Reclama tus monedas diarias gratuitas\n` +
                    `• \`/monedas\` *(alias: !coins, !balance)* - Consulta tu saldo acumulado y racha\n` +
                    `• \`/planes\` *(alias: !tienda, !shop)* - Catalogo de planes de hosting y caracteristicas\n` +
                    `• \`/vincular [codigo]\` - Conecta tu cuenta del panel con Discord`
                ]),
                v2Separator(false, 1),
                v2Section([
                    `**Utilidad y Estado:**\n` +
                    `• \`/estado\` *(alias: !status)* - Estado operativo de los nodos y servicios\n` +
                    `• \`/ping\` *(alias: !latencia)* - Tiempo de respuesta en vivo del bot y API`
                ]),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: 'Mis Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    v2Button({ label: 'Reclamar Diario', custom_id: 'btn:diario', style: ButtonStyle.SUCCESS }),
                    v2Button({ label: 'Ver Monedas', custom_id: 'btn:monedas', style: ButtonStyle.SECONDARY }),
                    v2Button({ label: 'Estado Nodos', custom_id: 'btn:estado', style: ButtonStyle.SECONDARY }),
                ]),
            ],
        });
    },
};
