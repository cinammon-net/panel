/**
 * Bienvenidas, despedidas e invitaciones.
 *
 * Necesita en el portal de desarrolladores "Server Members Intent" (eventos de entrada/salida)
 * y el permiso Gestionar servidor (para leer las invitaciones y saber quién invitó a quién).
 */
const art = require('./art');

let env = null; // { discord, sendFile, st, saveState, ctx, pal, audit, log, forgetRoles }
const invites = new Map(); // code -> { uses, inviter }

function init(e) {
    env = e;
}

async function loadInvites() {
    try {
        const list = await env.discord('GET', `/guilds/${env.ctx().guild}/invites`);
        invites.clear();
        for (const i of list) invites.set(i.code, { uses: i.uses || 0, inviter: i.inviter?.id || null });
    } catch (e) {
        env.log(`[SYNC] invitaciones: ${e.message}`);
    }
}

function onInviteCreate(d) {
    invites.set(d.code, { uses: d.uses || 0, inviter: d.inviter?.id || null });
}

function onInviteDelete(d) {
    invites.delete(d.code);
}

/** Compara usos antes/después para saber qué invitación se usó. */
async function detectInviter() {
    const before = new Map(invites);
    await loadInvites();
    for (const [code, now] of invites) {
        const prev = before.get(code);
        if ((prev?.uses || 0) < now.uses) return { code, inviter: ownerOf(code, now.inviter) };
    }
    // Invitación de un solo uso: desaparece al usarse.
    for (const [code, prev] of before) {
        if (!invites.has(code) && prev.inviter) return { code, inviter: ownerOf(code, prev.inviter) };
    }
    return null;
}

/** Las invitaciones de /invitar las crea el bot: cuentan para quien las pidió. */
function ownerOf(code, inviter) {
    return env.st().invites?.owners?.[code] || inviter;
}

/**
 * Enlace permanente y personal al servidor (sin caducidad ni límite de usos).
 * Se reutiliza mientras siga existiendo; si alguien lo borra, se crea otro.
 */
async function personalInvite(userId) {
    const state = env.st();
    state.invites ??= { counts: {}, members: {} };
    state.invites.links ??= {};
    state.invites.owners ??= {};
    if (!invites.size) await loadInvites();
    const known = state.invites.links[userId];
    if (known && invites.has(known)) return known;

    const ch = env.ctx().layout.channels;
    const channel = ch.verify || ch.rules || ch.general;
    const inv = await env.discord('POST', `/channels/${channel}/invites`, { max_age: 0, max_uses: 0, unique: true });
    if (known) delete state.invites.owners[known];
    state.invites.links[userId] = inv.code;
    state.invites.owners[inv.code] = userId;
    invites.set(inv.code, { uses: inv.uses || 0, inviter: inv.inviter?.id || null });
    env.saveState();
    return inv.code;
}

function stats(userId) {
    const s = env.st().invites?.counts?.[userId] || { joins: 0, leaves: 0 };
    return { ...s, total: Math.max(0, s.joins - s.leaves) };
}

const avatarOf = (u) => (u.avatar
    ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=256`
    : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`);
const nameOf = (u) => u.global_name || u.username;

async function memberCount() {
    const g = await env.discord('GET', `/guilds/${env.ctx().guild}?with_counts=true`).catch(() => null);
    return g?.approximate_member_count || null;
}

async function onJoin(member) {
    const u = member.user;
    if (!u || u.bot) return;
    const { st, saveState, ctx } = env;
    const layout = ctx().layout;
    const state = st();
    state.invites ??= { counts: {}, members: {} };

    // El rol Miembro (acceso a los canales) ya no se da al entrar: se consigue verificándose en #verificación.
    // La tarjeta de bienvenida también sale al verificarse (welcome()).
    env.forgetRoles(u.id);

    const used = await detectInviter();
    if (used?.inviter && used.inviter !== u.id) {
        state.invites.members[u.id] = used.inviter;
        const c = (state.invites.counts[used.inviter] ??= { joins: 0, leaves: 0 });
        c.joins++;
    }
    saveState();
}

/** Tarjeta de bienvenida en #llegadas (se llama al verificarse). */
async function welcome(u) {
    const layout = env.ctx().layout;
    const state = env.st();
    state.invites ??= { counts: {}, members: {} };
    const count = await memberCount();
    const inviter = state.invites.members[u.id];
    const inviterUser = inviter ? await env.discord('GET', `/users/${inviter}`).catch(() => null) : null;
    const line = [count ? `Miembro #${count}` : null, inviterUser ? `invitación de ${nameOf(inviterUser)}` : null].filter(Boolean).join(' | ');
    const png = await art.memberCard({ avatarUrl: avatarOf(u), name: nameOf(u), kind: 'join', line }, env.pal());

    const ch = layout.channels;
    const text = `## Te damos la bienvenida, <@${u.id}>\n` +
        `Pásate por <#${ch.rules}> y saluda en <#${ch.general}>. Si tienes cuenta en cinammon.net, vincúlala con Discord para recibir tus roles.` +
        (inviter ? `\n-# Invitación de <@${inviter}>, que ya lleva ${stats(inviter).total} invitación(es).` : '');
    await env.sendFile(ch.arrivals, 'bienvenida.png', png, [
        { type: 10, content: text },
    ], { users: [u.id] }, env.accent());
}

async function onLeave(d) {
    const u = d.user;
    if (!u || u.bot) return;
    const state = env.st();
    state.invites ??= { counts: {}, members: {} };
    const inviter = state.invites.members[u.id];
    if (inviter && state.invites.counts[inviter]) state.invites.counts[inviter].leaves++;
    delete state.invites.members[u.id];
    env.saveState();

    const count = await memberCount();
    const png = await art.memberCard({ avatarUrl: avatarOf(u), name: nameOf(u), kind: 'leave', line: count ? `Ahora somos ${count}` : '' }, env.pal());
    await env.sendFile(env.ctx().layout.channels.arrivals, 'despedida.png', png, [
        { type: 10, content: `**${nameOf(u)}** ha salido del servidor. ¡Hasta pronto!` },
    ], { users: [] }, 0x71717a);
}

/** Ranking de invitaciones (las salidas restan). */
function leaderboard(limit = 10) {
    const counts = env.st().invites?.counts || {};
    return Object.entries(counts)
        .map(([id, c]) => ({ id, ...c, total: Math.max(0, c.joins - c.leaves) }))
        .filter((r) => r.joins > 0)
        .sort((a, b) => b.total - a.total || b.joins - a.joins)
        .slice(0, limit);
}

module.exports = { init, loadInvites, personalInvite, onInviteCreate, onInviteDelete, onJoin, onLeave, welcome, stats, leaderboard };
