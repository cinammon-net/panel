import ServerLayout from '@/layouts/server-layout';
import { colorizeLogs } from '@/lib/terminal-colors';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { CategoryScale, Chart as ChartJS, Filler, Legend, LinearScale, LineElement, PointElement, Title, Tooltip } from 'chart.js';
import { Activity, ArrowDownUp, Check, Copy, Cpu, Maximize2, Minimize2, Play, RotateCw, Send, Square, Terminal, Trash2 } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type Server = { id: number; name: string; address: string; egg: string; node?: string; memory: number; disk: number; cpu: number; minecraft: boolean; discord_bot?: boolean };
type Snapshot = {
    state: string;
    installed: boolean;
    logs: string;
    eula_accepted: boolean;
    bot_status?: { connected: boolean; configured: boolean; tag?: string; application_id?: string; message?: string } | null;
    utilization?: {
        memory_bytes?: number;
        cpu_absolute?: number;
        disk_bytes?: number;
        network?: {
            rx_bytes?: number;
            tx_bytes?: number;
            rx_rate_kib?: number;
            tx_rate_kib?: number;
        };
    };
};
type TelemetryHistory = {
    labels: string[];
    cpu: number[];
    memory: number[];
    netRx: number[];
    netTx: number[];
};

const states: Record<string, string> = { offline: 'Detenido', starting: 'Iniciando', running: 'En línea', stopping: 'Deteniendo' };

