import { router } from '@inertiajs/react';
import ConfirmDialog from '@/components/confirm-dialog';
import { ArrowUpCircle, CheckCircle2, ExternalLink, RefreshCw, Rocket, ShieldCheck, Terminal } from 'lucide-react';
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
    state?: string;
    message?: string;
    progress?: number;
    log?: string[];
    output?: string;
}

export interface UpdateStatus {
    panel: ComponentStatus;
    wings: ComponentStatus;
    billing: ComponentStatus;
    runner: RunnerStatus | null;
    demo: boolean;
}

const STATE_LABELS: Record<string, string> = {
    queued: 'En cola…',
    downloading: 'Descargando release…',
    applying: 'Aplicando archivos…',
    migrating: 'Ejecutando migraciones…',
    restarting: 'Reiniciando servicios…',
    done: 'Actualización completada',
    error: 'Error durante la actualización',
};

function Row({ title, status, busy, onUpdate }: { title: string; status: ComponentStatus; busy: boolean; onUpdate: () => void }) {
    const [showNotes, setShowNotes] = useState(false);

    return (
        <div className={`rounded-xl border p-4 ${status.update_available ? 'border-fuchsia-500/50 bg-fuchsia-950/10' : 'border-neutral-800 bg-black/40'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold tracking-wider text-white">{title}</span>
                    <span className="rounded border border-neutral-700 bg-black/60 px-2 py-0.5 font-mono text-xs text-neutral-300">
                        v{status.current || '—'}
                    </span>
                    {status.update_available && status.latest && (
                        <>
                            <span className="text-xs text-neutral-500">→</span>
                            <span className="rounded border border-fuchsia-500/60 bg-fuchsia-950/50 px-2 py-0.5 font-mono text-xs font-bold text-fuchsia-200">
                                v{status.latest}
                            </span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {status.update_available ? (
                        <>
                            {status.notes && (
                                <button onClick={() => setShowNotes(!showNotes)} className="text-[11px] text-cyan-400 hover:text-cyan-300">
                                    {showNotes ? 'Ocultar notas' : 'Ver notas'}
                                </button>
                            )}
                            {status.url && (
                                <a href={status.url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            )}
                            <button
                                onClick={onUpdate}
                                disabled={busy}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-fuchsia-500 bg-fuchsia-600/20 px-3 py-1.5 text-xs font-bold text-fuchsia-200 transition hover:bg-fuchsia-500 hover:text-black disabled:opacity-50"
                            >
                                <Rocket className="h-3.5 w-3.5" /> Actualizar ahora
                            </button>
                        </>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                            <ShieldCheck className="h-3.5 w-3.5" /> Al día
                        </span>
                    )}
                </div>
            </div>
            {showNotes && status.notes && (
                <pre className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-lg border border-neutral-800 bg-black/50 p-3 font-sans text-xs leading-relaxed text-neutral-300">
                    {status.notes}
                </pre>
            )}
        </div>
    );
}

/** Gestor de actualizaciones embebido en el dashboard. */
export default function UpdateManager({ status }: { status: UpdateStatus }) {
    const [checking, setChecking] = useState(false);
    const [busy, setBusy] = useState(false);
    const [pendingTarget, setPendingTarget] = useState<'panel' | 'wings' | 'billing' | null>(null);
    const [runner, setRunner] = useState<RunnerStatus | null>(status.runner);

    const runnerActive = runner?.state && !['done', 'error'].includes(runner.state);
    const anyUpdate = status.panel.update_available || status.wings.update_available || status.billing?.update_available;

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
                if (data.runner?.state === 'error') toast.error(data.runner?.message ?? 'La actualización ha fallado.');
            } catch {
                /* siguiente tick */
            }
        }, 3000);
        return () => clearInterval(id);
    }, [runnerActive]);

    const handleUpdate = (target: 'panel' | 'wings' | 'billing') => {
        setPendingTarget(target);
    };

    const confirmUpdate = () => {
        const target = pendingTarget;
        if (!target) return;
        setPendingTarget(null);
        setBusy(true);
        router.post(
            '/updates/run',
            { target },
            { onFinish: () => setBusy(false), onSuccess: () => setRunner({ target, state: 'queued', progress: 0 }) },
        );
    };

    return (
        <div className={`rounded-2xl border p-5 shadow-md backdrop-blur ${anyUpdate ? 'border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.15)]' : 'border-purple-500/30'} bg-black/40`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                    {anyUpdate ? (
                        <ArrowUpCircle className="h-5 w-5 animate-pulse text-fuchsia-400" />
                    ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    )}
                    <h2 className="text-sm font-bold tracking-wider text-white">ACTUALIZACIONES</h2>
                    {status.demo && <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300">DEMO · SIMULADO</span>}
                </div>
                <button
                    onClick={() => {
                        setChecking(true);
                        router.post('/updates/check', {}, { onFinish: () => setChecking(false) });
                    }}
                    disabled={checking}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/60 bg-purple-950/40 px-3 py-1.5 text-[11px] font-semibold text-purple-200 transition hover:bg-purple-900/60 disabled:opacity-50"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} /> Buscar actualizaciones
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <Row title="PANEL" status={status.panel} busy={busy || !!runnerActive} onUpdate={() => handleUpdate('panel')} />
                <Row title="WINGS" status={status.wings} busy={busy || !!runnerActive} onUpdate={() => handleUpdate('wings')} />
                {status.billing && (
                    <Row title="BILLING" status={status.billing} busy={busy || !!runnerActive} onUpdate={() => handleUpdate('billing')} />
                )}
            </div>

            {runner?.state && (
                <div className="mt-4 rounded-xl border border-cyan-500/40 bg-neutral-950 p-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-400">
                        <Terminal className="h-3.5 w-3.5" /> {STATE_LABELS[runner.state] ?? runner.state}
                        {runner.target && <span className="text-neutral-400">· {runner.target} {runner.version && `→ v${runner.version}`}</span>}
                        {runner.message && <span className="font-normal text-neutral-500">— {runner.message}</span>}
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-800">
                        <div
                            className={`h-full transition-all duration-700 ${runner.state === 'error' ? 'bg-red-500' : runner.state === 'done' ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                            style={{ width: `${runner.state === 'done' ? 100 : Math.min(95, runner.progress ?? 5)}%` }}
                        />
                    </div>
                    {(runner.output || runner.log?.length) && (
                        <pre
                            ref={(el) => {
                                if (el) el.scrollTop = el.scrollHeight;
                            }}
                            className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-neutral-800 bg-black p-3 font-mono text-[10px] leading-relaxed text-emerald-300/90"
                        >
                            {runner.output || runner.log?.join('\n')}
                        </pre>
                    )}
                </div>
            )}

            <ConfirmDialog
                open={pendingTarget !== null}
                title="CONFIRMAR ACTUALIZACIÓN"
                description={`¿Actualizar ${pendingTarget === 'panel' ? 'el panel' : pendingTarget === 'wings' ? 'Wings' : 'el billing'} a la última versión? El servicio puede tardar unos segundos en responder durante el proceso.`}
                confirmLabel="Actualizar ahora"
                onConfirm={confirmUpdate}
                onCancel={() => setPendingTarget(null)}
            />
        </div>
    );
}
