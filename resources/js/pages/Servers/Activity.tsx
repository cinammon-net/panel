import ServerLayout from '@/layouts/server-layout';
import { Head } from '@inertiajs/react';
import {
    Activity as ActivityIcon,
    Calendar,
    Clock,
    FileText,
    Filter,
    HardDrive,
    Lock,
    Power,
    Radio,
    Search,
    Shield,
    Terminal,
    User,
    Users,
} from 'lucide-react';
import { useState } from 'react';

interface ActivityItem {
    id: string;
    user: {
        name: string;
        email: string;
        avatar?: string | null;
    };
    action: string;
    description: string;
    ip: string;
    created_at: string;
}

interface PageProps {
    server: {
        id: number;
        name: string;
        uuid: string;
        owner_id?: number;
    };
    activity: ActivityItem[];
}

function getActionBadge(action: string) {
    if (action.includes('power')) {
        return {
            label: 'ENERGÍA',
            icon: Power,
            color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
        };
    }
    if (action.includes('backup')) {
        return {
            label: 'BACKUP',
            icon: HardDrive,
            color: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400',
        };
    }
    if (action.includes('network') || action.includes('subdomain')) {
        return {
            label: 'RED',
            icon: Radio,
            color: 'border-purple-500/40 bg-purple-500/10 text-purple-400',
        };
    }
    if (action.includes('subuser') || action.includes('owner')) {
        return {
            label: 'ACCESOS',
            icon: Users,
            color: 'border-pink-500/40 bg-pink-500/10 text-pink-400',
        };
    }
    if (action.includes('file')) {
        return {
            label: 'ARCHIVOS',
            icon: FileText,
            color: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
        };
    }

    return {
        label: 'SISTEMA',
        icon: Terminal,
        color: 'border-neutral-500/40 bg-neutral-500/10 text-neutral-300',
    };
}

export default function ActivityPage({ server, activity = [] }: PageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [actionFilter, setActionFilter] = useState('all');

    const filteredActivity = activity.filter((item) => {
        const matchesSearch =
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.ip.includes(searchQuery);

        if (actionFilter === 'all') return matchesSearch;
        return matchesSearch && item.action.includes(actionFilter);
    });

    return (
        <ServerLayout server={server} section="activity">
            <Head title={`${server.name} · Actividad - Cinammon`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-cyan-900/60 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <ActivityIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
                                Auditoría y Registro de Actividad
                            </h1>
                            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                Monitorea las acciones de control, cambios de configuración y accesos realizados en este servidor.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-cyan-800/60 bg-cyan-950/30 px-3 py-1.5 text-xs text-cyan-300">
                        <Shield className="h-4 w-4 text-cyan-400" />
                        <span>{activity.length} Eventos registrados</span>
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Buscar en el registro..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 pl-9 pr-3.5 py-2 text-xs text-neutral-900 dark:text-white placeholder-neutral-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Filter className="h-4 w-4 text-neutral-400 shrink-0" />
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="w-full sm:w-auto rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 px-3 py-2 text-xs text-neutral-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            <option value="all">Todas las acciones</option>
                            <option value="power">Energía y Estado</option>
                            <option value="backup">Copias de Seguridad</option>
                            <option value="network">Red y Puertos</option>
                            <option value="files">Archivos</option>
                            <option value="subuser">Usuarios</option>
                        </select>
                    </div>
                </div>

                {/* Activity Feed */}
                <div className="space-y-3">
                    {filteredActivity.map((item) => {
                        const badge = getActionBadge(item.action);
                        const Icon = badge.icon;

                        return (
                            <div
                                key={item.id}
                                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-4 transition-all shadow-sm hover:border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                            >
                                <div className="flex items-start gap-3.5">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold text-xs uppercase border border-neutral-300 dark:border-neutral-700">
                                        {item.user.avatar ? (
                                            <img
                                                src={item.user.avatar}
                                                alt={item.user.name}
                                                className="h-full w-full rounded-lg object-cover"
                                            />
                                        ) : (
                                            <span>{item.user.name.slice(0, 2)}</span>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-neutral-900 dark:text-white">
                                                {item.user.name}
                                            </span>
                                            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                                                ({item.user.email})
                                            </span>
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${badge.color}`}
                                            >
                                                <Icon className="h-2.5 w-2.5" />
                                                {badge.label}
                                            </span>
                                        </div>

                                        <p className="text-xs text-neutral-700 dark:text-neutral-300">
                                            {item.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto text-[11px] text-neutral-500 dark:text-neutral-400 gap-1 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-200 dark:border-neutral-800">
                                    <span className="font-mono">{item.ip}</span>
                                    <span>{new Date(item.created_at).toLocaleString('es-ES')}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredActivity.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-cyan-900/60 bg-neutral-50 dark:bg-neutral-900/30 p-12 text-center">
                        <ActivityIcon className="h-12 w-12 text-neutral-400 dark:text-cyan-500/40 mb-3" />
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-white">
                            No se encontraron eventos
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                            No hay actividad reciente registrada con los filtros seleccionados.
                        </p>
                    </div>
                )}
            </div>
        </ServerLayout>
    );
}

