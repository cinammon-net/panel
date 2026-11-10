import { Link } from '@inertiajs/react';
import axios from 'axios';
import { Ban, CheckCircle2, CircleOff, FileCode2, FolderOpen, Gamepad2, Loader2, LogOut, Map as MapIcon, Package, RefreshCw, Search, Signal, Trophy, Users, Wifi } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type Player = { id: number | null; name: string; score: number | null; ping: number | null };
type Online = {
    kind: string;
    supported: boolean;
    actions: string[];
    reachable: boolean;
    online: number;
    max: number;
    players: Player[];
    hostname: string | null;
    gamemode: string | null;
    map: string | null;
    version: string | null;
};
type Mod = { name: string; file: string; path: string; section: string; group: string | null; type: string; size: number | null; enabled: boolean | null;
    icon?: string | null; title?: string | null; author?: string | null; version?: string | null; description?: string | null };
type Mods = { kind: string; config: string | null; known: boolean; items: Mod[]; total: number };
type Tab = 'online' | 'mods';

const GAME: Record<string, { label: string; mods: string }> = {
    mta: { label: 'Multi Theft Auto', mods: 'Resources' },
    samp: { label: 'SA-MP / open.mp', mods: 'Scripts y plugins' },
    cfx: { label: 'FiveM / RedM', mods: 'Resources' },
    altv: { label: 'alt:V', mods: 'Resources' },
    ragemp: { label: 'RAGE Multiplayer', mods: 'Packages' },
    ragecoop: { label: 'RageCOOP', mods: 'Resources' },
    gtac: { label: 'GTA Connected', mods: 'Resources' },
};

const errorMessage = (error: unknown, fallback: string) =>
    axios.isAxiosError(error) ? (error.response?.data?.message as string) || fallback : fallback;

