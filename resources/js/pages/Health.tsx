import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Activity, CheckCircle2, Cpu, Database, HardDrive, HeartPulse, RefreshCw, Server, ShieldAlert, Users } from 'lucide-react';
import { useState } from 'react';

interface NodeHealth {
    id: number;
    name: string;
    fqdn: string;
    port: number;
    scheme: string;
    memory: number;
    disk: number;
    servers_count: number;
    online: boolean;
    latency_ms: number | null;
    wings_version: string;
    maintenance_mode: boolean;
}

interface SystemHealth {
    panel_version: string;
    php_version: string;
    laravel_version: string;
    environment: string;
    db_connected: boolean;
    db_driver: string;
    db_latency_ms: number;
    cache_working: boolean;
    queue_driver: string;
    counts: {
        users: number;
        servers: number;
        nodes: number;
        eggs: number;
    };
}

interface Props {
    system: SystemHealth;
    nodes: NodeHealth[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Health', href: '/health' }];

export default function Health({ system, nodes = [] }: Props) {
    const [refreshing, setRefreshing] = useState(false);

    const handleRefresh = () => {
        setRefreshing(true);
        router.reload({
            onFinish: () => setRefreshing(false),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="System Health" />
            <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-500/30 pb-4">
                    <div className="flex items-center gap-3">
                        <HeartPulse className="h-8 w-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-wider text-orange-400">SYSTEM HEALTH MONITOR</h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Estado en tiempo real del panel, base de datos y demonios Wings
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="flex items-center gap-2 rounded-lg border border-orange-500 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-black disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Actualizar Estado
                    </button>
                </div>

                {/* Resumen de Servicios Core */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border border-orange-500/40 bg-neutral-900/80 p-4 shadow-[0_0_15px_rgba(251,146,60,0.1)]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-neutral-400">PANEL VERSION</span>
                            <Activity className="h-5 w-5 text-orange-400" />
                        </div>
                        <p className="mt-2 text-xl font-bold text-white">v{system.panel_version}</p>
                        <p className="mt-1 text-xs text-neutral-400">
                            PHP {system.php_version} · Laravel {system.laravel_version}
                        </p>
                    </div>

                    <div className="rounded-xl border border-emerald-500/40 bg-neutral-900/80 p-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-neutral-400">DATABASE ({system.db_driver.toUpperCase()})</span>
                            <Database className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <CheckCircle2 className={`h-5 w-5 ${system.db_connected ? 'text-emerald-400' : 'text-red-500'}`} />
                            <span className="text-xl font-bold text-white">{system.db_connected ? 'ONLINE' : 'OFFLINE'}</span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400">Latencia: {system.db_latency_ms} ms</p>
                    </div>

                    <div className="rounded-xl border border-cyan-500/40 bg-neutral-900/80 p-4 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-neutral-400">CACHE & QUEUE</span>
                            <Cpu className="h-5 w-5 text-cyan-400" />
                        </div>
                        <p className="mt-2 text-xl font-bold text-white">{system.cache_working ? 'HEALTHY' : 'DEGRADED'}</p>
                        <p className="mt-1 text-xs text-neutral-400">Queue Driver: {system.queue_driver}</p>
                    </div>

                    <div className="rounded-xl border border-pink-500/40 bg-neutral-900/80 p-4 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-neutral-400">RECURSOS ACTIVOS</span>
                            <Users className="h-5 w-5 text-pink-400" />
                        </div>
                        <p className="mt-2 text-xl font-bold text-white">
                            {system.counts.servers} Servers / {system.counts.nodes} Nodes
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                            {system.counts.users} Usuarios · {system.counts.eggs} Eggs
                        </p>
                    </div>
                </div>

                {/* Estado de los Nodos Wings */}
                <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-orange-400">
                        <Server className="h-5 w-5" /> Estado de Nodos (Wings Daemon)
                    </h2>

                    {nodes.length === 0 ? (
                        <div className="rounded-lg border border-neutral-800 p-8 text-center text-neutral-400">
                            No hay nodos registrados todavía.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                    <tr>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Nodo</th>
                                        <th className="px-4 py-3">Endpoint</th>
                                        <th className="px-4 py-3">Versión Wings</th>
                                        <th className="px-4 py-3">Servidores</th>
                                        <th className="px-4 py-3">Memoria / Disco</th>
                                        <th className="px-4 py-3">Latencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {nodes.map((node) => (
                                        <tr key={node.id} className="hover:bg-orange-500/5">
                                            <td className="px-4 py-3">
                                                {node.maintenance_mode ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-400">
                                                        <ShieldAlert className="h-3.5 w-3.5" /> Mantenimiento
                                                    </span>
                                                ) : node.online ? (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-400">
                                                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Online
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400">
                                                        <span className="h-2 w-2 rounded-full bg-red-400" /> Offline
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-white">{node.name}</td>
                                            <td className="px-4 py-3 text-neutral-300">
                                                {node.scheme}://{node.fqdn}:{node.port}
                                            </td>
                                            <td className="px-4 py-3 text-cyan-400">{node.wings_version}</td>
                                            <td className="px-4 py-3 text-neutral-300">{node.servers_count}</td>
                                            <td className="px-4 py-3 text-neutral-300">
                                                <span className="inline-flex items-center gap-1">
                                                    <HardDrive className="h-3.5 w-3.5 text-orange-400" />
                                                    {node.memory} MB / {node.disk} MB
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-300">
                                                {node.latency_ms !== null ? `${node.latency_ms} ms` : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

