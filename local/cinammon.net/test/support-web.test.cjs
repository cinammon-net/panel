const { test } = require('node:test');
const assert = require('node:assert/strict');
const support = require('../src/sync/support');

function setup(panel, assistant = {}) {
    const st = {};
    const calls = [];
    support.init({
        st: () => st, ctx: () => ({ layout: { channels: { help: 'help' } } }),
        saveState() {}, accent: () => 1, log() {},
        ui: { text: (content) => ({ content }), sep: () => ({}), row: (...components) => ({ components }), container: (color, components) => ({ color, components }) },
        discord: async (method, path, body) => { calls.push({ method, path, body }); return method === 'GET' ? [] : { id: path.endsWith('/threads') ? '123456' : '234567', name: 'Pregunta' }; },
        panel,
        assistant: { answer: async () => null, pingStaff: async () => {}, summarizeThread: async () => null, ...assistant },
    });
    return { st, calls };
}

const feed = { new: [{ id: 1, title: 'Cómo instalar plugins', author: 'Ana', category: 'Minecraft', url: 'https://panel/dudas/1' }] };

test('si falla la confirmación, reintenta sin duplicar el hilo ni el mensaje', async () => {
    let attempts = 0;
    const h = setup(async () => { if (++attempts === 1) throw new Error('Sin conexión'); });
    await support.syncWeb(feed); // el error se registra y no rompe el ciclo
    await support.syncWeb(feed);
    assert.equal(h.calls.filter((c) => c.path.endsWith('/threads')).length, 1);
    assert.equal(h.calls.filter((c) => c.method === 'POST' && c.path.endsWith('/messages')).length, 1);
    assert.equal(h.st.support.threads['123456'].webQuestion, 1);
});

test('la respuesta segura del asistente se publica en el hilo y en la web', async () => {
    const received = [];
    setup(async (m, path, body) => received.push({ path, body }), { answer: async () => ({ title: 'Plugins', body: 'Súbelos a /plugins' }) });
    await support.syncWeb(feed);
    const a = received.find((r) => r.path === '/api/bot/community/answers');
    assert.equal(a.body.source, 'assistant');
    assert.match(a.body.body, /plugins/);
});

test('una respuesta que falla no bloquea las siguientes', async () => {
    const h = setup(async () => {});
    h.discord = null;
    let n = 0;
    support.init({ ...{}, st: () => h.st, ctx: () => ({ layout: { channels: { help: 'help' } } }), saveState() {}, accent: () => 1, log() {},
        ui: { text: (c) => c, row: (...c) => c, container: (a, c) => c },
        discord: async (method) => { if (method === 'POST' && ++n === 1) throw new Error('Hilo borrado'); return { id: '999999' }; },
        panel: async () => {}, assistant: {} });
    await support.syncWeb({ answers: [{ id: 1, thread: '111111', body: 'a', author: 'X', url: 'u' }, { id: 2, thread: '222222', body: 'b', author: 'Y', url: 'u' }] });
    assert.equal(n, 2);
    assert.deepEqual(h.st.support.webMessages, {});
});

test('guarda también las respuestas del autor y no vuelve a publicar los mensajes del bot', async () => {
    const received = [];
    const h = setup(async (method, path, body) => received.push({ path, body }));
    h.st.support = { threads: { '123456': { webQuestion: 1, asker: '345678', helpers: {} } }, points: {} };
    await support.onThreadMessage({ channel_id: '123456', id: '456789', content: 'Lo he probado', author: { id: '345678', username: 'Ana' } });
    await support.onThreadMessage({ channel_id: '123456', id: '567890', content: 'Mensaje reflejado', author: { id: '678901', bot: true } });
    assert.equal(received.length, 1);
    assert.equal(received[0].path, '/api/bot/community/answers');
    assert.equal(received[0].body.body, 'Lo he probado');
});

test('no copia a la web mensajes con datos privados', async () => {
    const received = [];
    const h = setup(async (method, path, body) => received.push({ path, body }));
    h.st.support = { threads: { '123456': { webQuestion: 1, asker: '345678', helpers: {} } }, points: {} };
    await support.onThreadMessage({ channel_id: '123456', id: '456789', content: 'mi contraseña es x', author: { id: '345678', username: 'Ana' } });
    assert.equal(received.length, 0);
});
