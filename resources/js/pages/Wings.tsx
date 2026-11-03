import WingsConsole from '@/components/wings-console';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2, Cpu, Info, Lock, ServerCog, ShieldCheck, Terminal, XCircle } from 'lucide-react';
import { type ReactNode, useEffect } from 'react';

interface Isolation {
    privileged: boolean;
    no_new_privileges: boolean;
    readonly_rootfs: boolean;
    capabilities_dropped: number;
    memory_limited: boolean;
    pids_limited: boolean;
}

interface Container {
    server: string;
    image: string;
    status: string;
    cpu_percent: number | null;
    memory_mb: number | null;
    isolation: Isolation | null;
}

interface Telemetry {
    generated_at: number;
    wings: { service: string; started_at: number | null; memory_mb: number | null; cpu_seconds: number; restarts: number };
    ports: { wings_api: string; sftp: string };
    containers: Container[];
    host: { load: number[]; cpus: number; memory_used_mb: number; memory_total_mb: number; disk_used_gb: number; disk_total_gb: number; uptime_hours: number };
    security: null | {
        sftp_failed_logins_24h: number;
        sftp_failed_sources_24h: number;
        fail2ban: Record<string, { banned_now: number; banned_total: number }>;
    };
}

interface Check {
    label: string;
    status: 'ok' | 'warn' | 'fail' | 'info';
    detail: string;
}

