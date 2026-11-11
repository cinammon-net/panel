import ServerLayout from '@/layouts/server-layout';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, Check, Copy, Database, ExternalLink, Eye, EyeOff, FolderOpen, Loader2, Newspaper, RefreshCw, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Props {
    server: { id: number; name: string; owner_id?: number };
    site: string | null;
    available: boolean;
    demo: boolean;
    ownerEmail?: string | null;
}

type State = 'loading' | 'empty' | 'files' | 'configured' | 'other' | 'error';
type StepKey = 'prepare' | 'download' | 'unpack' | 'database' | 'config' | 'setup';
type StepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

const STEPS: { key: StepKey; label: string }[] = [
    { key: 'prepare', label: 'Comprobar la carpeta de la web' },
    { key: 'download', label: 'Descargar WordPress en español' },
    { key: 'unpack', label: 'Descomprimir los archivos' },
    { key: 'database', label: 'Crear la base de datos' },
    { key: 'config', label: 'Configurar WordPress' },
    { key: 'setup', label: 'Crear tu sitio y tu usuario' },
];

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

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <label className="block space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">{label}</span>
            {children}
            {hint && <span className="block text-[11px] text-neutral-500">{hint}</span>}
        </label>
    );
}

const input =
    'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-cyan-500 focus:ring-0 dark:border-neutral-700 dark:bg-black/60 dark:text-white';