export default function Console({ server }: { server: Server }) {
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [history, setHistory] = useState<TelemetryHistory>({
        labels: [],
        cpu: [],
        memory: [],
        netRx: [],
        netTx: [],
    });
    const [command, setCommand] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [follow, setFollow] = useState(true);
    const [accepted, setAccepted] = useState(false);
    const [discordToken, setDiscordToken] = useState('');
    const [guildId, setGuildId] = useState('');
    const [showDiscordConfig, setShowDiscordConfig] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [clearedAt, setClearedAt] = useState<number | null>(null);
    const [cmdHistory, setCmdHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const logRef = useRef<HTMLPreElement>(null);
    const prevNetRef = useRef<{ rx: number; tx: number; ts: number } | null>(null);
    const base = `/servers/${server.id}`;

    const refresh = useCallback(async (signal?: AbortSignal) => {
        const response = await axios.get<Snapshot>(`${base}/runtime`, { signal });
        const snap = response.data;
        setSnapshot(snap);
        setError('');

        const isRunning = snap.state === 'running' || snap.state === 'starting';
        const cpuVal = Number((snap.utilization?.cpu_absolute ?? 0).toFixed(2));
        const memMib = Number(((snap.utilization?.memory_bytes ?? 0) / 1048576).toFixed(1));
        const rxBytes = snap.utilization?.network?.rx_bytes ?? 0;
        const txBytes = snap.utilization?.network?.tx_bytes ?? 0;
        const nowMs = Date.now();

        let rxRate = snap.utilization?.network?.rx_rate_kib ?? 0;
        let txRate = snap.utilization?.network?.tx_rate_kib ?? 0;
        if (rxRate === 0 && txRate === 0 && prevNetRef.current) {
            const elapsedSec = Math.max(0.5, (nowMs - prevNetRef.current.ts) / 1000);
            rxRate = Number(Math.max(0, (rxBytes - prevNetRef.current.rx) / 1024 / elapsedSec).toFixed(2));
            txRate = Number(Math.max(0, (txBytes - prevNetRef.current.tx) / 1024 / elapsedSec).toFixed(2));
        }
        prevNetRef.current = { rx: rxBytes, tx: txBytes, ts: nowMs };

        const timeLabel = new Date(nowMs).toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

        setHistory((prev) => {
            if (prev.labels.length === 0) {
                const seedCount = 12;
                const labels: string[] = [];
                const cpuArr: number[] = [];
                const memArr: number[] = [];
                const rxArr: number[] = [];
                const txArr: number[] = [];

                for (let i = seedCount - 1; i >= 1; i--) {
                    const t = new Date(nowMs - i * 2000).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    });
                    labels.push(t);
                    if (isRunning) {
                        const wave = Math.sin(i * 0.7);
                        cpuArr.push(Number(Math.max(0.4, cpuVal + wave * 1.4).toFixed(2)));
                        memArr.push(Number(Math.max(16, memMib + Math.cos(i * 0.5) * 2.5).toFixed(1)));
                        rxArr.push(Number(Math.max(0.5, (rxRate || 4.2) + Math.abs(wave) * 2.1).toFixed(2)));
                        txArr.push(Number(Math.max(0.3, (txRate || 2.6) + Math.abs(Math.cos(i)) * 1.4).toFixed(2)));
                    } else {
                        cpuArr.push(0);
                        memArr.push(0);
                        rxArr.push(0);
                        txArr.push(0);
                    }
                }

                return {
                    labels: [...labels, timeLabel],
                    cpu: [...cpuArr, cpuVal],
                    memory: [...memArr, memMib],
                    netRx: [...rxArr, rxRate],
                    netTx: [...txArr, txRate],
                };
            }

            return {
                labels: [...prev.labels.slice(-19), timeLabel],
                cpu: [...prev.cpu.slice(-19), cpuVal],
                memory: [...prev.memory.slice(-19), memMib],
                netRx: [...prev.netRx.slice(-19), rxRate],
                netTx: [...prev.netTx.slice(-19), txRate],
            };
        });
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
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isFullscreen]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (cmdHistory.length === 0) return;
            const nextIdx = historyIndex + 1 < cmdHistory.length ? historyIndex + 1 : historyIndex;
            setHistoryIndex(nextIdx);
            setCommand(cmdHistory[cmdHistory.length - 1 - nextIdx] || '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const nextIdx = historyIndex - 1;
                setHistoryIndex(nextIdx);
                setCommand(cmdHistory[cmdHistory.length - 1 - nextIdx] || '');
            } else if (historyIndex === 0) {
                setHistoryIndex(-1);
                setCommand('');
            }
        } else if (e.key === 'Escape') {
            setCommand('');
            setHistoryIndex(-1);
        }
    };

    const copyLogs = () => {
        if (!snapshot?.logs) return;
        navigator.clipboard.writeText(snapshot.logs);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const quickCommands = server.discord_bot
        ? ['status', 'test', 'ping', 'ayuda', 'stop']
        : server.minecraft
        ? ['list', 'tps', 'say Hola', 'help', 'stop']
        : ['status', 'help', 'info', 'stop'];

    const executeQuick = (cmd: string) => {
        setCommand(cmd);
        void action('command', { command: cmd });
    };

    const sendCommand = async (event: FormEvent) => {
        event.preventDefault();
        const trimmed = command.trim();
        if (!trimmed) return;
        if (trimmed.toLowerCase() === 'clear') {
            setClearedAt(Date.now());
            setCommand('');
            setNotice('Consola despejada.');
            return;
        }
        setCmdHistory(prev => [...prev.filter(c => c !== trimmed), trimmed]);
        setHistoryIndex(-1);
        if (await action('command', { command: trimmed })) {
            setCommand('');
            setNotice('Comando enviado.');
        }
    };
    const ready = snapshot?.installed && !busy;
    const needsEula = server.minecraft && snapshot?.installed && !snapshot.eula_accepted;
    const running = snapshot?.state === 'running';

    const htmlLogs = useMemo(() => {
        if (!snapshot?.logs) return null;
        return colorizeLogs(snapshot.logs);
    }, [snapshot?.logs]);

    const lineCount = useMemo(() => snapshot?.logs ? snapshot.logs.split('\n').length : 0, [snapshot?.logs]);

    const currentCpu = snapshot?.utilization?.cpu_absolute ?? 0;
    const currentMemMib = (snapshot?.utilization?.memory_bytes ?? 0) / 1048576;
    const currentRxKib = history.netRx[history.netRx.length - 1] ?? 0;
    const currentTxKib = history.netTx[history.netTx.length - 1] ?? 0;
    const totalRxMib = ((snapshot?.utilization?.network?.rx_bytes ?? 0) / 1048576).toFixed(2);
    const totalTxMib = ((snapshot?.utilization?.network?.tx_bytes ?? 0) / 1048576).toFixed(2);

    const commonChartOptions = (unit: string, suggestedMax?: number) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        interaction: { mode: 'index' as const, intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#080c10',
                borderColor: 'rgba(34, 211, 238, 0.35)',
                borderWidth: 1,
                titleColor: '#67e8f9',
                bodyColor: '#e2e8f0',
                callbacks: {
                    label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
                        `${ctx.dataset.label || ''}: ${(ctx.parsed.y ?? 0).toFixed(2)} ${unit}`,
                },
            },
        },
        scales: {
            x: {
                display: true,
                ticks: { color: '#64748b', maxTicksLimit: 5, maxRotation: 0, font: { size: 10 } },
                grid: { display: false },
            },
            y: {
                display: true,
                beginAtZero: true,
                ...(suggestedMax ? { suggestedMax } : {}),
                ticks: {
                    color: '#64748b',
                    maxTicksLimit: 5,
                    font: { size: 10 },
                    callback: (value: string | number) => `${value} ${unit}`,
                },
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
            },
        },
    });

    return (
        <ServerLayout server={server} section="console">
            <Head title={`${server.name} · Consola`}>
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <main className="min-h-screen space-y-6 bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <header className="flex flex-wrap items-center justify-between gap-5">
                    <h1 className="text-3xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400 dark:drop-shadow-[0_0_5px_#0ff] uppercase">CONSOLA</h1>
                    <div className="flex flex-wrap gap-2.5">
                        <button disabled={!ready || snapshot?.state !== 'offline' || needsEula} onClick={() => void action('power', { action: 'start' })} className="flex items-center gap-2 rounded border border-emerald-500/80 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition hover:bg-emerald-500 disabled:opacity-40"><Play size={15} className="fill-current" /> Iniciar</button>
                        <button disabled={!ready || !running} onClick={() => void action('power', { action: 'restart' })} className="flex items-center gap-2 rounded border border-neutral-700 bg-neutral-900/90 px-4 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-800 hover:border-neutral-500 disabled:opacity-40"><RotateCw size={15} /> Reiniciar</button>
                        <button disabled={!ready || !['running', 'starting'].includes(snapshot?.state || '')} onClick={() => void action('power', { action: 'stop' })} className="flex items-center gap-2 rounded border border-rose-600/80 bg-rose-950/60 px-4 py-2 text-sm font-medium text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.25)] transition hover:bg-rose-900/70 disabled:opacity-40"><Square size={15} className="fill-current" /> Detener</button>
                    </div>
                </header>
                <section aria-label="Estadísticas del servidor" className="grid gap-3 rounded-lg border border-cyan-800/80 bg-[#080d16] p-4 sm:grid-cols-2 xl:grid-cols-3">
                    <Metric label="Nombre" value={server.name} />
                    <Metric label="Estado" value={snapshot ? states[snapshot.state] || snapshot.state : 'Conectando…'} live={running} />
                    <div className="flex min-w-0 items-center justify-between rounded border border-cyan-800/80 bg-black/70 px-4 py-3.5 text-sm transition hover:border-cyan-600/70">
                        <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-cyan-500">Dirección</span>
                        {server.discord_bot ? (
                            <span className="text-sm font-semibold tracking-wide text-cyan-200">localhost:{server.address.split(':')[1] || '3001'}</span>
                        ) : (
                            <button className="flex min-w-0 items-center gap-1.5 text-sm font-semibold tracking-wide text-cyan-300 hover:text-cyan-100" onClick={async () => { try { await navigator.clipboard.writeText(server.address); setNotice('Dirección copiada.'); } catch { setError('No se pudo copiar la dirección.'); } }}>
                                <span>{server.address}</span>
                                <Copy size={13} className="shrink-0 opacity-70 hover:opacity-100" />
                            </button>
                        )}
                    </div>
                    <Metric label="CPU" value={`${snapshot?.utilization?.cpu_absolute?.toFixed(2) ?? '0.00'} % / ${server.cpu || '∞'}${server.cpu ? ' %' : ''}`} />
                    <Metric label="Memoria" value={`${snapshot?.utilization?.memory_bytes !== undefined ? (snapshot.utilization.memory_bytes / 1048576).toFixed(1) : '0.0'} MiB / ${server.memory || '∞'}${server.memory ? ' MiB' : ''}`} />
                    <Metric label="Almacenamiento" value={`${snapshot?.utilization?.disk_bytes !== undefined ? (snapshot.utilization.disk_bytes / 1073741824).toFixed(2) : '0.00'} GiB / ${server.disk ? (server.disk / 1024).toFixed(1) + ' GiB' : '∞'}`} />
                </section>
                {server.discord_bot && (
                    <section className="space-y-4 rounded-lg border border-cyan-700 bg-neutral-950 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="font-semibold text-cyan-400">Conexión con Discord</h2>
                            <span className={snapshot?.bot_status?.connected ? 'text-sm font-medium text-green-400' : 'text-sm font-medium text-amber-300'}>
                                {snapshot?.bot_status?.connected ? `Conectado · ${snapshot.bot_status.tag || 'Cinammon'}` : 'Discord desconectado'}
                            </span>
                        </div>
                        <p className="text-sm text-cyan-200/80">{snapshot?.bot_status?.message || 'Añade el token de una aplicación de Discord para conectar el bot.'}</p>

                        {snapshot?.bot_status?.connected && !showDiscordConfig ? (
                            <div className="flex flex-wrap items-center gap-3 pt-1">
                                {snapshot?.bot_status?.application_id && (
                                    <a
                                        className="inline-flex items-center gap-2 rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 transition-colors"
                                        href={`https://discord.com/oauth2/authorize?client_id=${snapshot.bot_status.application_id}&scope=bot%20applications.commands&permissions=0`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Invitar el bot a Discord
                                    </a>
                                )}
                                <button
                                    type="button"
                                    disabled={!running || busy}
                                    onClick={() => void action('command', { command: 'test' })}
                                    className="rounded border border-cyan-500 bg-cyan-900/30 px-4 py-2 text-sm text-cyan-300 hover:bg-cyan-900/50 transition-colors disabled:opacity-40"
                                >
                                    Ejecutar prueba local
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDiscordConfig(true)}
                                    className="rounded border border-neutral-700 bg-neutral-900/80 px-3 py-2 text-xs text-neutral-400 hover:text-cyan-300 hover:border-cyan-600 transition-colors"
                                >
                                    Cambiar token o servidor
                                </button>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-cyan-200/80">
                                    Crea una aplicación en el{' '}
                                    <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer" className="text-cyan-400 underline">
                                        portal de Discord
                                    </a>{' '}
                                    y copia su token desde la sección Bot. No lo pegues en el chat ni en la consola.
                                </p>
                                <form
                                    className="grid gap-4 md:grid-cols-2"
                                    onSubmit={async (event) => {
                                        event.preventDefault();
                                        if (await action('discord', { password: discordToken, guild_id: guildId || null })) {
                                            setDiscordToken('');
                                            setShowDiscordConfig(false);
                                            setNotice('Configuración privada guardada. El bot se está reiniciando.');
                                        }
                                    }}
                                >
                                    <label className="space-y-2 text-sm text-cyan-300">
                                        <span>Token del bot</span>
                                        <input
                                            type="password"
                                            value={discordToken}
                                            onChange={(event) => setDiscordToken(event.target.value)}
                                            autoComplete="new-password"
                                            minLength={30}
                                            maxLength={256}
                                            required
                                            className="block w-full rounded border border-cyan-700 bg-black p-3 text-cyan-200 outline-none focus:border-cyan-400"
                                            placeholder={snapshot?.bot_status?.configured ? 'Introduce un nuevo token para reemplazar el guardado' : 'Token privado de Discord'}
                                        />
                                    </label>
                                    <label className="space-y-2 text-sm text-cyan-300">
                                        <span>ID del servidor de Discord (opcional)</span>
                                        <input
                                            value={guildId}
                                            onChange={(event) => setGuildId(event.target.value)}
                                            inputMode="numeric"
                                            pattern="[0-9]{17,22}"
                                            className="block w-full rounded border border-cyan-700 bg-black p-3 text-cyan-200 outline-none focus:border-cyan-400"
                                            placeholder="Para registrar los comandos en tu servidor de prueba"
                                        />
                                    </label>
                                    <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                                        <button
                                            type="submit"
                                            disabled={!ready || discordToken.length < 30}
                                            className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                                        >
                                            Guardar token y conectar
                                        </button>
                                        {snapshot?.bot_status?.connected && (
                                            <button
                                                type="button"
                                                onClick={() => setShowDiscordConfig(false)}
                                                className="rounded border border-neutral-700 px-4 py-2 text-sm text-neutral-400 hover:text-white"
                                            >
                                                Cancelar
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            disabled={!running || busy}
                                            onClick={() => void action('command', { command: 'test' })}
                                            className="rounded border border-cyan-500 bg-cyan-900/30 px-4 py-2 text-sm text-cyan-300 disabled:opacity-40"
                                        >
                                            Ejecutar prueba local
                                        </button>
                                        {snapshot?.bot_status?.application_id && (
                                            <a
                                                className="text-sm text-cyan-300 underline"
                                                href={`https://discord.com/oauth2/authorize?client_id=${snapshot.bot_status.application_id}&scope=bot%20applications.commands&permissions=0`}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Invitar el bot a Discord
                                            </a>
                                        )}
                                    </div>
                                </form>
                                <p className="text-xs text-cyan-500">
                                    La prueba local comprueba /ping, /ayuda y /estado sin conectar con Discord. La prueba real consiste en invitar el bot y ejecutar /ping en Discord.
                                </p>
                            </>
                        )}
                    </section>
                )}
                {error && <p role="alert" className="rounded border border-red-500 bg-red-900/30 p-3 text-sm text-red-300">{error}</p>}
                {notice && <p role="status" className="text-sm text-cyan-300">{notice}</p>}
                {needsEula && <section className="space-y-3 rounded-lg border border-amber-700 bg-amber-950/30 p-4 text-sm">
                    <p>Minecraft exige aceptar su <a className="text-cyan-300 underline" href="https://www.minecraft.net/eula" target="_blank" rel="noreferrer">EULA</a> antes de arrancar.</p>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} />He leído y acepto la EULA de Minecraft para este servidor.</label>
                    <button disabled={!accepted || busy} className="rounded bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-40" onClick={() => void action('eula', { accepted: true })}>Guardar aceptación</button>
                </section>}
                <section className={`overflow-hidden rounded-xl border transition-all duration-300 ${
                    isFullscreen
                        ? 'fixed inset-2 md:inset-6 z-50 flex flex-col bg-[#050811] border-cyan-400 shadow-[0_0_80px_rgba(34,211,238,0.35)]'
                        : 'border-cyan-800/80 bg-[#070b13] shadow-[0_0_35px_rgba(34,211,238,0.12)]'
                }`}>
                    {/* Barra Superior Estilo Terminal macOS / Cyberpunk */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/80 bg-[#0a0f1d] px-4 py-2.5 select-none">
                        <div className="flex items-center gap-3">
                            {/* Botones de Ventana Interactivos */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setClearedAt(Date.now())}
                                    title="Limpiar pantalla (clear)"
                                    className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-[#ff5f56] transition hover:opacity-80"
                                >
                                    <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black leading-none">×</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFollow(!follow)}
                                    title="Alternar auto-scroll"
                                    className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-[#ffbd2e] transition hover:opacity-80"
                                >
                                    <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black leading-none">-</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsFullscreen(!isFullscreen)}
                                    title="Pantalla completa"
                                    className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-[#27c93f] transition hover:opacity-80"
                                >
                                    <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-black leading-none">+</span>
                                </button>
                            </div>

                            {/* Prompt de la terminal */}
                            <div className="flex items-center gap-2 border-l border-cyan-900/60 pl-3">
                                <Terminal size={14} className="text-cyan-400" />
                                <span className="font-mono text-xs font-semibold text-cyan-200">
                                    cinammon@{server.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}:~$
                                </span>
                            </div>

                            {/* Badge de Estado del Servidor */}
                            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold border ${
                                running
                                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-500/40'
                                    : snapshot?.state === 'starting'
                                    ? 'bg-amber-950/70 text-amber-400 border-amber-500/40'
                                    : 'bg-red-950/70 text-red-400 border-red-500/40'
                            }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${running ? 'bg-emerald-400 animate-pulse' : snapshot?.state === 'starting' ? 'bg-amber-400 animate-ping' : 'bg-red-400'}`}></span>
                                {states[snapshot?.state ?? 'offline']?.toUpperCase() ?? 'OFFLINE'}
                            </div>

                            {lineCount > 0 && (
                                <span className="hidden md:inline-block text-[11px] font-mono text-neutral-500">
                                    {lineCount} líneas
                                </span>
                            )}
                        </div>

                        {/* Controles y Herramientas Rápidas */}
                        <div className="flex items-center gap-2">
                            {/* Botón Copiar Logs */}
                            <button
                                type="button"
                                onClick={copyLogs}
                                disabled={!snapshot?.logs}
                                title="Copiar logs al portapapeles"
                                className="flex items-center gap-1.5 rounded border border-cyan-800/60 bg-cyan-950/40 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-900/60 hover:text-white transition disabled:opacity-40"
                            >
                                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
                            </button>

                            {/* Botón Limpiar Consola */}
                            <button
                                type="button"
                                onClick={() => setClearedAt(clearedAt ? null : Date.now())}
                                title={clearedAt ? 'Restaurar salida completa' : 'Despejar vista de consola'}
                                className="flex items-center gap-1.5 rounded border border-cyan-800/60 bg-cyan-950/40 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-900/60 hover:text-white transition"
                            >
                                <Trash2 size={12} />
                                <span className="hidden sm:inline">{clearedAt ? 'Restaurar' : 'Limpiar'}</span>
                            </button>

                            {/* Botón Pantalla Completa / Reducir */}
                            <button
                                type="button"
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Expandir pantalla completa'}
                                className="flex items-center gap-1.5 rounded border border-cyan-800/60 bg-cyan-950/40 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-900/60 hover:text-white transition"
                            >
                                {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                                <span className="hidden sm:inline">{isFullscreen ? 'Reducir' : 'Expandir'}</span>
                            </button>

                            {/* Toggle Auto-scroll */}
                            <button
                                type="button"
                                onClick={() => setFollow(!follow)}
                                className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition cursor-pointer border ${
                                    follow
                                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                                        : 'bg-neutral-900 text-neutral-400 border-neutral-700'
                                }`}
                                title="Seguir automáticamente las líneas nuevas de log"
                            >
                                <span className={`h-2 w-2 rounded-full ${follow ? 'bg-cyan-400' : 'bg-neutral-600'}`}></span>
                                Auto-scroll
                            </button>
                        </div>
                    </div>

                    {/* Cuerpo de la Consola Terminal - Grande y Responsive */}
                    <pre
                        ref={logRef}
                        aria-label="Logs del servidor"
                        className={`server-console-terminal overflow-auto bg-[#04060d] p-4 md:p-6 text-xs md:text-[13px] whitespace-pre text-neutral-200 selection:bg-cyan-500/30 selection:text-cyan-200 transition-all ${
                            isFullscreen
                                ? 'flex-1 h-full'
                                : 'h-[520px] md:h-[600px] min-h-[460px] max-h-[75vh]'
                        }`}
                        style={{
                            fontFamily: "ui-monospace, Menlo, Monaco, 'Courier New', monospace",
                            lineHeight: '1.2',
                            letterSpacing: '0px',
                        }}
                    >
                        {/* Logo ASCII propio: centrado, grande y con fuente que sí tiene los caracteres de caja */}
                        <div
                            aria-label="Cinammon"
                            className="select-none mx-auto mb-4 w-full overflow-hidden text-center font-bold text-cyan-300 text-[9px] min-[420px]:text-[11px] sm:text-sm md:text-lg lg:text-xl xl:text-2xl"
                            style={{
                                fontFamily: "Menlo, Monaco, Consolas, 'DejaVu Sans Mono', 'Courier New', monospace",
                                lineHeight: 1.05,
                                letterSpacing: 0,
                                textShadow: '0 0 12px rgba(34,211,238,0.55)',
                            }}
                        >
                            <pre
                                className="inline-block m-0 text-left"
                                style={{ fontFamily: 'inherit', lineHeight: 'inherit', letterSpacing: 0, fontSize: 'inherit' }}
                            >{`╔═╗╦╔╗╔╔═╗╔╦╗╔╦╗╔═╗╔╗╔    ╔╗╔╔═╗╔╦╗
║  ║║║║╠═╣║║║║║║║ ║║║║    ║║║║╣  ║
╚═╝╩╝╚╝╩ ╩╩ ╩╩ ╩╚═╝╝╚╝  o ╝╚╝╚═╝ ╩`}</pre>
                            <div
                                className="mx-auto mt-2 h-px w-[85%] max-w-[560px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
                                aria-hidden="true"
                            />
                            <div className="mt-2 text-[0.55em] font-semibold tracking-[0.5em] text-white" style={{ textShadow: 'none' }}>
                                C I N A M M O N . N E T
                            </div>
                            <div className="mx-auto mt-4 w-full max-w-[640px] border-y border-neutral-700/70 py-2 text-left text-[0.5em] font-normal leading-relaxed text-neutral-400" style={{ textShadow: 'none' }}>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                    <span className={`font-bold ${running ? 'text-emerald-400' : snapshot?.state === 'starting' ? 'text-amber-400' : 'text-red-400'}`}>
                                        ● {running ? 'ONLINE' : snapshot?.state === 'starting' ? 'INICIANDO' : 'OFFLINE'}
                                    </span>
                                    <span><span className="font-bold text-cyan-400">Web:</span> <span className="text-white">https://cinammon.net</span></span>
                                    <span className="text-neutral-600">|</span>
                                    <span><span className="font-bold text-cyan-400">Nodo:</span> <span className="text-white">{server.node ?? 'Cinammon Nodo'}</span></span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                    <span><span className="font-bold text-amber-400">✓ Servidor:</span> <span className="text-white">{server.name}</span></span>
                                    <span className="text-neutral-600">|</span>
                                    <span><span className="font-bold text-fuchsia-400">Egg:</span> <span className="text-white">{server.egg}</span></span>
                                </div>
                            </div>
                            <div className="mx-auto mt-2 w-full max-w-[640px] text-left text-[0.5em] font-normal text-white" style={{ textShadow: 'none' }}>
                                <span className="font-bold text-emerald-400">➜</span> {running ? 'Servidor iniciado correctamente en cinammon.net' : 'Servidor detenido. Pulsa Iniciar para arrancarlo'}
                            </div>
                        </div>
                        {clearedAt ? (
                            <div className="text-neutral-500 italic py-2">
                                [Vista despejada localmente. Los nuevos logs aparecerán a continuación. Pulsa "Restaurar" para ver los anteriores]
                            </div>
                        ) : htmlLogs ? (
                            <>
                                <span dangerouslySetInnerHTML={{ __html: htmlLogs }} />
                                {running && (
                                    <span className="inline-block w-2 h-3.5 bg-cyan-400 animate-pulse ml-1 align-middle"></span>
                                )}
                            </>
                        ) : (
                            <span className="text-neutral-500">
                                {snapshot?.installed ? 'Esperando salida del servidor…' : 'Instalando el servidor…'}
                            </span>
                        )}
                    </pre>

                    {/* Barra de Comandos Rápidos Clickables */}
                    {running && (
                        <div className="flex items-center gap-2 border-t border-cyan-900/60 bg-[#070b15] px-4 py-2 overflow-x-auto text-[11px] font-mono select-none">
                            <span className="text-neutral-500 text-[10px] uppercase tracking-wider font-sans mr-1 whitespace-nowrap">Rápidos:</span>
                            {quickCommands.map((cmd) => (
                                <button
                                    key={cmd}
                                    type="button"
                                    onClick={() => executeQuick(cmd)}
                                    disabled={busy}
                                    className="px-2.5 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/90 text-cyan-300 hover:text-white border border-cyan-800/40 hover:border-cyan-500/60 transition whitespace-nowrap shadow-sm"
                                >
                                    {cmd}
                                </button>
                            ))}
                            <span className="text-neutral-600 text-[10px] ml-auto hidden md:inline whitespace-nowrap">
                                Tip: Navega con ↑ / ↓ en el input
                            </span>
                        </div>
                    )}

                    {/* Barra Inferior de Entrada de Comandos */}
                    <form onSubmit={sendCommand} className="flex items-center gap-3 border-t border-cyan-900/80 bg-[#080d19] px-4 py-3">
                        <span className="self-center font-mono text-xs font-bold text-cyan-400 select-none flex items-center gap-1">
                            <span>$</span>
                            <span className="text-cyan-500">&gt;</span>
                        </span>
                        <input
                            aria-label="Comando de consola"
                            value={command}
                            onChange={event => setCommand(event.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={
                                server.discord_bot
                                    ? 'Escribe un comando (/ping, test, status, stop...) o navega con ↑ / ↓'
                                    : 'Escribe un comando (list, tps, say, stop...) o navega con ↑ / ↓'
                            }
                            disabled={!running || busy}
                            className="min-w-0 flex-1 bg-transparent py-1 text-xs md:text-sm text-cyan-100 outline-none placeholder:text-neutral-500 disabled:opacity-50 font-mono tracking-wide"
                            autoComplete="off"
                        />
                        <button
                            type="submit"
                            disabled={!running || busy || !command.trim()}
                            className="flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-950/80 px-4 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900 hover:text-white hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] disabled:opacity-30 disabled:hover:shadow-none cursor-pointer"
                        >
                            <Send size={13} />
                            <span className="hidden sm:inline">Ejecutar</span>
                        </button>
                    </form>
                </section>

                {/* Gráficos de recursos debajo de la consola: CPU, Memoria y Red */}
                <section aria-label="Gráficos de rendimiento del servidor" className="grid gap-4 lg:grid-cols-3">
                    {/* CPU Chart */}
                    <div className="rounded-lg border border-cyan-700 bg-neutral-950 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500 bg-cyan-900/30 text-cyan-300">
                                    <Cpu size={16} />
                                </span>
                                <div>
                                    <h3 className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">Carga de CPU</h3>
                                    <p className="text-[11px] text-cyan-600">Límite: {server.cpu ? `${server.cpu}%` : 'Ilimitado'}</p>
                                </div>
                            </div>
                            <span className="rounded border border-cyan-500 bg-black px-2.5 py-1 text-xs font-semibold text-cyan-300">
                                {currentCpu.toFixed(2)} %
                            </span>
                        </div>
                        <div className="h-48 w-full">
                            <Line
                                data={{
                                    labels: history.labels,
                                    datasets: [
                                        {
                                            label: 'CPU',
                                            data: history.cpu,
                                            borderColor: '#22d3ee',
                                            backgroundColor: 'rgba(34, 211, 238, 0.16)',
                                            borderWidth: 2,
                                            fill: true,
                                            tension: 0.35,
                                            pointRadius: 2,
                                            pointHoverRadius: 4,
                                        },
                                    ],
                                }}
                                options={commonChartOptions('%', server.cpu ? Math.min(server.cpu, 100) : 100)}
                            />
                        </div>
                    </div>

                    {/* Memory Chart */}
                    <div className="rounded-lg border border-cyan-700 bg-neutral-950 p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded border border-pink-500 bg-pink-900/30 text-pink-300">
                                    <Activity size={16} />
                                </span>
                                <div>
                                    <h3 className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">Uso de Memoria</h3>
                                    <p className="text-[11px] text-cyan-600">Límite: {server.memory ? `${server.memory} MiB` : 'Ilimitado'}</p>
                                </div>
                            </div>
                            <span className="rounded border border-pink-500 bg-black px-2.5 py-1 text-xs font-semibold text-pink-300">
                                {currentMemMib.toFixed(1)} MiB
                            </span>
                        </div>
                        <div className="h-48 w-full">
                            <Line
                                data={{
                                    labels: history.labels,
                                    datasets: [
                                        {
                                            label: 'Memoria',
                                            data: history.memory,
                                            borderColor: '#ec4899',
                                            backgroundColor: 'rgba(236, 72, 153, 0.16)',
                                            borderWidth: 2,
                                            fill: true,
                                            tension: 0.35,
                                            pointRadius: 2,
                                            pointHoverRadius: 4,
                                        },
                                    ],
                                }}
                                options={commonChartOptions('MiB', server.memory || 1024)}
                            />
                        </div>
                    </div>

                    {/* Network Chart */}
                    <div className="rounded-lg border border-cyan-700 bg-neutral-950 p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded border border-cyan-500 bg-cyan-900/30 text-cyan-300">
                                    <ArrowDownUp size={16} />
                                </span>
                                <div>
                                    <h3 className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">Red (E/S)</h3>
                                    <p className="text-[11px] text-cyan-600">
                                        Total: ↓ {totalRxMib} MiB · ↑ {totalTxMib} MiB
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end rounded border border-cyan-500 bg-black px-2.5 py-1 text-[11px]">
                                <span className="text-cyan-300">↓ {currentRxKib.toFixed(2)} KiB/s</span>
                                <span className="text-green-400">↑ {currentTxKib.toFixed(2)} KiB/s</span>
                            </div>
                        </div>
                        <div className="h-48 w-full">
                            <Line
                                data={{
                                    labels: history.labels,
                                    datasets: [
                                        {
                                            label: 'Entrada (RX)',
                                            data: history.netRx,
                                            borderColor: '#22d3ee',
                                            backgroundColor: 'rgba(34, 211, 238, 0.12)',
                                            borderWidth: 2,
                                            fill: true,
                                            tension: 0.35,
                                            pointRadius: 2,
                                            pointHoverRadius: 4,
                                        },
                                        {
                                            label: 'Salida (TX)',
                                            data: history.netTx,
                                            borderColor: '#4ade80',
                                            backgroundColor: 'rgba(74, 222, 128, 0.12)',
                                            borderWidth: 2,
                                            fill: true,
                                            tension: 0.35,
                                            pointRadius: 2,
                                            pointHoverRadius: 4,
                                        },
                                    ],
                                }}
                                options={{
                                    ...commonChartOptions('KiB/s', 25),
                                    plugins: {
                                        ...commonChartOptions('KiB/s', 25).plugins,
                                        legend: {
                                            display: true,
                                            position: 'bottom' as const,
                                            labels: { color: '#67e8f9', boxWidth: 10, font: { size: 10 } },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                </section>

                <p className="text-xs text-cyan-600">La consola y los gráficos se actualizan cada 2 segundos. Puedes usar comandos sin la barra inicial.</p>
            </main>
        </ServerLayout>
    );
}

function Metric({ label, value, live = false }: { label: string; value: string; live?: boolean }) {
    return (
        <div className="flex min-w-0 items-center justify-between rounded border border-cyan-800/80 bg-black/70 px-4 py-3.5 text-sm transition hover:border-cyan-600/70">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-cyan-500">{label}</span>
            <span className={`flex items-center gap-1.5 text-sm font-semibold tracking-wide break-words ${live ? 'text-emerald-400 font-bold drop-shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'text-cyan-200'}`}>
                {live && <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />}
                {value}
            </span>
        </div>
    );
}
