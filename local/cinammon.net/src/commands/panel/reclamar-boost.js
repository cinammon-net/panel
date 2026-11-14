const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'reclamar-boost',
    aliases: ['reclamarboost', 'boost-server', 'claim-boost', 'boostserver', 'reclamar'],
    description: 'Gestiona tu Nucleo Cinammon Booster y elige como canjear tu recompensa de Server Boost',
    options: [],
    async execute({ user = {}, log } = {}) {
        const userId = user.id;
        if (!userId) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Reclamar Nucleo Boost\nNo se pudo identificar tu usuario de Discord.'),
                ],
            });
        }

        try {
            const data = await callPanelApi(`/api/bot/discord/${userId}/booster-core`, 'GET');
            const { core, target_server, allocated_server, user_servers } = data;

            // Si el nucleo ya esta asignado y activo en algun modo
            if (core && core.mode !== 'none') {
                let modeTitle = 'Nucleo Booster Activo';
                let modeDesc = '';
                let activeServer = target_server || allocated_server;

                if (core.mode === 'overclock') {
                    modeTitle = 'Overclock Dinamico Activo';
                    modeDesc = `✦ Servidor: **${activeServer?.name || 'Servidor asignado'}**\n` +
                        `✦ Recursos Inyectados: **+3 GB RAM** · **+150% CPU Turbo** · **+10 GB NVMe**\n` +
                        `✦ Estado: **Potenciado y Sincronizado**\n\n` +
                        `Tu servidor cuenta con potencia adicional transferible y backups prioritarios.`;
                } else if (core.mode === 'pod') {
                    modeTitle = 'Pod Booster a la Carta Activo';
                    modeDesc = `✦ Servidor Pod: **${activeServer?.name || 'Pod creado'}**\n` +
                        `✦ Recursos: **4 GB RAM** · **15 GB NVMe** · **200% CPU**\n` +
                        `✦ Direccion: \`${activeServer?.address || 'Asignada en panel'}\`\n\n` +
                        `Servidor dedicado exclusivo en linea y gestionable desde el panel.`;
                } else if (core.mode === 'shield') {
                    modeTitle = 'Escudo de Inmunidad Activo';
                    modeDesc = `✦ Servidor Protegido: **${activeServer?.name || 'Servidor asignado'}**\n` +
                        `✦ Estado: **Blindado contra suspension e inactividad**\n\n` +
                        `Tu servidor esta protegido mientras mantengas tu Server Boost activo en Discord.`;
                }

                return v2Container({
                    accentColor: 0xec4899,
                    children: [
                        v2Text(`## ${modeTitle}\nTu Nucleo Cinammon Booster esta asignado y funcionando.`),
                        v2Separator(true, 1),
                        v2Section([modeDesc]),
                        v2Separator(true, 1),
                        v2ActionRow([
                            v2Button({ label: 'Abrir Consola', url: activeServer?.url || 'https://panel.cinammon.net', style: ButtonStyle.LINK }),
                            v2Button({ label: 'Reasignar / Transferir Nucleo', custom_id: 'btn:boost:reset', style: ButtonStyle.SECONDARY }),
                        ]),
                    ],
                });
            }

            // Si el nucleo esta disponible para elegir modo
            return v2Container({
                accentColor: 0xec4899,
                children: [
                    v2Text('## NUCLEO CINAMMON BOOSTER DISPONIBLE\n¡Muchas gracias por apoyar a Cinammon Network con tu Server Boost!'),
                    v2Separator(true, 1),
                    v2Section([
                        `Dispones de **1 Nucleo de Potencia Transferible** en tu cuenta.\n` +
                        `✦ Estado: **Activo (Disponible para elegir)**\n` +
                        `✦ Potencia: **+3 GB RAM / 4 GB Pod · 150% - 200% CPU**\n` +
                        `✦ Servidores disponibles en tu cuenta: **${user_servers?.length || 0} servidores**\n\n` +
                        `Selecciona abajo la opcion que deseas aplicar:`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: '1. Sobrecargar Servidor (Overclock)', custom_id: 'btn:boost:overclock', style: ButtonStyle.PRIMARY }),
                    ]),
                    v2ActionRow([
                        v2Button({ label: '2. Desplegar Pod a Medida (Nuevo)', custom_id: 'btn:boost:pod', style: ButtonStyle.SECONDARY }),
                        v2Button({ label: '3. Activar Escudo Anti-Suspension', custom_id: 'btn:boost:shield', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            const isNotLinked = err.message && (err.message.includes('not_linked') || err.message.includes('vinculada') || err.message.includes('404'));
            if (isNotLinked) {
                return v2Container({
                    accentColor: 0xf59e0b,
                    children: [
                        v2Text('## Cuenta no Vinculada\nPara acceder a tu Nucleo Booster debes vincular tu cuenta de Discord.'),
                        v2Separator(true, 1),
                        v2Section([
                            `Pasos para vincular:\n` +
                            `1. Entra a https://panel.cinammon.net y accede a tu cuenta.\n` +
                            `2. Usa el comando **/vincular** aqui en Discord.\n` +
                            `3. Vuelve a ejecutar **/reclamar-boost**.`
                        ]),
                        v2Separator(true, 1),
                        v2ActionRow([
                            v2Button({ label: 'Ir al Panel', url: 'https://panel.cinammon.net', style: ButtonStyle.LINK }),
                        ]),
                    ],
                });
            }

            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Error al Gestionar Nucleo Booster\nNo se pudo procesar la solicitud.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
