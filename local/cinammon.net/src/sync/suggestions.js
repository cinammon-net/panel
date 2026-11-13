/**
 * #sugerencias (foro): cada idea es una publicación con votos y un estado que lleva el equipo.
 *
 * - Se puede proponer desde el botón "Proponer una idea", con /sugerir o abriendo una publicación a mano.
 * - El bot pone la etiqueta Pendiente, avisa si ya hay alguna parecida y deja una tarjeta con
 *   botones A favor / En contra (un voto por persona; volver a pulsar lo quita).
 * - El equipo cambia el estado desde la misma tarjeta, con una nota opcional para el autor.
 *   Implementada y Descartada cierran la publicación.
 * - Sincronizado bidireccionalmente con la base de datos del Panel Web (/sugerencias).
 * - Notificación por Mensaje Directo (DM) al autor cuando su idea cambia de estado.
 */
let env = null; // { discord, panel, log, st, ctx, ui, saveState, isStaff }

const V2 = 1 << 15;
const EPH = 64;

const STATUS = {
    pending: { tag: 'Pendiente', label: 'Pendiente', color: 0x71717a, open: true },
    review: { tag: 'En estudio', label: 'En estudio', color: 0x38bdf8, open: true },
    accepted: { tag: 'Aceptada', label: 'Aceptada', color: 0x10b981, open: true },
    done: { tag: 'Implementada', label: 'Implementada', color: 0xa855f7, open: false },
    rejected: { tag: 'Descartada', label: 'Descartada', color: 0xf59e0b, open: false },
};
const NOTICE = {
    review: 'el equipo la está estudiando',
    accepted: 'se va a hacer; avisaremos aquí cuando esté',
    done: 'ya está disponible. ¡Gracias por proponerla!',
    rejected: 'no encaja ahora mismo',
    pending: 'vuelve a estar pendiente',
};

function init(deps) {
    env = deps;
}

function state() {
    const st = env.st();
    st.suggestions ??= {};
    st.suggestions.posts ??= {}; // threadId -> { author, title, at, status, card, up: {id: 1}, down: {id: 1}, note, webId }
    return st.suggestions;
}

const cut = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
const forumId = () => env.ctx().layout.channels?.suggestions;
const isSuggestion = (id) => !!state().posts[id];

/* ------------------------------------------------------------ foro */

let forumCache = { at: 0, tags: new Map() };
async function tagIds() {
    if (Date.now() - forumCache.at > 10 * 60_000) {
        const forum = await env.discord('GET', `/channels/${forumId()}`);
        forumCache = { at: Date.now(), tags: new Map((forum.available_tags || []).map((t) => [t.name, t.id])) };
    }
    return forumCache.tags;
}

async function setTag(threadId, status, extra = {}) {
    const id = (await tagIds()).get(STATUS[status].tag);
    await env.discord('PATCH', `/channels/${threadId}`, { applied_tags: id ? [id] : [], ...extra }, `Sugerencia: ${STATUS[status].label}`);
}

/** Palabras con significado de un título, para detectar ideas repetidas. */
const STOP = new Set('a al con de del el en la las lo los para por que se un una y o mas más poder añadir anadir agregar quiero sugerencia sugiero idea'.split(' '));
const words = (s) => new Set(String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !STOP.has(w)));

function similar(threadId, title) {
    const mine = words(title);
    if (!mine.size) return [];
    const out = [];
    for (const [id, p] of Object.entries(state().posts)) {
        if (id === threadId) continue;
        const other = words(p.title);
        const common = [...mine].filter((w) => other.has(w)).length;
        const score = common / Math.min(mine.size, other.size || 1);
        if (common >= 2 && score >= 0.6) out.push({ id, score });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.id);
}

/* ------------------------------------------------------------ tarjeta */

const count = (o) => Object.keys(o || {}).length;

