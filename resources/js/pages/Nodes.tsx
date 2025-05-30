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
    MapPinned,
    Pencil,
    Router,
    Server,
    ServerOff,
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
            <Head title="Nodes">
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
                            className="rounded border border-purple-400 bg-purple-100/50 px-4 py-1.5 text-sm text-purple-800 transition hover:bg-purple-200/70 dark:border-purple-500 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-700/50"
                        >
                            New Node
                        </button>
                    </div>
                </div>

                {/* Tabla responsive */}
                <div className="overflow-x-auto rounded-lg border border-cyan-300 bg-white shadow-none transition dark:border-cyan-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                    <table className="min-w-full table-auto text-sm">
                        <thead className="border-b border-cyan-500 bg-cyan-900 text-cyan-200">
                            <tr>
                                <th className="w-[60px] px-4 py-2 text-left">Health</th>

                                <th className="w-1/5 px-4 py-2 text-left">
                                    <button onClick={() => handleSort('name')} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100">
                                        <span>Name</span>
                                        {filters.sort === 'name' ? (
                                            filters.direction === 'asc' ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )
                                        ) : (
                                            <ChevronDown className="opacity-30" />
                                        )}
                                    </button>
                                </th>

                                <th className="w-1/5 px-4 py-2 text-left">
                                    <button onClick={() => handleSort('fqdn')} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100">
                                        <span>Address</span>
                                        {filters.sort === 'fqdn' ? (
                                            filters.direction === 'asc' ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )
                                        ) : (
                                            <ChevronDown className="opacity-30" />
                                        )}
                                    </button>
                                </th>

                                <th className="w-[60px] px-4 py-2 text-left">
                                    <button onClick={() => handleSort('ssl')} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100">
                                        <span>SSL</span>
                                        {filters.sort === 'ssl' ? (
                                            filters.direction === 'asc' ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )
                                        ) : (
                                            <ChevronDown className="opacity-30" />
                                        )}
                                    </button>
                                </th>

                                <th className="w-[80px] px-4 py-2 text-left">Public</th>

                                <th className="w-[80px] px-4 py-2 text-left">
                                    <button
                                        onClick={() => handleSort('servers')}
                                        className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100"
                                    >
                                        <span>Servers</span>
                                        {filters.sort === 'servers' ? (
                                            filters.direction === 'asc' ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )
                                        ) : (
                                            <ChevronDown className="opacity-30" />
                                        )}
                                    </button>
                                </th>

                                <th className="w-[50px] px-4 py-2 text-left"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {nodes.data.length === 0 ? (
                                <tr className="border-b border-cyan-300 dark:border-cyan-700">
                                    <td colSpan={7} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No nodes found.
                                    </td>
                                </tr>
                            ) : (
                                nodes.data.map((node) => (
                                    <tr key={node.id} className="cursor-pointer border-b border-cyan-800 hover:bg-cyan-900/10">
                                        <td className="px-4 py-2">
                                            {node.health === 'active' ? (
                                                <HeartPulse className="text-green-500" size={20} />
                                            ) : node.health === 'standby' ? (
                                                <HeartCrack className="text-orange-500" size={20} />
                                            ) : (
                                                <HeartOff className="text-red-500" size={20} />
                                            )}
                                        </td>
                                        <td className="truncate px-4 py-2">
                                            <div className="flex items-center gap-2 truncate">
                                                <Router className="text-cyan-500" size={20} />
                                                <span className="truncate">{node.name}</span>
                                            </div>
                                        </td>
                                        <td className="truncate px-4 py-2">
                                            <div className="flex items-center gap-2 truncate">
                                                <MapPinned className="text-cyan-500" size={20} />
                                                <span className="truncate">{node.fqdn}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            {node.ssl ? (
                                                <Lock className="text-green-500" size={20} />
                                            ) : (
                                                <LockOpen className="text-red-500" size={20} />
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    {node.public ? (
                                                        <Eye className="text-green-500" size={20} />
                                                    ) : (
                                                        <EyeOff className="text-red-500" size={20} />
                                                    )}
                                                    <span className="text-sm text-cyan-500 dark:text-cyan-400">
                                                        {node.public ? 'Public' : 'Private'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2 text-cyan-500">
                                                {node.servers > 0 ? (
                                                    <Server className="text-cyan-500" size={20} />
                                                ) : (
                                                    <ServerOff className="text-red-500" size={20} />
                                                )}
                                                <span className="text-sm text-cyan-500 dark:text-cyan-400">{node.servers}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => router.visit(`/nodes/${node.id}/edit`)}
                                                className="text-cyan-500 hover:text-cyan-700"
                                            >
                                                <span className="sr-only">Edit Node</span>
                                                <Pencil className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
