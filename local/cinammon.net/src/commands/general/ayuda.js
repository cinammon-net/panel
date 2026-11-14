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
                    `**Gestion de Servidores y Juego:**\n` +
                    `• \`/servidores\` *(alias: !sv)* - Lista tus servidores con controles de energia\n` +
                    `• \`/metricas [id]\` *(alias: !recursos)* - Monitor en vivo de CPU, RAM, disco y red\n` +
                    `• \`/jugadores [id]\` *(alias: !query, !online)* - Jugadores conectados en tiempo real\n` +
                    `• \`/consola <id> <comando>\` *(alias: !cmd)* - Ejecutar ordenes en la consola del juego\n` +
                    `• \`/energia <id> <accion>\` *(alias: !power)* - Iniciar, detener o reiniciar\n` +
                    `• \`/backups [id]\` *(alias: !copias)* - Respaldos manuales y automáticos\n` +
                    `• \`/diagnostico [id]\` *(alias: !diag)* - Deteccion de caidas y salud del servidor\n` +
                    `• \`/reinstalar <id>\` *(alias: !rebuild)* - Reinstalacion asistida del motor\n` +
                    `• \`/basedatos [id]\` *(alias: !db)* - Credenciales de bases de datos MySQL\n` +
                    `• \`/subdominio [id]\` *(alias: !ip)* - Direccion de conexion personalizada gratis\n` +
                    `• \`/optimizar [ram]\` *(alias: !flags)* - Argumentos Java y consejos de rendimiento\n` +
                    `• \`/benchmark\` *(alias: !bench)* - Prueba de latencia y velocidad NVMe de los nodos`
                ]),
                v2Separator(false, 1),
                v2Section([
                    `**Seguridad y Colaboracion:**\n` +
                    `• \`/panico <id>\` *(alias: !panic)* - Apagado de emergencia y bloqueo de accesos\n` +
                    `• \`/actividad [id]\` *(alias: !auditoria)* - Historial de inicios y cambios en el panel\n` +
                    `• \`/colaborador [id]\` *(alias: !subuser)* - Miembros con acceso a tu servidor`
                ]),
                v2Separator(false, 1),
                v2Section([
                    `**Economia y Tienda:**\n` +
                    `• \`/diario\` *(alias: !daily)* - Reclama tus monedas diarias gratuitas\n` +
                    `• \`/monedas\` *(alias: !coins)* - Consulta tu saldo acumulado y racha\n` +
                    `• \`/canjear <codigo>\` *(alias: !cupon)* - Validar codigos de descuento\n` +
                    `• \`/planes\` *(alias: !tienda)* - Catalogo de planes de hosting\n` +
                    `• \`/vincular [codigo]\` - Conectar cuenta del panel con Discord`
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
