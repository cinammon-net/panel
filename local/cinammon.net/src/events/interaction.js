const { commands } = require('../commands');
const { v2Container, v2Text, v2Separator, v2Section, v2Button, v2ActionRow, v2StringSelect, ButtonStyle } = require('../components/v2');
const { callPanelApi } = require('../api/panel');

async function onInteraction({ interaction, token, applicationId, log }) {
    const isSlash = interaction.type === 2;
    const isButton = interaction.type === 3;
    if (!isSlash && !isButton) return;

    const user = interaction.member?.user || interaction.user || { username: 'Usuario' };

    // Ack immediate
    const callbackUrl = `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`;
    await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 5 }), // DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE
    }).catch(() => null);

    let responsePayload;

    if (isSlash) {
        const cmdName = interaction.data?.name;
        log(`Comando: /${cmdName} por @${user.username}`);
        const cmd = commands.get(cmdName);
        if (!cmd) {
            log(`[CMD ERROR] Comando desconocido: /${cmdName} (ejecutado por @${user.username})`);
            responsePayload = v2Container({
                accentColor: 0xef4444,
                children: [v2Text(`### ⚠️ Comando desconocido: \`/${cmdName}\``)],
            });
        } else {
            try {
                responsePayload = await cmd.execute({
                    options: interaction.data?.options || [],
                    user,
                    log,
                });
            } catch (err) {
                log(`[CMD ERROR] Error ejecutando /${cmdName} por @${user.username}: ${err.message}`);
                if (err.stack) {
                    const trace = err.stack.split('\n').slice(0, 3).map((l) => l.trim()).join(' | ');
                    log(`[CMD ERROR TRACE] ${trace}`);
                }
                responsePayload = v2Container({
                    accentColor: 0xef4444,
                    children: [v2Text(`### ⚠️ Error en comando /${cmdName}\n\`${err.message}\``)],
                });
            }
        }
    } else if (isButton) {
        const customId = interaction.data?.custom_id || '';
        log(`Botón: ${customId} por @${user.username}`);

        try {
            // Quick routes: btn:servidores, btn:estado, btn:tienda, btn:perfil, btn:ayuda, power:action:id
            if (customId === 'btn:servidores' || customId === 'v2_cmd:servidores') {
                responsePayload = await commands.get('servidores')?.execute({ user, log });
            } else if (customId === 'btn:estado' || customId === 'v2_cmd:estado') {
                responsePayload = await commands.get('estado')?.execute({ user, log });
            } else if (customId === 'btn:tienda' || customId === 'v2_cmd:tienda') {
                responsePayload = await commands.get('planes')?.execute({ user, log });
            } else if (customId === 'btn:perfil' || customId === 'v2_cmd:perfil') {
                responsePayload = await commands.get('perfil')?.execute({ user, log });
            } else if (customId === 'btn:ayuda' || customId === 'v2_cmd:ayuda') {
                responsePayload = await commands.get('ayuda')?.execute({ user, log });
            } else if (customId === 'btn:diario' || customId === 'v2_cmd:diario') {
                responsePayload = await commands.get('diario')?.execute({ user, log });
            } else if (customId === 'btn:monedas' || customId === 'v2_cmd:monedas') {
                responsePayload = await commands.get('monedas')?.execute({ user, log });
            } else if (customId === 'btn:boost' || customId === 'v2_cmd:boost') {
                responsePayload = await commands.get('reclamar-boost')?.execute({ user, log });
            } else if (customId === 'btn:boost:overclock') {
                const data = await callPanelApi(`/api/bot/discord/${user.id}/booster-core`, 'GET');
                const servers = data.user_servers || [];
                if (servers.length === 0) {
                    responsePayload = v2Container({
                        accentColor: 0xf59e0b,
                        children: [
                            v2Text('## No Tienes Servidores Propios\nNo encontramos servidores activos en tu cuenta para aplicar Overclock.\n\nPuedes usar la **Opcion 2: Desplegar Pod a Medida** para crear uno nuevo con tus 4 GB de RAM de Booster.'),
                            v2Separator(true, 1),
                            v2ActionRow([
                                v2Button({ label: 'Desplegar Pod a Medida', custom_id: 'btn:boost:pod', style: ButtonStyle.PRIMARY }),
                                v2Button({ label: 'Volver', custom_id: 'btn:boost', style: ButtonStyle.SECONDARY }),
                            ]),
                        ],
                    });
                } else {
                    const options = servers.map((s) => ({
                        label: `${s.name}`.slice(0, 50),
                        value: String(s.id),
                        description: `RAM: ${s.memory} MB -> ${s.memory + 3072} MB | CPU: ${s.cpu}% -> ${s.cpu + 150}%`.slice(0, 95),
                    }));
                    responsePayload = v2Container({
                        accentColor: 0x34d399,
                        children: [
                            v2Text('## Selecciona el Servidor para Overclock\nElige cual de tus servidores recibira **+3 GB RAM**, **+150% CPU Turbo** y **+10 GB NVMe**:'),
                            v2Separator(true, 1),
                            v2StringSelect({
                                custom_id: 'select:boost:overclock',
                                placeholder: 'Elige tu servidor a potenciar...',
                                options,
                            }),
                            v2Separator(true, 1),
                            v2ActionRow([
                                v2Button({ label: 'Cancelar / Volver', custom_id: 'btn:boost', style: ButtonStyle.SECONDARY }),
                            ]),
                        ],
                    });
                }
            } else if (customId === 'select:boost:overclock') {
                const serverId = interaction.data?.values?.[0];
                const res = await callPanelApi(`/api/bot/discord/${user.id}/booster-core/overclock`, 'POST', { server_id: serverId });
                responsePayload = v2Container({
                    accentColor: 0x10b981,
                    children: [
                        v2Text('## OVERCLOCK APLICADO CON EXITO\nTu Nucleo Cinammon Booster ha potenciado tu servidor.'),
                        v2Separator(true, 1),
                        v2Section([
                            `✦ Servidor: **${res.server.name}**\n` +
                            `✦ Memoria RAM: **${res.server.memory} MB**\n` +
                            `✦ Procesador: **${res.server.cpu}% CPU**\n` +
                            `✦ Almacenamiento: **${res.server.disk} MB NVMe**\n` +
                            `✦ Direccion: \`${res.server.address || 'En panel'}\`\n\n` +
                            `Este beneficio es transferible. Puedes reasignar la potencia a otro servidor cuando lo desees.`
                        ]),
                        v2Separator(true, 1),
                        v2ActionRow([
                            v2Button({ label: 'Abrir Consola', url: res.server.url, style: ButtonStyle.LINK }),
                            v2Button({ label: 'Mis Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                            v2Button({ label: 'Reasignar Nucleo', custom_id: 'btn:boost:reset', style: ButtonStyle.SECONDARY }),
                        ]),
                    ],
                });
            } else if (customId === 'btn:boost:shield') {
                const data = await callPanelApi(`/api/bot/discord/${user.id}/booster-core`, 'GET');
                const servers = data.user_servers || [];
                if (servers.length === 0) {
                    responsePayload = v2Container({
                        accentColor: 0xf59e0b,
                        children: [
                            v2Text('## No Tienes Servidores para Proteger\nNo encontramos servidores activos en tu cuenta para aplicar el Escudo de Inmunidad.\n\nCrea primero un servidor o despliega un Pod a Medida con tu boost.'),
                            v2Separator(true, 1),
                            v2ActionRow([
                                v2Button({ label: 'Desplegar Pod a Medida', custom_id: 'btn:boost:pod', style: ButtonStyle.PRIMARY }),
                                v2Button({ label: 'Volver', custom_id: 'btn:boost', style: ButtonStyle.SECONDARY }),
                            ]),
                        ],
                    });
                } else {
                    const options = servers.map((s) => ({
                        label: `${s.name}`.slice(0, 50),
                        value: String(s.id),
                        description: `Inmunidad total anti-suspension y borrado por inactividad`.slice(0, 95),
                    }));
                    responsePayload = v2Container({
                        accentColor: 0x06b6d4,
                        children: [
                            v2Text('## Selecciona el Servidor para el Escudo de Inmunidad\nEl servidor seleccionado nunca se suspendera ni se borrara por inactividad mientras mantengas tu Boost:'),
                            v2Separator(true, 1),
                            v2StringSelect({
                                custom_id: 'select:boost:shield',
                                placeholder: 'Elige tu servidor a blindar...',
                                options,
                            }),
                            v2Separator(true, 1),
                            v2ActionRow([
                                v2Button({ label: 'Cancelar / Volver', custom_id: 'btn:boost', style: ButtonStyle.SECONDARY }),
                            ]),
                        ],
                    });
                }
            } else if (customId === 'select:boost:shield') {
                const serverId = interaction.data?.values?.[0];
                const res = await callPanelApi(`/api/bot/discord/${user.id}/booster-core/shield`, 'POST', { server_id: serverId });
                responsePayload = v2Container({
                    accentColor: 0x06b6d4,
                    children: [
                        v2Text('## ESCUDO DE INMUNIDAD ACTIVADO\nTu servidor ha quedado blindado con exito.'),
                        v2Separator(true, 1),
                        v2Section([
                            `✦ Servidor Protegido: **${res.server.name}**\n` +
                            `✦ Proteccion: **Inmune a suspension por saldo, creditos o inactividad**\n` +
                            `✦ Vigencia: **Activa mientras mantengas tu Server Boost**\n\n` +
                            `Puedes administrarlo o transferir el escudo cuando lo desees.`
                        ]),
                        v2Separator(true, 1),
                        v2ActionRow([
                            v2Button({ label: 'Abrir Consola', url: res.server.url, style: ButtonStyle.LINK }),
                            v2Button({ label: 'Mis Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                            v2Button({ label: 'Reasignar Nucleo', custom_id: 'btn:boost:reset', style: ButtonStyle.SECONDARY }),
                        ]),
                    ],
                });
            } else if (customId === 'btn:boost:pod') {
                responsePayload = v2Container({
                    accentColor: 0x06b6d4,
                    children: [
                        v2Text('## CONFIGURAR POD BOOSTER A LA CARTA\nElige el tipo de entorno que deseas desplegar para tu servidor nuevo (4 GB RAM, 15 GB NVMe, 200% CPU):'),
                        v2Separator(true, 1),
                        v2ActionRow([
                            v2Button({ label: 'Bots & Codigo 24/7 (NodeJS / Python / Bun)', custom_id: 'btn:boost:pod_cat:bots', style: ButtonStyle.PRIMARY }),
                        ]),
                        v2ActionRow([
                            v2Button({ label: 'Minecraft Dedicado (Paper / Fabric / Bedrock)', custom_id: 'btn:boost:pod_cat:minecraft', style: ButtonStyle.SECONDARY }),
                        ]),
                        v2ActionRow([
                            v2Button({ label: 'Juegos (GTA SA-MP / MTA / Rust / Palworld)', custom_id: 'btn:boost:pod_cat:games', style: ButtonStyle.SECONDARY }),
                        ]),
                        v2ActionRow([
                            v2Button({ label: 'Web, Cloud & DB (Nginx+PHP / Uptime / SQL)', custom_id: 'btn:boost:pod_cat:web', style: ButtonStyle.SECONDARY }),
                        ]),
                        v2Separator(true, 1),
                        v2ActionRow([
                            v2Button({ label: 'Volver al Menu Principal', custom_id: 'btn:boost', style: ButtonStyle.SECONDARY }),
                        ]),
                    ],
                });
            } else if (customId.startsWith('btn:boost:pod_cat:')) {
                const category = customId.split(':')[3];
                const res = await callPanelApi(`/api/bot/discord/${user.id}/booster-core/pod`, 'POST', { category });
                responsePayload = v2Container({
                    accentColor: 0xec4899,
                    children: [
                        v2Text('## POD BOOSTER APROVISIONADO CON EXITO\nTu nuevo servidor a la carta ha sido creado.'),
                        v2Separator(true, 1),
                        v2Section([
                            `✦ Nombre: **${res.server.name}**\n` +
                            `✦ Memoria RAM: **4 GB (4096 MB)**\n` +
                            `✦ Almacenamiento: **15 GB NVMe**\n` +
                            `✦ Procesador: **200% CPU**\n` +
                            `✦ Direccion: \`${res.server.address || 'Asignando puerto...'}\`\n\n` +
                            `El servidor se encuentra en instalacion. Puedes gestionarlo de inmediato desde el panel web.`
                        ]),
                        v2Separator(true, 1),
                        v2ActionRow([
                            v2Button({ label: 'Abrir en Panel', url: res.server.url, style: ButtonStyle.LINK }),
                            v2Button({ label: 'Mis Servidores', custom_id: 'btn:servidores', style: ButtonStyle.PRIMARY }),
                            v2Button({ label: 'Reasignar Nucleo', custom_id: 'btn:boost:reset', style: ButtonStyle.SECONDARY }),
                        ]),
                    ],
                });
            } else if (customId === 'btn:boost:reset') {
                await callPanelApi(`/api/bot/discord/${user.id}/booster-core/reset`, 'POST', {});
                responsePayload = await commands.get('reclamar-boost')?.execute({ user, log });
            } else if (customId === 'btn:afiliado' || customId === 'v2_cmd:afiliado') {
                responsePayload = await commands.get('afiliado')?.execute({ user, log });
            } else if (customId.startsWith('metrics:')) {
                const sId = Number(customId.split(':')[1]);
                responsePayload = await commands.get('metricas')?.execute({ options: [{ name: 'id', value: sId }], user, log });
            } else if (customId.startsWith('diag:')) {
                const sId = Number(customId.split(':')[1]);
                responsePayload = await commands.get('diagnostico')?.execute({ options: [{ name: 'id', value: sId }], user, log });
            } else if (customId.startsWith('backup:list:')) {
                const sId = Number(customId.split(':')[2]);
                responsePayload = await commands.get('backups')?.execute({ options: [{ name: 'id', value: sId }], user, log });
            } else if (customId.startsWith('backup:create:')) {
                const sId = Number(customId.split(':')[2]);
                await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${sId}/backups`, 'POST', {});
                responsePayload = await commands.get('backups')?.execute({ options: [{ name: 'id', value: sId }], user, log });
            } else if (customId.startsWith('db:list:')) {
                const sId = Number(customId.split(':')[2]);
                responsePayload = await commands.get('basedatos')?.execute({ options: [{ name: 'id', value: sId }], user, log });
            } else if (customId.startsWith('players:')) {
                const sId = Number(customId.split(':')[1]);
                responsePayload = await commands.get('jugadores')?.execute({ options: [{ name: 'id', value: sId }], user, log });
            } else if (customId.startsWith('activity:')) {
                const sId = Number(customId.split(':')[1]);
                responsePayload = await commands.get('actividad')?.execute({ options: [{ name: 'id', value: sId }], user, log });
            } else if (customId.startsWith('reinstall:confirm:')) {
                const sId = Number(customId.split(':')[2]);
                await callPanelApi(`/api/bot/discord/${user.id || 'system'}/servers/${sId}/reinstall`, 'POST', {});
                responsePayload = v2Container({
                    accentColor: 0x10b981,
                    children: [
                        v2Text(`## Reinstalacion Iniciada\nServidor #${sId} se esta reinstalando. El proceso tardara 1-2 minutos.`),
                    ],
                });
            } else if (customId.startsWith('power:') || customId.startsWith('v2_power:')) {
                const parts = customId.split(':');
                const action = parts[1];
                const sId = parts[2];
                responsePayload = await commands.get('energia')?.execute({
                    options: [
                        { name: 'servidor_id', value: Number(sId) },
                        { name: 'accion', value: action },
                    ],
                    user,
                    log,
                });
            } else {
                log(`[CMD WARN] Botón sin manejador registrado: ${customId}`);
            }
        } catch (err) {
            log(`[CMD ERROR] Error al procesar botón "${customId}" por @${user.username}: ${err.message}`);
            if (err.stack) {
                const trace = err.stack.split('\n').slice(0, 3).map((l) => l.trim()).join(' | ');
                log(`[CMD ERROR TRACE] ${trace}`);
            }
            responsePayload = v2Container({
                accentColor: 0xef4444,
                children: [v2Text(`### ⚠️ Error en acción: \`${err.message}\``)],
            });
        }
    }

    if (!responsePayload) {
        responsePayload = v2Container({
            accentColor: 0x06b6d4,
            children: [v2Text(`Acción procesada correctamente.`)],
        });
    }

    // Edit deferred message
    await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${interaction.token}/messages/@original`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(responsePayload),
    }).catch((err) => log(`Error al responder: ${err.message}`));
}

module.exports = { onInteraction };
