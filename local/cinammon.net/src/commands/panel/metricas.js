const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'metricas',
    aliases: ['metrics', 'recursos', 'uso', 'stats-sv'],
    description: 'Consulta el uso en tiempo real de CPU, RAM, disco y red de un servidor',
    options: [
        {
            name: 'id',
            description: 'ID del servidor',
            type: 4, // INTEGER
            required: false,
        },
    ],
    async execute({ options = [], user = {}, log } = {}) {
        let serverId = options.find((o) => o.name === 'id')?.value || options[0]?.value;

        // Si no se especifica ID, obtener el primer servidor del overview
        if (!serverId) {
            try {
                const overview = await callPanelApi('/api/bot/overview');
                if (overview?.servers?.length > 0) {
                    serverId = overview.servers[0].id;
                }
            } catch (err) {}
        }

        if (!serverId) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Metricas de Servidor\nDebes indicar el ID del servidor. Ejemplo: `/metricas id:11` o `!metricas 11`.'),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/metrics`);
            const s = res?.server;
            if (!s) throw new Error('Servidor no encontrado o no vinculado');

            const live = s.live || {};
            const isOnline = live.state === 'running' || live.state === 'starting';
            const ramPct = s.memory_limit > 0 ? Math.min(100, Math.round((live.memory_mb / s.memory_limit) * 100)) : 0;
            const cpuPct = live.cpu || 0;
            const diskPct = s.disk_limit > 0 ? Math.min(100, Math.round((live.disk_mb / s.disk_limit) * 100)) : 0;

            const makeBar = (pct) => {
                const filled = Math.min(10, Math.max(0, Math.round(pct / 10)));
                return '[' + '='.repeat(filled) + '-'.repeat(10 - filled) + '] ' + pct + '%';
            };

            const formatUptime = (sec) => {
                if (!sec) return '0 m';
                const h = Math.floor(sec / 3600);
                const m = Math.floor((sec % 3600) / 60);
                return h > 0 ? `${h}h ${m}m` : `${m}m`;
            };

            return v2Container({
                accentColor: isOnline ? 0x06b6d4 : 0xef4444,
                children: [
                    v2Text(`## Metricas en Vivo · ${s.name} (#${s.id})\nEstado: **${isOnline ? 'En linea' : 'Detenido'}** · Motor: \`${s.egg}\``),
                    v2Separator(true, 1),
                    v2Section([
                        `**Procesador (CPU):**\n\`${makeBar(cpuPct)}\` (Uso: ${cpuPct}% / Asignado: ${s.cpu_limit}%)\n\n` +
                        `**Memoria RAM:**\n\`${makeBar(ramPct)}\` (${live.memory_mb || 0} MiB / ${s.memory_limit || 0} MiB)\n\n` +
                        `**Almacenamiento (Disco):**\n\`${makeBar(diskPct)}\` (${live.disk_mb || 0} MiB / ${s.disk_limit || 0} MiB)\n\n` +
                        `**Red y Actividad:**\nDescarga: \`${live.rx_mb || 0} MB\` · Subida: \`${live.tx_mb || 0} MB\` · Tiempo activo: \`${formatUptime(live.uptime)}\``
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Actualizar', custom_id: `metrics:${s.id}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: isOnline ? 'Reiniciar' : 'Iniciar', custom_id: isOnline ? `power:restart:${s.id}` : `power:start:${s.id}`, style: isOnline ? ButtonStyle.SECONDARY : ButtonStyle.SUCCESS }),
                        v2Button({ label: 'Diagnostico', custom_id: `diag:${s.id}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Metricas de Servidor\nNo se pudieron obtener las metricas del servidor #${serverId}.\nDetalle: \`${err.message}\``),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        }
    },
};