function cardPayload(threadId) {
    const p = state().posts[threadId];
    const s = STATUS[p.status] || STATUS.pending;
    const { text, sep, row, container } = env.ui;
    const up = count(p.up);
    const down = count(p.down);
    const authorMention = /^\d{5,25}$/.test(p.author) ? `<@${p.author}>` : `**${p.author}**`;
    const lines = [`### ${s.label}`, `Propuesta por ${authorMention} · **${up - down >= 0 ? '+' : ''}${up - down}** de apoyo`];
    if (p.note) lines.push(`-# Nota del equipo: ${cut(p.note, 400)}`);
    const components = [
        text(lines.join('\n')),
        p.similar?.length ? text(`-# Parecidas: ${p.similar.map((id) => `<#${id}>`).join(' · ')}. Si es la misma idea, apóyala allí.`) : null,
        sep(),
        row(
            { type: 2, style: 3, label: `A favor · ${up}`, custom_id: `sug:up:${threadId}`, disabled: !s.open },
            { type: 2, style: 2, label: `En contra · ${down}`, custom_id: `sug:down:${threadId}`, disabled: !s.open },
        ),
        { type: 1, components: [{
            type: 3, custom_id: `sug:status:${threadId}`, placeholder: 'Cambiar estado (solo equipo)',
            options: Object.entries(STATUS).map(([value, x]) => ({ value, label: x.label, default: value === p.status })),
        }] },
    ];
    return { flags: V2, components: [container(s.color, components)], allowed_mentions: { parse: [] } };
}

async function refreshCard(threadId) {
    const p = state().posts[threadId];
    if (!p?.card) return;
    await env.discord('PATCH', `/channels/${threadId}/messages/${p.card}`, cardPayload(threadId)).catch((e) => env.log(`[SUGERENCIAS] tarjeta: ${e.message}`));
}

/** Registra una publicación nueva: etiqueta, tarjeta con votos y aviso de parecidas. */
async function register(threadId, author, title) {
    const S = state();
    if (S.posts[threadId]) return;
    S.posts[threadId] = { author, title: cut(title, 100), at: Date.now(), status: 'pending', up: {}, down: {} };
    S.posts[threadId].similar = similar(threadId, title);
    env.saveState();
    await setTag(threadId, 'pending').catch((e) => env.log(`[SUGERENCIAS] etiqueta: ${e.message}`));
    const m = await env.discord('POST', `/channels/${threadId}/messages`, cardPayload(threadId));
    S.posts[threadId].card = m.id;
    env.saveState();
}

/** Envía una tarjeta por mensaje privado (si la persona los tiene abiertos). */
async function sendDM(userId, payload) {
    if (!userId || !/^\d{5,25}$/.test(userId)) return;
    try {
        const dm = await env.discord('POST', '/users/@me/channels', { recipient_id: userId });
        if (dm?.id) await env.discord('POST', `/channels/${dm.id}/messages`, payload);
    } catch (_) {}
}

/* ------------------------------------------------------------ eventos */

/** THREAD_CREATE: una publicación nueva en el foro (las del bot ya se registran al crearlas). */
async function onThreadCreate(d) {
    if (!d?.newly_created || d.parent_id !== forumId()) return;
    if (d.owner_id === env.ctx().appId) return;
    await new Promise((r) => setTimeout(r, 1500)); // que exista el primer mensaje antes de responder
    await register(d.id, d.owner_id, d.name).catch((e) => env.log(`[SUGERENCIAS] nueva: ${e.message}`));
}

/** Las publicaciones que ya había antes de este sistema reciben su tarjeta una vez. */
async function backfill(skip) {
    const S = state();
    if (S.backfilled || !forumId()) return;
    const { threads } = await env.discord('GET', `/guilds/${env.ctx().guild}/threads/active`);
    for (const t of threads.filter((x) => x.parent_id === forumId() && x.id !== skip && x.owner_id !== env.ctx().appId)) {
        await register(t.id, t.owner_id, t.name).catch((e) => env.log(`[SUGERENCIAS] relleno ${t.name}: ${e.message}`));
    }
    S.backfilled = true;
    env.saveState();
}

/** Las más apoyadas que siguen abiertas, para la publicación fijada y comando /top-sugerencias. */
function top(n = 5) {
    return Object.entries(state().posts)
        .filter(([, p]) => STATUS[p.status]?.open)
        .map(([id, p]) => ({ id, ...p, score: count(p.up) - count(p.down) }))
        .filter((p) => p.score > 0)
        .sort((a, b) => b.score - a.score || a.at - b.at)
        .slice(0, n);
}

function topSuggestionsResponse() {
    const list = top(5);
    if (!list.length) {
        return {
            type: 4,
            data: {
                flags: EPH,
                content: 'No hay sugerencias abiertas con votos ahora mismo. Usa `/sugerir` para proponer la primera.',
            },
        };
    }
    const { text, container } = env.ui;
    const lines = ['## Sugerencias más apoyadas\nLas ideas abiertas con más apoyo de la comunidad:\n'];
    for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const s = STATUS[p.status] || STATUS.pending;
        lines.push(`**${i + 1}. [${cut(p.title, 70)}](https://discord.com/channels/${env.ctx().guild}/${p.id})**`);
        lines.push(`> **+${p.score}** de apoyo · Estado: **${s.label}** · Hilo: <#${p.id}>`);
    }
    lines.push('\n-# Entra a cada hilo para votar o propón tu propia idea con `/sugerir`.');
    return {
        type: 4,
        data: {
            flags: EPH | V2,
            components: [container(0xfacc15, [text(lines.join('\n'))])],
        },
    };
}

