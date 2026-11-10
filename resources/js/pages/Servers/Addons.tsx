import ServerLayout from '@/layouts/server-layout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, ArrowUpCircle, Check, Compass, Download, ExternalLink, FolderOpen, Loader2, Package, Power, Puzzle, RefreshCw, Search, Trash2, Upload } from 'lucide-react';
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type Folder = 'plugins' | 'mods';

type Addon = {
    file: string;
    folder: Folder;
    enabled: boolean;
    size: number;
    modified: string | null;
    name: string;
    version: string | null;
    description: string | null;
    authors: string[];
    website: string | null;
    icon?: string | null;
    modrinth_url?: string | null;
    loader: string | null;
    meta_loaded: boolean;
};

type Folders = Partial<Record<Folder, Addon[] | null>>;
type Kind = 'plugins' | 'mods' | 'both' | 'none' | 'auto';

const FOLDER_LABEL: Record<Folder, string> = { plugins: 'Plugins', mods: 'Mods' };
const AVATAR_COLORS = ['from-pink-500 to-fuchsia-600', 'from-cyan-500 to-blue-600', 'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-violet-500 to-purple-600', 'from-rose-500 to-red-600'];

const formatSize = (bytes: number) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '');
const colorFor = (name: string) => AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const errorMessage = (error: unknown, fallback: string) =>
    axios.isAxiosError(error) ? (error.response?.data?.message as string) || fallback : fallback;

type Hit = { id: string; slug: string | null; title: string; description: string; author: string | null; downloads: number; icon: string | null; categories: string[] };

