import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowUpCircle,
    CheckCircle2,
    Clock,
    Download,
    ExternalLink,
    RefreshCw,
    Rocket,
    ShieldCheck,
    Terminal,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface ComponentStatus {
    current: string;
    latest: string | null;
    update_available: boolean;
    notes: string | null;
    url: string | null;
    published_at: string | null;
}

interface RunnerStatus {
    target?: string;
    version?: string;
    state?: string; // queued | downloading | applying | migrating | restarting | done | error
    message?: string;
    progress?: number;
    updated_at?: string;
    log?: string[];
}

interface Props {
    status: {
        panel: ComponentStatus;
        wings: ComponentStatus;
        billing: ComponentStatus;
        runner: RunnerStatus | null;
        demo: boolean;
    };
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Updates', href: '/updates' }];

const STATE_LABELS: Record<string, string> = {
    queued: 'En cola…',
    downloading: 'Descargando release…',
    applying: 'Aplicando archivos…',
    migrating: 'Ejecutando migraciones…',
    restarting: 'Reiniciando servicios…',
    done: 'Actualización completada',
    error: 'Error durante la actualización',
};

function ComponentCard({
    title,
    subtitle,
    status,
    busy,
    onUpdate,
}: {
    title: string;
    subtitle: string;
    status: ComponentStatus;
    busy: boolean;
    onUpdate: () => void;
}) {
    const upToDate = !status.update_available;

    return (
        <div
            className={`rounded-2xl border p-5 backdrop-blur ${
                upToDate
                    ? 'border-emerald-500/40 bg-neutral-950/80 shadow-[0_0_15px_rgba(16,185,129,0.08)]'
                    : 'border-fuchsia-500/50 bg-fuchsia-950/10 shadow-[0_0_20px_rgba(217,70,239,0.15)]'
            }`}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold tracking-wider text-white">{title}</h2>
                    <p className="text-xs text-neutral-400">{subtitle}</p>
                </div>
                {upToDate ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                        <ShieldCheck className="h-3.5 w-3.5" /> Al día
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs font-semibold text-fuchsia-300">
                        <ArrowUpCircle className="h-3.5 w-3.5" /> Nueva versión
                    </span>
                )}
            </div>

            <div className="mt-4 flex items-center gap-3 font-mono">
                <span className="rounded-lg border border-neutral-700 bg-black/60 px-3 py-1.5 text-sm text-neutral-200">
                    v{status.current || '—'}
                </span>
                {status.latest && status.update_available && (
                    <>
                        <span className="text-neutral-500">→</span>
                        <span className="rounded-lg border border-fuchsia-500/60 bg-fuchsia-950/50 px-3 py-1.5 text-sm font-bold text-fuchsia-200">
                            v{status.latest}
                        </span>
                    </>
                )}
            </div>

            {status.update_available && status.notes && (
                <div className="mt-4 max-h-44 overflow-y-auto rounded-xl border border-neutral-800 bg-black/50 p-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-500">Notas de la versión</p>
                    <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-neutral-300">{status.notes}</pre>
                </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
                {status.update_available && (
                    <button
                        onClick={onUpdate}
                        disabled={busy}
                        className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-500 bg-fuchsia-600/20 px-4 py-2 text-sm font-bold text-fuchsia-200 transition hover:bg-fuchsia-500 hover:text-black disabled:opacity-50"
                    >
                        <Rocket className="h-4 w-4" />
                        Actualizar ahora
                    </button>
                )}
                {status.url && (
                    <a
                        href={status.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300"
                    >
                        Ver release en GitHub <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                )}
                {status.published_at && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-neutral-500">
                        <Clock className="h-3.5 w-3.5" /> {new Date(status.published_at).toLocaleString()}
                    </span>
                )}
            </div>
        </div>
    );
}

export default function Updates() {
    const { status } = usePage<Props>().props;
    const [checking, setChecking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [runner, setRunner] = useState<RunnerStatus | null>(status.runner);

    const runnerActive = runner?.state && !['done', 'error'].includes(runner.state);

    // Polling del progreso del updater mientras hay una actualización en marcha
    useEffect(() => {
        if (!runnerActive) return;
        const id = setInterval(async () => {
            try {
                const res = await fetch('/updates/runner-status', { headers: { Accept: 'application/json' } });
                const data = await res.json();
                setRunner(data.runner);
                if (data.runner?.state === 'done') {
                    toast.success('Actualización completada. Recargando…');
                    setTimeout(() => router.reload(), 2500);
                }
                if (data.runner?.state === 'error') {
                    toast.error(data.runner?.message ?? 'La actualización ha fallado.');
                }
            } catch {
                /* siguiente tick */
            }
        }, 3000);
        return () => clearInterval(id);
    }, [runnerActive]);

    const handleCheck = () => {
        setChecking(true);
        router.post('/updates/check', {}, { onFinish: () => setChecking(false) });
    };

    const handleUpdate = (target: 'panel' | 'wings' | 'billing') => {
        const names = { panel: 'el panel', wings: 'Wings', billing: 'el billing' };
        if (!confirm(`¿Actualizar ${names[target]} a la última versión? El servicio puede tardar unos segundos en responder durante el proceso.`)) {
            return;
        }
        setBusy(true);
        router.post(
            '/updates/run',
            { target },
            {
                onFinish: () => setBusy(false),
                onSuccess: () => setRunner({ target, state: 'queued', progress: 0 }),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Actualizaciones" />
            <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-fuchsia-500/30 pb-4">
                    <div className="flex items-center gap-3">
                        <Download className="h-8 w-8 text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-wider text-fuchsia-400">ACTUALIZACIONES</h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                El panel comprueba los releases de GitHub y aplica las actualizaciones por ti.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleCheck}
                        disabled={checking}
                        className="flex items-center gap-2 rounded-lg border border-fuchsia-500 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-400 transition hover:bg-fuchsia-500 hover:text-black disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                        Buscar actualizaciones
                    </button>
                </div>

                {status.demo && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-xs text-amber-300">
                        Estás en la demo: las actualizaciones que se muestran aquí son simuladas y el botón no modifica nada.
                    </div>
                )}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                    <ComponentCard
                        title="PANEL CINAMMON"
                        subtitle="Aplicación web, API y base de datos"
                        status={status.panel}
                        busy={busy || !!runnerActive}
                        onUpdate={() => handleUpdate('panel')}
                    />
                    <ComponentCard
                        title="WINGS DAEMON"
                        subtitle="Demonio de los nodos (contenedores y consola)"
                        status={status.wings}
                        busy={busy || !!runnerActive}
                        onUpdate={() => handleUpdate('wings')}
                    />
                    <ComponentCard
                        title="BILLING"
                        subtitle="Tienda, planes y facturación"
                        status={status.billing}
                        busy={busy || !!runnerActive}
                        onUpdate={() => handleUpdate('billing')}
                    />
                </div>

                {runner?.state && (
                    <div className="rounded-2xl border border-cyan-500/40 bg-neutral-950 p-5">
                        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-cyan-400">
                            <Terminal className="h-4 w-4" /> PROGRESO DE LA ACTUALIZACIÓN
                            {runner.target && <span className="text-neutral-400">· {runner.target} {runner.version && `→ v${runner.version}`}</span>}
                        </h2>
                        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
                            <div
                                className={`h-full transition-all duration-700 ${runner.state === 'error' ? 'bg-red-500' : runner.state === 'done' ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                                style={{ width: `${runner.state === 'done' ? 100 : Math.min(95, runner.progress ?? 5)}%` }}
                            />
                        </div>
                        <p className="flex items-center gap-2 text-sm text-neutral-300">
                            {runner.state === 'done' ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                                <RefreshCw className={`h-4 w-4 text-cyan-400 ${runnerActive ? 'animate-spin' : ''}`} />
                            )}
                            {STATE_LABELS[runner.state] ?? runner.state}
                            {runner.message && <span className="text-neutral-500">— {runner.message}</span>}
                        </p>
                        {!!runner.log?.length && (
                            <pre className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-neutral-800 bg-black p-3 font-mono text-[11px] leading-relaxed text-neutral-400">
                                {runner.log.join('\n')}
                            </pre>
                        )}
                    </div>
                )}

                <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 text-[11px] leading-relaxed text-neutral-500">
                    Cómo funciona: cuando publicas un release en GitHub (panel o wings), aquí aparece el aviso de nueva
                    versión con sus notas. Al pulsar «Actualizar ahora» el panel deja la orden al updater del host, que
                    descarga el release, aplica los archivos, ejecuta las migraciones y reinicia los servicios sin que
                    tengas que tocar nada más. Instalación del updater: <span className="font-mono text-neutral-400">deploy/updater/README.md</span>.
                </div>
            </div>
        </AppLayout>
    );
}
