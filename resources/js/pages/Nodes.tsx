import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ChevronDown,
    ChevronUp,
    Eye,
    EyeOff,
    HeartCrack,
    HeartOff,
    HeartPulse,
    Lock,
    LockOpen,
} from 'lucide-react';

interface NodeItem {
    id: number;
    name: string;
    fqdn: string;
    ssl: boolean;
    servers: number;
    public: boolean;
    health: string;
}

interface Pagination<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

export default function Nodes() {
    const { nodes, filters } = usePage<{
        nodes: Pagination<NodeItem>;
        filters: { search?: string; sort?: string; direction?: string; per_page?: number };
    }>().props;

    const handleSort = (column: string) => {
        const isSameField = filters.sort === column;
        const newDirection = isSameField && filters.direction === 'asc' ? 'desc' : 'asc';

        router.get(
            '/nodes',
            {
                ...filters,
                sort: column,
                direction: newDirection,
            },
            {
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Nodes', href: '/nodes' }]}>
            <Head>
                <title>Nodes</title>
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between border-cyan-500 dark:border-cyan-600">
                    <h1 className="text-3xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400 dark:drop-shadow-[0_0_5px_#0ff]">
                        NODES
                    </h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.visit('/nodes/create')}
                            className="rounded border border-cyan-400 bg-cyan-100/50 px-4 py-1.5 text-sm text-cyan-800 transition hover:bg-cyan-200/70 dark:border-cyan-500 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-700/50"
                        >
                            + New Node
                        </button>
                    </div>
                </div>

                {/* Tabla responsive */}
                <div className="overflow-x-auto rounded-lg border border-cyan-300 dark:border-cyan-700">
                    <table className="w-full table-auto">
                        <thead className="bg-cyan-200 dark:bg-cyan-800">
                            <tr>
                                <th className="px-4 py-2">
                                    <button onClick={() => handleSort('health')} className="flex items-center gap-1 font-semibold hover:text-white">
                                        Health
                                        {filters.sort === 'health' &&
                                            (filters.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </button>
                                </th>
                                <th className="px-4 py-2">
                                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 font-semibold hover:text-white">
                                        Name
                                        {filters.sort === 'name' &&
                                            (filters.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </button>
                                </th>
                                <th className="px-4 py-2">
                                    <button onClick={() => handleSort('fqdn')} className="flex items-center gap-1 font-semibold hover:text-white">
                                        Address
                                        {filters.sort === 'fqdn' &&
                                            (filters.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </button>
                                </th>
                                <th className="px-4 py-2">
                                    <button onClick={() => handleSort('ssl')} className="flex items-center gap-1 font-semibold hover:text-white">
                                        SSL
                                        {filters.sort === 'ssl' &&
                                            (filters.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </button>
                                </th>
                                <th className="px-4 py-2">
                                    <button onClick={() => handleSort('servers')} className="flex items-center gap-1 font-semibold hover:text-white">
                                        Servers
                                        {filters.sort === 'servers' &&
                                            (filters.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </button>
                                </th>
                                <th className="px-4 py-2">
                                    <button onClick={() => handleSort('public')} className="flex items-center gap-1 font-semibold hover:text-white">
                                        Public
                                        {filters.sort === 'public' &&
                                            (filters.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {nodes.data.map((node) => (
                                <tr
                                    key={node.id}
                                    onClick={() => router.visit(`/nodes/${node.id}/edit`)}
                                    className="cursor-pointer border-b border-cyan-200 transition hover:bg-cyan-100/50 dark:border-cyan-700 dark:hover:bg-cyan-800/40"
                                >
                                    <td className="px-4 py-2">
                                        {node.health === 'healthy' ? (
                                            <HeartPulse className="h-5 w-5 text-green-500" />
                                        ) : node.health === 'unhealthy' ? (
                                            <HeartCrack className="h-5 w-5 text-yellow-500" />
                                        ) : (
                                            <HeartOff className="h-5 w-5 text-red-500" />
                                        )}
                                    </td>
                                    <td className="px-4 py-2">{node.name}</td>
                                    <td className="px-4 py-2">{node.fqdn}</td>
                                    <td className="px-4 py-2">
                                        {node.ssl ? <LockOpen className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-red-500" />}
                                    </td>
                                    <td className="px-4 py-2">{node.servers}</td>
                                    <td className="px-4 py-2">
                                        {node.public ? <Eye className="h-5 w-5 text-blue-500" /> : <EyeOff className="h-5 w-5 text-gray-500" />}
                                    </td>
                                </tr>
                            ))}
                            {nodes.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-2 text-center text-gray-500">
                                        No nodes found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
