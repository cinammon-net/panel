const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'reclamar-boost',
    aliases: ['reclamarboost', 'boost-server', 'claim-boost', 'boostserver', 'reclamar'],
    description: 'Reclama tu servidor gratuito de hosting por dar Server Boost a Cinammon Network',
    options: [],
    async execute({ user = {}, log } = {}) {
        const userId = user.id;
        if (!userId) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Reclamar Servidor Boost\nNo se pudo identificar tu usuario de Discord.'),
                ],
            });
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${userId}/claim-boost`, 'POST', {});

            if (res.already_has_server) {
                return v2Container({
                    accentColor: 0x3b82f6,
                    children: [
                        v2Text('## Servidor Boost Activo\nYa dispones de un servidor de recompensa por Server Boost activo en tu cuenta.'),
                        v2Separator(true, 1),
                        v2Section([
                            `✦ Nombre: **${res.server.name}**\n` +
                            `✦ Direccion: \`${res.server.address || 'Asignada en panel'}\`\n` +
                            `✦ Recursos: **${res.server.memory} MB RAM** · **${res.server.disk} MB Disco** · **${res.server.cpu}% CPU**\n\n` +
                            `Puedes administrarlo encendiendolo, apagandolo o accediendo a la consola desde el panel web.`
                        ]),
                        v2Separator(true, 1),
                        v2ActionRow([
                            v2Button({ label: 'Abrir Servidor', url: res.server.url, style: ButtonStyle.LINK }),
                            v2Button({ label: 'Mis Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                        ]),
                    ],
                });
            }

            return v2Container({
                accentColor: 0xec4899,
                children: [
                    v2Text('## Servidor Boost Aprovisionado con Exito\n¡Muchas gracias por apoyar a Cinammon Network con tu Server Boost!'),
                    v2Separator(true, 1),
                    v2Section([
                        `Hemos creado tu servidor de recompensa:\n` +
                        `✦ Servidor: **${res.server.name}**\n` +
                        `✦ Memoria RAM: **4 GB (4096 MB)**\n` +
                        `✦ Almacenamiento: **15 GB (15360 MB NVMe)**\n` +
                        `✦ Procesador: **200% CPU**\n` +
                        `✦ Direccion: \`${res.server.address || 'Asignando puerto...'}\`\n\n` +
                        `El servidor se encuentra en instalacion. Podras gestionarlo en unos instantes desde el panel.`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Abrir en el Panel', url: res.server.url, style: ButtonStyle.LINK }),
                        v2Button({ label: 'Mis Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        } catch (err) {
            const isNotLinked = err.message && (err.message.includes('not_linked') || err.message.includes('vinculada') || err.message.includes('404'));
            if (isNotLinked) {
                return v2Container({
                    accentColor: 0xf59e0b,
                    children: [
                        v2Text('## Cuenta no Vinculada\nPara reclamar tu servidor gratuito por Server Boost debes vincular tu cuenta de Discord.'),
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
                    v2Text(`## Error al Reclamar Servidor Boost\nNo se pudo procesar la solicitud.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
