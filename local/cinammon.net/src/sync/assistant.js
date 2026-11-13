/**
 * Asistente de soporte: responde dudas en #soporte y con /pregunta.
 *
 * 1. Errores conocidos de consola (community.matchSupportTip).
 * 2. Base de conocimiento propia (preguntas frecuentes por palabras clave).
 * 3. Opcional: Claude, solo si bot-config.json tiene "anthropic_api_key" y está instalado
 *    @anthropic-ai/sdk. Responde solo con lo que sabe de Cinammon y dice si está seguro.
 * Si nada de eso sirve, avisa al equipo (con límite para no saturar) y ofrece abrir ticket.
 */
const { readConfig } = require('../api/panel');

let env = null; // { discord, log, st, ctx, accent, ui, PANEL, BILLING, matchTip }
const V2 = 1 << 15;

function init(deps) {
    env = deps;
}

/* ------------------------------------------------------- base de conocimiento */

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ');

// words: palabras o frases (sin tildes). Cada coincidencia suma; `need` es lo mínimo para responder.
const KB = [
    {
        key: 'free', title: 'Servidor gratis',
        words: ['gratis', 'free', 'gratuito', 'sin pagar', 'monedas', 'coins', 'canjear'],
        answer: () => `Puedes tener servidor sin pagar juntando **monedas**:\n- \`/diario\` cada día (con racha suma más).\n- Sorteos e invitaciones (\`/monedas\` te da tu enlace).\nLuego las canjeas en la tienda: ${env.BILLING}/store.`,
        guide: 'start',
    },
    {
        key: 'buy', title: 'Contratar un plan',
        words: ['comprar', 'contratar', 'precio', 'precios', 'plan', 'planes', 'cuanto cuesta', 'cuesta', 'tienda', 'ampliar', 'mas ram', 'subir ram', 'upgrade'],
        answer: () => `Los planes y precios al día están en ${env.BILLING}/store (también con \`/planes\`). Pagas por días, semanas, meses o años, y desde ahí mismo puedes ampliar RAM o CPU de un servidor que ya tengas.`,
    },
    {
        key: 'pay', title: 'Pagos y facturas',
        words: ['pago', 'pagar', 'factura', 'facturas', 'cobro', 'cobrado', 'reembolso', 'devolucion', 'paypal', 'tarjeta', 'metodo de pago', 'no se ha reflejado'],
        answer: () => `Tus facturas pendientes las ves con \`/facturas\` o en ${env.BILLING}. Si un pago no aparece, te han cobrado dos veces o quieres un reembolso, **abre un ticket de tipo Pagos**: es privado y ahí puedes dar el número de factura sin que lo vea nadie más.`,
        ticket: true,
    },
    {
        key: 'link', title: 'Vincular Discord con el panel',
        words: ['vincular', 'vinculo', 'vinculada', 'codigo para el bot', 'no esta vinculado', 'link', 'conectar discord', 'roles', 'rol cliente', 'no tengo rol'],
        answer: () => `En el panel ve a **Ajustes → Perfil → Código para el bot** y copia el código. Aquí escribe \`/vincular codigo:\` y pégalo. Con eso recibes tus roles (Cliente, VIP) en un minuto y puedes usar \`/servidores\`, \`/consola\` y abrir tickets desde Discord.`,
    },
    {
        key: 'start', title: 'Encender o reiniciar el servidor',
        words: ['encender', 'arrancar', 'iniciar', 'reiniciar', 'apagar', 'no arranca', 'no inicia', 'no enciende', 'offline', 'apagado', 'se apaga', 'se cierra', 'crash', 'crashea'],
        answer: () => `Desde el panel (**Consola**) o aquí con \`/servidor\`. Si no arranca:\n1. Lee las últimas líneas de la **Consola**: casi siempre dicen el motivo.\n2. Si pone \`UnsupportedClassVersionError\`, cambia la versión de Java en **Inicio → Imagen de Docker**.\n3. Si se cierra con código **137** u \`OutOfMemoryError\`, le falta RAM.\nSi pegas aquí el error exacto te digo qué es.`,
        guide: 'start',
    },
    {
        key: 'ip', title: 'IP y conectarse',
        words: ['ip', 'direccion', 'conectar', 'conectarme', 'entrar al servidor', 'no puedo entrar', 'puerto', 'connection refused', 'timed out'],
        answer: () => 'La dirección es la **IP y el puerto** que ves en la **Consola** (o en **Red y Puertos**). Asegúrate de que el servidor está encendido y de poner también el puerto (`ip:puerto`). Para usar algo como `play.tudominio.com`, mira la guía de dominios.',
        guide: 'domains',
    },
    {
        key: 'java', title: 'Versión de Java',
        words: ['java', 'version de java', 'java 17', 'java 21', 'java 8', 'imagen de docker', 'unsupportedclassversion'],
        answer: () => 'En **Inicio → Imagen de Docker**:\n- 1.20.5 en adelante: **Java 21**\n- 1.18 a 1.20.4: **Java 17**\n- 1.16.5 o anterior: **Java 8 u 11**\nCambia la imagen y **reinicia**.',
        guide: 'mc-optimize',
    },
    {
        key: 'lag', title: 'Lag en Minecraft',
        words: ['lag', 'laggea', 'tps', 'va lento', 'lento', 'optimizar', 'rendimiento', 'tirones'],
        answer: () => 'Lo que más se nota: usar **Paper** o **Purpur**, `view-distance` 8-10 y `simulation-distance` 6-8, y pregenerar el mapa con **Chunky**. Para ver la causa exacta instala **Spark** y usa `/spark profiler start` y `stop`. Más RAM no arregla el lag de CPU.',
        guide: 'mc-optimize',
    },
    {
        key: 'plugins', title: 'Plugins y mods',
        words: ['plugin', 'plugins', 'mod', 'mods', 'modpack', 'modrinth', 'forge', 'fabric', 'neoforge', 'instalar'],
        answer: () => 'Tu servidor → pestaña **Plugins** (o **Mods**): buscas en Modrinth, instalas en un clic y **reinicias**. A mano: plugins en `plugins/`, mods en `mods/`. Haz una **copia de seguridad** antes y comprueba que es para tu versión exacta.',
        guide: 'mc-addons',
    },
    {
        key: 'bots', title: 'Alojar un bot',
        words: ['bot de discord', 'bot discord', 'mi bot', 'node', 'nodejs', 'python', 'npm', 'node modules', 'whatsapp', 'telegram', 'requirements'],
        answer: () => 'Sube el código por **Archivos** o **Acceso SFTP** (sin `node_modules` ni `venv`, se instalan solos). En **Inicio** eliges versión de Node o Python y el archivo principal. El token va en un `.env` o en las variables de **Inicio**, nunca en el código.',
        guide: 'bots',
    },
    {
        key: 'domain', title: 'Dominio propio',
        words: ['dominio', 'subdominio', 'cloudflare', 'dns', 'srv', 'registro a', 'play.'],
        answer: () => 'En servidores de pago: tu servidor → **Subdominios → Conecta tu Cloudflare** con un token de API y el panel crea los registros. A mano: registro `A` a la IP del nodo con **nube gris** y, si el puerto no es el de por defecto, un `SRV`.',
        guide: 'domains',
    },
    {
        key: 'db', title: 'Bases de datos',
        words: ['base de datos', 'bases de datos', 'mysql', 'mariadb', 'database', 'phpmyadmin', 'sql', 'luckperms'],
        answer: () => 'Tu servidor → **Bases de Datos → Nueva Base de Datos**. Usa el **host y puerto que pone el panel** (no `localhost`) y el nombre completo con su prefijo. phpMyAdmin: https://database.cinammon.net.',
        guide: 'databases',
    },
    {
        key: 'files', title: 'Archivos, SFTP y copias',
        words: ['sftp', 'filezilla', 'winscp', 'subir archivos', 'subir mundo', 'mundo', 'backup', 'copia de seguridad', 'copias', 'restaurar', 'zip'],
        answer: () => '**SFTP:** tu servidor → **Acceso SFTP**, genera la contraseña (solo se ve una vez) y conéctate con FileZilla o WinSCP. **Copias:** pestaña **Copias de Seguridad**; restáurala si algo sale mal.',
        guide: 'files',
    },
    {
        key: 'team', title: 'Dar acceso a otra persona',
        words: ['dar acceso', 'subusuario', 'usuarios', 'compartir servidor', 'mi amigo', 'permisos', 'otra persona'],
        answer: () => 'Tu servidor → pestaña **Usuarios**: invitas por correo y eliges qué puede hacer. Nunca compartas tu contraseña.',
        guide: 'team',
    },
    {
        key: 'password', title: 'Contraseña o acceso a la cuenta',
        words: ['contrasena', 'password', 'olvide', 'no puedo entrar al panel', 'iniciar sesion', 'login', 'correo', 'cambiar email', '2fa'],
        answer: () => `En ${env.PANEL}/login pulsa **¿Olvidaste tu contraseña?** y te llega un correo. Si ya no tienes acceso a ese correo, **abre un ticket de tipo Cuenta**. Nadie del equipo te pedirá nunca tu contraseña.`,
        ticket: true,
    },
    {
        key: 'status', title: 'Caídas y mantenimientos',
        words: ['caido', 'caida', 'no funciona el panel', 'mantenimiento', 'nodo', 'esta caido', 'no carga', 'down'],
        answer: () => `Mira <#${env.ctx().layout.channels.status}> o usa \`/estado\`: ahí sale en directo si algún nodo está caído o en mantenimiento. Si todo está en línea y solo falla lo tuyo, cuéntanos el error.`,
    },
    {
        key: 'vip', title: 'Rangos VIP',
        words: ['vip', 'rango', 'rangos', 'prioridad', 'ventajas'],
        answer: () => 'Los rangos VIP dan ventajas en la web (como prioridad en tickets) y un rol aquí. Detalles y precios con `/rangos`.',
    },
    {
        key: 'ticket', title: 'Abrir un ticket',
        words: ['ticket', 'tickets', 'hablar con el staff', 'soporte privado', 'ayuda privada', 'admin', 'staff'],
        answer: () => `Pulsa **Abrir ticket** en <#${env.ctx().layout.channels.tickets}>, elige el tipo y rellena el formulario: se crea un hilo privado solo con el equipo. Se responden por orden, no hace falta mencionar a nadie.`,
        ticket: true,
    },
];

