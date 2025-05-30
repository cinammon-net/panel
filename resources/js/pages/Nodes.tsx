import AppLayout from '@/layouts/app-layout';
import { Head, usePage, router } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Lock, LockOpen, Server, HeartPulse, HeartOff, HeartCrack, Eye, EyeOff, ServerOff, MapPinned, Router, Pencil } from 'lucide-react';
interface NodeItem {
    id: number;
    name: string;
    fqdn : string;
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

                {/* Tabla vacía */}
                <div className="overflow-hidden rounded-lg border border-cyan-300 bg-white shadow-none transition dark:border-cyan-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                    <table className="min-w-full table-auto text-sm">
                        <thead className="border-b border-cyan-500 bg-cyan-900 text-cyan-200">
                            <tr>
                                <th className="px-4 py-2 text-left">Health</th>

                                <th className="px-4 py-2 text-left">
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

                                <th className="px-4 py-2 text-left">
                                    <button onClick={() => handleSort('fqdn')} className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100">
                                        <span>Address</span>
                                        {filters.sort === 'address' ? (
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

                                <th className="px-4 py-2 text-left">
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

                                <th className="px-4 py-2 text-left"> Public </th>

                                <th className="px-4 py-2 text-left">
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
                                <th className="px-4 py-2 text-left"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {nodes.data.length === 0 ? (
                                <tr className="border-b border-cyan-300 dark:border-cyan-700">
                                    <td colSpan={6} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
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
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <Router className="text-cyan-500" size={20} />
                                                {node.name}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-2">
                                                <MapPinned className="text-cyan-500" size={20} />
                                                {node.fqdn}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            {/* Usando Lucide para el estado SSL */}
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
                                                <span className="text-sm text-cyan-500 dark:text-cyan-400">
                                                    {node.servers}
                                                </span>
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

                    {/* Pagination */}
                    {nodes.links.length > 5 && (
                        <div className="mt-6 flex justify-center p-4">
                            <ul className="flex flex-wrap gap-2 text-sm font-medium">
                                {nodes.links.map((link, i) => (
                                    <li key={i}>
                                        <button
                                            disabled={!link.url}
                                            onClick={() => {
                                                if (!link.url) return;
                                                const url = new URL(link.url);
                                                const page = url.searchParams.get('page');
                                                router.get(
                                                    '/nodes',
                                                    {
                                                        page,
                                                        sort: filters.sort,
                                                        direction: filters.direction,
                                                        per_page: filters.per_page,
                                                    },
                                                    { preserveScroll: true, preserveState: true },
                                                );
                                            }}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`rounded border px-3 py-1.5 text-xs transition ${link.active ? 'border-cyan-500 bg-cyan-500 text-white shadow-md' : 'border-cyan-700 bg-black text-cyan-400 hover:bg-cyan-800/30 hover:text-white'} ${!link.url ? 'cursor-not-allowed opacity-40' : ''}`}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {/* Per page selector */}
                    <div className="flex items-center justify-center border-t border-cyan-300 bg-white px-4 py-2 shadow-none transition dark:border-cyan-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                        <div className="inline-flex items-center overflow-hidden rounded-md border border-cyan-700 text-sm text-cyan-600 dark:border-cyan-700 dark:bg-neutral-950">
                            <span className="border-r px-4 py-2 text-sm text-cyan-600 dark:text-cyan-400">Per page</span>
                            <div className="relative">
                                <select
                                    className="appearance-none px-4 py-2 pr-8 text-sm text-cyan-600 focus:outline-none dark:bg-neutral-950 dark:text-cyan-400"
                                    value={filters.per_page ?? 10}
                                    onChange={(e) => {
                                        const perPage = parseInt(e.target.value, 10);
                                        router.get(
                                            '/nodes',
                                            {
                                                sort: filters.sort,
                                                direction: filters.direction,
                                                per_page: perPage,
                                            },
                                            {
                                                preserveScroll: true,
                                                preserveState: true,
                                            },
                                        );
                                    }}
                                >
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100">All</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
