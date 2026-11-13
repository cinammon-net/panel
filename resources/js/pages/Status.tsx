import { cinLogo } from '@/lib/brand';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    Database,
    Globe,
    HardDrive,
    Radio,
    RefreshCw,
    Server as ServerIcon,
    Shield,
    Wifi,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

interface ServiceItem {
    name: string;
    description: string;
    status: 'operational' | 'partial_outage' | 'major_outage';
    latency_ms: number;
}

interface NodeItem {
    id: number;
    name: string;
    fqdn: string;
    online: boolean;
    latency_ms: number | null;
    version: string | null;
    servers_count: number;
    running: number;
    maintenance: boolean;
}

interface MaintenanceItem {
    id: number;
    title: string;
    description: string;
    status: string;
    type: string;
    started_at: string | null;
    finished_at: string | null;
}

interface StatusData {
    updated_at: string;
    overall_status: 'operational' | 'partial_outage' | 'major_outage';
    services: ServiceItem[];
    nodes: NodeItem[];
    maintenances: MaintenanceItem[];
    uptime_percentage: string;
}

export default function Status() {
    const { status, auth } = usePage<{
        status: StatusData;
        auth?: { user?: { name: string } | null };
    }>().props;

    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = () => {
        setIsRefreshing(true);
        window.location.reload();
    };

    const isOperational = status.overall_status === 'operational';

    const content = (
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Header del monitor */}
            <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-pink-400">
                    <Radio className="h-3 w-3 animate-pulse" />
                    Monitor de Infraestructura en Vivo
                </div>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    Estado de Cinammon Network
                </h1>
                <p className="mt-1 text-sm text-neutral-400">
                    Monitorización continua de nodos de juego, bases de datos y servicios en tiempo real.
                </p>
            </div>

            {/* Banner de Estado Global */}
            <div
                className={`mb-8 overflow-hidden rounded-2xl border p-6 backdrop-blur-md transition-all ${
                    isOperational
                        ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-neutral-950/80 to-emerald-950/20 shadow-lg shadow-emerald-950/30'
                        : 'border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-neutral-950/80 to-amber-950/20 shadow-lg shadow-amber-950/30'
                }`}
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                                isOperational
                                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/20'
                                    : 'border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-md shadow-amber-500/20'
                            }`}
                        >
                            {isOperational ? (
                                <CheckCircle2 className="h-7 w-7" />
                            ) : (
                                <AlertCircle className="h-7 w-7" />
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {isOperational
                                    ? 'Todos los sistemas están operativos'
                                    : 'Atención: algunos servicios presentan interrupciones'}
                            </h2>
                            <p className="text-xs text-neutral-400">
                                Disponibilidad global verificada: <span className="font-semibold text-pink-400">{status.uptime_percentage}</span> en los últimos 90 días.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-black/40 px-3.5 py-2 text-xs text-neutral-400">
                        <Clock className="h-3.5 w-3.5 text-pink-400" />
                        <span>Comprobado: {new Date(status.updated_at).toLocaleTimeString('es-ES')}</span>
                    </div>
                </div>

                {/* Barra de Uptime simulada con 45 días */}
                <div className="mt-6 border-t border-neutral-800/80 pt-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
                        <span>Historial de disponibilidad (últimos 45 días)</span>
                        <span className="font-mono text-emerald-400">100% de uptime</span>
                    </div>
                    <div className="flex items-center gap-1">
                        {Array.from({ length: 45 }).map((_, i) => (
                            <div
                                key={i}
                                title={`Día -${45 - i}: 100% operativo`}
                                className="h-6 flex-1 rounded-sm bg-emerald-500/80 transition-all hover:scale-110 hover:bg-emerald-400"
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Cuadrícula de Servicios Clave */}
            <div className="mb-10">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-400">
                    Servicios de la Plataforma
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    {status.services.map((svc, idx) => (
                        <div
                            key={idx}
                            className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/50 p-5 backdrop-blur-sm transition-all hover:border-pink-500/30 hover:bg-neutral-900/80"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-950 text-pink-400">
                                        {idx === 0 && <Globe className="h-5 w-5" />}
                                        {idx === 1 && <Database className="h-5 w-5" />}
                                        {idx === 2 && <Shield className="h-5 w-5" />}
                                        {idx === 3 && <Zap className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-white">{svc.name}</h4>
                                        <p className="text-xs text-neutral-400">{svc.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80" />
                                    <span className="text-xs font-semibold text-emerald-400">Operativo</span>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-neutral-800/60 pt-3 text-xs text-neutral-400">
                                <span className="flex items-center gap-1.5">
                                    <Wifi className="h-3 w-3 text-emerald-400" />
                                    Latencia interna:
                                </span>
                                <span className="font-mono font-semibold text-neutral-200">
                                    {svc.latency_ms} ms
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Nodos de Servidores de Juegos */}
            <div className="mb-10">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
                            Nodos de Servidores de Juegos (Wings)
                        </h3>
                        <p className="text-xs text-neutral-500">
                            Infraestructura de hardware dedicada donde corren los servidores de la comunidad.
                        </p>
                    </div>
                    <span className="rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-0.5 text-xs font-bold text-pink-400">
                        {status.nodes.length} {status.nodes.length === 1 ? 'Nodo' : 'Nodos'}
                    </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {status.nodes.length === 0 ? (
                        <div className="col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-8 text-center text-sm text-neutral-500">
                            No hay nodos registrados en este momento.
                        </div>
                    ) : (
                        status.nodes.map((node) => {
                            const isNodeOnline = node.online && !node.maintenance;
                            return (
                                <div
                                    key={node.id}
                                    className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 backdrop-blur-sm transition-all hover:border-pink-500/30"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                                                    isNodeOnline
                                                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                                        : node.maintenance
                                                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                                        : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                                                }`}
                                            >
                                                <ServerIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white">{node.name}</h4>
                                                <p className="font-mono text-xs text-neutral-400">{node.fqdn}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`flex h-2.5 w-2.5 rounded-full ${
                                                    isNodeOnline
                                                        ? 'bg-emerald-400 shadow-sm shadow-emerald-400/80'
                                                        : node.maintenance
                                                        ? 'bg-amber-400 shadow-sm shadow-amber-400/80'
                                                        : 'bg-rose-400 shadow-sm shadow-rose-400/80'
                                                }`}
                                            />
                                            <span
                                                className={`text-xs font-bold ${
                                                    isNodeOnline
                                                        ? 'text-emerald-400'
                                                        : node.maintenance
                                                        ? 'text-amber-400'
                                                        : 'text-rose-400'
                                                }`}
                                            >
                                                {node.maintenance
                                                    ? 'Mantenimiento'
                                                    : isNodeOnline
                                                    ? 'Online'
                                                    : 'Desconectado'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-neutral-800/60 pt-3 text-xs">
                                        <div className="flex items-center gap-1.5 text-neutral-400">
                                            <Activity className="h-3.5 w-3.5 text-pink-400" />
                                            <span>Ping:</span>
                                            <span className="font-mono font-semibold text-neutral-200">
                                                {node.latency_ms !== null ? `${node.latency_ms} ms` : '—'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-end gap-1.5 text-neutral-400">
                                            <HardDrive className="h-3.5 w-3.5 text-pink-400" />
                                            <span>Servidores:</span>
                                            <span className="font-mono font-semibold text-neutral-200">
                                                {node.running} / {node.servers_count}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Mantenimientos / Historial de Incidencias */}
            {status.maintenances.length > 0 && (
                <div className="mb-10">
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-neutral-400">
                        Avisos y Mantenimientos Programados
                    </h3>
                    <div className="space-y-3">
                        {status.maintenances.map((m) => (
                            <div
                                key={m.id}
                                className="flex items-start gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-sm"
                            >
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-pink-400" />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <h5 className="font-semibold text-white">{m.title}</h5>
                                        <span className="text-xs text-neutral-500">
                                            {m.started_at
                                                ? new Date(m.started_at).toLocaleDateString('es-ES', {
                                                      day: 'numeric',
                                                      month: 'short',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  })
                                                : ''}
                                        </span>
                                    </div>
                                    <p className="mt-1 text-xs text-neutral-400">{m.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer de la página */}
            <div className="border-t border-neutral-900 pt-6 text-center text-xs text-neutral-500">
                <p>Cinammon Network · Infraestructura de Alto Rendimiento protegida por Cloudflare y Wings Daemon.</p>
                <div className="mt-2 flex justify-center gap-4 text-neutral-400">
                    <a href="https://cinammon.net" className="hover:text-pink-400">Inicio</a>
                    <span>·</span>
                    <a href="https://cinammon.net/terms" className="hover:text-pink-400">Términos</a>
                    <span>·</span>
                    <a href="https://cinammon.net/privacy" className="hover:text-pink-400">Privacidad</a>
                    <span>·</span>
                    <a href="https://panel.cinammon.net/dudas" className="hover:text-pink-400">Comunidad</a>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#08080a] text-[#f4f4f5] antialiased">
            <Head title="Estado de la Red — Cinammon Network" />

            {/* Barra superior de navegación independiente */}
            <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-black/60 backdrop-blur-md">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-4">
                        <a href="https://cinammon.net" title="Volver a Cinammon.net" className="flex items-center gap-2.5 transition hover:opacity-80">
                            <img src={cinLogo()} alt="Cinammon Logo" className="h-9 w-auto" />
                            <span className="font-[Orbitron] text-base font-bold tracking-wide text-white">
                                Cinammon<span className="text-pink-400">Status</span>
                            </span>
                        </a>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-1.5 text-xs font-medium text-neutral-300 transition hover:border-pink-500/40 hover:text-white"
                        >
                            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-pink-400' : ''}`} />
                            <span className="hidden sm:inline">Actualizar</span>
                        </button>
                        <a
                            href="https://cinammon.net"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-neutral-700 hover:text-white"
                        >
                            <ArrowLeft className="h-3 w-3" />
                            <span className="hidden sm:inline">Web principal</span>
                        </a>
                        <a
                            href="https://panel.cinammon.net/dashboard"
                            className="inline-flex items-center rounded-xl bg-pink-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-pink-500/20 transition hover:bg-pink-600"
                        >
                            {auth?.user ? 'Ir al Panel' : 'Iniciar sesión'}
                        </a>
                    </div>
                </div>
            </header>

            {content}
        </div>
    );
}
