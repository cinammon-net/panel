/**
 * #soporte: preguntas públicas de la comunidad (lo privado va por #tickets).
 *
 * - Cada pregunta abre su propio hilo público: el canal queda limpio y cada duda tiene su conversación.
 * - En el hilo responde primero el asistente; si no sabe, avisa al equipo. Cualquiera puede ayudar.
 * - Si la duda es de una cuenta o un pago, el bot avisa de que aquí es público y ofrece abrir ticket.
 * - Quien preguntó pulsa "Resuelto" y elige quién le ayudó: suma un punto de ayuda. Los que más
 *   ayudan en el mes salen en el mensaje de #soporte.
 */
let env = null; // { discord, log, st, ctx, accent, ui, saveState, assistant, isStaff }

const V2 = 1 << 15;
const GREEN = 0x10b981;
const AMBER = 0xf59e0b;

// Cosas que no deberían tratarse en público
const PRIVATE = /\b(factura|facturas|cobr\w*|reembols\w*|pago|pagu[eé]|pagado|tarjeta|paypal|contrase[nñ]a|password|mi correo|mi email|cambiar (el )?(correo|email)|mis datos|dni|nif|suspendid\w* mi|me han baneado|me han suspendido)\b/i;

function init(deps) {
    env = deps;
}

function state() {
    const st = env.st();
    st.support ??= {};
    st.support.threads ??= {}; // threadId -> { asker, title, q, at, helpers: {id: name}, solved }
    st.support.points ??= {}; // `${mes}` -> { userId: n }
    return st.support;
}

/** Olvida hilos de hace más de 30 días (Discord ya los ha archivado). */
function prune() {
    const S = state();
    const limit = Date.now() - 30 * 86400_000;
    for (const [id, t] of Object.entries(S.threads)) if (t.at < limit) delete S.threads[id];
}

const month = () => new Date().toISOString().slice(0, 7);
const cut = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');
const card = (color, ...c) => ({ flags: V2, components: [env.ui.container(color, c)], allowed_mentions: { parse: [] } });
const btn = (label, custom_id, style = 2) => ({ type: 2, style, label, custom_id });
const ticketBtn = { type: 2, style: 1, label: 'Abrir ticket privado', custom_id: 'ticket:open' };

