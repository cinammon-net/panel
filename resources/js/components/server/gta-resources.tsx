import { Link } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, Download, FolderOpen, Loader2, Power, Puzzle, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type Mod = {
    name: string;
    file: string;
    path: string;
    section: string;
    group: string | null;
    type: string;
    size: number | null;
    modified: string | null;
    enabled: boolean | null;
    toggleable?: boolean;
    icon?: string | null;
    title?: string | null;
    author?: string | null;
    version?: string | null;
    description?: string | null;
};
type Mods = { kind: string; config: string | null; known: boolean; items: Mod[]; total: number };

const AVATAR_COLORS = ['from-pink-500 to-fuchsia-600', 'from-cyan-500 to-blue-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-violet-500 to-purple-600', 'from-rose-500 to-red-600'];
const colorFor = (name: string) => AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const formatSize = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const errorMessage = (error: unknown, fallback: string) =>
    axios.isAxiosError(error) ? (error.response?.data?.message as string) || fallback : fallback;

const UPLOAD: Record<string, { accept: string; noun: string; hint: string }> = {
    mta: { accept: '.zip', noun: 'resource', hint: 'Sube el resource en .zip; MTA lo carga tal cual.' },
    cfx: { accept: '.zip', noun: 'resource', hint: 'Sube el resource en .zip; se descomprime en resources/.' },
    altv: { accept: '.zip', noun: 'resource', hint: 'Sube el resource en .zip; se descomprime en resources/.' },
    gtac: { accept: '.zip', noun: 'resource', hint: 'Sube el resource en .zip; se descomprime en resources/.' },
    ragemp: { accept: '.zip', noun: 'package', hint: 'Sube el package en .zip; se descomprime en packages/.' },
    samp: { accept: '.amx,.so,.dll', noun: 'script o plugin', hint: 'Los .amx van a filterscripts/ y los .so / .dll a plugins/.' },
};

