/**
 * /admin: crear servidores y nodos, mantenimiento de nodos y suspender, reactivar o borrar servidores.
 *
 * Doble cerrojo: en Discord solo lo ven quienes tienen Administrador, y el panel además exige que la
 * cuenta vinculada a ese Discord sea Owner o Admin (BotAdminController).
 */
let api = null; // { panel, ui, accent, log, PANEL }

const S = 3, INT = 4, USER = 6;
const V2 = 1 << 15;

function init(a) {
    api = a;
}

function definitions() {
    return [{
        name: 'admin', description: 'Administración de la red (solo Owner y Admin)', default_member_permissions: String(1 << 3),
        options: [
            {
                name: 'crear-servidor', description: 'Crear un servidor en un nodo', type: 1, options: [
                    { name: 'nombre', description: 'Nombre del servidor', type: S, required: true, max_length: 60 },
                    { name: 'juego', description: 'Egg (escribe para buscar)', type: S, required: true, autocomplete: true },
                    { name: 'memoria', description: 'RAM en MB (ej. 4096)', type: INT, required: true, min_value: 128, max_value: 262144 },
                    { name: 'disco', description: 'Disco en MB (ej. 20480)', type: INT, required: true, min_value: 512, max_value: 2097152 },
                    { name: 'cpu', description: 'CPU en % (100 = 1 núcleo)', type: INT, required: true, min_value: 25, max_value: 3200 },
                    { name: 'dueño', description: 'Para quién (su Discord tiene que estar vinculado)', type: USER, required: false },
                    { name: 'correo', description: 'O el correo de su cuenta del panel', type: S, required: false },
                    { name: 'nodo', description: 'Nodo (por defecto el primero sin mantenimiento)', type: S, required: false, autocomplete: true },
                ],
            },
            {
                name: 'crear-nodo', description: 'Dar de alta un nodo nuevo', type: 1, options: [
                    { name: 'nombre', description: 'Nombre del nodo', type: S, required: true, max_length: 100 },
                    { name: 'dominio', description: 'FQDN o IP (ej. node2.cinammon.net)', type: S, required: true, max_length: 255 },
                    { name: 'puerto', description: 'Puerto de Wings (por defecto 8080)', type: INT, required: false, min_value: 1, max_value: 65535 },
                    { name: 'sftp', description: 'Puerto SFTP (por defecto 2022)', type: INT, required: false, min_value: 1, max_value: 65535 },
                    { name: 'esquema', description: 'Conexión con Wings', type: S, required: false, choices: [{ name: 'https', value: 'https' }, { name: 'http', value: 'http' }, { name: 'https detrás de proxy', value: 'https-reverse' }] },
                ],
            },
            { name: 'nodos', description: 'Nodos, su estado y modo mantenimiento', type: 1 },
            {
                name: 'servidor', description: 'Suspender, reactivar o borrar un servidor', type: 1, options: [
                    { name: 'id', description: 'ID del servidor en el panel', type: INT, required: true, min_value: 1 },
                    { name: 'accion', description: 'Qué hacer', type: S, required: true, choices: [{ name: 'Suspender', value: 'suspend' }, { name: 'Reactivar', value: 'unsuspend' }, { name: 'Borrar', value: 'delete' }] },
                ],
            },
        ],
    }];
}

/* --------------------------------------------------------------- utilidades */

const ui = (k) => (...a) => api.ui[k](...a);
const [text, sep, row, linkBtn, container, cut] = ['text', 'sep', 'row', 'linkBtn', 'container', 'cut'].map(ui);
const card = (color, ...c) => ({ flags: V2, components: [container(color ?? api.accent(), c.filter(Boolean))], allowed_mentions: { parse: [] } });
const btn = (label, custom_id, style = 2) => ({ type: 2, style, label, custom_id });
const actor = (i) => i.member?.user || i.user;
const call = (i, method, route, body) => api.panel(method, `/api/bot/discord/${actor(i).id}/admin${route}`, body);
const subOf = (i) => (i.data.options || [])[0];
const opt = (i, name) => (subOf(i)?.options || []).find((o) => o.name === name)?.value;
const gb = (mb) => (mb >= 1024 ? `${+(mb / 1024).toFixed(1)} GB` : `${mb} MB`);

/* ------------------------------------------------------------ autocompletar */

async function autocomplete(i) {
    const focused = (subOf(i)?.options || []).find((o) => o.focused);
    let choices = [];
    try {
        if (focused?.name === 'juego') {
            const { eggs } = await call(i, 'GET', `/eggs?q=${encodeURIComponent(String(focused.value || ''))}`);
            choices = eggs.map((e) => ({ name: cut(`${e.name}${e.category ? ` · ${e.category}` : ''}`, 100), value: String(e.id) }));
        } else if (focused?.name === 'nodo') {
            const { nodes } = await call(i, 'GET', '/nodes');
            const q = String(focused.value || '').toLowerCase();
            choices = nodes.filter((n) => n.name.toLowerCase().includes(q)).map((n) => ({ name: cut(`${n.name}${n.maintenance ? ' (mantenimiento)' : ''} · ${n.servers} servidores`, 100), value: String(n.id) }));
        }
    } catch {}
    return choices.slice(0, 25);
}

/* ---------------------------------------------------------------- comandos */

