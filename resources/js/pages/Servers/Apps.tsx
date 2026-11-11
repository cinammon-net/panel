import ServerLayout from '@/layouts/server-layout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import {
    AlertTriangle,
    ArrowLeft,
    BarChart3,
    Check,
    Copy,
    Database,
    Droplet,
    ExternalLink,
    Eye,
    EyeOff,
    Feather,
    FolderOpen,
    LayoutGrid,
    Layers,
    Loader2,
    Newspaper,
    RefreshCw,
    Wand2,
    type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface AppDef {
    key: string;
    name: string;
    db: boolean;
    auto: boolean;
}

interface Props {
    server: { id: number; name: string; owner_id?: number };
    site: string | null;
    available: boolean;
    demo: boolean;
    ownerEmail?: string | null;
    apps: AppDef[];
}

interface Db {
    name: string;
    user: string;
    host: string;
    port: number;
    password?: string | null;
}

interface Status {
    state: 'empty' | 'installed' | 'other';
    app?: string;
    configured?: boolean;
    site?: string | null;
    admin?: string | null;
    wizard?: string | null;
    database?: Db | null;
    files?: string[];
}

type StepKey = 'prepare' | 'download' | 'unpack' | 'database' | 'config' | 'setup' | 'finish';
type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

const INFO: Record<string, { icon: LucideIcon; text: string; color: string }> = {
    wordpress: { icon: Newspaper, text: 'Blog, web o tienda (WooCommerce). Queda instalado con tu usuario, sin pasos extra.', color: 'from-sky-500 to-blue-600' },
    joomla: { icon: Layers, text: 'Gestor de contenidos para webs, portales y comunidades.', color: 'from-orange-500 to-rose-600' },
    drupal: { icon: Droplet, text: 'CMS robusto para webs grandes y con mucho contenido.', color: 'from-blue-500 to-indigo-700' },
    matomo: { icon: BarChart3, text: 'Estadísticas de visitas propias y privadas, sin depender de Google.', color: 'from-emerald-500 to-teal-600' },
    grav: { icon: Feather, text: 'CMS ultrarrápido sin base de datos, ideal para webs sencillas.', color: 'from-violet-500 to-fuchsia-600' },
};

const LABELS: Record<StepKey, string> = {
    prepare: 'Comprobar la carpeta de la web',
    download: 'Descargar la versión oficial',
    unpack: 'Descomprimir los archivos',
    database: 'Crear la base de datos',
    config: 'Configurar WordPress',
    setup: 'Crear tu sitio y tu usuario',
    finish: 'Preparar el asistente',
};

