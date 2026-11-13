import BirthdaySurprise, { type BirthdayToday } from '@/components/birthday-surprise';
import UpdateManager, { type UpdateStatus } from '@/components/update-manager';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import {
    Activity,
    CheckCircle2,
    HelpCircle,
    Info,
    LayoutGrid,
    Newspaper,
    Server,
    Settings,
    Share2,
    Shield,
    Ticket,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface LiveNode {
    id: number;
    name: string;
    online: boolean;
    latency_ms: number | null;
    version: string | null;
    servers_count: number;
    running: number;
    maintenance: boolean;
}

interface DashboardNews {
    id: number;
    title: string;
    category?: string;
    summary?: string;
    picture?: string;
    is_pinned?: boolean;
    created_at?: string;
}

interface DashboardProps {
    liveNodes?: LiveNode[] | null;
    updateStatus?: UpdateStatus | null;
    updates?: { pending: string[]; panel_latest: string | null; wings_latest: string | null } | null;
    roleScope?: 'admin' | 'moderator' | 'client';
    userRole?: string;
    birthday?: BirthdayToday | null;
    latestNews?: DashboardNews[] | null;
    stats?: Record<string, number>;
    weeklyActivity?: {
        labels: string[];
        datasets: Array<{
            label: string;
            data: number[];
            backgroundColor: string;
        }>;
    };
    [key: string]: unknown;
}

export default function Dashboard() {
    const {
        liveNodes,
        birthday,
        updateStatus,
        updates,
        roleScope = 'client',
        userRole = 'Member',
        latestNews = [],
        stats: serverStats = {},
        weeklyActivity,
    } = usePage<DashboardProps>().props;
    const { discordInvite } = usePage<{ discordInvite?: string }>().props;

    const [version, setVersion] = useState('1.0.0');

    useEffect(() => {
        if (roleScope === 'admin') {
            fetch('/api/dashboard-version')
                .then((res) => (res.ok ? res.json() : { version: '1.0.0' }))
                .then((data) => {
                    if (data?.version) setVersion(data.version);
                })
                .catch(() => setVersion('1.0.0'));
        }
    }, [roleScope]);

    // Configuración de métricas / tarjetas según rol
    const getStatsCards = () => {
        if (roleScope === 'admin') {
            return [
                {
                    name: 'Usuarios Totales',
                    value: String(serverStats.users ?? 0),
                    icon: Users,
                    color: 'text-cyan-400',
                    border: 'border-cyan-500/40 hover:border-cyan-400',
                    bg: 'bg-cyan-950/20',
                },
                {
                    name: 'Servidores Globales',
                    value: String(serverStats.servers ?? 0),
                    icon: Server,
                    color: 'text-purple-400',
                    border: 'border-purple-500/40 hover:border-purple-400',
                    bg: 'bg-purple-950/20',
                },
                {
                    name: 'Nodos de Infraestructura',
                    value: String(serverStats.nodes ?? 0),
                    icon: Activity,
                    color: 'text-emerald-400',
                    border: 'border-emerald-500/40 hover:border-emerald-400',
                    bg: 'bg-emerald-950/20',
                },
                {
                    name: 'Eggs / Plantillas',
                    value: String(serverStats.installations ?? 0),
                    icon: Settings,
                    color: 'text-pink-400',
                    border: 'border-pink-500/40 hover:border-pink-400',
                    bg: 'bg-pink-950/20',
                },
                {
                    name: 'Tickets del Sistema',
                    value: String(serverStats.tickets ?? 0),
                    icon: Ticket,
                    color: 'text-amber-400',
                    border: 'border-amber-500/40 hover:border-amber-400',
                    bg: 'bg-amber-950/20',
                },
            ];
        }

        if (roleScope === 'moderator') {
            return [
                {
                    name: 'Tickets Abiertos',
                    value: String(serverStats.openTickets ?? 0),
                    icon: Ticket,
                    color: 'text-amber-400',
                    border: 'border-amber-500/40 hover:border-amber-400',
                    bg: 'bg-amber-950/20',
                },
                {
                    name: 'Total Tickets',
                    value: String(serverStats.totalTickets ?? 0),
                    icon: CheckCircle2,
                    color: 'text-purple-400',
                    border: 'border-purple-500/40 hover:border-purple-400',
                    bg: 'bg-purple-950/20',
                },
                {
                    name: 'Usuarios Registrados',
                    value: String(serverStats.users ?? 0),
                    icon: Users,
                    color: 'text-cyan-400',
                    border: 'border-cyan-500/40 hover:border-cyan-400',
                    bg: 'bg-cyan-950/20',
                },
                {
                    name: 'Servidores en Red',
                    value: String(serverStats.servers ?? 0),
                    icon: Server,
                    color: 'text-blue-400',
                    border: 'border-blue-500/40 hover:border-blue-400',
                    bg: 'bg-blue-950/20',
                },
            ];
        }

        // Cliente estándar / Member / Sponsor
        return [
            {
                name: 'Mis Servidores',
                value: String(serverStats.myServers ?? 0),
                icon: Server,
                color: 'text-cyan-400',
                border: 'border-cyan-500/40 hover:border-cyan-400',
                bg: 'bg-cyan-950/20',
            },
            {
                name: 'Servidores Compartidos',
                value: String(serverStats.sharedServers ?? 0),
                icon: Share2,
                color: 'text-purple-400',
                border: 'border-purple-500/40 hover:border-purple-400',
                bg: 'bg-purple-950/20',
            },
            {
                name: 'Servidores En Línea',
                value: String(serverStats.onlineServers ?? 0),
                icon: Activity,
                color: 'text-emerald-400',
                border: 'border-emerald-500/40 hover:border-emerald-400',
                bg: 'bg-emerald-950/20',
            },
            {
                name: 'Mis Tickets de Soporte',
                value: String(serverStats.myTickets ?? 0),
                icon: Ticket,
                color: 'text-pink-400',
                border: 'border-pink-500/40 hover:border-pink-400',
                bg: 'bg-pink-950/20',
            },
        ];
    };

    const stats = getStatsCards();

    // Adaptar datasets del gráfico
    const chartData = {
        labels: weeklyActivity?.labels ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: (weeklyActivity?.datasets ?? []).map((ds) => ({
            ...ds,
            borderRadius: 6,
        })),
    };

    const headerTitles = {
        admin: {
            title: 'Dashboard de Administración',
            desc: 'Resumen global del sistema Cinammon y estado de infraestructura.',
            badge: 'SUPERADMIN / INFRAESTRUCTURA',
            badgeColor: 'border-purple-500/60 bg-purple-950/80 text-purple-300',
        },
        moderator: {
            title: 'Dashboard de Moderación',
            desc: 'Supervisión de tickets de soporte, usuarios y comunidad.',
            badge: 'EQUIPO DE MODERACIÓN',
            badgeColor: 'border-amber-500/60 bg-amber-950/80 text-amber-300',
        },
        client: {
            title: 'Mi Panel de Control',
            desc: 'Resumen personal de tus servidores, servicios y actividad.',
            badge: userRole.toUpperCase(),
            badgeColor: 'border-cyan-500/60 bg-cyan-950/80 text-cyan-300',
        },
    };

    const currentHeader = headerTitles[roleScope] || headerTitles.client;

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }]}>
            <Head title="Dashboard" />

            <div className="min-h-screen w-full max-w-7xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-8 font-[Orbitron,sans-serif] text-white">
                <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-black via-[#080210] to-black" />
                <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle,#751aff11_1px,transparent_1px)] bg-[length:18px_18px]" />

                {birthday && <BirthdaySurprise birthday={birthday} />}

                {/* Cabecera */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cyan-950/80 pb-6">
                    <div className="flex items-center gap-3.5">
                        <div className="rounded-xl border border-purple-500/40 bg-purple-950/40 p-3 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]">
                            {roleScope === 'admin' ? (
                                <Shield className="h-7 w-7 text-purple-400" />
                            ) : (
                                <LayoutGrid className="h-7 w-7 text-cyan-400" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-widest text-white uppercase">
                                    {currentHeader.title}
                                </h1>
                                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider ${currentHeader.badgeColor}`}>
                                    {currentHeader.badge}
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                                {currentHeader.desc}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Métricas Estadísticas (Grid Responsivo) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {stats.map((stat, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-4 rounded-2xl border ${stat.border} ${stat.bg} p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl`}
                        >
                            <div className={`rounded-xl border border-current/20 bg-black/40 p-3.5 ${stat.color} shadow-inner`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-neutral-400 font-medium truncate">{stat.name}</p>
                                <p className="text-2xl font-bold text-white tracking-wide mt-0.5">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tablón de Últimas Noticias & Novedades */}
                {latestNews && latestNews.length > 0 && (
                    <div className="rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-neutral-950 via-[#18130a] to-neutral-950 p-5 sm:p-6 shadow-xl backdrop-blur">
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-yellow-500/20">
                            <div className="flex items-center gap-2.5">
                                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2 text-yellow-400">
                                    <Newspaper className="h-4 w-4" />
                                </div>
                                <div>
                                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
                                        Novedades & Noticias Oficiales
                                    </h2>
                                    <p className="text-[11px] text-neutral-400">
                                        Últimos comunicados y anuncios de la red
                                    </p>
                                </div>
                            </div>
                            <a
                                href="https://news.cinammon.net"
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-yellow-400 hover:text-yellow-300 transition"
                            >
                                Leer el periódico →
                            </a>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {latestNews.map((news) => (
                                <Link
                                    key={news.id}
                                    href={`/posts?id=${news.id}`}
                                    className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-800/80 bg-black/40 p-4 transition-all duration-300 hover:border-yellow-500/40 hover:bg-neutral-900/60"
                                >
                                    <div className="flex items-center justify-between gap-2 text-[10px] text-neutral-400 mb-2">
                                        <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 font-bold uppercase text-yellow-300">
                                            {news.category || 'Novedad'}
                                        </span>
                                        {news.is_pinned && (
                                            <span className="text-yellow-400 font-semibold flex items-center gap-0.5">
                                                📌 Destacada
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-sm text-white group-hover:text-yellow-400 transition-colors line-clamp-2">
                                        {news.title}
                                    </h3>
                                    {news.summary && (
                                        <p className="mt-1.5 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                                            {news.summary}
                                        </p>
                                    )}
                                    <span className="mt-3 text-[11px] text-neutral-500 font-sans">
                                        {new Date(news.created_at || '').toLocaleDateString('es-ES', {
                                            day: '2-digit',
                                            month: 'short',
                                        })}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Infraestructura en vivo (nodos Wings) */}
                {roleScope === 'admin' && !!liveNodes?.length && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {liveNodes.map((node) => (
                            <div
                                key={node.id}
                                className={`rounded-2xl border p-4 backdrop-blur transition ${
                                    node.maintenance
                                        ? 'border-amber-500/50 bg-amber-950/10'
                                        : node.online
                                        ? 'border-emerald-500/40 bg-emerald-950/10'
                                        : 'border-red-500/50 bg-red-950/10'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2.5">
                                        <span
                                            className={`h-2.5 w-2.5 rounded-full ${
                                                node.maintenance ? 'bg-amber-400' : node.online ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                                            }`}
                                        />
                                        <span className="text-sm font-bold tracking-wider text-white">{node.name}</span>
                                    </div>
                                    <span className="font-mono text-[10px] text-neutral-400">
                                        {node.maintenance ? 'MANTENIMIENTO' : node.online ? `${node.latency_ms} ms` : 'OFFLINE'}
                                    </span>
                                </div>
                                <div className="mt-3 flex items-center justify-between text-xs text-neutral-300">
                                    <span>
                                        <span className="font-bold text-white">{node.running}</span>/{node.servers_count} servidores en marcha
                                    </span>
                                    {node.version && <span className="font-mono text-cyan-400">wings {node.version}</span>}
                                </div>
                                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-neutral-800">
                                    <div
                                        className="h-full bg-emerald-400"
                                        style={{ width: `${node.servers_count ? Math.round((node.running / node.servers_count) * 100) : 0}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Gráfico de Actividad Semanal (compacto) */}
                {chartData.datasets.length > 0 && (
                    <div className="rounded-2xl border border-purple-500/30 bg-black/40 p-4 shadow-[0_0_20px_rgba(117,26,255,0.15)] backdrop-blur">
                        <div className="mb-3 flex items-center gap-2.5 text-purple-300">
                            <TrendingUp className="h-4 w-4 text-purple-400" />
                            <h2 className="text-sm font-bold tracking-wider">
                                {roleScope === 'admin'
                                    ? 'Actividad Semanal del Sistema'
                                    : roleScope === 'moderator'
                                    ? 'Actividad Semanal de Soporte'
                                    : 'Tu Actividad Semanal'}
                            </h2>
                        </div>
                        <div className="h-36 sm:h-44 w-full">
                            <Bar
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            labels: {
                                                color: '#bbb',
                                                font: { family: 'Orbitron', size: 10 },
                                                boxWidth: 10,
                                            },
                                        },
                                    },
                                    scales: {
                                        x: {
                                            ticks: { color: '#888', font: { family: 'Orbitron', size: 9 } },
                                            grid: { display: false },
                                        },
                                        y: {
                                            beginAtZero: true,
                                            ticks: { color: '#888', stepSize: 1, font: { family: 'Orbitron', size: 9 } },
                                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Gestor de actualizaciones embebido en el dashboard */}
                {roleScope === 'admin' && updateStatus && <UpdateManager status={updateStatus} />}

                {/* Información exclusiva para Administradores */}
                {roleScope === 'admin' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-purple-500/30 bg-black/40 p-5 shadow-md flex items-center justify-between gap-4 flex-wrap">
                            <p className="flex items-center gap-2.5 text-sm text-purple-300 font-medium">
                                <Settings className="h-4 w-4 text-emerald-400" />
                                <span>Versión del Sistema:</span>
                                <span className="font-mono font-bold text-white bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-800">
                                    v{version}
                                </span>
                            </p>
                            {updates?.pending?.length ? (
                                <span className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-500/60 bg-fuchsia-950/50 px-3.5 py-1.5 text-xs font-bold text-fuchsia-200 animate-pulse">
                                    <TrendingUp className="h-3.5 w-3.5" />
                                    {updates.pending.includes('panel')
                                        ? `Panel v${updates.panel_latest} disponible`
                                        : `Wings v${updates.wings_latest} disponible`}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Al día
                                </span>
                            )}
                        </div>

                        <div className="rounded-2xl border border-purple-500/30 bg-black/40 p-5 shadow-md flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-2.5">
                                <Info className="h-5 w-5 text-cyan-400" />
                                <div>
                                    <h3 className="text-sm font-bold text-white">Reporte de Bugs</h3>
                                    <p className="text-xs text-neutral-400">Canal directo en GitHub Issues</p>
                                </div>
                            </div>
                            <a
                                href="https://github.com/cinammon-net/panel/issues/new"
                                className="rounded-xl border border-purple-500/60 bg-purple-950/40 px-3.5 py-1.5 text-xs font-semibold text-purple-200 hover:bg-purple-900/60 transition"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Abrir Issue
                            </a>
                        </div>
                    </div>
                )}

                {/* Ayuda y Soporte Comunitario (Disponible para todos los roles) */}
                <div className="rounded-2xl border border-cyan-800/40 bg-black/40 p-5 sm:p-6 shadow-md backdrop-blur flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-2.5 text-cyan-400">
                            <HelpCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">¿Necesitas Ayuda o Soporte?</h3>
                            <p className="text-xs text-neutral-400 mt-0.5">
                                Consulta la documentación oficial o únete al servidor de Discord.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href="https://wiki.cinammon.net"
                            className="rounded-xl border border-cyan-700/60 bg-cyan-950/40 px-4 py-2 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:text-white transition"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Documentación
                        </a>
                        <a
                            href={discordInvite}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-[0_0_12px_rgba(99,102,241,0.3)]"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Discord
                        </a>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
