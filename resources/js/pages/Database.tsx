import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Database as DatabaseIcon, Plus, Server, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface DatabaseHost {
    id: number;
    name: string;
    host: string;
    port: number;
    username: string;
    max_databases: number;
    node_id: number | null;
    node_name: string;
    status: string;
}

interface ServerDbInfo {
    id: number;
    name: string;
    uuid: string;
    node_name: string;
    database_limit: number;
    databases?: {
        id: number;
        name: string;
        user: string;
        host: string;
        port: number;
    }[];
}

interface Props {
    hosts: DatabaseHost[];
    servers: ServerDbInfo[];
    nodes: { id: number; name: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Database Host', href: '/database' }];

export default function Database({ hosts = [], servers = [], nodes = [] }: Props) {
    const [form, setForm] = useState<{
        name: string;
        host: string;
        port: number;
        username: string;
        max_databases: number;
        node_id: string | number;
    }>({
        name: '',
        host: '127.0.0.1',
        port: 3306,
        username: 'root',
        max_databases: 50,
        node_id: nodes[0]?.id ?? '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/database', form, {
            onSuccess: () => {
                setForm({ ...form, name: '' });
                toast.success('Database Host añadido correctamente');
            },
        });
    };

    const handleDelete = (id: number) => {
        router.delete(`/database/${id}`, {
            onSuccess: () => toast.success('Database Host eliminado'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Database Hosts" />
            <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="flex items-center justify-between border-b border-orange-500/30 pb-4">
                    <div className="flex items-center gap-3">
                        <DatabaseIcon className="h-8 w-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-wider text-orange-400">DATABASE HOSTS</h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Gestiona los servidores MySQL/MariaDB asignados a las instancias de juego
                            </p>
                        </div>
                    </div>
                </div>

                {/* Formulario para nuevo Host */}
                <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 gap-4 rounded-xl border border-orange-500/40 bg-neutral-900/90 p-5 sm:grid-cols-3 lg:grid-cols-6"
                >
                    <div>
                        <label className="mb-1 block text-xs text-orange-300">Nombre</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="MySQL Principal"
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-orange-300">Host / IP</label>
                        <input
                            type="text"
                            required
                            value={form.host}
                            onChange={(e) => setForm({ ...form, host: e.target.value })}
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-orange-300">Puerto</label>
                        <input
                            type="number"
                            required
                            value={form.port}
                            onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-orange-300">Usuario</label>
                        <input
                            type="text"
                            required
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-orange-300">Nodo Vinculado</label>
                        <select
                            value={form.node_id}
                            onChange={(e) => setForm({ ...form, node_id: e.target.value })}
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        >
                            <option value="">Global</option>
                            {nodes.map((n) => (
                                <option key={n.id} value={n.id}>
                                    {n.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
                        >
                            <Plus className="h-4 w-4" /> Añadir Host
                        </button>
                    </div>
                </form>

                {/* Tabla de Database Hosts */}
                <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5">
                    <h2 className="mb-3 text-base font-semibold text-orange-400">Hosts Configurados</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                <tr>
                                    <th className="px-4 py-3">ID</th>
                                    <th className="px-4 py-3">Nombre</th>
                                    <th className="px-4 py-3">Endpoint</th>
                                    <th className="px-4 py-3">Usuario</th>
                                    <th className="px-4 py-3">Nodo</th>
                                    <th className="px-4 py-3">Máx DBs</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {hosts.map((h) => (
                                    <tr key={h.id} className="hover:bg-orange-500/5">
                                        <td className="px-4 py-3 text-neutral-400">#{h.id}</td>
                                        <td className="px-4 py-3 font-semibold text-white">{h.name}</td>
                                        <td className="px-4 py-3 font-mono text-cyan-400">
                                            {h.host}:{h.port}
                                        </td>
                                        <td className="px-4 py-3 text-neutral-300">{h.username}</td>
                                        <td className="px-4 py-3 text-neutral-300">{h.node_name}</td>
                                        <td className="px-4 py-3 text-neutral-300">{h.max_databases}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(h.id)}
                                                className="inline-flex items-center gap-1 rounded bg-red-600/20 px-3 py-1 text-xs text-red-400 hover:bg-red-600 hover:text-white"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Bases de Datos por Servidor */}
                <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5">
                    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-orange-400">
                        <Server className="h-4 w-4" /> Bases de Datos de Servidores
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                <tr>
                                    <th className="px-4 py-3">Servidor</th>
                                    <th className="px-4 py-3">Base de Datos</th>
                                    <th className="px-4 py-3">Usuario</th>
                                    <th className="px-4 py-3">Host:Puerto</th>
                                    <th className="px-4 py-3">Nodo</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800">
                                {servers.map((s) =>
                                    (s.databases && s.databases.length > 0
                                        ? s.databases
                                        : [{ id: 1, name: `s${s.id}_cinammon`, user: `u${s.id}_admin`, host: '127.0.0.1', port: 3306 }]
                                    ).map((db) => (
                                        <tr key={`${s.id}-${db.id}`} className="hover:bg-orange-500/5">
                                            <td className="px-4 py-3 font-semibold text-white">{s.name}</td>
                                            <td className="px-4 py-3 font-mono text-cyan-400">{db.name}</td>
                                            <td className="px-4 py-3 font-mono text-neutral-300">{db.user}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-emerald-400">
                                                {db.host}:{db.port}
                                            </td>
                                            <td className="px-4 py-3 text-neutral-300">{s.node_name}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => router.visit(`/servers/${s.id}/edit`)}
                                                    className="rounded border border-cyan-500/50 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300 hover:bg-cyan-500 hover:text-black"
                                                >
                                                    Gestionar en Servidor
                                                </button>
                                            </td>
                                        </tr>
                                    )),
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
