import ServerLayout from '@/layouts/server-layout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Ban, ChevronDown, Clock, Crown, Footprints, Loader2, LogOut, Pickaxe, RefreshCw, Search, ShieldCheck, Skull, Swords, Trophy, UserCheck, UsersRound } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type Stats = {
    play_ticks?: number;
    deaths?: number;
    mob_kills?: number;
    player_kills?: number;
    sessions?: number;
    jumps?: number;
    distance_m?: number;
    mined?: number;
    placed?: number;
    advancements?: number | null;
};
type Player = {
    uuid: string;
    name: string;
    last_seen: string | null;
    op: boolean;
    op_level: number | null;
    whitelisted: boolean;
    banned: boolean;
    ban_reason: string | null;
    online: boolean;
    stats: Stats | null;
};
type Filter = 'all' | 'online' | 'op' | 'whitelist' | 'banned';
type Sort = 'recent' | 'playtime' | 'name' | 'deaths' | 'kills';

const errorMessage = (error: unknown, fallback: string) =>
    axios.isAxiosError(error) ? (error.response?.data?.message as string) || fallback : fallback;

const playtime = (ticks = 0) => {
    const minutes = Math.floor(ticks / 20 / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return hours < 48 ? `${hours} h ${minutes % 60} min` : `${Math.floor(hours / 24)} d ${hours % 24} h`;
};
const number = (n = 0) => n.toLocaleString('es-ES');
const distance = (m = 0) => (m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`);
const ago = (iso: string | null) => {
    if (!iso) return 'desconocido';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 90) return 'hace un momento';
    if (diff < 3600) return `hace ${Math.round(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.round(diff / 3600)} h`;
    if (diff < 86400 * 30) return `hace ${Math.round(diff / 86400)} días`;
    return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
};

function Avatar({ player, size = 40 }: { player: Player; size?: number }) {
    const [failed, setFailed] = useState(false);
    return failed ? (
        <span className="flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 font-black text-white" style={{ width: size, height: size }}>
            {player.name.charAt(0).toUpperCase()}
        </span>
    ) : (
        <img
            src={`https://mc-heads.net/avatar/${player.uuid}/${size * 2}`}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="shrink-0 rounded-lg bg-neutral-800 [image-rendering:pixelated]"
            style={{ width: size, height: size }}
        />
    );
}

export default function People({ server }: { server: { id: number; name: string; owner_id?: number; egg?: string | null } }) {
    const [players, setPlayers] = useState<Player[]>([]);
    const [online, setOnline] = useState<{ online: number; max: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<Filter>('all');
    const [sort, setSort] = useState<Sort>('recent');
    const [open, setOpen] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`/servers/${server.id}/players/roster`);
            setPlayers(data.players);
            setOnline(data.online);
            setError('');
        } catch (e) {
            setError(errorMessage(e, 'No se pudo leer la lista de jugadores.'));
        } finally {
            setLoading(false);
        }
    }, [server.id]);

    useEffect(() => {
        void load();
        const timer = window.setInterval(() => !document.hidden && void load(), 30000);
        return () => window.clearInterval(timer);
    }, [load]);

    const act = async (action: string, player: Player, reason = '') => {
        setBusy(`${action}:${player.uuid}`);
        try {
            const { data } = await axios.post(`/servers/${server.id}/players`, { action, target: player.name, reason });
            toast.success(`/${data.command}`);
            window.setTimeout(() => void load(), 2500);
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo ejecutar.'));
        } finally {
            setBusy(null);
        }
    };

    const counts = useMemo(
        () => ({
            all: players.length,
            online: players.filter((p) => p.online).length,
            op: players.filter((p) => p.op).length,
            whitelist: players.filter((p) => p.whitelisted).length,
            banned: players.filter((p) => p.banned).length,
        }),
        [players],
    );

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const list = players.filter(
            (p) =>
                (!q || p.name.toLowerCase().includes(q) || p.uuid.startsWith(q)) &&
                (filter === 'all' || (filter === 'online' ? p.online : filter === 'op' ? p.op : filter === 'whitelist' ? p.whitelisted : p.banned)),
        );
        const by: Record<Sort, (a: Player, b: Player) => number> = {
            recent: (a, b) => Number(b.online) - Number(a.online) || (b.last_seen ?? '').localeCompare(a.last_seen ?? ''),
            playtime: (a, b) => (b.stats?.play_ticks ?? 0) - (a.stats?.play_ticks ?? 0),
            name: (a, b) => a.name.localeCompare(b.name),
            deaths: (a, b) => (b.stats?.deaths ?? 0) - (a.stats?.deaths ?? 0),
            kills: (a, b) => (b.stats?.mob_kills ?? 0) + (b.stats?.player_kills ?? 0) - ((a.stats?.mob_kills ?? 0) + (a.stats?.player_kills ?? 0)),
        };
        return [...list].sort(by[sort]);
    }, [players, query, filter, sort]);

    const totalPlay = players.reduce((n, p) => n + (p.stats?.play_ticks ?? 0), 0);
    const btn = 'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40';

    return (
        <ServerLayout server={server} section="people">
            <Head title={`${server.name} · Jugadores - Cinammon`} />

            <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center dark:border-cyan-900/60">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <UsersRound className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase sm:text-2xl dark:text-white">Jugadores</h1>
                            <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">Todas las personas que han entrado al servidor, con sus estadísticas.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="flex items-center gap-2 rounded-lg border border-neutral-700 px-3 py-2 text-xs text-neutral-300 transition hover:border-cyan-500 hover:text-cyan-300"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                </div>

                {/* Resumen */}
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                        { label: 'Conectados ahora', value: online ? `${online.online}/${online.max}` : '—', icon: UsersRound, color: 'text-emerald-400' },
                        { label: 'Jugadores únicos', value: number(players.length), icon: UserCheck, color: 'text-cyan-400' },
                        { label: 'Tiempo jugado total', value: playtime(totalPlay), icon: Clock, color: 'text-purple-400' },
                        { label: 'Baneados', value: number(counts.banned), icon: Ban, color: 'text-red-400' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                                <Icon className={`h-3.5 w-3.5 ${color}`} /> {label}
                            </p>
                            <p className="mt-1 text-xl font-bold text-white">{value}</p>
                        </div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60 p-1">
                        {(
                            [
                                ['all', 'Todos'],
                                ['online', 'Conectados'],
                                ['op', 'OP'],
                                ['whitelist', 'Whitelist'],
                                ['banned', 'Baneados'],
                            ] as const
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setFilter(key)}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                                    filter === key ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40' : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                {label} <span className="rounded bg-black/40 px-1.5 text-[10px]">{counts[key]}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <label className="relative flex-1 lg:w-64">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar jugador…"
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 py-2 pr-3 pl-9 text-sm text-white placeholder:text-neutral-500 focus:border-cyan-500 focus:outline-none"
                            />
                        </label>
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value as Sort)}
                            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                            aria-label="Ordenar"
                        >
                            <option value="recent">Última conexión</option>
                            <option value="playtime">Tiempo jugado</option>
                            <option value="kills">Más kills</option>
                            <option value="deaths">Más muertes</option>
                            <option value="name">Nombre</option>
                        </select>
                    </div>
                </div>

                {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

                {loading && !players.length ? (
                    <div className="space-y-2">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-16 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/60" />
                        ))}
                    </div>
                ) : visible.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-sm text-neutral-400">
                        {players.length === 0 ? 'Todavía no ha entrado nadie al servidor.' : 'Ningún jugador coincide con el filtro.'}
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {visible.map((p) => {
                            const expanded = open === p.uuid;
                            const s = p.stats;
                            return (
                                <li key={p.uuid} className={`overflow-hidden rounded-xl border transition ${expanded ? 'border-cyan-500/50 bg-neutral-900/80' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'}`}>
                                    <button type="button" onClick={() => setOpen(expanded ? null : p.uuid)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                                        <span className="relative">
                                            <Avatar player={p} />
                                            {p.online && <span className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-2 border-neutral-900 bg-emerald-400" title="Conectado" />}
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-1.5">
                                                <span className="truncate font-mono font-bold text-white">{p.name}</span>
                                                {p.online && <span className="rounded border border-emerald-500/40 bg-emerald-500/10 px-1.5 text-[10px] font-bold text-emerald-300">EN LÍNEA</span>}
                                                {p.op && <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 text-[10px] font-bold text-amber-300">OP</span>}
                                                {p.whitelisted && <span className="rounded border border-cyan-500/40 bg-cyan-500/10 px-1.5 text-[10px] font-bold text-cyan-300">WHITELIST</span>}
                                                {p.banned && <span className="rounded border border-red-500/40 bg-red-500/10 px-1.5 text-[10px] font-bold text-red-300">BANEADO</span>}
                                            </span>
                                            <span className="block text-[11px] text-neutral-500">{p.online ? 'Jugando ahora' : `Última vez ${ago(p.last_seen)}`}</span>
                                        </span>
                                        <span className="hidden items-center gap-5 text-xs text-neutral-400 sm:flex">
                                            <span title="Tiempo jugado" className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5 text-purple-400" /> {s ? playtime(s.play_ticks) : '—'}
                                            </span>
                                            <span title="Muertes" className="flex w-14 items-center gap-1">
                                                <Skull className="h-3.5 w-3.5 text-red-400" /> {s ? number(s.deaths) : '—'}
                                            </span>
                                            <span title="Mobs matados" className="flex w-16 items-center gap-1">
                                                <Swords className="h-3.5 w-3.5 text-amber-400" /> {s ? number(s.mob_kills) : '—'}
                                            </span>
                                        </span>
                                        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                    </button>

                                    {expanded && (
                                        <div className="space-y-4 border-t border-neutral-800 px-4 py-4">
                                            {s ? (
                                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                                                    {[
                                                        { label: 'Tiempo jugado', value: playtime(s.play_ticks), icon: Clock },
                                                        { label: 'Sesiones', value: number(s.sessions), icon: UsersRound },
                                                        { label: 'Muertes', value: number(s.deaths), icon: Skull },
                                                        { label: 'Mobs matados', value: number(s.mob_kills), icon: Swords },
                                                        { label: 'Jugadores matados', value: number(s.player_kills), icon: Swords },
                                                        { label: 'Bloques minados', value: number(s.mined), icon: Pickaxe },
                                                        { label: 'Objetos usados', value: number(s.placed), icon: Pickaxe },
                                                        { label: 'Distancia', value: distance(s.distance_m), icon: Footprints },
                                                        { label: 'Saltos', value: number(s.jumps), icon: Footprints },
                                                        { label: 'Logros', value: s.advancements === null || s.advancements === undefined ? '—' : number(s.advancements), icon: Trophy },
                                                    ].map(({ label, value, icon: Icon }) => (
                                                        <div key={label} className="rounded-lg border border-neutral-800 bg-black/30 px-3 py-2">
                                                            <p className="flex items-center gap-1 text-[10px] tracking-wider text-neutral-500 uppercase">
                                                                <Icon className="h-3 w-3" /> {label}
                                                            </p>
                                                            <p className="font-mono text-sm font-bold text-white">{value}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-neutral-500">Sin estadísticas guardadas todavía (se guardan al salir del servidor).</p>
                                            )}
                                            {p.banned && p.ban_reason && <p className="text-xs text-red-300">Motivo del baneo: {p.ban_reason}</p>}
                                            <p className="font-mono text-[10px] text-neutral-600">UUID {p.uuid}</p>
                                            <div className="flex flex-wrap gap-2">
                                                <button type="button" disabled={busy !== null} onClick={() => void act(p.op ? 'deop' : 'op', p)} className={`${btn} border-amber-500/40 text-amber-300 hover:bg-amber-500/10`}>
                                                    {busy === `${p.op ? 'deop' : 'op'}:${p.uuid}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />} {p.op ? 'Quitar OP' : 'Dar OP'}
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={busy !== null}
                                                    onClick={() => void act(p.whitelisted ? 'whitelist_remove' : 'whitelist_add', p)}
                                                    className={`${btn} border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10`}
                                                >
                                                    <ShieldCheck className="h-3.5 w-3.5" /> {p.whitelisted ? 'Quitar de whitelist' : 'Añadir a whitelist'}
                                                </button>
                                                {p.online && (
                                                    <button type="button" disabled={busy !== null} onClick={() => void act('kick', p)} className={`${btn} border-neutral-600 text-neutral-200 hover:bg-white/5`}>
                                                        <LogOut className="h-3.5 w-3.5" /> Expulsar
                                                    </button>
                                                )}
                                                {p.banned ? (
                                                    <button type="button" disabled={busy !== null} onClick={() => void act('pardon', p)} className={`${btn} border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10`}>
                                                        <Ban className="h-3.5 w-3.5" /> Desbanear
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        disabled={busy !== null}
                                                        onClick={() => {
                                                            const reason = window.prompt(`Motivo del baneo de ${p.name} (opcional):`, '');
                                                            if (reason !== null) void act('ban', p, reason);
                                                        }}
                                                        className={`${btn} border-red-500/40 text-red-300 hover:bg-red-500/10`}
                                                    >
                                                        <Ban className="h-3.5 w-3.5" /> Banear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
                <p className="text-[11px] text-neutral-600">Las estadísticas las guarda Minecraft al salir o cada pocos minutos; los cambios de OP, whitelist y baneos requieren el servidor encendido.</p>
            </div>
        </ServerLayout>
    );
}
