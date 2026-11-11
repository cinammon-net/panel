const test = require('node:test');
const assert = require('node:assert');
const members = require('../src/sync/members');

test('Discord invite becomes a store referral once both accounts are linked', async () => {
    const state = { invites: { counts: {}, members: { newbie: 'ana', old: 'ana' }, joined: { newbie: new Date().toISOString(), old: '2020-01-01T00:00:00Z' } } };
    let linked = false;
    const calls = [];
    members.init({
        st: () => state, saveState() {}, log() {}, ctx: () => ({ guild: 'g' }),
        discord: async () => ({}),
        panel: async (method, route, body) => {
            calls.push({ route, body });
            if (!linked) { const e = new Error('404'); e.status = 404; throw e; }
            return { status: 'linked' };
        },
    });
    assert.equal(await members.claimReferral('nobody'), null, 'not invited: nothing to do');

    let r = await members.claimReferral('newbie');
    assert.equal(r.status, 'waiting');
    assert.deepEqual(calls[0], { route: '/api/bot/discord/newbie/referral', body: { inviter: 'ana', joined_at: state.invites.joined.newbie } });

    r = await members.claimReferral('old');
    assert.equal(r.status, 'expired', 'stops retrying after 30 days');

    linked = true;
    r = await members.claimReferral('newbie');
    assert.equal(r.status, 'linked');
    const n = calls.length;
    await members.claimReferral('newbie');
    assert.equal(calls.length, n, 'final result is not asked again');
    assert.equal(members.inviterOf('newbie'), 'ana');
});