interface PageProps {
    mode: 'real' | 'demo';
    tier: 'owner' | 'full' | 'ops' | 'own';
    node: { name: string; online: boolean; maintenance: boolean } | null;
    telemetry: Telemetry | null;
    checks: Check[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Wings', href: '/wings' }];

const uptime = (since: number | null) => {
    if (!since) return '—';
    const seconds = Math.max(0, Math.floor(Date.now() / 1000) - since);
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
};

const STATUS_STYLE: Record<Check['status'], { icon: typeof Info; color: string }> = {
    ok: { icon: CheckCircle2, color: 'text-emerald-400' },
    warn: { icon: AlertTriangle, color: 'text-yellow-400' },
    fail: { icon: XCircle, color: 'text-rose-400' },
    info: { icon: Info, color: 'text-cyan-400' },
};

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
    return (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-cyan-900/60 dark:bg-neutral-900/60">
            <p className="text-[10px] font-bold tracking-wider text-neutral-500 uppercase dark:text-neutral-400">{label}</p>
            <p className="mt-1 text-xl font-black text-neutral-900 dark:text-white">{value}</p>
            {sub && <p className="mt-0.5 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">{sub}</p>}
        </div>
    );
}

function Badge({ ok, children }: { ok: boolean; children: ReactNode }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${ok ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300'}`}>
            {children}
        </span>
    );
}

export default function WingsPage({ mode, tier, node, telemetry, checks }: PageProps) {
    useEffect(() => {
        const timer = setInterval(() => router.reload({ only: ['telemetry', 'checks', 'node'] }), 15000);
        return () => clearInterval(timer);
    }, []);

    const passed = checks.filter((c) => c.status === 'ok').length;
    const fails = checks.filter((c) => c.status === 'fail').length;
    const warns = checks.filter((c) => c.status === 'warn').length;
    const t = telemetry;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Wings · Estado y seguridad" />
            <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-4 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-cyan-900/60">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase sm:text-2xl dark:text-white">Wings · Estado y seguridad</h1>
                            <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">
                                {node ? <>Nodo <span className="font-semibold text-cyan-500">{node.name}</span></> : 'Sin nodo configurado'}
                                {' · '}Acceso: {tier === 'owner' ? 'propietario (vista sin depurar)' : tier === 'full' ? 'administrador (vista completa)' : 'soporte (vista operativa)'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 font-mono text-[11px] font-bold ${mode === 'real' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300'}`}>
                            {mode === 'real' ? 'WINGS REAL' : 'WINGS DE LA DEMO · SIMULADO'}
                        </span>
                        {node && (
                            <span className={`rounded-full border px-3 py-1 font-mono text-[11px] font-bold ${node.online ? 'border-emerald-500/50 text-emerald-300' : 'border-rose-500/50 text-rose-300'}`}>
                                {node.maintenance ? 'MANTENIMIENTO' : node.online ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        )}
                    </div>
                </div>

                {!t && (
                    <div className="flex items-start gap-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p>No hay datos recientes del recolector de Wings. Comprueba que el servicio <code>cinammon-wings-snapshot.timer</code> esté activo.</p>
                    </div>
                )}

                {t && (
                    <>
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Stat label="Servicio Wings" value={t.wings.service === 'active' ? 'Activo' : t.wings.service} sub={`Activo desde hace ${uptime(t.wings.started_at)} · reinicios: ${t.wings.restarts}`} />
                            <Stat label="Servidores" value={`${t.containers.length}`} sub={`${t.containers.filter((c) => c.status.startsWith('Up') || c.status.startsWith('En marcha')).length} en marcha`} />
                            <Stat label="Memoria del anfitrión" value={`${Math.round((t.host.memory_used_mb / t.host.memory_total_mb) * 100)} %`} sub={`${(t.host.memory_used_mb / 1024).toFixed(1)} de ${(t.host.memory_total_mb / 1024).toFixed(0)} GB · carga ${t.host.load[0]}`} />
                            <Stat label="Disco" value={`${t.host.disk_used_gb} GB`} sub={`de ${t.host.disk_total_gb} GB`} />
                        </div>

                        {checks.length > 0 && (
                        <section className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-cyan-900/60 dark:bg-neutral-900/60">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyan-600 uppercase dark:text-cyan-400">
                                    <Lock className="h-4 w-4" /> Seguridad
                                </h2>
                                <span className="font-mono text-xs text-neutral-500 dark:text-neutral-400">
                                    {passed} de {checks.length} comprobaciones correctas{fails > 0 && ` · ${fails} críticas`}{warns > 0 && ` · ${warns} recomendadas`}
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                                <div className={`h-full ${fails > 0 ? 'bg-rose-500' : warns > 0 ? 'bg-yellow-400' : 'bg-emerald-400'}`} style={{ width: `${checks.length ? (passed / checks.length) * 100 : 0}%` }} />
                            </div>
                            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                                {checks.map((c) => {
                                    const { icon: Icon, color } = STATUS_STYLE[c.status];
                                    return (
                                        <li key={c.label} className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white/60 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-950/40">
                                            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                                            <div>
                                                <p className="text-sm font-semibold text-neutral-900 dark:text-white">{c.label}</p>
                                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{c.detail}</p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                        )}

                        {t.security && (
                            <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <Stat label="Intentos SFTP fallidos (24 h)" value={t.security.sftp_failed_logins_24h.toLocaleString('es-ES')} sub={`desde ${t.security.sftp_failed_sources_24h} origen(es)`} />
                                {Object.entries(t.security.fail2ban).map(([jail, v]) => (
                                    <Stat key={jail} label={`fail2ban · ${jail}`} value={`${v.banned_now} bloqueadas`} sub={`${v.banned_total} en total`} />
                                ))}
                            </section>
                        )}

                        <section className="space-y-3">
                            <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyan-600 uppercase dark:text-cyan-400">
                                <Terminal className="h-4 w-4" /> Consola de Wings
                            </h2>
                            <WingsConsole endpoint="/wings/log" />
                        </section>

                        <section className="space-y-3">
                            <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyan-600 uppercase dark:text-cyan-400">
                                <ServerCog className="h-4 w-4" /> Servidores en este nodo
                            </h2>
                            <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-cyan-900/60">
                                <table className="w-full min-w-[720px] text-left text-xs">
                                    <thead className="border-b border-neutral-200 text-[10px] tracking-wider text-neutral-500 uppercase dark:border-cyan-900/60 dark:text-neutral-400">
                                        <tr>
                                            <th className="px-4 py-3">Servidor</th>
                                            <th className="px-4 py-3">Imagen</th>
                                            <th className="px-4 py-3">Estado</th>
                                            <th className="px-4 py-3">CPU</th>
                                            <th className="px-4 py-3">Memoria</th>
                                            <th className="px-4 py-3">Aislamiento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {t.containers.map((c) => (
                                            <tr key={c.server + c.image} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                                                <td className="px-4 py-3 font-bold text-neutral-900 dark:text-white">{c.server}</td>
                                                <td className="px-4 py-3 font-mono text-neutral-600 dark:text-neutral-300">{c.image}</td>
                                                <td className="px-4 py-3 text-neutral-700 dark:text-neutral-200">{c.status}</td>
                                                <td className="px-4 py-3 font-mono">{c.cpu_percent !== null ? `${c.cpu_percent} %` : '—'}</td>
                                                <td className="px-4 py-3 font-mono">{c.memory_mb !== null ? `${c.memory_mb} MB` : '—'}</td>
                                                <td className="px-4 py-3">
                                                    {c.isolation ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            <Badge ok={!c.isolation.privileged}>sin privilegios</Badge>
                                                            <Badge ok={c.isolation.readonly_rootfs}>solo lectura</Badge>
                                                            <Badge ok={c.isolation.capabilities_dropped > 0}>{c.isolation.capabilities_dropped} caps retiradas</Badge>
                                                            <Badge ok={c.isolation.memory_limited}>{c.isolation.memory_limited ? 'RAM limitada' : 'RAM sin límite'}</Badge>
                                                        </div>
                                                    ) : (
                                                        <span className="text-neutral-500">simulado</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <p className="flex items-center gap-2 font-mono text-[11px] text-neutral-500 dark:text-neutral-400">
                            <Cpu className="h-3.5 w-3.5" />
                            Instantánea de hace {Math.max(0, Math.floor(Date.now() / 1000) - t.generated_at)} s · se actualiza sola{tier === 'owner' ? ' · vista sin depurar (incluye IPs).' : ' · no se muestran IPs, tokens ni registros.'}
                        </p>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
