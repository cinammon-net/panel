const {
    ButtonStyle,
    v2Text,
    v2Separator,
    v2Section,
    v2Button,
    v2ActionRow,
    v2Container,
} = require('../components/v2');
const { getOption } = require('../commands/registry');
const { state, callPanelApi } = require('../api/panel');

async function buildV2Response(commandName, options, discordUser) {
    const username = discordUser?.username || 'Administrador';
    try {
        if (commandName === 'ping') {
            const start = Date.now();
            const overview = await callPanelApi('/api/bot/overview').catch(() => null);
            const rtt = Date.now() - start;

            return v2Container({
                accentColor: 0x06b6d4,
                children: [
                    v2Text(`## ⚡ Cinammon Node.js Bot · Components V2\nRespuesta en vivo desde **${state.mode}** con latencia de red \`${rtt} ms\`.`),
                    v2Separator(true, 1),
                    v2Section(
                        [
                            `**Endpoint del Panel:** \`${state.panel_url}\`\n**Motor UI:** \`Discord Components V2 (flag 32768)\`\n**Runtime:** \`Node.js ${process.version}\` · **Servidores:** \`${overview?.stats?.servers ?? 2}\``,
                        ],
                        v2Button({
                            label: 'Actualizar Estado',
                            custom_id: 'v2_cmd:estado',
                            style: ButtonStyle.PRIMARY,
                        }),
                    ),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores', custom_id: 'v2_cmd:servidores', style: ButtonStyle.SECONDARY }),
                        v2Button({ label: 'Tienda Billing', custom_id: 'v2_cmd:tienda', style: ButtonStyle.SUCCESS }),
                        v2Button({ label: 'Plugins Activos', custom_id: 'v2_cmd:plugins', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        }

        if (commandName === 'estado') {
            const overview = await callPanelApi('/api/bot/overview');
            return v2Container({
                accentColor: 0x10b981,
                children: [
                    v2Text(
                        `## 📊 Estado Global · Cinammon Panel, Wings & Billing\nSincronización bidireccional activa en modo **${state.mode}**.`,
                    ),
                    v2Separator(true, 1),
                    v2Section(
                        [
                            `### 🖥️ Infraestructura de Servidores y Nodos\n• **Servidores:** \`${overview.stats?.servers ?? 0}\` totales\n• **Nodos Wings:** \`${overview.stats?.nodes ?? 1}\` conectados · **Usuarios:** \`${overview.stats?.users ?? 1}\``,
                        ],
                        v2Button({
                            label: 'Listar Servidores',
                            custom_id: 'v2_cmd:servidores',
                            style: ButtonStyle.PRIMARY,
                        }),
                    ),
                    v2Separator(true, 1),
                    v2Section(
                        [
                            `### 💳 Monetización (Cinammon Billing) & Plugins\n• **Planes Disponibles:** \`${overview.plans?.length ?? 4}\` en catálogo\n• **Plugins:** \`${overview.plugins?.length ?? 6}\` (AI Auto-Healer & Clan Split-Pay activos)`,
                        ],
                        v2Button({
                            label: 'Abrir Tienda',
                            custom_id: 'v2_cmd:tienda',
                            style: ButtonStyle.SUCCESS,
                        }),
                    ),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Crear PaperMC 1-Click', custom_id: 'v2_quick_create:minecraft', style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Crear Bot Node.js 1-Click', custom_id: 'v2_quick_create:discord', style: ButtonStyle.SECONDARY }),
                        v2Button({ label: 'Ver Plugins', custom_id: 'v2_cmd:plugins', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        }

        if (commandName === 'servidores') {
            const overview = await callPanelApi('/api/bot/overview');
            const servers = (overview.servers || []).slice(0, 5);
            const sections = servers.map((s) =>
                v2Section(
                    [
                        `**#${s.id} · ${s.name}** (${s.status === 'running' ? '🟢 Online' : '🔴 Offline'})\nMotor: \`${s.egg}\` · Endpoint: \`${s.address}\` · RAM: \`${s.memory} MiB\``,
                    ],
                    v2Button({
                        label: 'Eliminar',
                        custom_id: `v2_delete:${s.id}`,
                        style: ButtonStyle.DANGER,
                    }),
                ),
            );

            return v2Container({
                accentColor: 0x06b6d4,
                children: [
                    v2Text(`## 🖥️ Servidores Desplegados (${overview.servers?.length ?? 0})\nGestiona la energía o crea nuevas instancias con **Components V2**.`),
                    v2Separator(true, 1),
                    ...(sections.length > 0 ? sections : [v2Text('No hay servidores registrados todavía.')]),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: '+ Crear Servidor PaperMC', custom_id: 'v2_quick_create:minecraft', style: ButtonStyle.SUCCESS }),
                        v2Button({ label: '+ Crear Bot Node.js', custom_id: 'v2_quick_create:discord', style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Refrescar Lista', custom_id: 'v2_cmd:servidores', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        }

        if (commandName === 'crear-servidor') {
            const name = getOption(options, 'nombre', `Server-${Math.floor(Math.random() * 900 + 100)}`);
            const planCode = getOption(options, 'tipo', 'starter-mc');

            // Exigencia de pago: Si se invoca sin orden de pago previa, se redirige a la pasarela
            const overview = await callPanelApi('/api/bot/overview');
            const targetPlan = (overview.plans || []).find((p) => p.id === planCode) || {
                name: 'Plan Personalizado',
                price: 4.99,
            };

            return v2Container({
                accentColor: 0xa855f7,
                children: [
                    v2Text(`## 💳 Pago Requerido para Despliegue\nPara desplegar el servidor **${name}** con el plan **${targetPlan.name}**, debes completar el pago seguro.`),
                    v2Separator(true, 1),
                    v2Section(
                        [
                            `### 💎 Coste: **${targetPlan.price}€ / mes**\n• **Servidor:** \`${name}\`\n• **Auto-Aprovisionamiento:** Inmediato tras confirmación de pasarela.`,
                        ],
                        v2Button({
                            label: `Proceder al Pago (${targetPlan.price}€)`,
                            custom_id: `v2_buy:${planCode}:${name}`,
                            style: ButtonStyle.SUCCESS,
                        }),
                    ),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Crear Fondo Split-Pay (Clan)', custom_id: `v2_splitpay:${name}`, style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Cancelar', custom_id: 'v2_cmd:servidores', style: ButtonStyle.DANGER }),
                    ]),
                ],
            });
        }

        if (commandName === 'eliminar-servidor') {
            const target = getOption(options, 'servidor_id', '1');
            const res = await callPanelApi('/api/bot/servers/delete', 'POST', {
                server_id: target,
            });

            return v2Container({
                accentColor: 0xef4444,
                children: [
                    v2Text(`## 🗑️ Servidor Eliminado\n${res.message}`),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Ver Servidores Restantes', custom_id: 'v2_cmd:servidores', style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Estado Global', custom_id: 'v2_cmd:estado', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        }

        if (commandName === 'energia') {
            const target = getOption(options, 'servidor_id', '1');
            const action = getOption(options, 'accion', 'restart');
            const res = await callPanelApi('/api/bot/servers/power', 'POST', {
                server_id: Number(target),
                action,
            });

            return v2Container({
                accentColor: 0xf59e0b,
                children: [
                    v2Text(`## ⚡ Control de Energía Wings\nAcción \`${action.toUpperCase()}\` ejecutada en servidor **#${res.server_id}** (${res.state}).`),
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Volver a Servidores', custom_id: 'v2_cmd:servidores', style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Estado del Nodo', custom_id: 'v2_cmd:estado', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        }

        if (commandName === 'tienda') {
            const overview = await callPanelApi('/api/bot/overview');
            const plans = overview.plans || [];
            const planSections = plans.slice(0, 4).map((p) =>
                v2Section(
                    [
                        `### 💎 ${p.name} — **${p.price}€/mes**\nRecursos: \`${p.memory} MiB RAM\` · \`${p.cpu}% CPU\` · \`${p.disk} MiB NVMe\` · Motor: *${p.egg}*`,
                    ],
                    v2Button({
                        label: `Comprar (${p.price}€)`,
                        custom_id: `v2_buy:${p.id}`,
                        style: ButtonStyle.SUCCESS,
                    }),
                ),
            );

            return v2Container({
                accentColor: 0xa855f7,
                children: [
                    v2Text(
                        `## 💳 Cinammon Billing · Catálogo de Monetización\nSincronizado con **cinammon-es/billing**. Aprovisionamiento instantáneo con **Stripe**, **PayPal** o **Clan Split-Pay**.`,
                    ),
                    v2Separator(true, 1),
                    ...planSections,
                    v2Separator(true, 1),
                    v2ActionRow([
                        v2Button({ label: 'Aportar 2.50€ a Colecta Split-Pay', custom_id: 'v2_splitpay:Clan-Valkyrie', style: ButtonStyle.PRIMARY }),
                        v2Button({ label: 'Ver Servidores Activos', custom_id: 'v2_cmd:servidores', style: ButtonStyle.SECONDARY }),
                    ]),
                ],
            });
        }

        if (commandName === 'comprar') {
            const planId = getOption(options, 'plan_id', 'bot-v2');
            const serverName = getOption(options, 'nombre_servidor', `Server-${username}`);
            const gateway = getOption(options, 'metodo_pago', 'stripe');

            const order = await callPanelApi('/api/bot/billing/checkout', 'POST', {
                plan_id: planId,
                server_name: serverName,
                gateway,
                discord_user: username,
            });

            return v2Container({
                accentColor: 0x10b981,
                children: [
                    v2Text(`## 🧾 Factura y Aprovisionamiento Completado`),
                    v2Separator(true, 1),
                    v2Section(
                        [
                            `**Factura:** \`${order.invoice_id}\` · **Pasarela:** \`${gateway.toUpperCase()}\`\n**Servidor Creado:** #${order.server.server_id} **${order.server.server_name}** (\`${order.server.address}\`)`,
                        ],
                        v2Button({
                            label: 'Ver Servidores',
                            custom_id: 'v2_cmd:servidores',
                            style: ButtonStyle.SUCCESS,
                        }),
                    ),
                ],
            });
        }

        if (commandName === 'colecta') {
            const poolName = getOption(options, 'servidor', 'Clan-Valkyrie');
            const amount = Number(getOption(options, 'aporte_eur', 2.5));
            const pool = await callPanelApi('/api/bot/billing/split-pay', 'POST', {
                clan_name: poolName,
                plan_id: 'pro-mc',
                contribution: amount,
                discord_user: username,
            });

            return v2Container({
                accentColor: 0xec4899,
                children: [
                    v2Text(`## 🤝 Colecta Co-Op Split-Pay · ${pool.clan_name}\n**@${username}** ha aportado **${amount.toFixed(2)}€** al fondo compartido del servidor.`),
                    v2Separator(true, 1),
                    v2Section(
                        [
                            `**Progreso del Fondo:** \`${pool.collected_amount.toFixed(2)}€ / ${pool.target_amount.toFixed(2)}€\`\n**Código de Colecta:** \`${pool.pool_code}\``,
                        ],
                        v2Button({
                            label: '+ Aportar 2.50€ más',
                            custom_id: `v2_splitpay:${pool.clan_name}`,
                            style: ButtonStyle.PRIMARY,
                        }),
                    ),
                ],
            });
        }

        if (commandName === 'plugins') {
            const overview = await callPanelApi('/api/bot/overview');
            const plugins = overview.plugins || [];
            const pluginSections = plugins.slice(0, 5).map((p) =>
                v2Section(
                    [
                        `${p.enabled ? '🟢' : '⚪'} **${p.name}** \`v${p.version}\`\n*${p.description.substring(0, 110)}...*`,
                    ],
                    v2Button({
                        label: p.enabled ? 'Activo' : 'Activar',
                        custom_id: `v2_toggle_plugin:${p.id}`,
                        style: p.enabled ? ButtonStyle.SUCCESS : ButtonStyle.SECONDARY,
                    }),
                ),
            );

            return v2Container({
                accentColor: 0xf97316,
                children: [
                    v2Text(`## 🧩 Ecosistema de Plugins Cinammon (Components V2)\nArquitectura compatible con manifiestos Pelican + funciones exclusivas de Cinammon.`),
                    v2Separator(true, 1),
                    ...pluginSections,
                ],
            });
        }

        // /ayuda por defecto
        return v2Container({
            accentColor: 0x06b6d4,
            children: [
                v2Text(
                    `## 🤖 Centro de Control · Cinammon Node.js Bot (Components V2)\nTodas las respuestas usan el estándar **Discord Components V2** (\`IS_COMPONENTS_V2\`) con contenedores interactivos, secciones y botones de acción directa.`,
                ),
                v2Separator(true, 1),
                v2Section(
                    [
                        `### 🖥️ Gestión de Servidores y Nodos\n• \`/crear-servidor\` — Despliega instancias PaperMC, Node.js Bot, Rust o Source.\n• \`/servidores\` y \`/energia\` — Lista servidores y controla su encendido en tiempo real.`,
                    ],
                    v2Button({ label: 'Ver Servidores', custom_id: 'v2_cmd:servidores', style: ButtonStyle.PRIMARY }),
                ),
                v2Separator(true, 1),
                v2Section(
                    [
                        `### 💎 Monetización Cinammon Billing & Split-Pay\n• \`/tienda\` y \`/comprar\` — Pasarela conectada con Stripe, PayPal y Credits.\n• \`/colecta\` — Pago cooperativo (**Clan Split-Pay**) entre varios usuarios.`,
                    ],
                    v2Button({ label: 'Abrir Tienda', custom_id: 'v2_cmd:tienda', style: ButtonStyle.SUCCESS }),
                ),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: 'Estado Global', custom_id: 'v2_cmd:estado', style: ButtonStyle.SECONDARY }),
                    v2Button({ label: 'Plugins Exclusivos', custom_id: 'v2_cmd:plugins', style: ButtonStyle.SECONDARY }),
                    v2Button({ label: 'Test Ping', custom_id: 'v2_cmd:ping', style: ButtonStyle.SECONDARY }),
                ]),
            ],
        });
    } catch (err) {
        return v2Container({
            accentColor: 0xef4444,
            children: [
                v2Text(`## ⚠️ Aviso al ejecutar comando\nDetalle: \`${err.message}\``),
                v2Separator(true, 1),
                v2ActionRow([
                    v2Button({ label: 'Reintentar Estado', custom_id: 'v2_cmd:estado', style: ButtonStyle.PRIMARY }),
                ]),
            ],
        });
    }
}

async function handleV2ButtonComponent(customId, discordUser) {
    if (customId.startsWith('v2_cmd:')) {
        const subCmd = customId.split(':')[1] || 'estado';
        return buildV2Response(subCmd, [], discordUser);
    }

    if (customId.startsWith('v2_quick_create:')) {
        const type = customId.split(':')[1] || 'minecraft';
        const suffix = Math.floor(Math.random() * 900 + 100);
        return buildV2Response(
            'crear-servidor',
            [
                { name: 'nombre', value: type === 'discord' ? `Cinammon-Bot-${suffix}` : `PaperMC-${suffix}` },
                { name: 'tipo', value: type },
            ],
            discordUser,
        );
    }

    if (customId.startsWith('v2_delete:')) {
        const serverId = customId.split(':')[1];
        return buildV2Response(
            'eliminar-servidor',
            [{ name: 'servidor_id', value: serverId }],
            discordUser,
        );
    }

    if (customId.startsWith('v2_power:')) {
        const [, serverId, action] = customId.split(':');
        return buildV2Response(
            'energia',
            [
                { name: 'servidor_id', value: serverId },
                { name: 'accion', value: action || 'restart' },
            ],
            discordUser,
        );
    }

    if (customId.startsWith('v2_buy:')) {
        const planId = customId.split(':')[1] || 'bot-v2';
        return buildV2Response(
            'comprar',
            [
                { name: 'plan_id', value: planId },
                { name: 'nombre_servidor', value: `${planId}-${Math.floor(Math.random() * 90 + 10)}` },
                { name: 'metodo_pago', value: 'stripe' },
            ],
            discordUser,
        );
    }

    if (customId.startsWith('v2_splitpay:')) {
        const poolName = customId.split(':')[1] || 'Clan-Valkyrie';
        return buildV2Response(
            'colecta',
            [
                { name: 'servidor', value: poolName },
                { name: 'aporte_eur', value: 2.5 },
            ],
            discordUser,
        );
    }

    if (customId.startsWith('v2_toggle_plugin:')) {
        const pluginId = customId.split(':')[1];
        await callPanelApi('/api/bot/plugins/toggle', 'POST', { plugin_id: pluginId }).catch(() => null);
        return buildV2Response('plugins', [], discordUser);
    }

    return buildV2Response('ayuda', [], discordUser);
}

module.exports = {
    buildV2Response,
    handleV2ButtonComponent,
};