function nodesView(nodes, note) {
    const lines = nodes.map((n) => `**${n.name}** · \`${n.fqdn}\`\n-# ${n.maintenance ? 'Mantenimiento' : n.online ? 'En línea' : 'Sin conexión'} · ${n.servers} servidores${n.memory ? ` · ${gb(n.memory)} RAM` : ''}${n.disk ? ` · ${gb(n.disk)} disco` : ''}`);
    const buttons = nodes.slice(0, 20).map((n) => btn(`${n.maintenance ? 'Activar' : 'Mantenimiento'}: ${cut(n.name, 40)}`, `adm:mt:${n.id}:${n.maintenance ? 0 : 1}`, n.maintenance ? 3 : 2));
    const rows = [];
    for (let k = 0; k < buttons.length; k += 5) rows.push(row(...buttons.slice(k, k + 5)));
    return card(null,
        text(`## Nodos\n${lines.join('\n') || 'No hay nodos.'}`),
        note ? text(`-# ${note}`) : null,
        ...rows.slice(0, 4),
        row(btn('Actualizar', 'adm:nodes'), linkBtn('Nodos en el panel', `${api.PANEL}/nodes`)),
    );
}

async function run(i) {
    const sub = subOf(i)?.name;
    switch (sub) {
        case 'crear-servidor': {
            const egg = parseInt(opt(i, 'juego'), 10);
            if (!egg) return card(0xef4444, text('Elige el juego de la lista que aparece al escribir.'));
            const nodeId = opt(i, 'nodo') ? parseInt(opt(i, 'nodo'), 10) : null;
            const { server: s } = await call(i, 'POST', '/servers', {
                name: opt(i, 'nombre'), egg_id: egg, memory: opt(i, 'memoria'), disk: opt(i, 'disco'), cpu: opt(i, 'cpu'),
                node_id: nodeId || null, owner_discord_id: opt(i, 'dueño') || null, owner_email: opt(i, 'correo') || null,
            });
            api.log(`[ADMIN] ${actor(i).username} creó el servidor ${s.id} (${s.name}) para ${s.owner}`);
            return card(0x10b981,
                text(`## Servidor creado\n**${s.name}** · #${s.id}\n**Juego:** ${s.egg}\n**Nodo:** ${s.node}\n**Dueño:** ${s.owner}${s.owner_discord_id ? ` (<@${s.owner_discord_id}>)` : ''}\n**Dirección:** \`${s.address || 'pendiente'}\`\n**Recursos:** ${gb(opt(i, 'memoria'))} RAM · ${gb(opt(i, 'disco'))} disco · ${opt(i, 'cpu')}% CPU`),
                text('-# Se está instalando en el nodo; en unos minutos estará listo.'),
                row(linkBtn('Abrir consola', s.url)),
            );
        }
        case 'crear-nodo': {
            const { node: n } = await call(i, 'POST', '/nodes', {
                name: opt(i, 'nombre'), fqdn: opt(i, 'dominio'), daemon_listen: opt(i, 'puerto') || null,
                sftp_port: opt(i, 'sftp') || null, scheme: opt(i, 'esquema') || null,
            });
            api.log(`[ADMIN] ${actor(i).username} creó el nodo ${n.id} (${n.name})`);
            return card(0x10b981,
                text(`## Nodo creado\n**${n.name}** · #${n.id}\n\`${n.fqdn}\``),
                text('Falta instalar Wings en la máquina: abre el nodo en el panel, copia la configuración y añade las direcciones (allocations).'),
                row(linkBtn('Configurar en el panel', n.url)),
            );
        }
        case 'nodos': return nodesView((await call(i, 'GET', '/nodes')).nodes);
        case 'servidor': {
            const id = opt(i, 'id');
            const action = opt(i, 'accion');
            if (action === 'delete') {
                return card(0xef4444,
                    text(`## Borrar el servidor #${id}\nSe borra del panel y de su nodo con todos sus archivos. No se puede deshacer.`),
                    row(btn('Sí, borrarlo', `adm:del:${id}`, 4), btn('Cancelar', 'adm:cancel')),
                );
            }
            const { server: s } = await call(i, 'POST', `/servers/${id}/action`, { action });
            api.log(`[ADMIN] ${actor(i).username}: ${action} servidor ${s.id}`);
            return card(s.active ? 0x10b981 : 0xf59e0b, text(`**${s.name}** (#${s.id}) ${s.active ? 'reactivado' : 'suspendido'}.`));
        }
        default: return card(0xef4444, text('Subcomando desconocido.'));
    }
}

/** Botones "adm:*". */
async function component(i) {
    const [, kind, a, b] = i.data.custom_id.split(':');
    if (kind === 'cancel') return card(null, text('Cancelado.'));
    if (kind === 'nodes') return nodesView((await call(i, 'GET', '/nodes')).nodes);
    if (kind === 'mt') {
        await call(i, 'POST', `/nodes/${a}/maintenance`, { on: b === '1' });
        api.log(`[ADMIN] ${actor(i).username}: nodo ${a} mantenimiento ${b === '1' ? 'on' : 'off'}`);
        return nodesView((await call(i, 'GET', '/nodes')).nodes, b === '1' ? 'Nodo en mantenimiento: no se crearán servidores nuevos en él.' : 'Nodo activo de nuevo.');
    }
    if (kind === 'del') {
        const r = await call(i, 'POST', `/servers/${a}/action`, { action: 'delete' });
        api.log(`[ADMIN] ${actor(i).username} borró el servidor ${a} (${r.deleted})`);
        return card(0x71717a, text(`Servidor **${r.deleted}** (#${a}) borrado.`));
    }
    return card(0xef4444, text('Acción desconocida.'));
}

module.exports = { init, definitions, autocomplete, run, component };
