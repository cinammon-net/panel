/**
 * Verificación de entrada.
 *
 * - Al entrar solo se ve #verificación. El resto de canales exige el rol Miembro.
 * - "Verificarme" muestra una comprobación sencilla (pulsar la palabra que se pide) para frenar
 *   cuentas automáticas; si se acierta, el bot da Miembro y publica la bienvenida en #llegadas.
 * - Cuentas de Discord con menos de 24 h no pueden verificarse (típico de raids y spam).
 * - El panel solo deja entrar o vincular con Discord a quien tiene el rol Miembro aquí.
 */
let env = null; // { discord, log, saveState, st, ctx, accent, ui, members, audit, layoutSave }

const VIEW = 1n << 10n, SEND = 1n << 11n, REACT = 1n << 6n, THREADS = (1n << 35n) | (1n << 36n) | (1n << 38n), HISTORY = 1n << 16n, COMMANDS = 1n << 31n;
const GATE_VERSION = 1;
const MIN_AGE_MS = 24 * 3600_000;
const WORDS = ['Canela', 'Galleta', 'Cohete', 'Cristal', 'Neón', 'Píxel', 'Dragón', 'Luna', 'Volcán', 'Trueno', 'Brújula', 'Cometa'];

const pending = new Map(); // nonce -> { user, answer, at }

function init(e) {
    env = e;
}

const ui = (k) => (...a) => env.ui[k](...a);
const [text, sep, row, container] = ['text', 'sep', 'row', 'container'].map(ui);
const V2 = 1 << 15, EPH = 64;
const card = (color, ...c) => ({ flags: V2, components: [container(color, c.filter(Boolean))], allowed_mentions: { parse: [] } });
const eph = (data) => ({ type: 4, data: { ...data, flags: V2 | EPH } });
const btn = (label, custom_id, style = 2) => ({ type: 2, style, label, custom_id });

/* -------------------------------------------------- canal y permisos */

/** Crea la categoría y el canal #verificación arriba del todo. */
async function ensureChannel() {
    const L = env.ctx().layout;
    const g = env.ctx().guild;
    const exists = async (id) => id && (await env.discord('GET', `/channels/${id}`).then(() => true).catch((e) => e.status !== 404));
    if (await exists(L.channels.verify)) return false;

    const member = L.roles.member;
    let cat = L.categories.verify;
    if (!(await exists(cat))) {
        const c = await env.discord('POST', `/guilds/${g}/channels`, {
            name: '˚₊‧ VERIFICACIÓN ‧₊˚', type: 4, position: 0,
            permission_overwrites: [
                { id: g, type: 0, allow: String(VIEW | HISTORY), deny: String(SEND | REACT | THREADS) },
                { id: member, type: 0, allow: '0', deny: String(VIEW) },
                { id: env.ctx().appId, type: 1, allow: String(VIEW | SEND), deny: '0' },
            ],
        }, 'Verificación de entrada');
        cat = c.id;
        L.categories.verify = cat;
    }
    const ch = await env.discord('POST', `/guilds/${g}/channels`, {
        name: '╰・verificación', type: 0, parent_id: cat,
        topic: 'Pulsa Verificarme para ver el resto del servidor.',
        permission_overwrites: [
            { id: g, type: 0, allow: String(VIEW | HISTORY | COMMANDS), deny: String(SEND | REACT | THREADS) },
            { id: member, type: 0, allow: '0', deny: String(VIEW) },
            { id: env.ctx().appId, type: 1, allow: String(VIEW | SEND), deny: '0' },
        ],
    }, 'Verificación de entrada');
    L.channels.verify = ch.id;
    // La categoría arriba del todo
    await env.discord('PATCH', `/guilds/${g}/channels`, [{ id: cat, position: 0 }]).catch(() => {});
    env.layoutSave();
    env.log(`[SYNC] Canal #verificación creado (${ch.id}).`);
    return true;
}

/**
 * Cierra el resto del servidor a @everyone y lo abre al rol Miembro, al staff y a los bots.
 * Se aplica una vez (GATE_VERSION); los canales privados (staff) no se tocan.
 */