const formatCount = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)} M` : n >= 1e3 ? `${Math.round(n / 1e3)} K` : String(n));

/** Catálogo de Modrinth filtrado por el tipo y la versión del servidor. */
function Explore({ base, folder, installedNames, onInstalled }: { base: string; folder: Folder; installedNames: string[]; onInstalled: () => void }) {
    const [query, setQuery] = useState('');
    const [debounced, setDebounced] = useState('');
    const [hits, setHits] = useState<Hit[]>([]);
    const [total, setTotal] = useState(0);
    const [info, setInfo] = useState<{ supported: boolean; loaders?: string[]; version?: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [installing, setInstalling] = useState<string | null>(null);
    const [done, setDone] = useState<string[]>([]);
    const noun = folder === 'mods' ? 'mod' : 'plugin';

    useEffect(() => {
        const t = window.setTimeout(() => setDebounced(query.trim()), 350);
        return () => window.clearTimeout(t);
    }, [query]);

    const fetchPage = useCallback(
        async (offset: number) => {
            setLoading(true);
            setError('');
            try {
                const { data } = await axios.get(`${base}/browse`, { params: { q: debounced, offset, folder } });
                setInfo({ supported: data.supported, loaders: data.loaders, version: data.version });
                setTotal(data.total ?? 0);
                setHits((prev) => (offset === 0 ? data.hits : [...prev, ...data.hits]));
            } catch (e) {
                setError(errorMessage(e, 'No se pudo cargar el catálogo.'));
            } finally {
                setLoading(false);
            }
        },
        [base, debounced, folder],
    );

    useEffect(() => {
        void fetchPage(0);
    }, [fetchPage]);

    const install = async (hit: Hit) => {
        setInstalling(hit.id);
        try {
            const { data } = await axios.post(`${base}/install`, { project: hit.id, folder });
            setDone((d) => [...d, hit.id]);
            toast.success(`${hit.title} ${data.version ? `v${data.version} ` : ''}instalado.`);
            if (data.requires?.length) toast.info(`${hit.title} necesita otras dependencias; búscalas en Explorar.`);
            onInstalled();
        } catch (e) {
            toast.error(errorMessage(e, `No se pudo instalar ${hit.title}.`));
        } finally {
            setInstalling(null);
        }
    };

    const isInstalled = (hit: Hit) =>
        done.includes(hit.id) || installedNames.some((n) => n === hit.title.toLowerCase() || (hit.slug && n.replace(/\s+/g, '-') === hit.slug));

    if (info && !info.supported) {
        return (
            <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-sm text-neutral-400">
                El catálogo no está disponible para este tipo de servidor. Puedes subir el <code className="text-cyan-400">.jar</code> a mano.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="relative sm:w-96">
                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={`Buscar ${noun}s en Modrinth…`}
                        className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 py-2 pr-3 pl-9 text-sm text-white placeholder:text-neutral-500 focus:border-cyan-500 focus:outline-none"
                    />
                </label>
                {info && (
                    <p className="text-xs text-neutral-500">
                        {debounced ? `${formatCount(total)} resultados` : 'Más descargados'} · compatibles con{' '}
                        <span className="text-cyan-400">{info.loaders?.[0] ? info.loaders[0].charAt(0).toUpperCase() + info.loaders[0].slice(1) : ''}</span>
                        {info.version && (
                            <>
                                {' '}
                                <span className="text-cyan-400">{info.version}</span>
                            </>
                        )}
                    </p>
                )}
            </div>

            {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

            {loading && hits.length === 0 ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/60" />
                    ))}
                </div>
            ) : hits.length === 0 ? (
                <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-sm text-neutral-400">No se ha encontrado ningún {noun}.</div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {hits.map((h) => {
                        const installed = isInstalled(h);
                        return (
                            <div key={h.id} className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 transition hover:border-cyan-500/40">
                                <div className="flex gap-3">
                                    {h.icon ? (
                                        <img src={h.icon} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-xl border border-neutral-800 bg-black object-cover" />
                                    ) : (
                                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-black text-white ${colorFor(h.title)}`}>
                                            {h.title.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <p className="truncate font-bold text-white">{h.title}</p>
                                        <p className="truncate text-[11px] text-neutral-500">
                                            {h.author && <>por {h.author} · </>}
                                            <Download className="inline h-3 w-3" /> {formatCount(h.downloads)}
                                        </p>
                                    </div>
                                </div>
                                <p className="mt-3 line-clamp-2 flex-1 font-sans text-xs text-neutral-400">{h.description}</p>
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 flex-wrap gap-1">
                                        {h.categories.slice(0, 2).map((c) => (
                                            <span key={c} className="rounded-md border border-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        {h.slug && (
                                            <a
                                                href={`https://modrinth.com/${noun}/${h.slug}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Ver en Modrinth"
                                                className="rounded-md p-1.5 text-neutral-500 hover:bg-white/5 hover:text-cyan-300"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                            </a>
                                        )}
                                        {installed ? (
                                            <span className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300">
                                                <Check className="h-3.5 w-3.5" /> Instalado
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                disabled={installing !== null}
                                                onClick={() => void install(h)}
                                                className="flex items-center gap-1 rounded-lg bg-cyan-500 px-3 py-1.5 text-[11px] font-bold text-black transition hover:bg-cyan-400 disabled:opacity-50"
                                            >
                                                {installing === h.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Instalar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {hits.length > 0 && hits.length < total && (
                <div className="flex justify-center">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => void fetchPage(hits.length)}
                        className="flex items-center gap-2 rounded-lg border border-neutral-700 px-4 py-2 text-xs font-bold text-neutral-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-50"
                    >
                        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Cargar más
                    </button>
                </div>
            )}
            <p className="text-[11px] text-neutral-600">Catálogo de Modrinth. Se instala la última versión estable compatible con tu servidor.</p>
        </div>
    );
}

export default function Addons({ server, kind }: { server: { id: number; name: string; owner_id?: number; egg?: string | null }; kind: Kind }) {
    const title = kind === 'plugins' ? 'Plugins' : kind === 'mods' ? 'Mods' : 'Plugins y mods';
    const base = `/servers/${server.id}/addons`;
    const [folders, setFolders] = useState<Folders | null>(null);
    const [tab, setTab] = useState<Folder>('plugins');
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState<string | null>(null);
    const [uploading, setUploading] = useState<string | null>(null);
    const [needsRestart, setNeedsRestart] = useState(false);
    const [view, setView] = useState<'installed' | 'explore'>('installed');
    const [updates, setUpdates] = useState<Record<string, string>>({});
    const [updating, setUpdating] = useState<string | null>(null);
    const viewChosen = useRef(false);
    const uploadRef = useRef<HTMLInputElement>(null);
    const uploadFolder = useRef<Folder>('plugins');

    const patch = useCallback((folder: Folder, file: string, next: Partial<Addon> | null) => {
        setFolders((prev) => {
            if (!prev || !prev[folder]) return prev;
            const list = prev[folder]!;
            return { ...prev, [folder]: next === null ? list.filter((a) => a.file !== file) : list.map((a) => (a.file === file ? { ...a, ...next } : a)) };
        });
    }, []);

    // Lee nombre/versión/autores de los .jar que aún no están en caché (3 a la vez).
    const loadMeta = useCallback(
        async (data: Folders) => {
            const pending = (Object.keys(data) as Folder[]).flatMap((f) => (data[f] ?? []).filter((a) => !a.meta_loaded));
            let index = 0;
            const worker = async () => {
                while (index < pending.length) {
                    const addon = pending[index++];
                    try {
                        const { data: meta } = await axios.get<Addon>(`${base}/meta`, { params: { folder: addon.folder, file: addon.file } });
                        patch(addon.folder, addon.file, meta);
                    } catch {
                        patch(addon.folder, addon.file, { meta_loaded: true });
                    }
                }
            };
            await Promise.all([worker(), worker(), worker()]);
            // Con las huellas ya leídas, se pregunta a Modrinth si hay versiones nuevas.
            const found: Record<string, string> = {};
            for (const f of Object.keys(data) as Folder[]) {
                if (!data[f]?.length) continue;
                try {
                    const { data: res } = await axios.get<{ updates: Record<string, { version: string }> }>(`${base}/updates`, { params: { folder: f } });
                    for (const [file, u] of Object.entries(res.updates ?? {})) found[`${f}/${file}`] = u.version;
                } catch {
                    /* sin conexión con Modrinth: no se muestran avisos */
                }
            }
            setUpdates(found);
        },
        [base, patch],
    );

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await axios.get<{ folders: Folders }>(`${base}/list`);
            setFolders(data.folders);
            // Sin nada instalado se abre directamente el catálogo.
            if (!viewChosen.current) {
                viewChosen.current = true;
                const any = Object.values(data.folders).some((l) => (l?.length ?? 0) > 0);
                if (!any) setView('explore');
            }
            setTab((current) => {
                const has = (f: Folder) => data.folders[f] !== null && data.folders[f] !== undefined;
                if (has(current) && data.folders[current]?.length) return current;
                if (data.folders.mods?.length && !data.folders.plugins?.length) return 'mods';
                if (has('plugins')) return 'plugins';
                return has('mods') ? 'mods' : current;
            });
            void loadMeta(data.folders);
        } catch (e) {
            setError(errorMessage(e, 'No se pudo conectar con el nodo.'));
        } finally {
            setLoading(false);
        }
    }, [base, loadMeta]);

    useEffect(() => {
        void load();
    }, [load]);

    const available = (['plugins', 'mods'] as Folder[]).filter((f) => folders?.[f] !== null && folders?.[f] !== undefined);
    const list = folders?.[tab] ?? [];
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return list.filter(
            (a) =>
                (filter === 'all' || (filter === 'enabled' ? a.enabled : !a.enabled)) &&
                (!q || [a.name, a.file, a.description ?? '', a.authors.join(' ')].some((v) => v.toLowerCase().includes(q))),
        );
    }, [list, query, filter]);

    const noun = tab === 'mods' ? 'mod' : 'plugin';

    const updateOne = async (addon: Addon) => {
        setUpdating(addon.file);
        try {
            const { data } = await axios.post<{ file: string; version: string }>(`${base}/update`, { folder: addon.folder, file: addon.file });
            setUpdates((u) => {
                const next = { ...u };
                delete next[`${addon.folder}/${addon.file}`];
                return next;
            });
            setNeedsRestart(true);
            toast.success(`${addon.name} actualizado a v${data.version}.`);
            return true;
        } catch (e) {
            toast.error(errorMessage(e, `No se pudo actualizar ${addon.name}.`));
            return false;
        } finally {
            setUpdating(null);
        }
    };

    const updateAll = async () => {
        const pending = list.filter((a) => updates[`${a.folder}/${a.file}`]);
        for (const addon of pending) await updateOne(addon);
        await load();
    };

    const toggle = async (addon: Addon) => {
        setBusy(addon.file);
        try {
            const { data } = await axios.post<{ file: string; enabled: boolean; live?: boolean }>(`${base}/toggle`, { folder: addon.folder, file: addon.file, name: addon.name });
            patch(addon.folder, addon.file, { file: data.file, enabled: data.enabled });
            if (!data.live) setNeedsRestart(true);
            toast.success(`${addon.name} ${data.enabled ? 'activado' : 'desactivado'}${data.live ? ' al momento, sin reiniciar' : ''}.`);
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo cambiar el estado.'));
        } finally {
            setBusy(null);
        }
    };

    const remove = async (addon: Addon) => {
        if (!window.confirm(`¿Borrar ${addon.file}? No se puede deshacer.`)) return;
        setBusy(addon.file);
        try {
            await axios.post(`${base}/delete`, { folder: addon.folder, file: addon.file });
            patch(addon.folder, addon.file, null);
            setNeedsRestart(true);
            toast.success(`${addon.file} eliminado.`);
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo borrar el archivo.'));
        } finally {
            setBusy(null);
        }
    };

    const [restarting, setRestarting] = useState(false);
    const restartNow = async () => {
        if (!window.confirm('Se reiniciará el servidor y los jugadores conectados saldrán unos segundos. ¿Continuar?')) return;
        setRestarting(true);
        try {
            await axios.post(`/servers/${server.id}/power`, { action: 'restart' });
            setNeedsRestart(false);
            toast.success('Reiniciando el servidor…');
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo reiniciar.'));
        } finally {
            setRestarting(false);
        }
    };

    const pickUpload = (folder: Folder) => {
        uploadFolder.current = folder;
        uploadRef.current?.click();
    };

    const onUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!files.length) return;
        const folder = uploadFolder.current;
        let ok = 0;
        for (const file of files) {
            try {
                const form = new FormData();
                form.append('folder', folder);
                form.append('upload', file);
                await axios.post(`${base}/upload`, form, {
                    onUploadProgress: (e) => setUploading(`${file.name} · ${e.total ? Math.round((e.loaded * 100) / e.total) : 0}%`),
                });
                ok++;
            } catch (e) {
                toast.error(`${file.name}: ${errorMessage(e, 'no se pudo subir.')}`);
            }
        }
        setUploading(null);
        if (ok) {
            toast.success(ok === 1 ? 'Archivo subido.' : `${ok} archivos subidos.`);
            setNeedsRestart(true);
            setTab(folder);
            await load();
        }
    };

    const enabledCount = list.filter((a) => a.enabled).length;
    const updateCount = list.filter((a) => updates[`${a.folder}/${a.file}`]).length;

    return (
        <ServerLayout server={server} section="addons">
            <Head title={`${server.name} · ${title} - Cinammon`} />
            <input ref={uploadRef} type="file" accept=".jar,application/java-archive" multiple hidden onChange={onUpload} />

            <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
                {/* Cabecera */}
                <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center dark:border-cyan-900/60">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Puzzle className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase sm:text-2xl dark:text-white">{title}</h1>
                            <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                                {kind === 'none' ? (
                                    <>Este tipo de servidor no carga plugins ni mods.</>
                                ) : (
                                    <>
                                        {title} instalados en {server.egg ? <span className="text-cyan-400">{server.egg}</span> : 'el servidor'}.
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    {kind !== 'none' && (
                    <div className="flex w-full items-center gap-2 sm:w-auto">
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
                            onClick={() => pickUpload(available.includes(tab) ? tab : available[0] ?? 'plugins')}
                            disabled={!!uploading}
                            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold tracking-wider text-black uppercase shadow-[0_0_15px_rgba(34,211,238,0.35)] transition hover:bg-cyan-400 disabled:opacity-60 sm:flex-none"
                        >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            <span>{uploading ?? `Subir ${available.includes(tab) ? noun : '.jar'}`}</span>
                        </button>
                    </div>
                    )}
                </div>

                {needsRestart && (
                    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                        <span className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" /> Reinicia el servidor para que se apliquen los cambios.
                        </span>
                        <span className="flex items-center gap-3">
                            <button
                                type="button"
                                disabled={restarting}
                                onClick={() => void restartNow()}
                                className="flex items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-amber-300 disabled:opacity-60"
                            >
                                {restarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Reiniciar ahora
                            </button>
                            <Link href={`/servers/${server.id}/console`} className="text-xs font-bold text-amber-300 underline-offset-2 hover:underline">
                                Ir a la consola →
                            </Link>
                        </span>
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

                {kind !== 'none' && folders && available.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex gap-1 rounded-xl border border-neutral-800 bg-neutral-900/60 p-1">
                            {(
                                [
                                    ['installed', `Instalados`, Package],
                                    ['explore', 'Explorar', Compass],
                                ] as const
                            ).map(([key, label, Icon]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => {
                                        viewChosen.current = true;
                                        setView(key);
                                    }}
                                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition ${
                                        view === key ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40' : 'text-neutral-400 hover:text-white'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" /> {label}
                                    {key === 'installed' && <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px]">{available.reduce((n, f) => n + (folders[f]?.length ?? 0), 0)}</span>}
                                </button>
                            ))}
                        </div>
                        {view === 'explore' && available.length > 1 && (
                            <div className="flex gap-1 rounded-xl border border-neutral-800 bg-neutral-900/60 p-1">
                                {available.map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setTab(f)}
                                        className={`rounded-lg px-3 py-2 text-xs font-bold uppercase transition ${tab === f ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`}
                                    >
                                        {FOLDER_LABEL[f]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {kind !== 'none' && view === 'explore' && folders && available.length > 0 ? (
                    <Explore
                        key={tab}
                        base={base}
                        folder={available.includes(tab) ? tab : available[0]}
                        installedNames={(folders[tab] ?? []).map((a) => a.name.toLowerCase())}
                        onInstalled={() => {
                            setNeedsRestart(true);
                            void load();
                        }}
                    />
                ) : kind === 'none' ? (
                    <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-10 text-center">
                        <Puzzle className="mx-auto h-10 w-10 text-neutral-600" />
                        <h2 className="mt-4 text-lg font-bold text-white">{server.egg ?? 'Este servidor'} no admite plugins ni mods</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
                            Para usar plugins cambia el servidor a <b>Paper</b> o <b>Purpur</b>; para mods, a <b>Fabric</b>, <b>Forge</b> o <b>NeoForge</b>.
                        </p>
                    </div>
                ) : loading && !folders ? (
                    <div className="grid gap-3 md:grid-cols-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-28 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/60" />
                        ))}
                    </div>
                ) : folders && available.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-cyan-900/60 bg-neutral-900/40 p-10 text-center">
                        <Puzzle className="mx-auto h-10 w-10 text-cyan-500/70" />
                        <h2 className="mt-4 text-lg font-bold text-white">Este servidor no tiene plugins ni mods</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">
                            Los servidores Paper, Spigot o Purpur usan <b>plugins</b>; Fabric, Forge o NeoForge usan <b>mods</b>. Sube el archivo
                            <code className="mx-1 text-cyan-400">.jar</code>y se creará la carpeta.
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center gap-3">
                            <button type="button" onClick={() => pickUpload('plugins')} className="flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20">
                                <Upload className="h-4 w-4" /> Subir plugin
                            </button>
                            <button type="button" onClick={() => pickUpload('mods')} className="flex items-center gap-2 rounded-lg border border-pink-500/50 bg-pink-500/10 px-4 py-2 text-xs font-bold text-pink-300 hover:bg-pink-500/20">
                                <Upload className="h-4 w-4" /> Subir mod
                            </button>
                        </div>
                    </div>
                ) : folders ? (
                    <>
                        {/* Pestañas, búsqueda y filtro */}
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            {available.length > 1 ? (
                            <div className="flex gap-1 rounded-xl border border-neutral-800 bg-neutral-900/60 p-1">
                                {available.map((f) => (
                                    <button
                                        key={f}
                                        type="button"
                                        onClick={() => setTab(f)}
                                        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold tracking-wider uppercase transition ${
                                            tab === f ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40' : 'text-neutral-400 hover:text-white'
                                        }`}
                                    >
                                        {FOLDER_LABEL[f]}
                                        <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px]">{folders[f]?.length ?? 0}</span>
                                    </button>
                                ))}
                            </div>
                            ) : (
                                <p className="text-sm text-neutral-400">
                                    <span className="font-bold text-white">{list.length}</span> {list.length === 1 ? noun : `${noun}s`} en{' '}
                                    <code className="text-cyan-400">/{tab}</code>
                                </p>
                            )}
                            <div className="flex flex-col gap-2 sm:flex-row">
                                {updateCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => void updateAll()}
                                        disabled={updating !== null}
                                        className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold whitespace-nowrap text-black hover:bg-emerald-400 disabled:opacity-60"
                                    >
                                        {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpCircle className="h-3.5 w-3.5" />} Actualizar todo ({updateCount})
                                    </button>
                                )}
                                <label className="relative flex-1 sm:w-72">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder={`Buscar ${noun}…`}
                                        className="w-full rounded-lg border border-neutral-800 bg-neutral-900/80 py-2 pr-3 pl-9 text-sm text-white placeholder:text-neutral-500 focus:border-cyan-500 focus:outline-none"
                                    />
                                </label>
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
                            </div>
                        </div>

                        {visible.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center text-sm text-neutral-400">
                                {list.length === 0 ? (
                                    <div className="space-y-4">
                                        <Puzzle className="mx-auto h-9 w-9 text-cyan-500/60" />
                                        <p>
                                            Todavía no hay ningún {noun} instalado en <code className="text-cyan-400">/{tab}</code>.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => pickUpload(tab)}
                                            className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20"
                                        >
                                            <Upload className="h-4 w-4" /> Subir {noun}
                                        </button>
                                    </div>
                                ) : (
                                    'Nada coincide con la búsqueda.'
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-3 md:grid-cols-2">
                                {visible.map((a) => (
                                    <div
                                        key={a.file}
                                        className={`group flex gap-4 rounded-xl border p-4 transition ${
                                            a.enabled
                                                ? 'border-neutral-800 bg-neutral-900/60 hover:border-cyan-500/40'
                                                : 'border-neutral-800/70 bg-neutral-950/60 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        {a.icon ? (
                                            <img
                                                src={a.icon}
                                                alt=""
                                                loading="lazy"
                                                className={`h-11 w-11 shrink-0 rounded-xl border border-neutral-800 bg-black object-cover ${a.enabled ? '' : 'opacity-50 grayscale'}`}
                                            />
                                        ) : (
                                            <div
                                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-black text-white ${
                                                    a.enabled ? colorFor(a.name) : 'from-neutral-700 to-neutral-800'
                                                }`}
                                            >
                                                {a.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="truncate font-bold text-white">{a.name}</span>
                                                {a.version && (
                                                    <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">v{a.version.replace(/^v/i, '')}</span>
                                                )}
                                                {a.loader && <span className="rounded-md border border-neutral-700 px-1.5 py-0.5 text-[10px] text-neutral-400">{a.loader}</span>}
                                                {!a.enabled && <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">DESACTIVADO</span>}
                                                {updates[`${a.folder}/${a.file}`] && (
                                                    <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                                        NUEVA v{updates[`${a.folder}/${a.file}`].replace(/^v/i, '')}
                                                    </span>
                                                )}
                                                {!a.meta_loaded && <Loader2 className="h-3 w-3 animate-spin text-neutral-500" aria-label="Leyendo datos" />}
                                            </div>
                                            {a.description && <p className="mt-1 line-clamp-2 font-sans text-xs text-neutral-400">{a.description}</p>}
                                            <p className="mt-1.5 truncate font-mono text-[10px] text-neutral-500">
                                                {a.authors.length > 0 && <span className="text-neutral-400">por {a.authors.join(', ')} · </span>}
                                                {a.file} · {formatSize(a.size)}
                                                {a.modified && ` · ${formatDate(a.modified)}`}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={a.enabled}
                                                aria-label={a.enabled ? `Desactivar ${a.name}` : `Activar ${a.name}`}
                                                title={a.enabled ? 'Desactivar' : 'Activar'}
                                                disabled={busy === a.file}
                                                onClick={() => void toggle(a)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full border transition disabled:opacity-50 ${
                                                    a.enabled ? 'border-emerald-400/60 bg-emerald-500/30' : 'border-neutral-700 bg-neutral-800'
                                                }`}
                                            >
                                                <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full transition ${a.enabled ? 'translate-x-6 bg-emerald-300' : 'translate-x-1 bg-neutral-500'}`}>
                                                    {busy === a.file ? <Loader2 className="h-3 w-3 animate-spin text-black" /> : <Power className="h-2.5 w-2.5 text-black" />}
                                                </span>
                                            </button>
                                            <div className="flex items-center gap-1 text-neutral-500">
                                                {updates[`${a.folder}/${a.file}`] && (
                                                    <button
                                                        type="button"
                                                        title={`Actualizar a v${updates[`${a.folder}/${a.file}`]}`}
                                                        disabled={updating !== null}
                                                        onClick={() => void updateOne(a).then((ok) => {
                                                            if (ok) void load();
                                                        })}
                                                        className="flex items-center gap-1 rounded-md border border-emerald-500/40 px-2 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                                                    >
                                                        {updating === a.file ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpCircle className="h-3.5 w-3.5" />} Actualizar
                                                    </button>
                                                )}
                                                {a.modrinth_url && (
                                                    <a href={a.modrinth_url} target="_blank" rel="noopener noreferrer" title="Ver en Modrinth" className="rounded-md p-1.5 hover:bg-white/5 hover:text-emerald-300">
                                                        <Compass className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                                {a.website && (
                                                    <a href={a.website} target="_blank" rel="noopener noreferrer" title="Web del autor" className="rounded-md p-1.5 hover:bg-white/5 hover:text-cyan-300">
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </a>
                                                )}
                                                <a
                                                    href={`/servers/${server.id}/files/download?file=${encodeURIComponent(`${a.folder}/${a.file}`)}`}
                                                    title="Descargar"
                                                    className="rounded-md p-1.5 hover:bg-white/5 hover:text-cyan-300"
                                                >
                                                    <Download className="h-3.5 w-3.5" />
                                                </a>
                                                <button type="button" title="Borrar" disabled={busy === a.file} onClick={() => void remove(a)} className="rounded-md p-1.5 hover:bg-red-500/10 hover:text-red-400">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                            <FolderOpen className="h-3.5 w-3.5" /> Las configuraciones de cada plugin están en
                            <Link href={`/servers/${server.id}/files`} className="text-cyan-400 hover:underline">
                                Archivos → {tab}
                            </Link>
                        </p>
                    </>
                ) : null}
            </div>
        </ServerLayout>
    );
}
