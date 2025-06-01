import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Title, Tooltip } from 'chart.js';
import { HelpCircle, Info, Server, Settings, TrendingUp, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
    const [version, setVersion] = useState('1.0.0'); 

    const chartData = {
        labels: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
        datasets: [
            {
                label: 'Usuarios activos',
                data: [120, 150, 180, 200, 170, 220, 250],
                backgroundColor: 'rgba(117, 26, 255, 0.6)',
                borderColor: 'rgba(117, 26, 255, 1)',
                borderWidth: 1,
            },
            {
                label: 'Nuevos registros',
                data: [30, 50, 40, 60, 70, 80, 90],
                backgroundColor: 'rgba(0, 204, 255, 0.6)',
                borderColor: 'rgba(0, 204, 255, 1)',
                borderWidth: 1,
            },
            {
                label: 'Instalaciones',
                data: [20, 30, 25, 35, 40, 45, 50],
                backgroundColor: 'rgba(255, 105, 180, 0.6)',
                borderColor: 'rgba(255, 105, 180, 1)',
                borderWidth: 1,
            },
            {
                label: 'Servidores activos',
                data: [10, 15, 20, 25, 30, 35, 40],
                backgroundColor: 'rgba(138, 43, 226, 0.6)',
                borderColor: 'rgba(138, 43, 226, 1)',
                borderWidth: 1,
            },
        ],
    };

    const stats = [
        { name: 'Usuarios', value: '1.204', icon: Users, color: 'text-cyan-400' },
        { name: 'Servidores', value: '412', icon: Server, color: 'text-purple-400' },
        { name: 'Instalaciones', value: '793', icon: Settings, color: 'text-pink-400' },
    ];

    useEffect(() => {
        fetch('/api/dashboard-version')
            .then((res) => res.json())
            .then((data) => setVersion(data.version));
    }, []);

    return (
        <AppLayout>
            <Head title="Dashboard">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@600&display=swap" rel="stylesheet" />
            </Head>

            <div className="mx-auto w-full max-w-7xl space-y-10 px-6 py-10 font-[Orbitron,sans-serif] text-white">
                <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-black via-[#0d0118] to-black" />
                <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle,#751aff11_1px,transparent_1px)] bg-[length:18px_18px]" />

                <div>
                    <h1 className="text-3xl font-bold tracking-widest text-purple-300 uppercase">Dashboard</h1>
                    <p className="text-sm text-purple-500">Resumen del sistema Cinammon en tiempo real.</p>
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
                        <h2 className="text-xl font-semibold">Actividad semanal</h2>
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
                                y: { ticks: { color: '#aaa', font: { family: 'Orbitron' } } },
                            },
                        }}
                    />
                </div>

                <div className="rounded-xl border border-purple-600/40 bg-black/30 p-4 text-sm text-purple-300 shadow-[0_0_10px_#751aff44]">
                    <p className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-green-400" />
                        Sistema en ejecución: <span className="font-bold text-white">{version}</span>
                    </p>
                </div>

                <div className="rounded-xl border border-purple-600/40 bg-black/30 p-6 shadow-[0_0_10px_#751aff44] backdrop-blur">
                    <div className="mb-3 flex items-center gap-3">
                        <Info className="h-5 w-5 text-blue-400" />
                        <h2 className="text-lg font-semibold text-white">Información para desarrolladores</h2>
                    </div>
                    <p className="mb-4 text-sm text-purple-400">Si encuentras un bug o fallo de seguridad, abre un reporte en GitHub.</p>
                    <a
                        href="https://github.com/cinammon-net/panel/issues/new"
                        className="inline-block rounded-md border border-purple-500 bg-black px-4 py-2 text-sm text-purple-200 hover:bg-purple-700/20"
                        target="_blank"
                    >
                        Abrir issue
                    </a>
                </div>

                <div className="rounded-xl border border-purple-600/40 bg-black/30 p-6 shadow-[0_0_10px_#751aff44] backdrop-blur">
                    <div className="mb-3 flex items-center gap-3">
                        <HelpCircle className="h-5 w-5 text-indigo-400" />
                        <h2 className="text-lg font-semibold text-white">¿Necesitas ayuda?</h2>
                    </div>
                    <p className="mb-4 text-sm text-purple-400">Accede a la documentación o únete al Discord de soporte.</p>
                    <div className="flex gap-2">
                        <a
                            href="https://wiki.cinammon.net"
                            className="rounded-md border border-purple-500 bg-purple-900/20 px-4 py-2 text-sm text-white hover:bg-purple-700/40"
                            target="_blank"
                        >
                            Documentación
                        </a>
                        <a
                            href="https://discord.gg/hikarinet"
                            className="rounded-md border border-purple-500 bg-purple-900/20 px-4 py-2 text-sm text-white hover:bg-purple-700/30"
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