function score(entry, q) {
    let s = 0;
    for (const w of entry.words) {
        const re = new RegExp(`(^| )${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
        if (re.test(q)) s += w.includes(' ') ? 2 : 1;
    }
    return s;
}

/** Mejor respuesta de la base de conocimiento, o null. */
function fromKb(question) {
    const q = ` ${norm(question)} `;
    const ranked = KB.map((e) => ({ e, s: score(e, q) })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
    if (!ranked.length) return null;
    const [best, second] = ranked;
    // Con una sola palabra suelta y empate, mejor no adivinar
    if (best.s < 2 && second && second.s === best.s) return null;
    return { title: best.e.title, body: best.e.answer(), guide: best.e.guide, ticket: !!best.e.ticket, source: 'kb' };
}

/* ---------------------------------------------------------------- Claude */

let claude = undefined; // undefined = sin mirar, null = no disponible
function claudeClient() {
    if (claude !== undefined) return claude;
    claude = null;
    try {
        const key = readConfig().anthropic_api_key || process.env.ANTHROPIC_API_KEY;
        if (!key) return null;
        const Anthropic = require('@anthropic-ai/sdk');
        claude = new Anthropic({ apiKey: key, maxRetries: 2, timeout: 30_000 });
        env.log('[ASISTENTE] Respuestas con Claude activadas.');
    } catch (e) {
        env.log(`[ASISTENTE] Claude no disponible (${e.code || e.message}); uso solo la base de conocimiento.`);
    }
    return claude;
}

function knowledge() {
    return KB.map((e) => `## ${e.title}\n${e.answer()}`).join('\n\n');
}

const SCHEMA = {
    type: 'object',
    properties: {
        answer: { type: 'string', description: 'Respuesta en español, breve (máx. 900 caracteres), en Markdown de Discord.' },
        confident: { type: 'boolean', description: 'true solo si la respuesta sale de la información de Cinammon o es conocimiento técnico general seguro.' },
        needs_staff: { type: 'boolean', description: 'true si hace falta una persona: datos de su cuenta, pagos, reembolsos, sanciones, fallos del servicio.' },
    },
    required: ['answer', 'confident', 'needs_staff'],
    additionalProperties: false,
};

async function fromClaude(question) {
    const client = claudeClient();
    if (!client) return null;
    const system = [
        {
            type: 'text',
            text: 'Eres el asistente de soporte del Discord de Cinammon (hosting de servidores de juegos, bots y webs: panel.cinammon.net, tienda billing.cinammon.net). '
                + 'Responde en español, con tono cercano y directo, en pocas líneas. Usa solo la información de abajo para lo que sea específico de Cinammon (menús, precios, políticas); '
                + 'para dudas técnicas generales (Minecraft, Node, Python, MySQL, DNS) puedes usar tu conocimiento. No inventes precios, plazos, políticas ni pasos del panel que no aparezcan aquí. '
                + 'Nunca pidas contraseñas ni datos de pago. Si la duda es de su cuenta, un pago, una sanción o no la sabes, marca needs_staff y di que el equipo le ayudará por ticket.\n\n'
                + `# Información de Cinammon\n${knowledge()}`,
            cache_control: { type: 'ephemeral' },
        },
    ];
    try {
        const res = await client.beta.messages.create({
            model: 'claude-opus-5-5',
            max_tokens: 2048,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system,
            output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
            messages: [{ role: 'user', content: String(question).slice(0, 2000) }],
        });
        if (res.stop_reason === 'refusal') return null;
        const out = JSON.parse(res.content.find((b) => b.type === 'text')?.text || '{}');
        if (!out.answer) return null;
        return { title: 'Respuesta', body: String(out.answer).slice(0, 1500), confident: !!out.confident, needsStaff: !!out.needs_staff, source: 'ai' };
    } catch (e) {
        env.log(`[ASISTENTE] Claude: ${e.status || ''} ${e.message}`);
        return null;
    }
}

const SUMMARY_SCHEMA = {
    type: 'object',
    properties: {
        publishable: { type: 'boolean', description: 'true solo si es una duda general útil para otros, con una solución clara. false si es un caso de una cuenta, un pago, una sanción, una queja o no quedó resuelto.' },
        title: { type: 'string', description: 'La pregunta en una frase, en español, como la buscaría otra persona (máx. 120 caracteres).' },
        question: { type: 'string', description: 'Contexto breve de la duda (1-3 frases), sin nombres, correos, IPs, dominios privados, IDs ni datos personales.' },
        answer: { type: 'string', description: 'La solución explicada paso a paso, en español, en Markdown sencillo (listas, `código`). Sin nombres ni datos personales.' },
        category: { type: 'string', enum: ['general', 'minecraft', 'bots', 'web', 'panel', 'bases', 'otros'] },
    },
    required: ['publishable', 'title', 'question', 'answer', 'category'],
    additionalProperties: false,
};

/** Resume un hilo de #soporte ya resuelto para guardarlo en Dudas de la comunidad. Devuelve null si no se puede. */
async function summarizeThread(question, transcript) {
    const client = claudeClient();
    if (!client) return null;
    try {
        const res = await client.beta.messages.create({
            model: 'claude-opus-5-5',
            max_tokens: 2048,
            betas: ['server-side-fallback-2026-07-01'],
            fallbacks: 'default',
            system: 'Resumes hilos de soporte de Cinammon (hosting de servidores de juegos, bots y webs) para una base pública de preguntas frecuentes. '
                + 'Escribe en español claro y neutro. Quita cualquier dato personal: nombres de usuario, correos, IPs, contraseñas, IDs, nombres de servidores privados y dominios de clientes (usa "tu servidor", "tu dominio"). '
                + 'Si la solución no queda clara en el hilo o el tema es privado (cuenta, pagos, sanciones), marca publishable=false.',
            output_config: { effort: 'low', format: { type: 'json_schema', schema: SUMMARY_SCHEMA } },
            messages: [{ role: 'user', content: `Pregunta inicial:\n${String(question).slice(0, 1500)}\n\nConversación:\n${String(transcript).slice(0, 12000)}` }],
        });
        if (res.stop_reason === 'refusal') return null;
        const out = JSON.parse(res.content.find((b) => b.type === 'text')?.text || '{}');
        return out.title && out.answer ? out : null;
    } catch (e) {
        env.log(`[ASISTENTE] resumen: ${e.status || ''} ${e.message}`);
        return null;
    }
}

/* ---------------------------------------------------------------- respuesta */

/** Busca una respuesta: error conocido → base de conocimiento → Claude. */
async function answer(question) {
    const tip = env.matchTip(question);
    if (tip) return { title: tip.title, body: tip.body, source: 'tip' };
    const kb = fromKb(question);
    if (kb) return kb; // gratis y al instante: Claude solo para lo que no está en la base
    const ai = await fromClaude(question);
    if (ai && ai.confident) return ai;
    if (ai) return { ...ai, unsure: true };
    return null;
}

function guideLink(key) {
    const t = key && env.st().content?.guides?.[key]?.thread;
    return t ? `<#${t}>` : null;
}

function staffRoles() {
    const r = env.ctx().layout.roles || {};
    return [r.helper, r.moderator].filter(Boolean);
}

const ticketBtn = { type: 2, style: 1, label: 'Abrir ticket', custom_id: 'ticket:open' };

/** Tarjeta de respuesta con botones de "me ha servido" / "necesito a alguien". */
function answerCard(a, askerId, { buttons = true } = {}) {
    const { text, sep, row, container } = env.ui;
    const guide = guideLink(a.guide);
    const foot = [
        a.source === 'ai' ? 'Respuesta automática; si no encaja, pide ayuda a una persona.' : 'Respuesta automática del asistente.',
        guide ? `Guía completa: ${guide}` : null,
    ].filter(Boolean).join(' · ');
    return {
        flags: V2,
        components: [container(env.accent(), [
            text(`### ${a.title}\n${a.body}`),
            sep(),
            text(`-# ${foot}`),
            buttons ? row(
                { type: 2, style: 3, label: 'Me ha servido', custom_id: `ast:ok:${askerId}` },
                { type: 2, style: 2, label: 'Necesito a alguien', custom_id: `ast:staff:${askerId}` },
                ...(a.ticket ? [ticketBtn] : []),
            ) : null,
        ])],
        allowed_mentions: { parse: [], replied_user: false },
    };
}

/* ------------------------------------------------------- avisos al equipo */

const pings = { channel: new Map(), user: new Map() };
const STAFF_PING_CHANNEL = 10 * 60_000; // como mucho una mención al equipo cada 10 min por canal
const STAFF_PING_USER = 30 * 60_000; // y una cada 30 min por persona

async function pingStaff(channelId, userId, why, replyTo) {
    const { text, row, container } = env.ui;
    const now = Date.now();
    const roles = staffRoles();
    const canPing = roles.length
        && now - (pings.channel.get(channelId) || 0) > STAFF_PING_CHANNEL
        && now - (pings.user.get(userId) || 0) > STAFF_PING_USER;
    if (canPing) {
        pings.channel.set(channelId, now);
        pings.user.set(userId, now);
    }
    const who = canPing ? roles.map((r) => `<@&${r}>`).join(' ') : 'el equipo';
    await env.discord('POST', `/channels/${channelId}/messages`, {
        flags: V2,
        components: [container(0xf59e0b, [
            text(`${who}, <@${userId}> necesita ayuda${why ? `: ${why}` : '.'}\n-# Mientras tanto, si es de tu cuenta, un pago o un servidor concreto, abre un ticket: es privado y no se pierde.`),
            row(ticketBtn),
        ])],
        ...(replyTo ? { message_reference: { message_id: replyTo, fail_if_not_exists: false } } : {}),
        allowed_mentions: { roles: canPing ? roles : [], users: [userId], replied_user: false },
    }).catch((e) => env.log(`[ASISTENTE] aviso al staff: ${e.message}`));
    return canPing;
}

/* ------------------------------------------------------------ #soporte */

const cooldown = new Map(); // userId -> timestamp
const looksLikeQuestion = (s) => /\?|^(como|cómo|que|qué|por que|por qué|donde|dónde|cuando|cuándo|cuanto|cuánto|puedo|se puede|alguien|ayuda|help|no me|no puedo|tengo un|me sale|error)\b/i.test(s.trim()) || /error|exception|failed|no funciona|no va|no arranca/i.test(s);

/** Mensaje en #soporte de alguien que no es del equipo. */
async function onSupportMessage(message, isStaff) {
    const content = String(message.content || '').trim();
    if (isStaff || content.length < 12 || !looksLikeQuestion(content)) return false;
    const last = cooldown.get(message.author.id) || 0;
    if (Date.now() - last < 60_000) return false;
    cooldown.set(message.author.id, Date.now());

    await env.discord('POST', `/channels/${message.channel_id}/typing`).catch(() => {});
    const a = await answer(content);
    if (a && !a.unsure) {
        await env.discord('POST', `/channels/${message.channel_id}/messages`, {
            ...answerCard(a, message.author.id),
            message_reference: { message_id: message.id, fail_if_not_exists: false },
        }).catch((e) => env.log(`[ASISTENTE] respuesta: ${e.message}`));
        if (a.needsStaff) await pingStaff(message.channel_id, message.author.id, 'parece que hace falta revisar su caso');
        return true;
    }
    await pingStaff(message.channel_id, message.author.id, 'el asistente no ha encontrado una respuesta segura', message.id);
    return true;
}

/* ------------------------------------------------------------ /pregunta */

const definitions = () => [{
    name: 'pregunta',
    description: 'Pregunta al asistente de Cinammon (te responde al momento)',
    options: [{ name: 'duda', description: 'Escribe tu duda o pega el error', type: 3, required: true, max_length: 1500 }],
}];

/** Devuelve el contenido de la respuesta (efímera) a /pregunta. */
async function ask(i) {
    const user = i.member?.user || i.user;
    const q = i.data.options?.find((o) => o.name === 'duda')?.value || '';
    const a = await answer(q);
    if (a && !a.unsure) return answerCard(a, user.id);
    const { text, row, container } = env.ui;
    return {
        flags: V2,
        components: [container(0xf59e0b, [
            text(`### No tengo una respuesta segura\n${a?.body ? `${a.body}\n\n` : ''}Mejor que te ayude una persona del equipo.`),
            row({ type: 2, style: 2, label: 'Avisar al equipo', custom_id: `ast:staff:${user.id}` }, ticketBtn),
        ])],
        allowed_mentions: { parse: [] },
    };
}

/** Respuesta automática al abrir un ticket (mientras llega el equipo). */
async function ticketHint(subject, message) {
    const tip = env.matchTip(`${subject}\n${message}`);
    if (tip) return { title: tip.title, body: tip.body, source: 'tip' };
    return fromKb(`${subject} ${message}`);
}

/* ------------------------------------------------------------ botones */

/** custom_id "ast:<ok|staff>:<userId>". Devuelve la respuesta de interacción a enviar. */
async function component(i) {
    const user = i.member?.user || i.user;
    const [, action, owner] = i.data.custom_id.split(':');
    const eph = (content) => ({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } });
    if (user.id !== owner) return eph('Estos botones son de quien hizo la pregunta. Si tienes otra duda, escríbela o usa `/pregunta`.');
    const ephemeralMsg = (i.message?.flags & 64) === 64;
    if (action === 'ok') {
        if (ephemeralMsg) return { type: 7, data: { flags: V2, components: [env.ui.container(0x10b981, [env.ui.text('Genial, me alegro de que se haya resuelto.')])] } };
        // Quita los botones y deja la respuesta
        const comps = JSON.parse(JSON.stringify(i.message.components || []));
        for (const c of comps) if (c.components) c.components = c.components.filter((x) => x.type !== 1);
        comps[0]?.components?.push(env.ui.text('-# Resuelto.'));
        return { type: 7, data: { components: comps } };
    }
    if (action === 'staff') {
        const pinged = await pingStaff(i.channel_id, user.id, 'la respuesta automática no le ha servido');
        return eph(pinged ? 'He avisado al equipo. Mientras, si es algo de tu cuenta o un pago, abre un ticket.' : 'El equipo ya está avisado hace poco; te responderán por orden. Si es privado, abre un ticket.');
    }
    return eph('Esta acción ya no está disponible.');
}

module.exports = { init, answer, summarizeThread, onSupportMessage, ask, ticketHint, component, definitions, pingStaff, NAMES: new Set(['pregunta']) };