function ModIcon({ serverId, mod }: { serverId: number; mod: Mod }) {
    const [failed, setFailed] = useState(false);
    const label = mod.title || mod.name;
    const off = mod.enabled === false;
    if (mod.icon && !failed) {
        return (
            <img
                src={`/servers/${serverId}/gta/mod-icon?path=${encodeURIComponent(mod.icon)}`}
                alt=""
                loading="lazy"
                onError={() => setFailed(true)}
                className={`h-11 w-11 shrink-0 rounded-xl border border-neutral-800 bg-black object-contain p-0.5 ${off ? 'opacity-50 grayscale' : ''}`}
            />
        );
    }
    return (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-black text-white ${off ? 'from-neutral-700 to-neutral-800' : colorFor(label)}`}>
            {label.replace(/[^\p{L}\p{N}]/gu, '').charAt(0).toUpperCase() || '?'}
        </div>
    );
}

/** Resources / scripts / packages de un servidor de GTA, con el mismo diseño que Plugins de Minecraft. */
export default function GtaResources({ server, title, header }: { server: { id: number; kind: string }; title: string; header: (actions: ReactNode) => ReactNode }) {
    const base = `/servers/${server.id}/gta`;
    const [mods, setMods] = useState<Mods | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [section, setSection] = useState<string | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [uploading, setUploading] = useState<string | null>(null);
    const [needsRestart, setNeedsRestart] = useState(false);
    const uploadRef = useRef<HTMLInputElement>(null);
    const upload = UPLOAD[server.kind] ?? UPLOAD.mta;

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.get<Mods>(`${base}/mods`);
            setMods(data);
        } catch (e) {
            setError(errorMessage(e, 'No se pudo conectar con el nodo.'));
        } finally {
            setLoading(false);
        }
    }, [base]);

    useEffect(() => {
        void load();
    }, [load]);

    const items = mods?.items ?? [];
    const sections = useMemo(() => [...new Set(items.map((m) => m.section))], [items]);
    const current = section && sections.includes(section) ? section : sections.length > 1 ? sections[0] : null;
    const list = current ? items.filter((m) => m.section === current) : items;
    const enabledCount = list.filter((m) => m.enabled).length;
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return list.filter(
            (m) =>
                (filter === 'all' || (filter === 'enabled' ? m.enabled === true : m.enabled === false)) &&
                (!q || [m.name, m.title ?? '', m.author ?? '', m.description ?? '', m.group ?? ''].some((v) => v.toLowerCase().includes(q))),
        );
    }, [list, query, filter]);

    const patch = (path: string, next: Partial<Mod> | null) =>
        setMods((prev) =>
            prev ? { ...prev, items: next === null ? prev.items.filter((m) => m.path !== path) : prev.items.map((m) => (m.path === path ? { ...m, ...next } : m)) } : prev,
        );

    const toggle = async (m: Mod) => {
        setBusy(m.path);
        try {
            const { data } = await axios.post<{ enabled: boolean; live: boolean }>(`${base}/mods/toggle`, { path: m.path, section: m.section, enabled: !m.enabled });
            patch(m.path, { enabled: data.enabled });
            if (!data.live) setNeedsRestart(true);
            toast.success(`${m.title || m.name} ${data.enabled ? 'activado' : 'desactivado'}${data.live ? ' (ya aplicado)' : ''}.`);
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo cambiar el estado.'));
        } finally {
            setBusy(null);
        }
    };

    const remove = async (m: Mod) => {
        if (!window.confirm(`¿Borrar ${m.file}? No se puede deshacer.`)) return;
        setBusy(m.path);
        try {
            await axios.post(`${base}/mods/delete`, { path: m.path });
            patch(m.path, null);
            setNeedsRestart(true);
            toast.success(`${m.file} eliminado.`);
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo borrar.'));
        } finally {
            setBusy(null);
        }
    };

    const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        let ok = 0;
        for (const file of files) {
            try {
                const form = new FormData();
                form.append('upload', file);
                await axios.post(`${base}/mods/upload`, form, {
                    onUploadProgress: (e) => setUploading(`${file.name} · ${e.total ? Math.round((e.loaded * 100) / e.total) : 0}%`),
                });
                ok++;
            } catch (e) {
                toast.error(`${file.name}: ${errorMessage(e, 'no se pudo subir.')}`);
            }
        }
        setUploading(null);
        if (ok) {
            toast.success(ok === 1 ? 'Archivo subido. Actívalo para que arranque con el servidor.' : `${ok} archivos subidos.`);
            setNeedsRestart(true);
            await load();
        }
    };

    const actions = (
        <div className="flex w-full items-center gap-2 sm:w-auto">
            <input ref={uploadRef} type="file" accept={upload.accept} multiple hidden onChange={onUpload} />
            <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                title="Recargar"
                className="rounded-lg border border-neutral-300 bg-neutral-100 p-2 text-neutral-700 transition hover:border-cyan-500 hover:text-cyan-400 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
            >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                disabled={!!uploading}
                title={upload.hint}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold tracking-wider text-black uppercase shadow-[0_0_15px_rgba(34,211,238,0.35)] transition hover:bg-cyan-400 disabled:opacity-60 sm:flex-none"
            >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{uploading ?? `Subir ${upload.noun}`}</span>
            </button>
        </div>
    );

    return (
        <>
            {header(actions)}

            {needsRestart && (
                <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" /> Reinicia el servidor para que se apliquen los cambios.
                    </span>
                    <Link href={`/servers/${server.id}/console`} className="text-xs font-bold text-amber-300 underline-offset-2 hover:underline">
                        Ir a la consola →
                    </Link>
                </div>
            )}

            {error && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <span>{error}</span>
                    <button type="button" onClick={() => void load()} className="text-xs font-bold underline">
                        Reintentar
                    </button>
                </div>
            )}

            {loading && !mods ? (
                <div className="grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-28 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/60" />
                    ))}
                </div>
            ) : mods ? (
                <>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        {sections.length > 1 ? (
                            <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60 p-1">
                                {sections.map((s) => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setSection(s)}
                                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-wider whitespace-nowrap uppercase transition ${
                                            current === s ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40' : 'text-neutral-400 hover:text-white'
                                        }`}
                                    >
                                        {s}
                                        <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px]">{items.filter((m) => m.section === s).length}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-neutral-400">
                                <span className="font-bold text-white">{list.length}</span> {title.toLowerCase()} instalados
                            </p>
                        )}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <label className="relative flex-1 sm:w-72">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={`Buscar ${upload.noun}…`}
                                    className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 py-2 pr-3 pl-9 text-sm text-white placeholder:text-neutral-500 focus:border-cyan-500 focus:outline-none"
                                />
                            </label>
                            {mods.known && (
                                <div className="flex gap-1 rounded-lg border border-neutral-800 bg-neutral-900/60 p-1 text-[11px] font-semibold">
                                    {(
                                        [
                                            ['all', `Todos ${list.length}`],
                                            ['enabled', `Activos ${enabledCount}`],
                                            ['disabled', `Desactivados ${list.length - enabledCount}`],
                                        ] as const
                                    ).map(([key, label]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setFilter(key)}
                                            className={`rounded-md px-2.5 py-1.5 whitespace-nowrap transition ${filter === key ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {visible.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-sm text-neutral-400">
                            {list.length === 0 ? (
                                <div className="space-y-4">
                                    <Puzzle className="mx-auto h-9 w-9 text-cyan-500/60" />
                                    <p>Todavía no hay ningún {upload.noun} instalado.</p>
                                    <button
                                        type="button"
                                        onClick={() => uploadRef.current?.click()}
                                        className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20"
                                    >
                                        <Upload className="h-4 w-4" /> Subir {upload.noun}
                                    </button>
                                </div>
                            ) : (
                                'Nada coincide con la búsqueda.'
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {visible.map((m) => {
                                const label = m.title && m.title.toLowerCase() !== m.name.toLowerCase() ? m.title : m.name;
                                const off = m.enabled === false;
                                return (
                                    <div
                                        key={m.path}
                                        className={`group flex gap-4 rounded-xl border p-4 transition ${
                                            off ? 'border-neutral-800/70 bg-neutral-950/60 opacity-70 hover:opacity-100' : 'border-neutral-800 bg-neutral-900/60 hover:border-cyan-500/40'
                                        }`}
                                    >
                                        <ModIcon serverId={server.id} mod={m} />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="truncate font-bold text-white">{label}</span>
                                                {m.version && (
                                                    <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">v{m.version.replace(/^v/i, '')}</span>
                                                )}
                                                {m.group && <span className="rounded-md border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-400">{m.group}</span>}
                                                {off && <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">DESACTIVADO</span>}
                                            </div>
                                            {m.description && <p className="mt-1 line-clamp-2 font-sans text-xs text-neutral-400">{m.description}</p>}
                                            <p className="mt-1.5 truncate font-mono text-[10px] text-neutral-500">
                                                {m.author && <span className="text-neutral-400">por {m.author} · </span>}
                                                {m.file}
                                                {m.size != null && ` · ${formatSize(m.size)}`}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                                            {m.toggleable ? (
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={!!m.enabled}
                                                    aria-label={m.enabled ? `Desactivar ${label}` : `Activar ${label}`}
                                                    title={m.enabled ? 'Desactivar' : 'Activar'}
                                                    disabled={busy === m.path}
                                                    onClick={() => void toggle(m)}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition disabled:opacity-50 ${
                                                        m.enabled ? 'border-emerald-400/60 bg-emerald-500/30' : 'border-neutral-700 bg-neutral-800'
                                                    }`}
                                                >
                                                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full transition ${m.enabled ? 'translate-x-6 bg-emerald-300' : 'translate-x-1 bg-neutral-500'}`}>
                                                        {busy === m.path ? <Loader2 className="h-3 w-3 animate-spin text-black" /> : <Power className="h-2.5 w-2.5 text-black" />}
                                                    </span>
                                                </button>
                                            ) : (
                                                m.enabled && <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">ACTIVO</span>
                                            )}
                                            <div className="flex items-center gap-1 text-neutral-500">
                                                {m.type !== 'folder' && (
                                                    <a href={`/servers/${server.id}/files/download?file=${encodeURIComponent(m.path)}`} title="Descargar" className="rounded-md p-1.5 hover:bg-white/5 hover:text-cyan-300">
                                                        <Download className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                                <button type="button" title="Borrar" disabled={busy === m.path} onClick={() => void remove(m)} className="rounded-md p-1.5 hover:bg-red-500/10 hover:text-red-400">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500">
                        <FolderOpen className="h-3.5 w-3.5" />
                        {mods.known && mods.config ? (
                            <>
                                Activado = arranca con el servidor ({mods.config}). Los archivos de cada {upload.noun} están en
                            </>
                        ) : (
                            <>Los archivos de cada {upload.noun} están en</>
                        )}
                        <Link href={`/servers/${server.id}/files`} className="text-cyan-400 hover:underline">
                            Archivos
                        </Link>
                    </p>
                </>
            ) : null}
        </>
    );
}
