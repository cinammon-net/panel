import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { Copy, Play, RotateCw, Send, Square, Terminal } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type Server = { id: number; name: string; address: string; egg: string; memory: number; minecraft: boolean; discord_bot?: boolean };
type Snapshot = { state: string; installed: boolean; logs: string; eula_accepted: boolean; bot_status?: { connected: boolean; configured: boolean; tag?: string; application_id?: string; message?: string } | null; utilization?: { memory_bytes?: number; cpu_absolute?: number } };
const states: Record<string, string> = { offline: 'Detenido', starting: 'Iniciando', running: 'En línea', stopping: 'Deteniendo' };

export default function Console({ server }: { server: Server }) {
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [command, setCommand] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [follow, setFollow] = useState(true);
    const [accepted, setAccepted] = useState(false);
    const [discordToken, setDiscordToken] = useState('');
    const [guildId, setGuildId] = useState('');
    const logRef = useRef<HTMLPreElement>(null);
    const base = `/servers/${server.id}`;
    const refresh = useCallback(async (signal?: AbortSignal) => {
        const response = await axios.get<Snapshot>(`${base}/runtime`, { signal });
        setSnapshot(response.data);
        setError('');
    }, [base]);

    useEffect(() => {
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const poll = async () => {
            try { await refresh(controller.signal); }
            catch (error) { if (!axios.isCancel(error)) setError('No se puede conectar con el nodo. Reintentando…'); }
            finally { if (!controller.signal.aborted) timer = setTimeout(poll, 2000); }
        };
        void poll();
        return () => { controller.abort(); clearTimeout(timer); };
    }, [refresh]);

    useEffect(() => {
        if (follow && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [snapshot?.logs, follow]);

    const action = async (path: string, payload: object) => {
        setBusy(true); setError(''); setNotice('');
        try { await axios.post(`${base}/${path}`, payload); await refresh(); return true; }
        catch (error) { setError(axios.isAxiosError(error) ? error.response?.data?.message || 'No se pudo ejecutar la acción.' : 'No se pudo ejecutar la acción.'); return false; }
        finally { setBusy(false); }
    };
    const sendCommand = async (event: FormEvent) => {
        event.preventDefault();
        if (command.trim() && await action('command', { command: command.trim() })) { setCommand(''); setNotice('Comando enviado.'); }
    };
    const ready = snapshot?.installed && !busy;
    const needsEula = server.minecraft && snapshot?.installed && !snapshot.eula_accepted;
    const running = snapshot?.state === 'running';

    return (
        <AppLayout breadcrumbs={[{ title: 'Servers', href: '/servers' }, { title: server.name, href: `${base}/console` }]}>
            <Head title={`${server.name} · Consola`} />
            <main className="min-h-screen space-y-6 bg-[#080c10] p-6 text-slate-100 md:p-8">
                <nav aria-label="Secciones del servidor" className="flex gap-2 border-b border-slate-800 pb-4"><Link href={`${base}/console`} className="rounded-lg bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300" aria-current="page">Consola</Link><Link href={`${base}/files`} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white">Archivos</Link></nav>
                <header className="flex flex-wrap items-start justify-between gap-5">
                    <div><p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-widest text-cyan-400"><Terminal size={15} /> CONSOLA DEL SERVIDOR</p>
                        <h1 className="text-2xl font-semibold">{server.name}</h1><p className="mt-2 text-sm text-slate-400">{server.egg} · {server.memory} MB de RAM</p></div>
                    <span role="status" className={`rounded-full border px-3 py-1.5 text-sm ${running ? 'border-emerald-700 bg-emerald-950 text-emerald-300' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>{server.discord_bot && running ? 'Proceso en marcha' : snapshot ? states[snapshot.state] || snapshot.state : 'Conectando…'}</span>
                </header>
                <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#101820] p-4">
                    {server.discord_bot ? <div><p className="mb-1 text-xs text-slate-400">Alojamiento del bot</p><p className="text-sm text-cyan-300">Conexión saliente a Discord · Sin puertos públicos</p></div> : <div><p className="mb-1 text-xs text-slate-400">Dirección para Minecraft Java</p><button className="flex items-center gap-3 font-mono text-cyan-300" onClick={async () => { try { await navigator.clipboard.writeText(server.address); setNotice('Dirección copiada.'); } catch { setError('No se pudo copiar la dirección.'); } }}>{server.address}<Copy size={14} /></button></div>}
                    <div className="flex gap-2">
                        <button disabled={!ready || snapshot?.state !== 'offline' || needsEula} onClick={() => void action('power', { action: 'start' })} className="flex items-center gap-2 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40"><Play size={15} /> Iniciar</button>
                        <button disabled={!ready || !running} onClick={() => void action('power', { action: 'restart' })} className="flex items-center gap-2 rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-40"><RotateCw size={15} /> Reiniciar</button>
                        <button disabled={!ready || !['running', 'starting'].includes(snapshot?.state || '')} onClick={() => void action('power', { action: 'stop' })} className="flex items-center gap-2 rounded-lg border border-red-900 px-3 py-2 text-sm text-red-300 disabled:opacity-40"><Square size={15} /> Detener</button>
                    </div>
                </section>
                {server.discord_bot && <section className="space-y-4 rounded-xl border border-slate-800 bg-[#101820] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Conexión con Discord</h2><span className={snapshot?.bot_status?.connected ? 'text-sm text-emerald-300' : 'text-sm text-amber-300'}>{snapshot?.bot_status?.connected ? `Conectado · ${snapshot.bot_status.tag || 'Cinammon'}` : 'Discord desconectado'}</span></div>
                    <p className="text-sm text-slate-400">{snapshot?.bot_status?.message || 'Añade el token de una aplicación de Discord para conectar el bot.'}</p>
                    <p className="text-sm text-slate-400">Crea una aplicación en el <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-cyan-300 underline">portal de Discord</a> y copia su token desde la sección Bot. No lo pegues en el chat ni en la consola.</p>
                    <form className="grid gap-4 md:grid-cols-2" onSubmit={async event => { event.preventDefault(); if (await action('discord', { password: discordToken, guild_id: guildId || null })) { setDiscordToken(''); setNotice('Configuración privada guardada. El bot se está reiniciando.'); } }}>
                        <label className="space-y-2 text-sm"><span>Token del bot</span><input type="password" value={discordToken} onChange={event => setDiscordToken(event.target.value)} autoComplete="new-password" minLength={30} maxLength={256} required className="block w-full rounded-lg border border-slate-700 bg-[#080c10] p-3 outline-none focus:border-cyan-400" placeholder={snapshot?.bot_status?.configured ? 'Introduce un nuevo token para reemplazar el guardado' : 'Token privado de Discord'} /></label>
                        <label className="space-y-2 text-sm"><span>ID del servidor de Discord (opcional)</span><input value={guildId} onChange={event => setGuildId(event.target.value)} inputMode="numeric" pattern="[0-9]{17,22}" className="block w-full rounded-lg border border-slate-700 bg-[#080c10] p-3 outline-none focus:border-cyan-400" placeholder="Para registrar los comandos en tu servidor de prueba" /></label>
                        <div className="flex flex-wrap items-center gap-3 md:col-span-2"><button type="submit" disabled={!ready || discordToken.length < 30} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-40">Guardar token y conectar</button><button type="button" disabled={!running || busy} onClick={() => void action('command', { command: 'test' })} className="rounded-lg border border-slate-600 px-4 py-2 text-sm disabled:opacity-40">Ejecutar prueba local</button>{snapshot?.bot_status?.application_id && <a className="text-sm text-cyan-300 underline" href={`https://discord.com/oauth2/authorize?client_id=${snapshot.bot_status.application_id}&scope=bot%20applications.commands&permissions=0`} target="_blank" rel="noreferrer">Invitar el bot a Discord</a>}</div>
                    </form>
                    <p className="text-xs text-slate-500">La prueba local comprueba /ping, /ayuda y /estado sin conectar con Discord. La prueba real consiste en invitar el bot y ejecutar /ping en Discord.</p>
                </section>}
                {error && <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}
                {notice && <p role="status" className="text-sm text-cyan-300">{notice}</p>}
                {needsEula && <section className="space-y-3 rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-sm">
                    <p>Minecraft exige aceptar su <a className="text-cyan-300 underline" href="https://www.minecraft.net/eula" target="_blank" rel="noreferrer">EULA</a> antes de arrancar.</p>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />He leído y acepto la EULA de Minecraft para este servidor.</label>
                    <button disabled={!accepted || busy} className="rounded-lg bg-amber-300 px-4 py-2 font-semibold text-slate-950 disabled:opacity-40" onClick={() => void action('eula', { accepted: true })}>Guardar aceptación</button>
                </section>}
                <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#05090d]">
                    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><h2 className="flex items-center gap-2 text-sm font-semibold"><Terminal size={16} className="text-cyan-400" /> Consola</h2><label className="flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)} />Seguir logs</label></div>
                    <pre ref={logRef} aria-label="Logs del servidor" className="h-[440px] overflow-auto p-4 font-mono text-xs leading-6 whitespace-pre-wrap text-slate-300">{snapshot?.logs || (snapshot?.installed ? 'Esperando salida del servidor…' : 'Instalando el servidor…')}</pre>
                    <form onSubmit={sendCommand} className="flex gap-3 border-t border-slate-800 p-3"><span className="self-center font-mono text-cyan-400">&gt;</span><input aria-label="Comando de consola" value={command} onChange={event => setCommand(event.target.value)} placeholder={server.discord_bot ? 'Comandos de proceso: status, test, stop' : 'Escribe un comando, por ejemplo: list'} disabled={!running || busy} className="min-w-0 flex-1 bg-transparent py-2 font-mono text-sm outline-none placeholder:text-slate-600 disabled:opacity-50" autoComplete="off" /><button type="submit" disabled={!running || busy || !command.trim()} className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-cyan-300 disabled:opacity-40"><Send size={15} />Enviar</button></form>
                </section>
                <p className="text-xs text-slate-500">La consola se actualiza cada 2 segundos. Puedes usar comandos sin la barra inicial.</p>
            </main>
        </AppLayout>
    );
}