/* ------------------------------------------------------------ formulario */

const askModal = () => ({
    type: 9,
    data: {
        custom_id: 'sug:modal',
        title: 'Proponer una idea',
        components: [
            { type: 1, components: [{ type: 4, custom_id: 'title', style: 1, label: 'La idea en una frase', placeholder: 'Añadir egg de Terraria', min_length: 8, max_length: 90, required: true }] },
            { type: 1, components: [{ type: 4, custom_id: 'what', style: 2, label: 'Qué quieres exactamente', min_length: 15, max_length: 1500, required: true }] },
            { type: 1, components: [{ type: 4, custom_id: 'why', style: 2, label: 'Por qué te vendría bien', max_length: 800, required: false }] },
        ],
    },
});

const field = (i, id) => (i.data.components || []).flatMap((r) => r.components || []).find((c) => c.custom_id === id)?.value?.trim() || '';

async function fromModal(i) {
    const user = i.member?.user || i.user;
    const title = field(i, 'title');
    const what = field(i, 'what');
    const why = field(i, 'why');
    const body = [`**Qué:** ${what}`, why ? `**Por qué:** ${why}` : null, `-# Propuesta por <@${user.id}>`].filter(Boolean).join('\n\n');
    const id = (await tagIds()).get(STATUS.pending.tag);
    const t = await env.discord('POST', `/channels/${forumId()}/threads`, {
        name: cut(title, 100),
        auto_archive_duration: 10080,
        applied_tags: id ? [id] : [],
        message: { content: body, allowed_mentions: { parse: [] } },
    }, `Sugerencia de ${user.username}`);
    // Quien la propone recibe los avisos del hilo
    await env.discord('PUT', `/channels/${t.id}/thread-members/${user.id}`).catch(() => {});
    await register(t.id, user.id, title);

    // Sincronizar con el panel si la API está conectada
    if (env.panel) {
        await env.panel('POST', '/api/bot/suggestions/store', {
            thread_id: t.id,
            message_id: state().posts[t.id]?.card || null,
            discord_id: user.id,
            author_name: user.username,
            title,
            what,
            why: why || null,
            category: 'general',
        }).catch((e) => env.log(`[SUGERENCIAS] panel store: ${e.message}`));
    }

    return t.id;
}

/* ------------------------------------------------------------ botones */

