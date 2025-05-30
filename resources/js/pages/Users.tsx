import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronUp, Mail, Pencil, Server, UsersRound, UserCheck,UserRoundCog, UserRoundX, UserRoundCheck } from 'lucide-react';

interface User {
    id: number;
    name: string;
    email: string;
    roles: string[];
    has2fa: boolean;
    servers: number;
    subusers: number;
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

export default function Users() {
    const { users, filters } = usePage<{
        users: Pagination<User>;
        filters: { search?: string; sort?: string; direction?: string; per_page?: number };
    }>().props;

    return (
        <AppLayout breadcrumbs={[{ title: 'Users', href: '/users' }]}>
            <Head title="Users">
                <meta name="description" content="User management page" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="mb-6 flex items-center justify-between border-pink-600">
                    <h1 className="text-3xl font-semibold tracking-widest text-pink-800 drop-shadow-none dark:text-pink-400 dark:drop-shadow-[0_0_6px_#f0f]">
                        USERS
                    </h1>
                    <button className="rounded border border-pink-400 bg-pink-100/50 px-4 py-1.5 text-sm text-pink-800 transition hover:bg-pink-200/70 dark:border-pink-500 dark:bg-pink-900/30 dark:text-pink-300 dark:hover:bg-pink-700/50">
                        + New User
                    </button>
                </div>

                <div className="bg-pink overflow-hidden rounded-lg border border-pink-300 shadow-none transition dark:border-pink-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                    <table className="min-w-full table-auto text-sm">
                        <thead className="border-b border-pink-500 bg-pink-900 text-pink-200">
                            <tr>
                                <th className="px-4 py-2 text-center">
                                    <button onClick={() => handleSort('avatar')} className="flex items-center gap-1 text-pink-300 hover:text-white" />
                                </th>
                                <th className="px-4 py-2 text-left">
                                    <button onClick={() => handleSort('username')} className="flex items-center gap-1 text-pink-300 hover:text-white">
                                        Username
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
                                <th className="px-4 py-2 text-left">
                                    <button onClick={() => handleSort('email')} className="flex items-center gap-1 text-pink-300 hover:text-pink-300">
                                        Email
                                        {filters.sort === 'email' ? (
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
                                <th className="px-4 py-2 text-left">2FA</th>
                                <th className="px-4 py-2 text-left">
                                    <button onClick={() => handleSort('role')} className="flex items-center gap-1 text-pink-300 hover:text-white">
                                        Role
                                        {filters.sort === 'role' ? (
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
                                <th className="px-4 py-2 text-left">
                                    <button onClick={() => handleSort('servers')} className="flex items-center gap-1 text-pink-300 hover:text-white">
                                        servers
                                        {filters.sort === 'servers' ? (
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
                                <th className="px-4 py-2 text-left">
                                    <button onClick={() => handleSort('subusers')} className="flex items-center gap-1 text-pink-300 hover:text-white">
                                        Subusers
                                        {filters.sort === 'servers' ? (
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
                                <th className="px-4 py-2 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.data.map((user) => (
                                <tr key={user.id} className="border-t border-pink-700 hover:bg-pink-900/10">
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-700 font-bold text-white uppercase">
                                            {user.name.charAt(0)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-pink-500">
                                        <span className="inline-flex items-center gap-1">
                                            <UserCheck className="h-4 w-4" /> {user.name}
                                        </span>
                                    </td>
                                    <td className="inline-flex items-center gap-1 py-5 text-pink-300">
                                        <Mail className="h-4 w-4" /> {user.email}
                                    </td>
                                    <td className="px-4 py-3 text-pink-300">
                                        <span className="inline-flex items-center gap-1">
                                            {user.has2fa ? (
                                                <>
                                                    <UserRoundCheck className="h-4 w-4 text-green-400" />
                                                    Yes
                                                </>
                                            ) : (
                                                <>
                                                    <UserRoundX className="h-4 w-4 text-red-400" />
                                                    No
                                                </>
                                            )}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-center text-pink-300">
                                        <div className="flex flex-wrap justify-center gap-1">
                                            {user.roles.length > 0 ? (
                                                user.roles.map((role) => (
                                                    <span
                                                        key={role}
                                                        className="inline-flex items-center gap-1 rounded border border-pink-600 bg-pink-800/20 px-2 py-0.5 text-xs text-pink-300"
                                                    >
                                                        {role === 'admin' ? <UserRoundCog className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                        {role}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-sm text-neutral-400 italic">
                                                    <UserRoundX className="h-4 w-4" />
                                                    No Role
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 text-center text-pink-300">
                                        <span className="inline-flex items-center gap-1">
                                            <Server className="h-4 w-4" /> {user.servers || 0}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-pink-300">
                                        <span className="inline-flex items-center gap-1">
                                            <UsersRound className="h-4 w-4" /> {user.subusers || 0}
                                        </span>
                                    </td>

                                    <td className="px-4 py-3 text-center text-pink-300">
                                        <button className="text-pink-300 hover:text-white">
                                            <Pencil className="h-4 w-4" />
                                        </button>
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
