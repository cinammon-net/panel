import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { commands, commandReply } from './commands.js';
import { selfTest } from './self-test.js';

const configPath = '/home/container/bot-config.json';
const statusPath = '/home/container/bot-status.json';
let client;
let connected = false;
let stopping = false;
let status = { connected: false, configured: false, tag: null, guilds: 0, message: 'Esperando configuración.' };

async function saveStatus(update = {}) {
  status = { ...status, ...update, updated_at: new Date().toISOString() };
  await writeFile(statusPath, JSON.stringify(status));
}

async function stop() {
  if (stopping) return;
  stopping = true;
  connected = false;
  client?.destroy();
  await saveStatus({ connected: false, message: 'Bot detenido.' });
  process.exit(0);
}
process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());

const cli = createInterface({ input: process.stdin, terminal: false });
cli.on('line', line => {
  const command = line.trim().toLowerCase();
  if (command === 'stop') void stop();
  else if (command === 'test') console.log(selfTest());
  else if (command === 'status') console.log(connected ? 'Discord: conectado.' : 'Discord: desconectado. Configura el token desde el panel.');
  else console.log('Comandos de consola: status, test, stop. Los comandos /ping, /ayuda y /estado se usan en Discord.');
});

async function main() {
  console.log(selfTest());
  let config = {};
  try {
    config = JSON.parse(await readFile(configPath, 'utf8'));
    await chmod(configPath, 0o600);
  } catch (error) {
    if (error.code !== 'ENOENT') console.log('No se pudo leer la configuración privada. Guárdala de nuevo desde el panel.');
  }
  const token = typeof config.token === 'string' ? config.token.trim() : '';
  const guildId = typeof config.guild_id === 'string' ? config.guild_id.trim() : '';
  await saveStatus({ configured: Boolean(token), connected: false });
  console.log('BOT_HOST_READY · Proceso del bot iniciado en el panel.');
  // Keep the host available for console tests even before a Discord token exists.
  setInterval(() => void saveStatus({ connected }).catch(() => {}), 10_000);
  if (!token) {
    console.log('DISCORD DESCONECTADO · Falta el token. Añádelo en la sección Discord del panel; no lo pegues en la consola ni en el chat.');
    return;
  }
  client = new Client({ intents: [GatewayIntentBits.Guilds] });
  client.once(Events.ClientReady, async ready => {
    connected = true;
    await saveStatus({ connected: true, tag: ready.user.tag, application_id: ready.user.id, guilds: ready.guilds.cache.size, message: 'Conectado a Discord.' });
    console.log(`DISCORD CONECTADO · ${ready.user.tag}`);
    try {
      if (guildId) {
        const guild = await ready.guilds.fetch(guildId);
        await guild.commands.set(commands);
        console.log('Comandos registrados en el servidor de prueba. Prueba /ping en Discord.');
      } else {
        await ready.application.commands.set(commands);
        console.log('Comandos globales registrados. Prueba /ping en un servidor donde hayas invitado el bot.');
      }
    } catch {
      console.log('No se pudieron registrar los comandos. Comprueba la invitación del bot y el ID del servidor.');
      await saveStatus({ message: 'Conectado, pero no se pudieron registrar los comandos.' });
    }
  });
  client.on(Events.ShardDisconnect, () => { connected = false; void saveStatus({ connected: false, message: 'Reconectando con Discord.' }); });
  client.on(Events.ShardResume, () => { connected = true; void saveStatus({ connected: true, message: 'Conectado a Discord.' }); });
  client.on(Events.Error, () => console.log('Error de conexión con Discord. No se han mostrado credenciales.'));
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const content = commandReply(interaction.commandName, { latency: client.ws.ping, uptime: (client.uptime || 0) / 1000 });
    if (!content) return;
    try {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
      console.log(`Comando /${interaction.commandName} respondido en Discord.`);
    } catch { console.log('No se pudo responder a una interacción de Discord.'); }
  });
  try { await client.login(token); }
  catch {
    connected = false;
    await saveStatus({ connected: false, message: 'No se pudo iniciar sesión. Revisa el token y reinicia el bot.' });
    console.log('DISCORD DESCONECTADO · No se pudo iniciar sesión. Revisa el token y reinicia desde el panel.');
    client.destroy();
  }
}
main().catch(async () => {
  console.log('El bot no pudo iniciar. Revisa la configuración desde el panel.');
  try { await saveStatus({ connected: false, message: 'Error al iniciar.' }); } catch { /* No credential output. */ }
  process.exit(1);
});