async function changeStatus(threadId, status, note, staffId) {
    const p = state().posts[threadId];
    if (!p) return;
    p.status = status;
    p.note = note || null;
    env.saveState();
    if (p.archived) await env.discord('PATCH', `/channels/${threadId}`, { archived: false, locked: false }).catch(() => {});
    await refreshCard(threadId);

    const linked = /^\d{5,25}$/.test(p.author);
    const { text, row, container } = env.ui;
    const quote = (n) => (note ? `\n> ${cut(note, n).replace(/\n/g, '\n> ')}` : '');
    const by = staffId === 'Panel' ? 'Cambiado desde el panel' : `Cambiado por <@${staffId}>`;
    await env.discord('POST', `/channels/${threadId}/messages`, {
        flags: V2,
        components: [container(STATUS[status].color, [
            text(`### ${STATUS[status].label}\n${linked ? `<@${p.author}>` : `**${cut(p.author, 60)}**`}, tu sugerencia ${NOTICE[status]}.${quote(900)}\n-# ${by}.`),
        ])],
        allowed_mentions: linked ? { users: [p.author] } : { parse: [] },
    }).catch((e) => env.log(`[SUGERENCIAS] aviso: ${e.message}`));

    // Aviso por privado al autor, en tarjeta
    if (linked) {
        const link = (label, url) => ({ type: 2, style: 5, label, url });
        sendDM(p.author, {
            flags: V2,
            components: [container(STATUS[status].color, [
                text(`### Tu sugerencia: ${STATUS[status].label}\n**${cut(p.title, 100)}**\n${NOTICE[status].charAt(0).toUpperCase() + NOTICE[status].slice(1)}.${quote(400)}`),
                row(link('Ver la sugerencia', `https://discord.com/channels/${env.ctx().guild}/${threadId}`), link('Ver en la web', 'https://panel.cinammon.net/sugerencias')),
            ])],
            allowed_mentions: { parse: [] },
        }).catch(() => {});
    }

    // Sincronizar cambio de estado hacia el panel
    if (env.panel && staffId !== 'Panel') {
        env.panel('POST', '/api/bot/suggestions/status', {
            thread_id: threadId,
            status,
            staff_note: note || '',
        }).catch((e) => env.log(`[SUGERENCIAS] panel status: ${e.message}`));
    }

    const closed = !STATUS[status].open;
    p.archived = closed;
    await setTag(threadId, status, closed ? { archived: true, locked: true } : {}).catch((e) => env.log(`[SUGERENCIAS] estado: ${e.message}`));
}

/** Botones, menú y formulario "sug:*". Devuelve la respuesta a enviar (o null si ya respondió). */
async function component(i, respond) {
    const user = i.member?.user || i.user;
    const [, action, threadId, status] = (i.data.custom_id || '').split(':');
    const eph = (content) => ({ type: 4, data: { content, flags: EPH, allowed_mentions: { parse: [] } } });

    if (action === 'ask') {
        if (!forumId()) return eph('El canal de sugerencias no está disponible ahora mismo.');
        return askModal();
    }
    if (action === 'modal') {
        await respond(i, { type: 5, data: { flags: EPH } });
        try {
            const id = await fromModal(i);
            const p = state().posts[id];
            await env.editOriginal(i, { content: `Tu idea ya está publicada: <#${id}>. Te avisaremos allí cuando el equipo la revise.${p?.similar?.length ? `\nOjo, hay alguna parecida: ${p.similar.map((x) => `<#${x}>`).join(' · ')}.` : ''}` });
        } catch (e) {
            env.log(`[SUGERENCIAS] formulario: ${e.message}`);
            await env.editOriginal(i, { content: 'No se pudo publicar la idea. Ábrela directamente en el foro de sugerencias.' });
        }
        return null;
    }

    const p = state().posts[threadId];
    if (!p) return eph('Esta sugerencia ya no está activa.');

    if (action === 'up' || action === 'down') {
        if (!STATUS[p.status].open) return eph('Esta sugerencia ya está cerrada.');
        if (user.id === p.author) return eph('Es tu propia idea: tu apoyo ya se da por hecho.');
        const mine = action === 'up' ? p.up : p.down;
        const other = action === 'up' ? p.down : p.up;
        let direction = 0;
        if (mine[user.id]) {
            delete mine[user.id];
            direction = 0;
        } else {
            mine[user.id] = 1;
            delete other[user.id];
            direction = action === 'up' ? 1 : -1;
        }
        env.saveState();

        // Sincronizar voto con la base de datos del panel
        if (env.panel) {
            env.panel('POST', '/api/bot/suggestions/vote', {
                thread_id: threadId,
                discord_id: user.id,
                direction,
            }).catch((e) => env.log(`[SUGERENCIAS] panel vote: ${e.message}`));
        }

        return { type: 7, data: cardPayload(threadId) };
    }

    if (action === 'status') {
        if (!env.isStaff(i.member)) return eph('Solo el equipo puede cambiar el estado. Tú puedes votar con los botones de arriba.');
        const next = i.data.values?.[0];
        if (!STATUS[next] || next === p.status) return { type: 7, data: cardPayload(threadId) };
        return {
            type: 9,
            data: {
                custom_id: `sug:note:${threadId}:${next}`,
                title: `Marcar como ${STATUS[next].label}`,
                components: [{ type: 1, components: [{
                    type: 4, custom_id: 'note', style: 2, label: 'Nota para quien la propuso (opcional)', max_length: 900, required: false,
                    placeholder: next === 'rejected' ? 'Por qué no encaja ahora' : 'Detalles, fechas, enlace…',
                }] }],
            },
        };
    }

    if (action === 'note') {
        if (!env.isStaff(i.member)) return eph('Solo el equipo puede cambiar el estado.');
        if (!STATUS[status]) return eph('Estado no válido.');
        await respond(i, { type: 6 });
        await changeStatus(threadId, status, field(i, 'note'), user.id);
        return null;
    }
    return eph('Esta acción ya no está disponible.');
}

