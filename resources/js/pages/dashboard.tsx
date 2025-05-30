import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { BarElement, CategoryScale, Chart, LinearScale } from 'chart.js';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';

Chart.register(BarElement, CategoryScale, LinearScale);

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Dashboard() {
    const [stats, setStats] = useState({
        users: 0,
        servers: 0,
        installations: 0,
    });

    const [logs, setLogs] = useState<{ id: number; message: string; date: string }[]>([]);

    const [weeklyData, setWeeklyData] = useState<number[]>(Array(7).fill(0));

    useEffect(() => {
        const eventNames = [
            'Conexión establecida',
            'Nuevo usuario registrado',
            'Servidor actualizado',
            'Error detectado',
            'Backup completado',
            'Instalación realizada',
            'Reinicio programado',
            'Actividad sospechosa detectada',
            'Nueva configuración aplicada',
            'Usuario eliminado',
        ];

        const interval = setInterval(() => {
            setStats((stats) => ({
                users: stats.users + randomInt(1, 10),
                servers: stats.servers + randomInt(0, 2),
                installations: stats.installations + randomInt(5, 20),
            }));

            setLogs((logs) => {
                const randomName = eventNames[randomInt(0, eventNames.length - 1)];
                const newLog = {
                    id: logs.length + 1,
                    message: `Evento: ${randomName}`,
                    date: 'Justo ahora',
                };
                return [newLog, ...logs].slice(0, 5);
            });

            setWeeklyData(() => {
                return Array.from({ length: 7 }, () => randomInt(10, 50));
            });
        }, 10000);

        return () => clearInterval(interval);
    }, []);

    const data = {
        labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
        datasets: [
            {
                label: 'Instalaciones',
                data: weeklyData,
                backgroundColor: 'rgba(180, 118, 255, 0.7)',
                borderRadius: 5,
            },
        ],
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="relative flex flex-1 flex-col gap-6 rounded-xl bg-black p-6 font-[var(--app-font)] text-purple-400 transition-colors md:p-6">
                {/* Fondo animado */}
                <div className="pointer-events-none absolute inset-0 z-0 animate-pulse bg-gradient-to-br from-purple-900/20 via-purple-800/20 to-purple-900/20" />
                <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle,#b476ff22_1px,transparent_1px)] bg-[length:20px_20px]" />

                {/* Tarjetas superiores */}
                <div className="relative z-10 grid auto-rows-min gap-6 md:grid-cols-3">
                    <div className="relative rounded-xl border border-purple-600/40 bg-purple-900/30 p-6 shadow-lg transition-all duration-300 hover:border-purple-500 hover:shadow-purple-500/40">
                        <h3 className="mb-2 font-semibold text-purple-400">Usuarios</h3>
                        <p className="text-3xl font-bold">{stats.users}</p>
                    </div>
                    <div className="relative rounded-xl border border-purple-600/40 bg-purple-900/30 p-6 shadow-lg transition-all duration-300 hover:border-purple-500 hover:shadow-purple-500/40">
                        <h3 className="mb-2 font-semibold text-purple-400">Servidores</h3>
                        <p className="text-3xl font-bold">{stats.servers}</p>
                    </div>
                    <div className="relative rounded-xl border border-purple-600/40 bg-purple-900/30 p-6 shadow-lg transition-all duration-300 hover:border-purple-500 hover:shadow-purple-500/40">
                        <h3 className="mb-2 font-semibold text-purple-400">Instalaciones</h3>
                        <p className="text-3xl font-bold">{stats.installations}</p>
                    </div>
                </div>

                {/* Tarjeta inferior con gráfica */}
                <div className="relative z-10 min-h-[40vh] w-full flex-1 overflow-hidden rounded-xl border border-purple-600/40 bg-purple-900/20 p-6 shadow-lg transition-all hover:border-purple-500 hover:shadow-purple-500/40">
                    <h3 className="mb-4 font-semibold text-purple-400">Actividad semanal de instalaciones</h3>
                    <Bar data={data} options={{ responsive: true, plugins: { legend: { display: true } } }} />
                </div>

                {/* Logs */}
                <div className="relative z-10 max-h-[200px] w-full overflow-auto rounded-xl border border-purple-600/40 bg-purple-900/20 p-4 text-sm text-purple-300 shadow-lg">
                    <h3 className="mb-2 font-semibold">Últimos eventos</h3>
                    {logs.length === 0 && <p>No hay eventos aún</p>}
                    <ul>
                        {logs.map((log) => (
                            <li key={log.id} className="border-b border-purple-700/50 py-1 last:border-0">
                                {log.message} — <span className="text-purple-400">{log.date}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </AppLayout>
    );
}
