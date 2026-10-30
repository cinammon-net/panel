import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { HelpCircle, Info, Server, Settings, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DashboardProps {
    stats?: {
        users: number;
        servers: number;
        installations: number;
        nodes?: number;
    };
    weeklyActivity?: {
        labels: string[];
        installations: number[];
        newUsers: number[];
        errors: number[];
    };
    [key: string]: unknown;
}

export default function Dashboard() {
    const { stats: serverStats, weeklyActivity } = usePage<DashboardProps>().props;
    const [version, setVersion] = useState('1.0.0');

    const chartData = {
        labels: weeklyActivity?.labels ?? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Installations (Servers)',
                data: weeklyActivity?.installations ?? [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(180, 118, 255, 0.7)',
                borderRadius: 5,
            },
            {
                label: 'New Users',
                data: weeklyActivity?.newUsers ?? [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(90, 200, 250, 0.7)',
                borderRadius: 5,
            },
            {
                label: 'Errors',
                data: weeklyActivity?.errors ?? [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: 'rgba(255, 100, 130, 0.7)',
                borderRadius: 5,
            },
        ],
    };

    const stats = [
        { name: 'Users', value: String(serverStats?.users ?? 0), icon: Users, color: 'text-cyan-400' },
        { name: 'Servers', value: String(serverStats?.servers ?? 0), icon: Server, color: 'text-purple-400' },
        { name: 'Eggs / Presets', value: String(serverStats?.installations ?? 0), icon: Settings, color: 'text-pink-400' },
    ];

    useEffect(() => {
        fetch('/api/dashboard-version')
            .then((res) => (res.ok ? res.json() : { version: '1.0.0' }))
            .then((data) => {
                if (data?.version) setVersion(data.version);
            })
            .catch(() => setVersion('1.0.0'));
    }, []);

    return (
        <AppLayout breadcrumbs={[{ title: 'Dashboard', href: '/dashboard' }]}>
            <Head title="Dashboard">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen w-full space-y-10 px-6 py-10 font-[Orbitron,sans-serif] text-white">
                <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-black via-[#0d0118] to-black" />
                <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle,#751aff11_1px,transparent_1px)] bg-[length:18px_18px]" />

                <div>
                    <h1 className="text-3xl font-bold tracking-widest text-purple-300 uppercase">Dashboard</h1>
                    <p className="text-sm text-purple-500">Real-time system summary for Cinammon.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat, i) => (
                        <div
                            key={i}
                            className={`flex items-center gap-4 rounded-xl border border-purple-600/50 bg-black/30 p-6 shadow-[0_0_15px_#751aff22] backdrop-blur-md transition hover:border-purple-400`}
                        >
                            <div className={`rounded-md bg-purple-800/20 p-3 ${stat.color}`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm text-purple-400">{stat.name}</p>
                                <p className="text-2xl font-bold text-white">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="rounded-xl border border-purple-600/40 bg-black/30 p-6 shadow-[0_0_10px_#751aff44] backdrop-blur">
                    <div className="mb-4 flex items-center gap-3 text-purple-300">
                        <TrendingUp className="h-5 w-5" />
                        <h2 className="text-xl font-semibold">Weekly Activity</h2>
                    </div>
                    <Bar
                        data={chartData}
                        options={{
                            responsive: true,
                            plugins: {
                                legend: {
                                    labels: { color: '#bbb', font: { family: 'Orbitron' } },
                                },
                            },
                            scales: {
                                x: { ticks: { color: '#aaa', font: { family: 'Orbitron' } } },
                                y: {
                                    beginAtZero: true,
                                    ticks: { color: '#aaa', stepSize: 1, font: { family: 'Orbitron' } },
                                },
                            },
                        }}
                    />
                </div>

                <div className="rounded-xl border border-purple-600/40 bg-black/30 p-4 text-sm text-purple-300 shadow-[0_0_10px_#751aff44]">
                    <p className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-green-400" />
                        System Running: <span className="font-bold text-white">{version}</span>
                    </p>
                </div>

                <div className="rounded-xl border border-purple-600/40 bg-black/30 p-6 shadow-[0_0_10px_#751aff44] backdrop-blur">
                    <div className="mb-3 flex items-center gap-3">
                        <Info className="h-5 w-5 text-blue-400" />
                        <h2 className="text-lg font-semibold text-white">Developer Info</h2>
                    </div>
                    <p className="mb-4 text-sm text-purple-400">If you find a bug or security issue, please report it on GitHub.</p>
                    <a
                        href="https://github.com/cinammon-net/panel/issues/new"
                        className="inline-block rounded-md border border-purple-500 bg-black px-4 py-2 text-sm text-purple-200 hover:bg-purple-700/20"
                        target="_blank"
                    >
                        Open Issue
                    </a>
                </div>

                <div className="rounded-xl border border-purple-600/40 bg-black/30 p-6 shadow-[0_0_10px_#751aff44] backdrop-blur">
                    <div className="mb-3 flex items-center gap-3">
                        <HelpCircle className="h-5 w-5 text-indigo-400" />
                        <h2 className="text-lg font-semibold text-white">Need Help?</h2>
                    </div>
                    <p className="mb-4 text-sm text-purple-400">Check the documentation or join the Hikarinet Discord.</p>
                    <div className="flex gap-2">
                        <a
                            href="https://wiki.cinammon.net"
                            className="rounded-md border border-purple-500 bg-purple-900/20 px-4 py-2 text-sm text-white hover:bg-purple-700/40"
                            target="_blank"
                        >
                            Documentation
                        </a>
                        <a
                            href="https://discord.gg/hikarinet"
                            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-500"
                            target="_blank"
                        >
                            Discord
                        </a>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