export default function WordpressPage({ server, site, available, demo, ownerEmail }: Props) {
    const base = `/servers/${server.id}/wordpress`;
    const [state, setState] = useState<State>('loading');
    const [otherFiles, setOtherFiles] = useState<string[]>([]);
    const [form, setForm] = useState({ title: server.name, user: 'admin', email: ownerEmail ?? '', password: genPassword() });
    const [showPass, setShowPass] = useState(true);
    const [running, setRunning] = useState(false);
    const [steps, setSteps] = useState<Record<StepKey, StepStatus>>({} as Record<StepKey, StepStatus>);
    const [detail, setDetail] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [done, setDone] = useState<{ site: string; admin: string } | null>(null);

    const load = useCallback(async () => {
        setState('loading');
        try {
            const { data } = await axios.get(`${base}/status`);
            setState(data.state);
            setOtherFiles(data.files ?? []);
        } catch {
            setState('error');
        }
    }, [base]);

    useEffect(() => {
        load();
    }, [load]);

    const mark = (key: StepKey, status: StepStatus) => setSteps((s) => ({ ...s, [key]: status }));

    const run = async () => {
        if (form.password.length < 10) return toast.error('La contraseña debe tener al menos 10 caracteres.');
        setRunning(true);
        setError(null);
        setDone(null);
        setSteps({} as Record<StepKey, StepStatus>);
        let current: StepKey = 'prepare';
        try {
            mark('prepare', 'running');
            const { data: prep } = await axios.post(`${base}/step`, { step: 'prepare' });
            mark('prepare', 'done');

            if (prep.skip_download) {
                mark('download', 'skipped');
                mark('unpack', 'skipped');
            } else {
                current = 'download';
                mark('download', 'running');
                await axios.post(`${base}/step`, { step: 'download' });
                for (let i = 0; i < 120; i++) {
                    current = 'unpack';
                    const { data } = await axios.post(`${base}/step`, { step: 'unpack' });
                    if (!data.wait) break;
                    setDetail(`Descargando… ${data.progress ?? 0}%`);
                    await sleep(2000);
                }
                setDetail(null);
                mark('download', 'done');
                mark('unpack', 'done');
            }

            current = 'database';
            mark('database', 'running');
            await axios.post(`${base}/step`, { step: 'database' });
            mark('database', 'done');

            current = 'config';
            mark('config', 'running');
            await axios.post(`${base}/step`, { step: 'config' });
            mark('config', 'done');

            current = 'setup';
            mark('setup', 'running');
            let result = null;
            for (let i = 0; i < 40; i++) {
                const { data } = await axios.post(`${base}/step`, { step: 'setup', ...form });
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
            setDone({ site: result.site, admin: result.admin });
            setState('configured');
            toast.success('WordPress instalado.');
        } catch (e) {
            mark(current, 'error');
            setDetail(null);
            setError(e instanceof Error && !(e as { response?: unknown }).response ? e.message : errorOf(e));
        } finally {
            setRunning(false);
        }
    };

    const copy = (text: string, what: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${what} copiado.`);
    };

    const card = 'rounded-2xl border border-neutral-200 bg-white p-5 dark:border-cyan-900/60 dark:bg-[#05080f]';

    return (
        <ServerLayout server={server} section="wordpress">
            <Head title={`${server.name} · WordPress - Cinammon`} />
            <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
                <header className="flex items-start gap-3">
                    <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-2.5 text-cyan-400">
                        <Newspaper className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl dark:text-white">WordPress</h1>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Instala WordPress en tu web con un clic: sin terminal, sin subir archivos y sin crear la base de datos a mano.
                        </p>
                    </div>
                </header>

                {!available ? (
                    <div className={`${card} flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-300`}>
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
                        {demo ? 'En la demo no se instala WordPress de verdad.' : 'El instalador no está disponible ahora mismo (faltan las bases de datos o la dirección web).'}
                    </div>
                ) : state === 'loading' ? (
                    <div className={`${card} flex items-center gap-2 text-sm text-cyan-400`}>
                        <Loader2 className="h-4 w-4 animate-spin" /> Comprobando tu web…
                    </div>
                ) : state === 'error' ? (
                    <div className={`${card} flex flex-wrap items-center justify-between gap-3 text-sm text-rose-400`}>
                        No se pudo consultar el servidor. ¿Está el nodo en línea?
                        <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-white">
                            <RefreshCw className="h-3.5 w-3.5" /> Reintentar
                        </button>
                    </div>
                ) : state === 'configured' && !running ? (
                    <div className={`${card} space-y-4`}>
                        <p className="flex items-center gap-2 font-bold text-emerald-400">
                            <Check className="h-5 w-5" /> WordPress está instalado en esta web
                        </p>
                        {done && (
                            <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-neutral-700 dark:text-neutral-200">
                                <p>Entra al escritorio con estos datos (guárdalos, la contraseña no se vuelve a mostrar):</p>
                                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                                    <span>Usuario: <b>{form.user}</b></span>
                                    <button type="button" onClick={() => copy(form.password, 'Contraseña')} className="inline-flex items-center gap-1 rounded border border-neutral-700 px-2 py-0.5">
                                        <Copy className="h-3 w-3" /> Copiar contraseña
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                            {site && (
                                <>
                                    <a href={`${site}/wp-admin/`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-black hover:bg-cyan-400">
                                        <ExternalLink className="h-4 w-4" /> Abrir el escritorio
                                    </a>
                                    <a href={site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/50 px-4 py-2 text-sm font-bold text-cyan-300 hover:bg-cyan-500/10">
                                        <ExternalLink className="h-4 w-4" /> Ver la web
                                    </a>
                                </>
                            )}
                            <Link href={`/servers/${server.id}/databases`} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:text-white">
                                <Database className="h-4 w-4" /> Base de datos
                            </Link>
                        </div>
                    </div>
                ) : state === 'other' && !running ? (
                    <div className={`${card} space-y-3 text-sm text-neutral-600 dark:text-neutral-300`}>
                        <p className="flex items-start gap-2">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-400" />
                            Tu web ya tiene archivos en <code className="text-cyan-400">webroot/</code> ({otherFiles.join(', ')}). Para no borrar nada, WordPress solo se instala en una web vacía.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <Link href={`/servers/${server.id}/files`} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-xs text-white">
                                <FolderOpen className="h-4 w-4" /> Abrir Archivos
                            </Link>
                            <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 px-4 py-2 text-xs text-white">
                                <RefreshCw className="h-4 w-4" /> Volver a comprobar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-5 md:grid-cols-2">
                        <div className={`${card} space-y-4`}>
                            <h2 className="font-bold text-neutral-900 dark:text-white">Datos de tu sitio</h2>
                            <Field label="Título del sitio">
                                <input className={input} value={form.title} maxLength={80} disabled={running} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                            </Field>
                            <Field label="Usuario administrador" hint="Con él entras al escritorio de WordPress.">
                                <input className={input} value={form.user} maxLength={40} disabled={running} onChange={(e) => setForm({ ...form, user: e.target.value.replace(/[^A-Za-z0-9._-]/g, '') })} />
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
                                    <button type="button" title={showPass ? 'Ocultar' : 'Mostrar'} onClick={() => setShowPass(!showPass)} className="shrink-0 rounded-lg border border-neutral-700 px-2.5 text-neutral-400 hover:text-white">
                                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                    <button type="button" title="Copiar" onClick={() => copy(form.password, 'Contraseña')} className="shrink-0 rounded-lg border border-neutral-700 px-2.5 text-neutral-400 hover:text-white">
                                        <Copy className="h-4 w-4" />
                                    </button>
                                    <button type="button" title="Generar otra" disabled={running} onClick={() => setForm({ ...form, password: genPassword() })} className="shrink-0 rounded-lg border border-neutral-700 px-2.5 text-neutral-400 hover:text-white">
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                </div>
                            </Field>
                            <button
                                type="button"
                                onClick={run}
                                disabled={running || !form.title || !form.user || !form.email}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 text-sm font-bold text-white hover:brightness-110 disabled:opacity-50"
                            >
                                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                {running ? 'Instalando…' : 'Instalar WordPress'}
                            </button>
                            {site && <p className="text-center text-[11px] break-all text-neutral-500">Se instalará en {site}</p>}
                        </div>

                        <div className={`${card} space-y-3`}>
                            <h2 className="font-bold text-neutral-900 dark:text-white">Progreso</h2>
                            <ol className="space-y-2">
                                {STEPS.map((s) => {
                                    const st = steps[s.key] ?? 'pending';
                                    return (
                                        <li key={s.key} className="flex items-center gap-2.5 text-sm">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                                                {st === 'running' ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                                                ) : st === 'done' || st === 'skipped' ? (
                                                    <Check className="h-4 w-4 text-emerald-400" />
                                                ) : st === 'error' ? (
                                                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                                                ) : (
                                                    <span className="h-2 w-2 rounded-full bg-neutral-600" />
                                                )}
                                            </span>
                                            <span className={st === 'pending' ? 'text-neutral-500' : st === 'error' ? 'text-rose-400' : 'text-neutral-800 dark:text-neutral-100'}>
                                                {s.label}
                                                {st === 'skipped' && <span className="text-neutral-500"> · ya estaba</span>}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                            {detail && <p className="font-mono text-xs text-cyan-400">{detail}</p>}
                            {error && <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-2.5 text-xs text-rose-300">{error}</p>}
                            {!running && !error && Object.keys(steps).length === 0 && (
                                <p className="text-xs text-neutral-500">Tarda alrededor de un minuto. Puedes seguir usando el panel mientras tanto, pero no cierres esta página.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ServerLayout>
    );
}
