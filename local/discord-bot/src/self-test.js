import assert from 'node:assert/strict';
import { commands, commandReply } from './commands.js';

export function selfTest() {
  assert.deepEqual(commands.map(command => command.name), ['ping', 'ayuda', 'estado']);
  assert.equal(commandReply('ping', { latency: 24.6 }), 'Pong! Latencia: 25 ms.');
  assert.match(commandReply('ayuda'), /\/estado/);
  assert.match(commandReply('estado', { uptime: 125.9 }), /125 segundos/);
  assert.equal(commandReply('unknown'), null);
  return 'Prueba local OK: /ping, /ayuda y /estado. Esta prueba no conecta con Discord.';
}
