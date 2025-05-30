import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { Pencil, ShieldCheck, Users, ChevronUp, ChevronDown } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Role {
    id: number;
    name: string;
    permissions: string[];
    users_count: number;
    node?: string | null;
    has_all_permissions?: boolean;
}
interface Pagination<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    per_page: number;
}

function handleSort(column: string) {
    const url = new URL(window.location.href);
    const currentSort = url.searchParams.get('sort');
    const currentDirection = url.searchParams.get('direction');

    if (currentSort === column) {
        url.searchParams.set('direction', currentDirection === 'asc' ? 'desc' : 'asc');
    } else {
        url.searchParams.set('sort', column);
        url.searchParams.set('direction', 'asc');
    }

    window.location.href = url.toString();
}

export default function Roles() {
    const { roles, filters } = usePage<{
        roles: Pagination<Role>;
        filters: { search?: string; sort?: string; direction?: string; per_page?: number };
    }>().props;

    return (
        <AppLayout breadcrumbs={[{ title: 'Roles', href: '/roles' }]}>
            <Head title="Roles">
                <meta name="description" content="Roles management page" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="mb-6 flex items-center justify-between border-pink-600">
                    <h1 className="text-3xl font-semibold tracking-widest text-pink-800 drop-shadow-none dark:text-pink-400 dark:drop-shadow-[0_0_6px_#f0f]">
                        ROLES
                    </h1>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/roles/create"
                            className="rounded border border-pink-400 bg-pink-100/50 px-4 py-1.5 text-sm text-pink-800 transition hover:bg-pink-200/70 dark:border-pink-500 dark:bg-pink-900/30 dark:text-pink-300 dark:hover:bg-pink-700/50"
                        >
                            + Create Role
                        </Link>
                    </div>
                </div>

                <div className="bg-pink overflow-hidden rounded-lg border border-pink-300 shadow-none transition dark:border-pink-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                    <table className="min-w-full table-auto text-sm">
                        <thead className="border-b border-pink-500 bg-pink-900 text-pink-200">
                            <tr>
                                <th className="px-4 py-2 text-center">
                                    <button onClick={() => handleSort('name')} className="flex items-center gap-1 text-pink-300 hover:text-white">
                                        Role Name
                                        {filters.sort === 'name' ? (
                                            filters.direction === 'asc' ? (
                                                <ChevronUp className="h-4 w-4" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4" />
                                            )
                                        ) : (
                                            <ChevronDown className="h-4 w-4 opacity-30" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-2 text-left font-semibold">Permissions</th>
                                <th className="px-4 py-2 text-left font-semibold">Users</th>
                                <th className="px-4 py-2 text-left font-semibold">Nodes</th>
                                <th className="px-4 py-2 text-right font-semibold"></th>
                            </tr>
                        </thead>

                        <tbody>
                            {roles.data.map((role) => (
                                <tr key={role.id} className="border-t border-pink-700 hover:bg-pink-300/10">
                                    <td className="px-4 py-3 font-semibold text-pink-500">{role.name}</td>
                                    <td className="px-4 py-3 text-pink-500">
                                        {role.has_all_permissions ? (
                                            <span className="inline-flex items-center gap-1 rounded border border-pink-400 px-2 py-0.5 text-xs font-medium text-pink-200 shadow-sm">
                                                <ShieldCheck className="h-4 w-4" />
                                                All
                                            </span>
                                        ) : role.permissions.length > 0 ? (
                                            role.permissions.map((perm, index) => (
                                                <span
                                                    key={index}
                                                    className="mr-1 inline-block rounded border border-pink-400 px-2 py-0.5 text-xs text-pink-200"
                                                >
                                                    {perm}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-neutral-400 italic">–</span>
                                        )}
                                    </td>

                                    <td className="px-4 py-3 text-pink-300">
                                        <span className="inline-flex items-center gap-1">
                                            <Users className="h-4 w-4" /> {role.users_count}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-pink-300">
                                        {role.node ? (
                                            <span className="inline-flex items-center gap-1">{role.node}</span>
                                        ) : (
                                            <span className="text-neutral-500 italic">–</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Link href={`/roles/${role.id}/edit`} className="inline-flex items-center text-pink-300 hover:text-white">
                                            <Pencil className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
