import axios from 'axios';
import { Pause, Play, Search, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface WingsEvent {
    id: string;
    ts: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'DEBUG';
    kind: string;
    message: string;
    server: string | null;
    count: number;
    detail?: string | null;
    user?: string | null;
    ip?: string | null;
}

interface Feed {
    tier: 'owner' | 'full' | 'ops' | 'own';
    stale: boolean;
    generated_at: number | null;
    events: WingsEvent[];
}

const LEVEL_STYLE: Record<WingsEvent['level'], string> = {
    INFO: 'text-cyan-300',
    WARN: 'text-yellow-300',
    ERROR: 'text-rose-400',
    FATAL: 'text-rose-500',
    DEBUG: 'text-neutral-400',
};

const TIER_TEXT: Record<Feed['tier'], string> = {
    owner: 'Vista del propietario: eventos sin depurar, con IPs, usuarios y el texto original del registro.',
    full: 'Vista completa (administrador): todos los eventos y su detalle técnico.',
    ops: 'Vista de soporte: eventos operativos de todos los servidores.',
    own: 'Solo se muestran los eventos de tus servidores.',
};

export default function WingsConsole({ endpoint, showServer = true }: { endpoint: string; showServer?: boolean }) {
    const [feed, setFeed] = useState<Feed | null>(null);
    const [paused, setPaused] = useState(false);
    const [level, setLevel] = useState<'all' | 'warn' | 'error'>('all');
    const [query, setQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const box = useRef<HTMLDivElement>(null);
    const stick = useRef(true);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get<Feed>(endpoint);
            setFeed(data);
            setError(null);
        } catch (e) {
            const status = (e as { response?: { status?: number } }).response?.status;
            setError(status === 429 ? 'Demasiadas peticiones: espera unos segundos.' : 'No se pudo actualizar la consola.');
        }
    }, [endpoint]);

    useEffect(() => {
        void load();
        if (paused) return;
        const timer = setInterval(() => void load(), 5000);
        return () => clearInterval(timer);
    }, [load, paused]);

    useEffect(() => {
        if (stick.current && box.current) box.current.scrollTop = box.current.scrollHeight;
    }, [feed, level, query]);

    const needle = query.trim().toLowerCase();
    const events = (feed?.events ?? []).filter((e) => {
        if (level === 'warn' && !['WARN', 'ERROR', 'FATAL'].includes(e.level)) return false;
        if (level === 'error' && !['ERROR', 'FATAL'].includes(e.level)) return false;
        return !needle || [e.message, e.detail, e.server, e.user].some((v) => v?.toLowerCase().includes(needle));
    });

    const age = feed?.generated_at ? Math.max(0, Math.floor(Date.now() / 1000) - feed.generated_at) : null;
    const chip = (active: boolean) =>
        `rounded-md border px-2.5 py-1 text-[11px] font-bold ${active ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300' : 'border-neutral-700 text-neutral-400 hover:border-cyan-600'}`;

    return (
        <div className="overflow-hidden rounded-xl border border-cyan-900/60 bg-black">
            <div className="flex flex-wrap items-center gap-2 border-b border-cyan-900/60 px-3 py-2">
                {(['all', 'warn', 'error'] as const).map((l) => (
                    <button key={l} type="button" onClick={() => setLevel(l)} className={chip(level === l)}>
                        {l === 'all' ? 'Todo' : l === 'warn' ? 'Avisos y errores' : 'Solo errores'}
                    </button>
                ))}
                <div className="relative ml-auto flex items-center">
                    <Search className="absolute left-2 h-3.5 w-3.5 text-neutral-500" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar…"
                        className="w-40 rounded-md border border-neutral-700 bg-black py-1 pr-2 pl-7 text-xs text-neutral-200 outline-none focus:border-cyan-500"
                    />
                </div>
                <button type="button" onClick={() => setPaused((p) => !p)} className={chip(paused)} title={paused ? 'Reanudar' : 'Pausar'}>
                    {paused ? <Play className="inline h-3.5 w-3.5" /> : <Pause className="inline h-3.5 w-3.5" />}
                </button>
            </div>

            <div
                ref={box}
                onScroll={(e) => {
                    const el = e.currentTarget;
                    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
                }}
                className="h-[26rem] overflow-y-auto py-2"
            >
                {feed?.stale && <p className="px-3 py-6 text-center text-xs text-yellow-300">Sin datos recientes del recolector de Wings.</p>}
                {feed && !feed.stale && events.length === 0 && <p className="px-3 py-6 text-center text-xs text-neutral-500">No hay eventos que coincidan.</p>}
                {!feed && !error && <p className="px-3 py-6 text-center text-xs text-neutral-500">Cargando…</p>}
                {events.map((e) => (
                    <div key={e.id} className="flex flex-wrap gap-x-2 px-3 py-0.5 font-mono text-[12px] hover:bg-white/5">
                        <span className="shrink-0 text-neutral-500">{new Date(e.ts).toLocaleTimeString('es-ES')}</span>
                        <span className={`w-11 shrink-0 font-bold ${LEVEL_STYLE[e.level]}`}>{e.level}</span>
                        {showServer && e.server && <span className="shrink-0 rounded bg-cyan-500/10 px-1.5 text-cyan-300">{e.server}</span>}
                        <span className="min-w-0 break-words text-neutral-100">
                            {e.message}
                            {e.count > 1 && <span className="text-neutral-500"> ×{e.count}</span>}
                            {e.user && <span className="text-neutral-500"> · usuario {e.user}</span>}
                            {e.detail && e.detail !== e.message && <span className="text-neutral-500"> — {e.detail}</span>}
                        </span>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-900/60 px-3 py-2 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    {feed ? TIER_TEXT[feed.tier] : 'Conectando…'}
                    {feed && feed.tier !== 'owner' && ' Las IPs, rutas y secretos se eliminan antes de llegar al panel.'}
                </span>
                <span>{error ?? (paused ? 'En pausa' : age !== null ? `En vivo · actualizado hace ${age} s` : '')}</span>
            </div>
        </div>
    );
}
