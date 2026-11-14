const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'instalar',
    aliases: ['plugin', 'mod', 'addons'],
    description: 'Instala plugins o mods verificados directamente en tu servidor de juego',
    options: [
        {
            name: 'servidor_id',
            description: 'ID o numero de tu servidor',
            type: 4, // INTEGER
            required: true,
        },
        {
            name: 'plugin_id',
            description: 'Nombre del plugin (ej. essentialsx, luckperms, vault, worldedit, viaversion, geyser, spark)',
            type: 3, // STRING
            required: false,
        },
    ],
    async execute({ options = [], user = {}, log } = {}) {
        let serverId = options.find((o) => o.name === 'servidor_id')?.value || options[0]?.value;
        let pluginId = options.find((o) => o.name === 'plugin_id')?.value || options[1]?.value;

        if (!serverId) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Instalar Plugins y Mods\nDebes especificar el ID de tu servidor.\nEjemplo: `/instalar servidor_id:12 plugin_id:luckperms` o `!instalar 12 luckperms`.'),
                ],
            });
        }

        // Si no especifico plugin, mostrar el catalogo disponible
        if (!pluginId) {
            try {
                const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/plugins`);
                const plugins = res.plugins || [];

                return v2Container({
                    accentColor: 0x3b82f6,
                    children: [
                        v2Text(`## Catalogo de Plugins Verificados · Servidor #${serverId}\nElige el plugin que deseas desplegar con un solo comando:`),
                        v2Separator(true, 1),
                        v2Section([
                            plugins.map((p) => `• **${p.name}** (\`${p.id}\`): ${p.description}`).join('\n')
                        ]),
                        v2Separator(true, 1),
                        v2Section([
                            `Para instalar uno escribe:\n\`/instalar servidor_id:${serverId} plugin_id:<nombre>\` o usa \`!instalar ${serverId} <nombre>\``
                        ]),
                    ],
                });
            } catch (err) {
                return v2Container({
                    accentColor: 0xef4444,
                    children: [
                        v2Text(`## Error al Consultar Catalogo\nNo se pudo obtener la lista de plugins.\nDetalle: \`${err.message}\``),
                    ],
                });
            }
        }

        pluginId = String(pluginId).trim().toLowerCase();

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/plugins/install`, 'POST', {
                plugin_id: pluginId,
            });

            return v2Container({
                accentColor: 0x10b981,
                children: [
                    v2Text(`## Plugin Instalado con Exito · Servidor #${serverId}\nArchivo: \`${res.file}\``),
                    v2Separator(true, 1),
                    v2Section([
                        `El archivo ha sido descargado e insertado en la carpeta **/plugins** de tu servidor.\n\n` +
                        `Para que el motor cargue el nuevo complemento, puedes reiniciar el servidor con \`/energia\` o directamente en la consola con \`/consola\`.`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Reiniciar Servidor', custom_id: `pwr:restart:${serverId}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Ver Consola', custom_id: `btn:consola:${serverId}`, style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Error al Instalar Plugin\nNo se pudo instalar el plugin \`${pluginId}\` en el servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
