import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commandReply, commands } from '../src/commands.js';
import { selfTest } from '../src/self-test.js';

test('all registered commands have a response', () => {
  for (const command of commands) assert.equal(typeof commandReply(command.name), 'string');
});
test('unknown commands do not create a response', () => assert.equal(commandReply('unknown'), null));
test('ping rounds and clamps latency', () => {
  assert.equal(commandReply('ping', { latency: -1 }), 'Pong! Latencia: 0 ms.');
  assert.equal(commandReply('ping', { latency: 42.7 }), 'Pong! Latencia: 43 ms.');
});
test('self test is explicitly local', () => assert.match(selfTest(), /no conecta con Discord/));
