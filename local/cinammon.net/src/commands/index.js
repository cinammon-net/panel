const fs = require('fs');
const path = require('path');

const commands = new Map();
const uniqueCommands = new Set();

function loadCommandsFromDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            loadCommandsFromDir(fullPath);
        } else if (file.endsWith('.js') && file !== 'index.js') {
            try {
                delete require.cache[require.resolve(fullPath)];
                const cmd = require(fullPath);
                if (cmd && cmd.name) {
                    const primaryName = cmd.name.toLowerCase();
                    commands.set(primaryName, cmd);
                    uniqueCommands.add(cmd);

                    // Registrar todos los alias para búsqueda rápida
                    if (Array.isArray(cmd.aliases)) {
                        for (const alias of cmd.aliases) {
                            commands.set(alias.toLowerCase(), cmd);
                        }
                    }
                }
            } catch (err) {
                // error loading command
            }
        }
    }
}

loadCommandsFromDir(__dirname);

function getSlashCommandData() {
    return Array.from(uniqueCommands).map((cmd) => ({
        name: cmd.name,
        description: cmd.description || 'Comando de Cinammon',
        options: cmd.options || [],
    }));
}

module.exports = {
    commands,
    uniqueCommands,
    getSlashCommandData,
};