const stepsFor = (app: AppDef): StepKey[] =>
    app.auto ? ['prepare', 'download', 'unpack', 'database', 'config', 'setup'] : ['prepare', 'download', 'unpack', ...(app.db ? (['database'] as StepKey[]) : []), 'finish'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const errorOf = (e: unknown) => {
    const d = (e as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response?.data;
    return (d?.errors && Object.values(d.errors)[0]?.[0]) || d?.message || 'Algo ha fallado. Vuelve a intentarlo.';
};
const genPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const a = new Uint32Array(16);
    crypto.getRandomValues(a);
    return Array.from(a, (n) => chars[n % chars.length]).join('');
};
const copy = (text: string, what: string) => {
    navigator.clipboard.writeText(text).catch(() => undefined);
    toast.success(`${what} copiado.`);
};

const card = 'rounded-2xl border border-neutral-200 bg-white p-5 dark:border-cyan-900/60 dark:bg-[#05080f]';
const input =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-cyan-500 focus:ring-0 dark:border-neutral-700 dark:bg-black/60 dark:text-white';
const btnPrimary =
    'inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50';
const btnGhost =
    'inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:text-black dark:border-neutral-700 dark:text-neutral-300 dark:hover:text-white';

function AppIcon({ app, size = 'md' }: { app: string; size?: 'md' | 'lg' }) {
    const info = INFO[app] ?? { icon: LayoutGrid, color: 'from-neutral-500 to-neutral-700' };
    const Icon = info.icon;
    return (
        <span className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${info.color} ${size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'}`}>
            <Icon className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
        </span>
    );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <label className="block space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">{label}</span>
            {children}
            {hint && <span className="block text-[11px] text-neutral-500">{hint}</span>}
        </label>
    );
}

function DbBox({ db }: { db: Db }) {
    const [show, setShow] = useState(false);
    const rows: [string, string, boolean?][] = [
        ['Servidor', `${db.host}:${db.port}`],
        ['Base de datos', db.name],
        ['Usuario', db.user],
        ['Contraseña', db.password ?? '', true],
    ];
    return (
        <div className="space-y-2 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3">
            <p className="flex items-center gap-2 text-xs font-bold text-cyan-600 dark:text-cyan-300">
                <Database className="h-4 w-4" /> Datos de la base de datos para el asistente
            </p>
            <div className="divide-y divide-neutral-200 text-xs dark:divide-white/5">
                {rows.map(([label, value, secret]) => (
                    <div key={label} className="flex items-center justify-between gap-2 py-1.5">
                        <span className="shrink-0 text-neutral-500">{label}</span>
                        <span className="flex min-w-0 items-center gap-1.5">
                            <code className="truncate font-mono text-neutral-800 dark:text-neutral-100">{secret && !show ? '••••••••••••' : value}</code>
                            {secret && (
                                <button type="button" title={show ? 'Ocultar' : 'Mostrar'} onClick={() => setShow(!show)} className="text-neutral-400 hover:text-cyan-400">
                                    {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                            )}
                            <button type="button" title="Copiar" onClick={() => copy(value, label)} className="text-neutral-400 hover:text-cyan-400">
                                <Copy className="h-3.5 w-3.5" />
                            </button>
                        </span>
                    </div>
                ))}
            </div>
            <p className="text-[11px] text-neutral-500">Si el asistente pide el puerto aparte, usa {db.port} y en servidor solo {db.host}.</p>
        </div>
    );
}

export default function AppsPage({ server, site, available, demo, ownerEmail, apps }: Props) {
    const base = `/servers/${server.id}/apps`;
    const [status, setStatus] = useState<Status | null>(null);
    const [loadError, setLoadError] = useState(false);
    const [selected, setSelected] = useState<AppDef | null>(null);
    const [form, setForm] = useState({ title: server.name, user: 'admin', email: ownerEmail ?? '', password: genPassword() });
    const [showPass, setShowPass] = useState(true);
    const [running, setRunning] = useState(false);
    const [steps, setSteps] = useState<Partial<Record<StepKey, StepStatus>>>({});
    const [detail, setDetail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [wpDone, setWpDone] = useState(false);

    const byKey = (k?: string) => apps.find((a) => a.key === k) ?? null;

    const load = useCallback(async () => {
        setLoadError(false);
        setStatus(null);
        try {
            const { data } = await axios.get<Status>(`${base}/status`);
            setStatus(data);
        } catch {
            setLoadError(true);
        }
    }, [base]);

    useEffect(() => {
        load();
    }, [load]);

    // WordPress descargado pero sin configurar (p. ej. el egg WordPress): se continúa directamente
    useEffect(() => {
        if (status?.state === 'installed' && status.app === 'wordpress' && !status.configured) setSelected(byKey('wordpress'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const mark = (key: StepKey, s: StepStatus) => setSteps((prev) => ({ ...prev, [key]: s }));

    const run = async (app: AppDef) => {
        if (app.auto && form.password.length < 10) return toast.error('La contraseña debe tener al menos 10 caracteres.');
        setRunning(true);
        setError(null);
        setSteps({});
        let current: StepKey = 'prepare';
        const post = (step: StepKey, extra: object = {}) => axios.post(`${base}/step`, { app: app.key, step, ...extra });
        try {
            mark('prepare', 'running');
            const { data: prep } = await post('prepare');
            mark('prepare', 'done');

            if (prep.skip_download) {
                mark('download', 'skipped');
                mark('unpack', 'skipped');
            } else {
                current = 'download';
                mark('download', 'running');
                await post('download');
                mark('download', 'done');
                current = 'unpack';
                mark('unpack', 'running');
                await post('unpack');
                mark('unpack', 'done');
            }

            if (app.db) {
                current = 'database';
                mark('database', 'running');
                await post('database');
                mark('database', 'done');
            }

            if (!app.auto) {
                current = 'finish';
                mark('finish', 'running');
                const { data } = await post('finish');
                mark('finish', 'done');
                setStatus(data);
                setSelected(null);
                toast.success(`${app.name} está listo: termina en su asistente.`);
                return;
            }

            current = 'config';
            mark('config', 'running');
            await post('config');
            mark('config', 'done');

            current = 'setup';
            mark('setup', 'running');
            let result: Status | null = null;
            for (let i = 0; i < 40; i++) {
                const { data } = await post('setup', form);
                if (!data.wait) {
                    result = data;
                    break;
                }
                setDetail(data.message ?? 'Arrancando la web…');
                await sleep(3000);
            }
            setDetail(null);
            if (!result) throw new Error('La web tarda demasiado en arrancar. Enciéndela desde la Consola y vuelve a pulsar Instalar.');
            mark('setup', 'done');
            setWpDone(true);
            setStatus({ state: 'installed', app: 'wordpress', configured: true, site: result.site, admin: result.admin });
            setSelected(null);
            toast.success('WordPress instalado.');
        } catch (e) {
            mark(current, 'error');
            setDetail(null);
            setError(e instanceof Error && !(e as { response?: unknown }).response ? e.message : errorOf(e));
        } finally {
            setRunning(false);
        }
    };

    const installedApp = status?.state === 'installed' ? byKey(status.app) : null;

    const body = () => {
        if (!available) {
            return (
                <div className={`${card} flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-300`}>
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
                    {demo ? 'En la demo no se instalan aplicaciones de verdad.' : 'El instalador no está disponible ahora mismo (faltan las bases de datos o la dirección web).'}
                </div>
            );
        }
        if (loadError) {
            return (
                <div className={`${card} flex flex-wrap items-center justify-between gap-3 text-sm text-rose-400`}>
                    No se pudo consultar el servidor. ¿Está el nodo en línea?
                    <button type="button" onClick={load} className={btnGhost}>
                        <RefreshCw className="h-4 w-4" /> Reintentar
                    </button>
                </div>
            );
        }
        if (!status) {
            return (
                <div className={`${card} flex items-center gap-2 text-sm text-cyan-500`}>
                    <Loader2 className="h-4 w-4 animate-spin" /> Comprobando tu web…
                </div>
            );
        }

        if (selected) return installer(selected);

        if (status.state === 'installed' && installedApp) {
            const done = status.configured;
            return (
                <div className={`${card} space-y-4`}>
                    <div className="flex items-start gap-3">
                        <AppIcon app={installedApp.key} size="lg" />
                        <div className="min-w-0">
                            <p className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                                {installedApp.name}
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${done ? 'bg-emerald-500/15 text-emerald-500' : 'bg-yellow-500/15 text-yellow-500'}`}>
                                    {done ? 'Instalado' : 'Falta el asistente'}
                                </span>
                            </p>
                            <p className="text-sm text-neutral-500">
                                {done
                                    ? 'Tu web ya funciona. Entra al panel de administración para empezar.'
                                    : `Los archivos y la base de datos están listos. Abre el asistente de ${installedApp.name}, pega los datos de abajo y crea tu usuario administrador.`}
                            </p>
                        </div>
                    </div>

                    {wpDone && installedApp.key === 'wordpress' && (
                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-neutral-700 dark:text-neutral-200">
                            <span>
                                Usuario <b>{form.user}</b>. Guarda tu contraseña: no se vuelve a mostrar.
                            </span>
                            <button type="button" onClick={() => copy(form.password, 'Contraseña')} className="inline-flex items-center gap-1 rounded border border-neutral-600 px-2 py-0.5 text-xs">
                                <Copy className="h-3 w-3" /> Copiar contraseña
                            </button>
                        </div>
                    )}

                    {!done && status.database && <DbBox db={status.database} />}

                    <div className="flex flex-wrap gap-2">
                        {!done && status.wizard && (
                            <a href={status.wizard} target="_blank" rel="noreferrer" className={btnPrimary}>
                                <Wand2 className="h-4 w-4" /> Abrir el asistente
                            </a>
                        )}
                        {done && status.admin && (
                            <a href={status.admin} target="_blank" rel="noreferrer" className={btnPrimary}>
                                <ExternalLink className="h-4 w-4" /> Panel de administración
                            </a>
                        )}
                        {status.site && (
                            <a href={status.site} target="_blank" rel="noreferrer" className={btnGhost}>
                                <ExternalLink className="h-4 w-4" /> Ver la web
                            </a>
                        )}
                        {installedApp.db && (
                            <Link href={`/servers/${server.id}/databases`} className={btnGhost}>
                                <Database className="h-4 w-4" /> Bases de datos
                            </Link>
                        )}
                        <button type="button" onClick={load} className={btnGhost}>
                            <RefreshCw className="h-4 w-4" /> Comprobar
                        </button>
                    </div>
                </div>
            );
        }

        if (status.state === 'other') {
            return (
                <div className={`${card} space-y-3 text-sm text-neutral-600 dark:text-neutral-300`}>
                    <p className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
                        <span>
                            Tu web ya tiene archivos en <code className="text-cyan-500">webroot/</code> ({(status.files ?? []).join(', ')}). Para no borrar nada, las aplicaciones solo se
                            instalan en una web vacía.
                        </span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Link href={`/servers/${server.id}/files`} className={btnGhost}>
                            <FolderOpen className="h-4 w-4" /> Abrir Archivos
                        </Link>
                        <button type="button" onClick={load} className={btnGhost}>
                            <RefreshCw className="h-4 w-4" /> Volver a comprobar
                        </button>
                    </div>
                </div>
            );
        }

        // Web vacía: catálogo
        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {apps.map((app) => (
                    <button
                        key={app.key}
                        type="button"
                        onClick={() => {
                            setSelected(app);
                            setSteps({});
                            setError(null);
                        }}
                        className={`${card} group flex items-start gap-3 text-left transition hover:border-cyan-500/60`}
                    >
                        <AppIcon app={app.key} />
                        <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2 font-bold text-neutral-900 dark:text-white">
                                {app.name}
                                {app.auto ? (
                                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500 uppercase">Todo automático</span>
                                ) : !app.db ? (
                                    <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-400 uppercase">Sin base de datos</span>
                                ) : null}
                            </span>
                            <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{INFO[app.key]?.text}</span>
                        </span>
                    </button>
                ))}
            </div>
        );
    };

    const installer = (app: AppDef) => {
        const list = stepsFor(app);
        const continuing = status?.state === 'installed';
        return (
            <div className="space-y-4">
                {!continuing && (
                    <button type="button" disabled={running} onClick={() => setSelected(null)} className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-cyan-500 disabled:opacity-50">
                        <ArrowLeft className="h-3.5 w-3.5" /> Elegir otra aplicación
                    </button>
                )}
                <div className="grid gap-5 md:grid-cols-2">
                    <div className={`${card} space-y-4`}>
                        <div className="flex items-center gap-3">
                            <AppIcon app={app.key} />
                            <div className="min-w-0">
                                <h2 className="font-bold text-neutral-900 dark:text-white">{app.name}</h2>
                                <p className="text-xs text-neutral-500">{INFO[app.key]?.text}</p>
                            </div>
                        </div>
                        {app.auto ? (
                            <>
                                <Field label="Título del sitio">
                                    <input className={input} value={form.title} maxLength={80} disabled={running} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                                </Field>
                                <Field label="Usuario administrador" hint="Con él entras al escritorio de WordPress.">
                                    <input
                                        className={input}
                                        value={form.user}
                                        maxLength={40}
                                        disabled={running}
                                        onChange={(e) => setForm({ ...form, user: e.target.value.replace(/[^A-Za-z0-9._-]/g, '') })}
                                    />
                                </Field>
                                <Field label="Email">
                                    <input className={input} type="email" value={form.email} disabled={running} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                                </Field>
                                <Field label="Contraseña" hint="Mínimo 10 caracteres. Cópiala antes de instalar.">
                                    <div className="flex gap-2">
                                        <input
                                            className={`${input} font-mono`}
                                            type={showPass ? 'text' : 'password'}
                                            value={form.password}
                                            disabled={running}
                                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                                        />
                                        <button type="button" title={showPass ? 'Ocultar' : 'Mostrar'} onClick={() => setShowPass(!showPass)} className="shrink-0 rounded-lg border border-neutral-300 px-2.5 text-neutral-400 hover:text-cyan-500 dark:border-neutral-700">
                                            {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                        <button type="button" title="Copiar" onClick={() => copy(form.password, 'Contraseña')} className="shrink-0 rounded-lg border border-neutral-300 px-2.5 text-neutral-400 hover:text-cyan-500 dark:border-neutral-700">
                                            <Copy className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            title="Generar otra"
                                            disabled={running}
                                            onClick={() => setForm({ ...form, password: genPassword() })}
                                            className="shrink-0 rounded-lg border border-neutral-300 px-2.5 text-neutral-400 hover:text-cyan-500 dark:border-neutral-700"
                                        >
                                            <RefreshCw className="h-4 w-4" />
                                        </button>
                                    </div>
                                </Field>
                            </>
                        ) : (
                            <p className="text-sm text-neutral-600 dark:text-neutral-300">
                                Subimos la última versión oficial a tu web{app.db ? ' y creamos su base de datos' : ''}. Después solo tienes que abrir su asistente para crear tu usuario
                                administrador.
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={() => run(app)}
                            disabled={running || (app.auto && (!form.title || !form.user || !form.email))}
                            className={`${btnPrimary} w-full py-3`}
                        >
                            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                            {running ? 'Instalando…' : `Instalar ${app.name}`}
                        </button>
                        {site && <p className="text-center text-[11px] break-all text-neutral-500">Se instalará en {site}</p>}
                    </div>

                    <div className={`${card} space-y-3`}>
                        <h2 className="font-bold text-neutral-900 dark:text-white">Progreso</h2>
                        <ol className="space-y-2">
                            {list.map((key) => {
                                const st = steps[key] ?? 'pending';
                                return (
                                    <li key={key} className="flex items-center gap-2.5 text-sm">
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                                            {st === 'running' ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                                            ) : st === 'done' || st === 'skipped' ? (
                                                <Check className="h-4 w-4 text-emerald-500" />
                                            ) : st === 'error' ? (
                                                <AlertTriangle className="h-4 w-4 text-rose-400" />
                                            ) : (
                                                <span className="h-2 w-2 rounded-full bg-neutral-400 dark:bg-neutral-600" />
                                            )}
                                        </span>
                                        <span className={st === 'pending' ? 'text-neutral-500' : st === 'error' ? 'text-rose-400' : 'text-neutral-800 dark:text-neutral-100'}>
                                            {LABELS[key]}
                                            {st === 'skipped' && <span className="text-neutral-500"> · ya estaba</span>}
                                        </span>
                                    </li>
                                );
                            })}
                        </ol>
                        {detail && <p className="font-mono text-xs text-cyan-500">{detail}</p>}
                        {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-400">{error}</p>}
                        {!running && !error && Object.keys(steps).length === 0 && (
                            <p className="text-xs text-neutral-500">Tarda alrededor de un minuto. No cierres esta página mientras se instala.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <ServerLayout server={server} section="apps">
            <Head title={`${server.name} · Aplicaciones - Cinammon`} />
            <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
                <header className="flex items-start gap-3">
                    <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-2.5 text-cyan-500">
                        <LayoutGrid className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">Aplicaciones</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Instala WordPress y otras aplicaciones en tu web con un clic: sin terminal, sin subir archivos y con la base de datos creada sola.
                        </p>
                    </div>
                </header>
                {body()}
            </div>
        </ServerLayout>
    );
}
