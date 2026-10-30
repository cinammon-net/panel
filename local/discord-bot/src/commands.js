export const commands = [
  { name: 'ping', description: 'Comprueba que Cinammon responde.' },
  { name: 'ayuda', description: 'Muestra los comandos del bot.' },
  { name: 'estado', description: 'Muestra el estado y el tiempo activo del bot.' },
];

export function commandReply(name, { latency = 0, uptime = 0 } = {}) {
  if (name === 'ping') return `Pong! Latencia: ${Math.max(0, Math.round(latency))} ms.`;
  if (name === 'ayuda') return 'Cinammon Bot · /ping: comprobar respuesta · /estado: estado del bot · /ayuda: esta lista.';
  if (name === 'estado') return `Cinammon está conectado a Discord. Tiempo activo: ${Math.floor(uptime)} segundos.`;
  return null;
}
