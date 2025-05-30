import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Copy, Pencil, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

interface ServerItem {
    id: number;
    uuid: string;
    name: string;
    author: string;
    description: string;
    node: string;
    egg: string;
    nest: string;
    status: string;
    servers: number;
    database: string;
    allocation: string;
    username: string;
}

interface Pagination<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number;
    to: number;
    total: number;
    per_page: number;
}

export default function Servers() {
    const { servers, filters } = usePage<{
        servers: Pagination<ServerItem>;
        filters: { search?: string; sort?: string; direction?: string; per_page?: number };
    }>().props;

    const [search, setSearch] = useState(filters.search || '');
    const [groupBy, setGroupBy] = useState<'none' | 'node' | 'username' | 'egg'>('none');
    const [groupDirection, setGroupDirection] = useState<'asc' | 'desc'>('asc');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/servers', { ...filters, search }, { preserveScroll: true, preserveState: true });
    };
    const handleSort = (field: string) => {
        const isSameField = filters.sort === field;
        const newDirection = isSameField && filters.direction === 'asc' ? 'desc' : 'asc';

        router.get(
            '/servers',
            {
                ...filters,
                sort: field,
                direction: newDirection,
                search,
            },
            {
                preserveScroll: true,
                preserveState: true,
            },
        );
    };

    const toggleGroupDirection = () => {
        setGroupDirection(groupDirection === 'asc' ? 'desc' : 'asc');
    };

    const groupedServers = servers.data.reduce((acc: Record<string, ServerItem[]>, server) => {
        const key = server[groupBy === 'none' ? 'node' : groupBy] || 'Unknown';
        if (!acc[key]) acc[key] = [];
        acc[key].push(server);
        return acc;
    }, {});

    const sortedGroups =
        groupBy === 'none' ? [] : Object.keys(groupedServers).sort((a, b) => (groupDirection === 'asc' ? a.localeCompare(b) : b.localeCompare(a)));

    
    return (
        <AppLayout breadcrumbs={[{ title: 'Servers', href: '/servers' }]}>
            <Head title="Servers">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                {/* Header */}
                <div className="border-cyan mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400 dark:drop-shadow-[0_0_5px_#0ff]">
                        SERVERS
                    </h1>
                    <button
                        onClick={() => router.visit('/servers/create')}
                        className="rounded border border-purple-400 bg-purple-100/50 px-4 py-1.5 text-sm text-purple-800 transition hover:bg-purple-200/70 dark:border-purple-500 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-700/50"
                    >
                        New Server
                    </button>
                </div>

                <div className="overflow-hidden rounded-lg border border-cyan-300 bg-white shadow-none transition dark:border-cyan-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                    {/* Search + GroupBy */}
                    <form onSubmit={handleSearch} className="flex w-full items-center justify-between gap-4 px-4 py-2">
                        {/* Agrupación + Orden */}
                        <div className="flex items-center gap-2">
                            {/* Selector de agrupación */}
                            <select
                                value={groupBy}
                                onChange={(e) => setGroupBy(e.target.value as 'none' | 'node' | 'username' | 'egg')}
                                className="rounded-md border border-cyan-700 px-4 py-2 text-sm focus:outline-none dark:border-cyan-700 dark:bg-neutral-950 dark:text-white"
                            >
                                <option value="none">Group by</option>
                                <option value="node">Node</option>
                                <option value="username">User</option>
                                <option value="egg">Egg</option>
                            </select>

                            {/* Botón de orden dinámico */}
                            {groupBy !== 'none' && (
                                <button
                                    type="button"
                                    onClick={toggleGroupDirection}
                                    className="flex items-center gap-2 rounded-md border border-cyan-700 bg-black px-4 py-2 text-sm text-cyan-200 shadow-[0_0_5px_#0ff] focus:outline-none"
                                >
                                    {groupDirection === 'asc' ? (
                                        <>
                                            Ascending <ChevronUp className="h-4 w-4" />
                                        </>
                                    ) : (
                                        <>
                                            Descending <ChevronDown className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Campo de búsqueda */}
                        <div className="relative w-full max-w-sm">
                            <input
                                type="text"
                                placeholder="Search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full rounded-md border border-cyan-700 px-4 py-2 pl-10 transition focus:ring-2 focus:ring-cyan-500 focus:outline-none dark:bg-neutral-950 dark:text-cyan-200"
                            />
                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-cyan-600">
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M21 21l-6-6m0 0A7 7 0 103 10a7 7 0 0012 5z"
                                    />
                                </svg>
                            </span>
                        </div>
                    </form>

                    {/* Table */}
                    <div className="bg-cyan overflow-hidden shadow-none transition dark:border-cyan-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                        <div className="min-w-full table-auto text-sm">
                            <table className="min-w-full table-auto text-sm">
                                <thead className="border-b border-cyan-500 bg-cyan-900 text-cyan-200">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Conditions</th>

                                        <th className="px-4 py-2 text-left">
                                            <button
                                                onClick={() => handleSort('name')}
                                                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100"
                                            >
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
                                            <button
                                                onClick={() => handleSort('egg')}
                                                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100"
                                            >
                                                <span>Egg</span>
                                                {filters.sort === 'egg' ? (
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
                                            <button
                                                onClick={() => handleSort('username')}
                                                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100"
                                            >
                                                <span>Username</span>
                                                {filters.sort === 'username' ? (
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
                                            <button
                                                onClick={() => handleSort('allocation')}
                                                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100"
                                            >
                                                <span>Primary Allocation</span>
                                                {filters.sort === 'allocation' ? (
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
                                            <button
                                                onClick={() => handleSort('backups')}
                                                className="flex items-center gap-2 text-cyan-400 hover:text-cyan-100"
                                            >
                                                <span>Backups</span>
                                                {filters.sort === 'backups' ? (
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
                                    </tr>
                                </thead>

                                <tbody>
                                    {groupBy === 'none' ? (
                                        servers.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-4 py-4 text-center text-cyan-600">
                                                    No servers found.
                                                </td>
                                            </tr>
                                        ) : (
                                            servers.data.map((item) => (
                                                <tr
                                                    key={item.id}
                                                    className="cursor-pointer border-t border-cyan-800 hover:bg-cyan-900/10"
                                                    onClick={() => router.visit(`/servers/${item.id}/edit`)}
                                                >
                                                    <td className="px-4 py-2">
                                                        <span
                                                            className={`inline-block rounded px-2 py-1 text-xs font-bold ${
                                                                item.status === 'offline'
                                                                    ? 'border border-red-500 bg-red-900 text-red-400'
                                                                    : 'border border-green-500 bg-green-900 text-green-400'
                                                            }`}
                                                        >
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">{item.name}</td>
                                                    <td className="px-4 py-2">{item.egg}</td>
                                                    <td className="px-4 py-2">{item.username}</td>
                                                    <td className="px-4 py-2">{item.allocation}</td>
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                            <button title="Edit" className="text-cyan-300 hover:text-cyan-100">
                                                                <Pencil className="h-4 w-4" />
                                                            </button>
                                                            <button title="Duplicate" className="text-blue-400 hover:text-blue-200">
                                                                <Copy className="h-4 w-4" />
                                                            </button>
                                                            <button title="Delete" className="text-pink-400 hover:text-pink-200">
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )
                                    ) : (
                                        (sortedGroups.length > 0 ? sortedGroups : ['']).map((key) => (
                                            <React.Fragment key={key}>
                                                <tr className="bg-black">
                                                    <td colSpan={6} className="border-b border-cyan-800 px-4 py-2 text-sm font-bold text-cyan-400">
                                                        {groupBy === 'node' && `Node ${key}`}
                                                        {groupBy === 'egg' && `Egg ${key}`}
                                                        {groupBy === 'username' && `User ${key}`}
                                                    </td>
                                                </tr>

                                                {(groupedServers[key] ?? []).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-4 py-4 text-center text-cyan-600">
                                                            No servers found.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    groupedServers[key].map((item) => (
                                                        <tr
                                                            key={item.id}
                                                            className="cursor-pointer border-t border-cyan-800 hover:bg-cyan-900/10"
                                                            onClick={() => router.visit(`/servers/${item.id}/edit`)}
                                                        >
                                                            <td className="px-4 py-2">
                                                                <span
                                                                    className={`inline-block rounded px-2 py-1 text-xs font-bold ${
                                                                        item.status === 'offline'
                                                                            ? 'border border-red-500 bg-red-900 text-red-400'
                                                                            : 'border border-green-500 bg-green-900 text-green-400'
                                                                    }`}
                                                                >
                                                                    {item.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-2">{item.name}</td>
                                                            <td className="px-4 py-2">{item.egg}</td>
                                                            <td className="px-4 py-2">{item.username}</td>
                                                            <td className="px-4 py-2">{item.allocation}</td>
                                                            <td className="px-4 py-2 text-right">
                                                                <div className="flex justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                                    <button title="Edit" className="text-cyan-300 hover:text-cyan-100">
                                                                        <Pencil className="h-4 w-4" />
                                                                    </button>
                                                                    <button title="Duplicate" className="text-blue-400 hover:text-blue-200">
                                                                        <Copy className="h-4 w-4" />
                                                                    </button>
                                                                    <button title="Delete" className="text-pink-400 hover:text-pink-200">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {servers.links.length > 5 && (
                                <div className="mt-6 flex justify-center p-4">
                                    <ul className="flex flex-wrap gap-2 text-sm font-medium">
                                        {servers.links.map((link, i) => (
                                            <li key={i}>
                                                <button
                                                    disabled={!link.url}
                                                    onClick={() => {
                                                        if (!link.url) return;
                                                        const url = new URL(link.url);
                                                        const page = url.searchParams.get('page');
                                                        router.get(
                                                            '/eggs',
                                                            {
                                                                page,
                                                                search,
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
                                                    '/servers',
                                                    {
                                                        search,
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
                </div>
            </div>
        </AppLayout>
    );
}
