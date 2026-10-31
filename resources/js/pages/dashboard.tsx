import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import {
    Activity,
    CheckCircle2,
    HelpCircle,
    Info,
    LayoutGrid,
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

interface DashboardProps {
    roleScope?: 'admin' | 'moderator' | 'client';
    userRole?: string;
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
        roleScope = 'client',
        userRole = 'Member',
        stats: serverStats = {},
        weeklyActivity,
    } = usePage<DashboardProps>().props;

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

                {/* Gráfico de Actividad Semanal */}
                {chartData.datasets.length > 0 && (
                    <div className="rounded-2xl border border-purple-500/30 bg-black/40 p-5 sm:p-6 shadow-[0_0_20px_rgba(117,26,255,0.15)] backdrop-blur">
                        <div className="mb-4 flex items-center gap-2.5 text-purple-300">
                            <TrendingUp className="h-5 w-5 text-purple-400" />
                            <h2 className="text-lg font-bold tracking-wider">
                                {roleScope === 'admin'
                                    ? 'Actividad Semanal del Sistema'
                                    : roleScope === 'moderator'
                                    ? 'Actividad Semanal de Soporte'
                                    : 'Tu Actividad Semanal'}
                            </h2>
                        </div>
                        <div className="h-64 sm:h-80 w-full">
                            <Bar
                                data={chartData}
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            labels: {
                                                color: '#bbb',
                                                font: { family: 'Orbitron', size: 11 },
                                                boxWidth: 14,
                                            },
                                        },
                                    },
                                    scales: {
                                        x: {
                                            ticks: { color: '#888', font: { family: 'Orbitron', size: 10 } },
                                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                                        },
                                        y: {
                                            beginAtZero: true,
                                            ticks: { color: '#888', stepSize: 1, font: { family: 'Orbitron', size: 10 } },
                                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                                        },
                                    },
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Información exclusiva para Administradores */}
                {roleScope === 'admin' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-purple-500/30 bg-black/40 p-5 shadow-md">
                            <p className="flex items-center gap-2.5 text-sm text-purple-300 font-medium">
                                <Settings className="h-4 w-4 text-emerald-400" />
                                <span>Versión del Sistema:</span>
                                <span className="font-mono font-bold text-white bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-800">
                                    v{version}
                                </span>
                            </p>
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
                            href="https://discord.gg/hikarinet"
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
