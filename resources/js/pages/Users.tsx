import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage, Link } from '@inertiajs/react';

import { Copy, Eye, Mail, Pencil, Server, Trash2, UserCheck, UserRoundCheck, UserRoundX, UsersRound } from 'lucide-react';

interface UserItem {
    id: number;
    name: string;
    email: string;
    has2fa: boolean;
    roles: string[];
    servers: number;
    subusers: number;
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

export default function Users() {
    const { users } = usePage<{ users: Pagination<UserItem> }>().props;

    return (
        <AppLayout breadcrumbs={[{ title: 'Users', href: '/users' }]}>
            <Head title="Users">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="mb-6 flex items-center justify-between border-pink-500 dark:border-pink-600">
                    <h1 className="text-3xl font-semibold tracking-widest text-pink-800 drop-shadow-none dark:text-pink-400 dark:drop-shadow-[0_0_5px_#f0f]">
                        USERS
                    </h1>
                    <div className="flex items-center gap-3">
                        <Link
                            href="/users/create"
                            className="rounded border border-pink-400 bg-pink-100/50 px-4 py-1.5 text-sm text-pink-800 transition hover:bg-pink-200/70 dark:border-pink-500 dark:bg-pink-900/30 dark:text-pink-300 dark:hover:bg-pink-700/50"
                        >
                            + Create User
                        </Link>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-pink-500 bg-white dark:border-pink-600 dark:bg-black">
                    <table className="w-full table-auto text-sm text-pink-800 dark:text-pink-300">
                        <thead className="display-table border-b border-pink-500 bg-pink-900 text-pink-200">
                            <tr>
                                <th className="w-[60px] px-4 py-3 text-left"></th>
                                <th className="w-1/5 px-4 py-3 text-left">name</th>
                                <th className="w-1/4 px-4 py-3 text-left">Email</th>
                                <th className="w-[80px] px-4 py-3 text-left">2FA</th>
                                <th className="w-1/5 px-4 py-3 text-left">Roles</th>
                                <th className="w-[80px] px-4 py-3 text-left">Servers</th>
                                <th className="w-[90px] px-4 py-3 text-left">Subusers</th>
                                <th className="w-[60px] px-4 py-3 text-right"></th>
                            </tr>
                        </thead>

                        <tbody>
                            {users.data.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.data.map((user) => (
                                    <tr key={user.id} className="border-b border-pink-800 hover:bg-pink-900/10">
                                        <td className="px-4 py-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-700 font-bold text-white uppercase">
                                                {user.name.charAt(0)}
                                            </div>
                                        </td>
                                        <td className="truncate px-4 py-3 text-pink-200">{user.name}</td>
                                        <td className="truncate px-4 py-3 text-pink-300">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-pink-300">
                                            {user.has2fa ? <UserRoundCheck className="text-green-400" /> : <UserRoundX className="text-red-400" />}
                                        </td>
                                        <td className="px-4 py-3 text-pink-300">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.length ? (
                                                    user.roles.map((role) => (
                                                        <span
                                                            key={role}
                                                            className="inline-flex items-center gap-1 rounded-full border border-pink-600 bg-pink-800/40 px-2 py-0.5 text-xs text-pink-200"
                                                        >
                                                            {role === 'admin' ? <UserCheck className="h-3 w-3" /> : <Eye className="h-3 w-3" />}{' '}
                                                            {role}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-neutral-400 italic">
                                                        <UserRoundX className="h-3 w-3" /> No Role
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-pink-300">
                                            <div className="flex items-center gap-1 font-semibold">
                                                <Server className="h-4 w-4" /> {user.servers}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-pink-300">
                                            <div className="flex items-center gap-1 font-semibold">
                                                <UsersRound className="h-4 w-4" /> {user.subusers}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2 text-pink-400">
                                                <button onClick={() => router.visit(`/users/${user.id}/edit`)}>
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button onClick={() => alert('Duplicate not implemented')}>
                                                    <Copy className="h-4 w-4 text-blue-400" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        confirm(`Are you sure you want to delete ${user.name}?`) &&
                                                        router.delete(`/users/${user.id}`, {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                        })
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-400" />
                                                </button>
                                            </div>
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