const size = (b: number | null) => (b == null ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Color estable por nombre para el avatar del jugador. */
function hue(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
    return h;
}

function Avatar({ name }: { name: string }) {
    const h = hue(name);
    return (
        <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-black text-white shadow-inner"
            style={{ background: `linear-gradient(135deg, hsl(${h} 70% 45%), hsl(${(h + 60) % 360} 70% 35%))` }}
        >
            {name.replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toUpperCase() || '?'}
        </span>
    );
}

/** Icono propio del resource (icon.png, logo.png...) o uno genérico si no tiene o no carga. */
function ModIcon({ serverId, mod }: { serverId: number; mod: Mod }) {
    const [failed, setFailed] = useState(false);
    if (mod.icon && !failed) {
        return (
            <img
                src={`/servers/${serverId}/gta/mod-icon?path=${encodeURIComponent(mod.icon)}`}
                alt=""
                loading="lazy"
                onError={() => setFailed(true)}
                className="h-8 w-8 shrink-0 rounded-md border border-neutral-800 bg-neutral-900 object-contain"
            />
        );
    }
    return (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-300">
            {mod.type === 'folder' || mod.type === 'zip' ? <Package className="h-4 w-4" /> : <FileCode2 className="h-4 w-4" />}
        </span>
    );
}

function PingBadge({ ping }: { ping: number | null }) {
    if (ping == null) return null;
    const tone = ping < 80 ? 'text-emerald-300' : ping < 160 ? 'text-amber-300' : 'text-red-300';
    return (
        <span className={`flex items-center gap-1 text-[10px] ${tone}`}>
            <Signal className="h-3 w-3" /> {ping} ms
        </span>
    );
}

export const gtaModsTitle = (kind?: string | null) => (kind === 'samp' ? 'Scripts y plugins' : kind === 'ragemp' ? 'Packages' : 'Resources');

/** `view` fija una sola vista (páginas del menú lateral); sin él se muestran las dos pestañas. */
export default function GtaPanel({ serverId, running, view }: { serverId: number; running: boolean; view?: Tab }) {
    const base = `/servers/${serverId}/gta`;
    const [tab, setTab] = useState<Tab>(view ?? 'online');
    const [online, setOnline] = useState<Online | null>(null);
    const [mods, setMods] = useState<Mods | null>(null);
    const [modsLoading, setModsLoading] = useState(false);
    const [modsError, setModsError] = useState('');
    const [query, setQuery] = useState('');
    const [busy, setBusy] = useState<string | null>(null);

    const loadOnline = useCallback(async () => {
        try {
            const { data } = await axios.get<Online>(`${base}/online`);
            setOnline(data);
            if (!data.supported && !view) setTab((t) => (t === 'online' ? 'mods' : t));
        } catch {
            setOnline(null);
        }
    }, [base]);

    const loadMods = useCallback(async () => {
        setModsLoading(true);
        try {
            const { data } = await axios.get<Mods>(`${base}/mods`);
            setMods(data);
            setModsError('');
        } catch (e) {
            setModsError(errorMessage(e, 'No se pudieron leer los mods.'));
        } finally {
            setModsLoading(false);
        }
    }, [base, view]);

    // Conectados: cada 15 s mientras el servidor está encendido (y una vez apagado para saber el juego).
    useEffect(() => {
        void loadOnline();
        if (!running) return;
        const timer = window.setInterval(() => !document.hidden && void loadOnline(), 15000);
        return () => window.clearInterval(timer);
    }, [running, loadOnline]);

    useEffect(() => {
        if (view !== 'online') void loadMods();
    }, [loadMods, view]);

    const act = async (action: 'kick' | 'ban', p: Player) => {
        if (action === 'ban' && !window.confirm(`¿Banear a ${p.name}?`)) return;
        const key = `${action}:${p.id ?? p.name}`;
        setBusy(key);
        try {
            const { data } = await axios.post<{ command: string }>(`${base}/players`, { action, name: p.name, id: p.id });
            toast.success(data.command);
            window.setTimeout(() => void loadOnline(), 1500);
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo ejecutar.'));
        } finally {
            setBusy(null);
        }
    };

    const kind = online?.kind ?? mods?.kind ?? '';
    const game = GAME[kind] ?? { label: 'GTA', mods: 'Mods' };

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        const items = mods?.items ?? [];
        return q ? items.filter((m) => `${m.name} ${m.title ?? ''} ${m.author ?? ''} ${m.description ?? ''} ${m.group ?? ''} ${m.section}`.toLowerCase().includes(q)) : items;
    }, [mods, query]);

    const sections = useMemo(() => {
        const out = new Map<string, Mod[]>();
        filtered.forEach((m) => out.set(m.section, [...(out.get(m.section) ?? []), m]));
        return [...out.entries()];
    }, [filtered]);

    const enabledCount = mods?.items.filter((m) => m.enabled).length ?? 0;

    const tabs: { key: Tab; label: string; icon: typeof Users; count: number | string }[] = [
        { key: 'online', label: 'En línea', icon: Wifi, count: online?.supported ? `${online.online}/${online.max || '?'}` : '-' },
        { key: 'mods', label: game.mods, icon: Package, count: mods?.total ?? 0 },
    ];

    const empty = (text: string) => <li className="rounded-lg border border-dashed border-neutral-800 px-3 py-6 text-center text-xs text-neutral-500 md:col-span-2">{text}</li>;
    const btn = 'flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold transition disabled:opacity-40';

    return (
        <section aria-label="Jugadores y mods" className="space-y-4 rounded-xl border border-cyan-800/80 bg-[#080d16] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyan-300 uppercase">
                        {view === 'mods' ? <Package className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                        {view === 'online' ? 'Jugadores conectados' : view === 'mods' ? game.mods : `Jugadores y ${game.mods.toLowerCase()}`}
                    </h2>
                    {online?.reachable && view !== 'mods' && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                            {online.hostname && <span className="max-w-[60ch] truncate text-neutral-200">{online.hostname}</span>}
                            {online.gamemode && (
                                <span className="flex items-center gap-1">
                                    <Gamepad2 className="h-3 w-3" /> {online.gamemode}
                                </span>
                            )}
                            {online.map && (
                                <span className="flex items-center gap-1">
                                    <MapIcon className="h-3 w-3" /> {online.map}
                                </span>
                            )}
                            {online.version && <span>{online.version}</span>}
                        </p>
                    )}
                </div>
                <button
                    type="button"
                    onClick={() => (tab === 'online' ? void loadOnline() : void loadMods())}
                    title="Recargar"
                    className="rounded-lg border border-neutral-700 p-1.5 text-neutral-400 transition hover:border-cyan-500 hover:text-cyan-300"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${modsLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {!view && (
            <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60 p-1">
                {tabs.map(({ key, label, icon: Icon, count }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap uppercase transition ${
                            tab === key ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40' : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                        <Icon className="h-4 w-4" /> {label}
                        <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px]">{count}</span>
                    </button>
                ))}
            </div>
            )}

            {tab === 'online' && (
                <ul className="grid gap-2 md:grid-cols-2">
                    {online && !online.supported ? (
                        empty(`${game.label} no permite consultar los jugadores desde fuera. Puedes verlos en la consola del juego.`)
                    ) : !running ? (
                        empty('El servidor está apagado.')
                    ) : !online ? (
                        empty('Consultando…')
                    ) : !online.reachable ? (
                        empty('El servidor no responde todavía (puede estar arrancando). En MTA, reinicia el servidor una vez para abrir el puerto de consulta.')
                    ) : online.players.length === 0 ? (
                        empty(online.online > 0 ? `${online.online} conectados (el servidor no envía los nombres).` : 'No hay nadie conectado.')
                    ) : (
                        <>
                            {online.players.map((p) => (
                                <li key={`${p.id ?? ''}:${p.name}`} className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                                    <Avatar name={p.name} />
                                    <span className="min-w-0">
                                        <span className="block truncate font-mono text-sm text-white">
                                            {p.name}
                                            {p.id != null && <span className="ml-1.5 text-[10px] text-neutral-500">#{p.id}</span>}
                                        </span>
                                        <span className="flex items-center gap-3">
                                            <PingBadge ping={p.ping} />
                                            {p.score != null && (
                                                <span className="flex items-center gap-1 text-[10px] text-amber-300">
                                                    <Trophy className="h-3 w-3" /> {p.score}
                                                </span>
                                            )}
                                        </span>
                                    </span>
                                    {online.actions.length > 0 && (
                                        <span className="ml-auto flex shrink-0 gap-1">
                                            {online.actions.includes('kick') && (
                                                <button type="button" disabled={busy !== null} onClick={() => void act('kick', p)} className={`${btn} border-neutral-600 text-neutral-200 hover:bg-white/5`}>
                                                    {busy === `kick:${p.id ?? p.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />} Expulsar
                                                </button>
                                            )}
                                            {online.actions.includes('ban') && (
                                                <button type="button" disabled={busy !== null} onClick={() => void act('ban', p)} className={`${btn} border-red-500/40 text-red-300 hover:bg-red-500/10`}>
                                                    {busy === `ban:${p.id ?? p.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />} Banear
                                                </button>
                                            )}
                                        </span>
                                    )}
                                </li>
                            ))}
                            {online.online > online.players.length && (
                                <li className="flex items-center justify-center rounded-lg border border-dashed border-neutral-800 px-3 py-2 text-xs text-neutral-500">
                                    y {online.online - online.players.length} más
                                </li>
                            )}
                        </>
                    )}
                </ul>
            )}

            {tab === 'mods' && (
                <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <label className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={`Buscar ${game.mods.toLowerCase()}…`}
                                className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 py-2 pr-3 pl-9 text-sm text-white placeholder:text-neutral-500 focus:border-cyan-500 focus:outline-none"
                            />
                        </label>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                            {mods?.known && (
                                <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-300">{enabledCount} activados</span>
                            )}
                            <Link href={`/servers/${serverId}/files`} className="flex items-center gap-1 rounded-md border border-neutral-700 px-2 py-1 transition hover:border-cyan-500 hover:text-cyan-300">
                                <FolderOpen className="h-3.5 w-3.5" /> Archivos
                            </Link>
                        </div>
                    </div>
                    {mods?.known && mods.config && (
                        <p className="text-[11px] text-neutral-500">
                            Activados = los que arrancan con el servidor según <span className="font-mono text-neutral-300">{mods.config}</span>.
                        </p>
                    )}

                    {modsError && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{modsError}</p>}

                    {modsLoading && !mods ? (
                        <div className="grid gap-2 md:grid-cols-2">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="h-12 animate-pulse rounded-lg border border-neutral-800 bg-neutral-900/60" />
                            ))}
                        </div>
                    ) : mods && filtered.length === 0 ? (
                        <ul className="grid">{empty(query ? 'Nada coincide con la búsqueda.' : `No hay ${game.mods.toLowerCase()} instalados.`)}</ul>
                    ) : (
                        sections.map(([section, items]) => (
                            <div key={section} className="space-y-2">
                                {sections.length > 1 && <h3 className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">{section}</h3>}
                                <ul className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                                    {items.map((m) => (
                                        <li key={m.path} className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2">
                                            <ModIcon serverId={serverId} mod={m} />
                                            <span className="min-w-0" title={m.description ?? undefined}>
                                                <span className="block truncate text-sm text-white">
                                                    <span className="font-mono">{m.title && m.title.toLowerCase() !== m.name.toLowerCase() ? m.title : m.name}</span>
                                                    {m.version && <span className="ml-1.5 text-[10px] text-neutral-500">v{m.version.replace(/^v/i, '')}</span>}
                                                </span>
                                                {m.description && <span className="block truncate text-[11px] text-neutral-400">{m.description}</span>}
                                                <span className="block truncate text-[10px] text-neutral-500">
                                                    {[m.title && m.title.toLowerCase() !== m.name.toLowerCase() ? m.name : null, m.author ? `por ${m.author}` : null, m.group, m.type === 'folder' ? null : `.${m.type}`, size(m.size)]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </span>
                                            </span>
                                            {m.enabled !== null && (
                                                <span
                                                    className={`ml-auto flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                                                        m.enabled ? 'bg-emerald-500/10 text-emerald-300' : 'bg-neutral-800 text-neutral-500'
                                                    }`}
                                                >
                                                    {m.enabled ? <CheckCircle2 className="h-3 w-3" /> : <CircleOff className="h-3 w-3" />}
                                                    {m.enabled ? 'Activo' : 'Inactivo'}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))
                    )}
                    {mods && mods.total > mods.items.length && <p className="text-center text-[11px] text-neutral-500">Mostrando {mods.items.length} de {mods.total}.</p>}
                </div>
            )}
        </section>
    );
}