async function lockServer() {
    const st = env.st();
    if (st.gate === GATE_VERSION) return;
    const L = env.ctx().layout;
    const g = env.ctx().guild;
    const roles = await env.discord('GET', `/guilds/${g}/roles`);
    const open = new Set([L.roles.member, L.roles.owner, L.roles.admin, L.roles.moderator, L.roles.helper, ...roles.filter((r) => r.managed).map((r) => r.id)].filter(Boolean));
    const skip = new Set([L.categories.verify, L.channels.verify]);
    const channels = await env.discord('GET', `/guilds/${g}/channels`);
    // Copia de los permisos de antes, por si hay que deshacerlo
    require('fs').writeFileSync(env.backupPath, JSON.stringify(channels.map((c) => ({ id: c.id, name: c.name, permission_overwrites: c.permission_overwrites })), null, 2));
    let changed = 0;

    for (const c of channels) {
        if (skip.has(c.id)) continue;
        const ow = c.permission_overwrites || [];
        const everyone = ow.find((o) => o.id === g) || { id: g, type: 0, allow: '0', deny: '0' };
        // Ya era privado (p. ej. staff): no se toca
        if (BigInt(everyone.deny) & VIEW) continue;
        const next = ow.filter((o) => o.id !== g && !open.has(o.id));
        next.push({ id: g, type: 0, allow: String(BigInt(everyone.allow) & ~VIEW), deny: String(BigInt(everyone.deny) | VIEW) });
        for (const id of open) {
            const prev = ow.find((o) => o.id === id);
            next.push({ id, type: 0, allow: String((prev ? BigInt(prev.allow) : 0n) | VIEW), deny: String((prev ? BigInt(prev.deny) : 0n) & ~VIEW) });
        }
        // Los permisos de @everyone (p. ej. no escribir en canales de solo lectura) se mantienen para Miembro
        const m = next.find((o) => o.id === L.roles.member);
        m.deny = String(BigInt(m.deny) | (BigInt(everyone.deny) & ~VIEW));
        try {
            await env.discord('PATCH', `/channels/${c.id}`, { permission_overwrites: next }, 'Verificación: solo Miembro ve el servidor');
            changed++;
        } catch (e) {
            env.log(`[SYNC] verificación: no se pudo cerrar ${c.name}: ${e.message}`);
        }
    }
    st.gate = GATE_VERSION;
    env.saveState();
    env.log(`[SYNC] Verificación activa: ${changed} canales/categorías cerrados a quien no está verificado.`);
}

/* -------------------------------------------------------- mensaje fijo */

function post() {
    const ch = env.ctx().layout.channels;
    return {
        flags: V2,
        allowed_mentions: { parse: [] },
        components: [container(env.accent(), [
            text('# Verificación\nPara ver el resto del servidor, demuestra que no eres un bot. Es un clic.'),
            sep(),
            text('**Al verificarte aceptas las normas:**\n- Respeto a todo el mundo; nada de insultos, acoso ni contenido sexual.\n- Sin spam, publicidad ni invitaciones a otros servidores.\n- Nada de estafas, cuentas robadas ni enlaces sospechosos.\n- El soporte se pide por ticket, no por mensaje privado al staff.'),
            text(`-# Las normas completas están en <#${ch.rules}> en cuanto entres. Si tienes cuenta en cinammon.net, después podrás vincularla con \`/vincular\`.`),
            row(btn('Verificarme', 'verify:start', 3)),
        ])],
    };
}

/* -------------------------------------------------------- interacciones */

function challenge(userId, note) {
    for (const [k, v] of pending) if (Date.now() - v.at > 5 * 60_000) pending.delete(k);
    const options = [...WORDS].sort(() => Math.random() - 0.5).slice(0, 4);
    const answer = Math.floor(Math.random() * 4);
    const nonce = Math.random().toString(36).slice(2, 10);
    pending.set(nonce, { user: userId, answer, at: Date.now() });
    return card(note ? 0xef4444 : env.accent(),
        text(`${note ? `${note}\n` : ''}### Último paso\nPulsa **${options[answer]}**.`),
        row(...options.map((w, i) => btn(w, `verify:ans:${nonce}:${i}`))),
    );
}

/** Devuelve true si la interacción era suya. */
async function handle(i, respond) {
    const id = i.data?.custom_id || '';
    if (i.type !== 3 || !id.startsWith('verify:')) return false;
    const L = env.ctx().layout;
    const user = i.member?.user || i.user;

    if ((i.member?.roles || []).includes(L.roles.member)) {
        await respond(i, eph(card(0x10b981, text(`Ya estás verificado. Empieza por <#${L.channels.rules}>.`))));
        return true;
    }
    if (id === 'verify:start') {
        const age = Date.now() - Number((BigInt(user.id) >> 22n) + 1420070400000n);
        if (age < MIN_AGE_MS) {
            await respond(i, eph(card(0xef4444, text('Tu cuenta de Discord es muy nueva. Vuelve a intentarlo cuando tenga al menos 24 horas.'))));
            return true;
        }
        await respond(i, eph(challenge(user.id)));
        return true;
    }

    const [, , nonce, choice] = id.split(':');
    const p = pending.get(nonce);
    if (!p || p.user !== user.id) {
        await respond(i, { type: 7, data: challenge(user.id) });
        return true;
    }
    pending.delete(nonce);
    if (Number(choice) !== p.answer) {
        await respond(i, { type: 7, data: challenge(user.id, 'No era esa. Prueba otra vez.') });
        return true;
    }

    await respond(i, { type: 6 });
    try {
        await env.discord('PUT', `/guilds/${env.ctx().guild}/members/${user.id}/roles/${L.roles.member}`, undefined, 'Verificado');
    } catch (e) {
        env.log(`[SYNC] verificación de ${user.id}: ${e.message}`);
        await env.editOriginal(i, card(0xef4444, text('No he podido darte acceso. Avisa al staff, por favor.')));
        return true;
    }
    await env.editOriginal(i, card(0x10b981, text(`## Verificado\nYa ves todo el servidor. Empieza por <#${L.channels.rules}> y saluda en <#${L.channels.general}>.\n-# ¿Tienes cuenta en cinammon.net? Usa \`/vincular\` para recibir tus roles.`)));
    env.audit(`Verificado: <@${user.id}> (${user.username})`).catch(() => {});
    env.members.welcome(user).catch((e) => env.log(`[SYNC] bienvenida: ${e.message}`));
    return true;
}

module.exports = { init, ensureChannel, lockServer, post, handle };
