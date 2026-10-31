const fs = require('fs');
const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, ButtonStyle } = require('../../components/v2');
const { state, readConfig, CONFIG_PATH } = require('../../api/panel');

module.exports = {
    name: 'perfil',
    aliases: ['profile', 'bot', 'config-bot', 'avatar', 'nombre', 'estado-bot', 'status-bot'],
    description: 'Consulta o personaliza el perfil, estado y prefijo del bot',
    options: [
        {
            name: 'estado',
            description: 'Nuevo estado o actividad personalizada (ej: Cinammon Network 🥽)',
            type: 3, // STRING
            required: false,
        },
        {
            name: 'nombre',
            description: 'Nuevo nombre para el bot en Discord',
            type: 3, // STRING
            required: false,
        },
        {
            name: 'prefijo',
            description: 'Nuevo prefijo para comandos (ej: ! o . o ?)',
            type: 3, // STRING
            required: false,
        },
    ],
    async execute({ options = [] }) {
        const cfg = readConfig();
        const newStatus = options.find((o) => o.name === 'estado' || o.name === 'arg0')?.value;
        const newName = options.find((o) => o.name === 'nombre' || o.name === 'arg1')?.value;
        const newPrefix = options.find((o) => o.name === 'prefijo' || o.name === 'arg2')?.value;

        // 1. Si solicita cambiar el estado personalizado de actividad
        if (newStatus && newStatus.trim()) {
            const cleanStatus = newStatus.trim();
            try {
                let currentFile = {};
                if (fs.existsSync(CONFIG_PATH)) {
                    currentFile = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
                }
                currentFile.status_text = cleanStatus;
                fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentFile, null, 2) + '\n', 'utf8');

                if (typeof state.updatePresence === 'function') {
                    state.updatePresence(cleanStatus);
                }

                return v2Container({
                    accentColor: 0x10b981,
                    children: [
                        v2Text(`## 🥽 Estado Personalizado Actualizado\nEl bot ahora muestra la actividad:\n**"${cleanStatus}"**\n*(Con icono oficial de Gafas VR activas)*`),
                        v2ActionRow([
                            v2Button({ label: 'Ver Perfil', custom_id: 'btn:perfil', style: ButtonStyle.PRIMARY }),
                        ]),
                    ],
                });
            } catch (err) {
                return v2Container({
                    accentColor: 0xef4444,
                    children: [v2Text(`Error al guardar estado: \`${err.message}\``)],
                });
            }
        }

        // 2. Si solicita cambiar de nombre
        if (newName && newName.length >= 2 && newName.length <= 32) {
            try {
                const res = await fetch('https://discord.com/api/v10/users/@me', {
                    method: 'PATCH',
                    headers: {
                        Authorization: `Bot ${cfg.token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ username: newName.trim() }),
                });

                if (res.ok) {
                    const data = await res.json();
                    state.tag = data.username;
                    return v2Container({
                        accentColor: 0x10b981,
                        children: [
                            v2Text(`## ✅ Nombre Actualizado\nEl bot ahora se llama **${data.username}**.`),
                            v2ActionRow([
                                v2Button({ label: 'Ver Perfil', custom_id: 'btn:perfil', style: ButtonStyle.PRIMARY }),
                            ]),
                        ],
                    });
                } else {
                    const errData = await res.json().catch(() => ({}));
                    return v2Container({
                        accentColor: 0xef4444,
                        children: [
                            v2Text(`## ⚠️ Aviso de Discord\n\`${errData.message || 'Límite de cambios de nombre alcanzado (máx. 2 por hora)'}\``),
                        ],
                    });
                }
            } catch (err) {
                return v2Container({
                    accentColor: 0xef4444,
                    children: [v2Text(`Error al actualizar nombre: \`${err.message}\``)],
                });
            }
        }

        // 3. Si solicita cambiar de prefijo
        if (newPrefix && newPrefix.trim()) {
            try {
                let currentFile = {};
                if (fs.existsSync(CONFIG_PATH)) {
                    currentFile = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
                }
                currentFile.prefix = newPrefix.trim();
                fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentFile, null, 2) + '\n', 'utf8');

                return v2Container({
                    accentColor: 0x10b981,
                    children: [
                        v2Text(`## ✅ Prefijo Actualizado\nNuevo prefijo para comandos: \`${newPrefix.trim()}\`\n*(Ejemplo: \`${newPrefix.trim()}ayuda\`, \`${newPrefix.trim()}sv\`)*`),
                        v2ActionRow([
                            v2Button({ label: 'Ver Comandos', custom_id: 'btn:ayuda', style: ButtonStyle.PRIMARY }),
                        ]),
                    ],
                });
            } catch (err) {
                return v2Container({
                    accentColor: 0xef4444,
                    children: [v2Text(`Error al guardar prefijo: \`${err.message}\``)],
                });
            }
        }

        // 4. Ver tarjeta de perfil completa
        const activeStatus = cfg.status_text || 'Cinammon Network 🥽';
        return v2Container({
            accentColor: 0x06b6d4,
            children: [
                v2Text(`## 🥽 Perfil & Presencia VR · Cinammon Bot\nConfiguración y estado activo del bot:`),
                v2Separator(true, 1),
                v2Section(
                    [
                        `**Nombre:** \`${state.tag || 'Cinammon Bot'}\`\n**Estado Activo:** \`${activeStatus}\` *(Gafas VR 🥽)*\n**Prefijo:** \`${cfg.prefix || '!'}\`\n**Panel:** \`${state.panel_url}\``,
                    ],
                    v2Button({
                        label: 'Portal Discord',
                        url: `https://discord.com/developers/applications/${state.application_id || ''}/bot`,
                        style: ButtonStyle.LINK,
                    })
                ),
                v2Separator(true, 1),
                v2Section(
                    [
                        `### 💡 Personalización Rápida\n• **Cambiar Estado:** \`/perfil estado: Tu Estado Aquí\` (o \`${cfg.prefix}perfil estado Tu Estado\`)\n• **Cambiar Nombre:** \`/perfil nombre: TuNombre\`\n• **Cambiar Prefijo:** \`/perfil prefijo: .\``,
                    ]
                ),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: '📖 Guía de Comandos', custom_id: 'btn:ayuda', style: ButtonStyle.PRIMARY }),
                    v2Button({ label: '🖥️ Servidores', custom_id: 'btn:servidores', style: ButtonStyle.SECONDARY }),
                    v2Button({ label: '🌐 Abrir Panel', url: cfg.panel_url || 'http://localhost:8000', style: ButtonStyle.LINK }),
                ]),
            ],
        });
    },
};