function threadName(q) {
    const line = String(q).split('\n').find((l) => l.trim()) || 'Pregunta';
    return cut(line.replace(/<[@#&!]+\d+>/g, '').replace(/\s+/g, ' ').trim(), 90) || 'Pregunta';
}

/* ------------------------------------------------------------ hilos */

/** Primera respuesta dentro del hilo de una pregunta. */
async function answerInThread(threadId, askerId, question) {
    const { text, sep, row } = env.ui;
    const solvedRow = (extra = []) => row(btn('Resuelto', `sup:solved:${threadId}`, 3), btn('Necesito a alguien', `ast:staff:${askerId}`), ...extra);

    if (PRIVATE.test(question)) {
        await env.discord('POST', `/channels/${threadId}/messages`, card(AMBER,
            text(`### Esto es mejor por ticket\n<@${askerId}>, parece algo de **tu cuenta o un pago**. Este hilo es público: no escribas aquí correos, facturas ni datos personales.\nEn un ticket lo ve solo el equipo y puede mirar tu cuenta.`),
            row(ticketBtn, btn('No es privado, sigue aquí', `sup:public:${threadId}`)),
        ));
        return;
    }

    const a = await env.assistant.answer(question).catch(() => null);
    if (a && !a.unsure) {
        const guide = a.guide && env.st().content?.guides?.[a.guide]?.thread;
        await env.discord('POST', `/channels/${threadId}/messages`, card(env.accent(),
            text(`### ${a.title}\n${a.body}`),
            sep(),
            text(`-# Respuesta automática${guide ? ` · guía completa: <#${guide}>` : ''}. Si no lo resuelve, sigue escribiendo aquí: la comunidad y el equipo leen los hilos.`),
            solvedRow(a.ticket ? [ticketBtn] : []),
        ));
        if (a.needsStaff) await env.assistant.pingStaff(threadId, askerId, 'parece que hace falta revisar su caso');
        return;
    }
    await env.discord('POST', `/channels/${threadId}/messages`, card(env.accent(),
        text(`### Tu pregunta tiene su hilo\n<@${askerId}>, el asistente no tiene una respuesta segura para esto, así que la comunidad y el equipo te ayudarán aquí.\n-# Añade la versión, el error exacto de la consola o una captura: así es más rápido.`),
        solvedRow(),
    ));
    await env.assistant.pingStaff(threadId, askerId, 'pregunta nueva sin respuesta automática');
}

/** Mensaje escrito directamente en #soporte: se convierte en hilo. */
async function onChannelMessage(message, isStaff) {
    const content = String(message.content || '').trim();
    if (isStaff || content.length < 12) return false;
    const thread = await env.discord('POST', `/channels/${message.channel_id}/messages/${message.id}/threads`, {
        name: threadName(content),
        auto_archive_duration: 1440,
    }, 'Pregunta en #soporte').catch((e) => {
        env.log(`[SOPORTE] crear hilo: ${e.message}`);
        return null;
    });
    if (!thread) return false;
    prune();
    state().threads[thread.id] = { asker: message.author.id, title: thread.name, q: cut(content, 1500), at: Date.now(), helpers: {} };
    env.saveState();
    await env.discord('POST', `/channels/${thread.id}/typing`).catch(() => {});
    await answerInThread(thread.id, message.author.id, content);
    return true;
}

/** Mensaje dentro de un hilo de pregunta: se apunta quién ayuda. */
function onThreadMessage(message) {
    const t = state().threads[message.channel_id];
    if (!t || message.author?.bot || message.author.id === t.asker) return false;
    if (!t.helpers[message.author.id]) {
        t.helpers[message.author.id] = cut(message.member?.nick || message.author.global_name || message.author.username, 80);
        env.saveState();
    }
    return true;
}

const isSupportThread = (id) => !!state().threads[id];

/* ------------------------------------------------------------ "Hacer una pregunta" */

function askModal() {
    const input = (custom_id, label, style, extra) => ({ type: 1, components: [{ type: 4, custom_id, label, style, ...extra }] });
    return {
        type: 9,
        data: {
            custom_id: 'sup:modal',
            title: 'Pregunta a la comunidad',
            components: [
                input('title', 'Tu pregunta en una frase', 1, { min_length: 8, max_length: 90, required: true, placeholder: 'Ej.: ¿Cómo instalo plugins en Paper?' }),
                input('details', 'Detalles (versión, error, qué has probado)', 2, { max_length: 1500, required: false, placeholder: 'Nada de contraseñas ni datos personales: esto es público.' }),
            ],
        },
    };
}

async function fromModal(i) {
    const user = i.member?.user || i.user;
    const field = (k) => i.data.components.flatMap((r) => r.components).find((c) => c.custom_id === k)?.value?.trim() || '';
    const title = field('title');
    const details = field('details');
    const ch = env.ctx().layout.channels.help;
    const thread = await env.discord('POST', `/channels/${ch}/threads`, { name: threadName(title), type: 11, auto_archive_duration: 1440 }, 'Pregunta en #soporte');
    state().threads[thread.id] = { asker: user.id, title: thread.name, q: cut(`${title}\n${details}`, 1500), at: Date.now(), helpers: {} };
    env.saveState();
    await env.discord('POST', `/channels/${thread.id}/messages`, {
        ...card(env.accent(), env.ui.text(`**Pregunta de <@${user.id}>**\n## ${cut(title, 200)}${details ? `\n${cut(details, 1500)}` : ''}`)),
        allowed_mentions: { users: [user.id] }, // la mención la añade al hilo
    });
    await answerInThread(thread.id, user.id, `${title}\n${details}`);
    return thread.id;
}

/* ------------------------------------------------------------ resolver */

async function finish(threadId, helperIds, by) {
    const S = state();
    const t = S.threads[threadId];
    if (!t || t.solved) return;
    t.solved = true;
    const m = month();
    S.points[m] ??= {};
    for (const id of helperIds) S.points[m][id] = (S.points[m][id] || 0) + 1;
    // Solo se guardan los dos últimos meses
    for (const k of Object.keys(S.points)) if (k < new Date(Date.now() - 40 * 86400_000).toISOString().slice(0, 7)) delete S.points[k];
    env.saveState();

    const thanks = helperIds.length ? ` Gracias a ${helperIds.map((id) => `<@${id}>`).join(', ')} por ayudar (+1 punto de ayuda).` : '';
    await env.discord('POST', `/channels/${threadId}/messages`, {
        ...card(GREEN, env.ui.text(`**Resuelto** por <@${by}>.${thanks}\n-# Si vuelve a pasar, abre otra pregunta en #soporte.`)),
        allowed_mentions: { users: helperIds },
    }).catch(() => {});
    await env.discord('PATCH', `/channels/${threadId}`, { name: cut(`[Resuelto] ${t.title}`, 100), archived: true }, 'Pregunta resuelta').catch(() => {});
}

/** Los que más han ayudado este mes. */
function topHelpers(n = 5) {
    const pts = state().points[month()] || {};
    return Object.entries(pts).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, p]) => ({ id, points: p }));
}

/** Botones y formularios "sup:*". Devuelve la respuesta de interacción a enviar (o null si ya respondió). */
async function component(i, respond) {
    const user = i.member?.user || i.user;
    const [, action, threadId] = (i.data.custom_id || '').split(':');
    const eph = (content) => ({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
    const t = state().threads[threadId];

    if (action === 'ask') return askModal();
    if (action === 'modal') {
        await respond(i, { type: 5, data: { flags: 64 } });
        try {
            const id = await fromModal(i);
            await env.editOriginal(i, { content: `Tu pregunta ya tiene su hilo: <#${id}>. Te avisaremos allí cuando respondan.` });
        } catch (e) {
            env.log(`[SOPORTE] pregunta desde formulario: ${e.message}`);
            await env.editOriginal(i, { content: 'No se pudo crear la pregunta. Escríbela directamente en el canal.' });
        }
        return null;
    }
    if (!t) return eph('Este hilo ya no está activo.');

    const allowed = user.id === t.asker || env.isStaff(i.member);
    if (action === 'public') {
        if (!allowed) return eph('Solo quien preguntó puede decidir eso.');
        await respond(i, { type: 6 });
        await env.discord('DELETE', `/channels/${threadId}/messages/${i.message.id}`).catch(() => {});
        await answerInThread(threadId, t.asker, String(t.q || t.title).replace(new RegExp(PRIVATE.source, 'gi'), ''));
        return null;
    }
    if (action === 'solved') {
        if (!allowed) return eph('Solo quien preguntó (o el equipo) puede marcarlo como resuelto.');
        if (t.solved) return eph('Ya estaba resuelto.');
        const helpers = Object.entries(t.helpers || {}).slice(0, 24);
        if (!helpers.length) {
            await respond(i, { type: 6 });
            await finish(threadId, [], user.id);
            return null;
        }
        return {
            type: 4,
            data: {
                flags: 64 | V2,
                components: [env.ui.container(GREEN, [
                    env.ui.text('### ¿Quién te ha ayudado?\nElige a quien te ayudó (puedes marcar varias personas). Se lleva un punto de ayuda del mes.'),
                    { type: 1, components: [{
                        type: 3, custom_id: `sup:credit:${threadId}`, placeholder: 'Elige quién te ayudó', min_values: 1, max_values: helpers.length + 1,
                        options: [
                            ...helpers.map(([id, name]) => ({ value: id, label: cut(name, 100) })),
                            { value: 'none', label: 'Me lo resolvió el asistente o lo resolví yo' },
                        ],
                    }] },
                ])],
            },
        };
    }
    if (action === 'credit') {
        if (!allowed) return eph('Solo quien preguntó puede elegir.');
        const ids = (i.data.values || []).filter((v) => v !== 'none' && t.helpers?.[v]);
        await respond(i, { type: 7, data: { flags: V2, components: [env.ui.container(GREEN, [env.ui.text('Hecho: pregunta marcada como resuelta.')])] } });
        await finish(threadId, ids, user.id);
        return null;
    }
    return eph('Esta acción ya no está disponible.');
}

module.exports = { init, onChannelMessage, onThreadMessage, isSupportThread, component, topHelpers };