/** Sincroniza sugerencias creadas y actualizadas en la web */
async function syncWeb(feed) {
    if (!feed || !forumId()) return;
    const S = state();

    for (const s of feed.new || []) {
        const existing = Object.entries(S.posts).find(([, p]) => p.webId === s.id);
        if (existing) {
            // Ya tiene hilo pero el panel no lo supo (falló la confirmación): se vuelve a avisar
            await env.panel('POST', `/api/bot/suggestions/${s.id}/thread`, { thread_id: existing[0], message_id: existing[1].card || null })
                .catch((e) => env.log(`[SUGERENCIAS] vincular web ${s.id}: ${e.message}`));
        } else {
            try {
                const tagId = (await tagIds()).get(STATUS.pending.tag);
                const body = [
                    `**Qué:** ${cut(s.what, 1500)}`,
                    s.why ? `**Por qué:** ${cut(s.why, 800)}` : null,
                    `-# Propuesta en la web por **${s.author}** · ${s.category_label}\n[Ver en el panel](${s.url})`,
                ].filter(Boolean).join('\n\n');

                const t = await env.discord('POST', `/channels/${forumId()}/threads`, {
                    name: cut(s.title, 100),
                    auto_archive_duration: 10080,
                    applied_tags: tagId ? [tagId] : [],
                    message: { content: body, allowed_mentions: { parse: [] } },
                }, `Sugerencia web de ${s.author}`);

                if (s.discord_id) {
                    await env.discord('PUT', `/channels/${t.id}/thread-members/${s.discord_id}`).catch(() => {});
                }

                await register(t.id, s.discord_id || s.author, s.title);
                S.posts[t.id].webId = s.id;
                env.saveState();

                if (env.panel) {
                    await env.panel('POST', `/api/bot/suggestions/${s.id}/thread`, {
                        thread_id: t.id,
                        message_id: S.posts[t.id]?.card || null,
                    });
                }
            } catch (e) {
                env.log(`[SUGERENCIAS] error creando hilo para web ${s.id}: ${e.message}`);
            }
        }
    }

    for (const st of feed.statuses || []) {
        const p = S.posts[st.thread_id];
        if (p && p.status !== st.status) {
            await changeStatus(st.thread_id, st.status, st.note, 'Panel').catch(() => {});
        }
    }
}

/** Olvida las cerradas de hace más de 180 días. */
function prune() {
    const S = state();
    const limit = Date.now() - 180 * 86400_000;
    for (const [id, p] of Object.entries(S.posts)) if (!STATUS[p.status]?.open && p.at < limit) delete S.posts[id];
}

module.exports = { init, onThreadCreate, backfill, isSuggestion, component, askModal, top, topSuggestionsResponse, syncWeb, prune, STATUS };
