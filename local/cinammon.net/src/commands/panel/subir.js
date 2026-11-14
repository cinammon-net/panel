const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { callPanelApi } = require('../../api/panel');

module.exports = {
    name: 'subir',
    aliases: ['upload', 'cargar', 'subir-archivo'],
    description: 'Sube un archivo o plugin directamente a tu servidor desde Discord',
    options: [
        {
            name: 'servidor_id',
            description: 'ID o numero de tu servidor',
            type: 4, // INTEGER
            required: true,
        },
        {
            name: 'archivo',
            description: 'URL directa del archivo adjunto a subir',
            type: 3, // STRING
            required: true,
        },
        {
            name: 'carpeta',
            description: 'Carpeta de destino (por defecto /plugins)',
            type: 3, // STRING
            required: false,
        },
    ],
    async execute({ options = [], user = {}, log } = {}) {
        let serverId = options.find((o) => o.name === 'servidor_id')?.value || options[0]?.value;
        let fileUrl = options.find((o) => o.name === 'archivo')?.value || options[1]?.value;
        let directory = options.find((o) => o.name === 'carpeta')?.value || options[2]?.value || '/plugins';

        if (!serverId || !fileUrl) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text('## Subir Archivo al Servidor\nDebes especificar el ID del servidor y la URL del archivo.\nEjemplo: `/subir servidor_id:12 archivo:https://... carpeta:/plugins` o `!subir 12 <url>`.\nTambién puedes adjuntar un archivo en Discord y escribir `!subir 12`.'),
                ],
            });
        }

        // Obtener nombre del archivo desde la URL
        let filename = 'archivo.jar';
        try {
            const parsedUrl = new URL(fileUrl);
            const pathname = parsedUrl.pathname;
            filename = pathname.substring(pathname.lastIndexOf('/') + 1) || 'archivo.jar';
        } catch {
            filename = 'archivo.jar';
        }

        try {
            const res = await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${serverId}/upload-url`, 'POST', {
                url: fileUrl,
                filename: filename,
                directory: directory,
            });

            return v2Container({
                accentColor: 0x10b981,
                children: [
                    v2Text(`## Archivo Subido con Exito · Servidor #${serverId}\nArchivo: \`${res.file}\``),
                    v2Separator(true, 1),
                    v2Section([
                        `Destino: \`${res.directory}\`\n` +
                        `El archivo ha sido transferido directamente al almacenamiento de tu servidor en el nodo.`
                    ]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ver Archivos en Web', url: `https://panel.cinammon.net/servers/${serverId}/files`, style: ButtonStyle.LINK }),
                        v2Button({ label: 'Reiniciar Servidor', custom_id: `pwr:restart:${serverId}`, style: ButtonStyle.PRIMARY }),
                    ]),
                ],
            });
        } catch (err) {
            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## Error al Subir Archivo\nNo se pudo subir el archivo al servidor #${serverId}.\nDetalle: \`${err.message}\``),
                ],
            });
        }
    },
};
