import { RoleBadge } from '@/components/rank-badges';
import UserAvatar from '@/components/user-avatar';
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage, Link } from '@inertiajs/react';

import { ChevronLeft, ChevronRight, Eye, Mail, Pencil, Server, Trash2, UserCheck, UserRoundCheck, UserRoundX, UsersRound } from 'lucide-react';
import { toast } from 'sonner';

interface UserItem {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
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
    const deleteUser = (userId: number, userName: string) => {
        router.delete(`/users/${userId}`, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success(`User ${userName} deleted successfully`);
            },
            onCancel: () => {
                toast.info('User deletion canceled');
            },
        });
    };
    return (
        <AppLayout breadcrumbs={[{ title: 'Users', href: '/users' }]}>
            <Head title="Users">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="mb-6 flex items-center justify-between border-pink-500 dark:border-pink-600">
                    <div className="flex items-center gap-3">
                        <UsersRound className="h-8 w-8 text-pink-400" />
                        <h1 className="text-3xl font-semibold tracking-widest text-pink-800 drop-shadow-none dark:text-pink-400">
                            USERS
                        </h1>
                    </div>
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
                                <th className="w-[60px] px-2 py-3 text-left sm:px-4"></th>
                                <th className="w-1/5 px-4 py-3 text-left">name</th>
                                <th className="hidden w-1/4 px-4 py-3 text-left md:table-cell">Email</th>
                                <th className="hidden w-[80px] px-4 py-3 text-left md:table-cell">2FA</th>
                                <th className="w-1/5 px-4 py-3 text-left">Roles</th>
                                <th className="w-[80px] px-4 py-3 text-left">Servers</th>
                                <th className="hidden w-[90px] px-4 py-3 text-left md:table-cell">Subusers</th>
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
                                    <tr
                                        key={user.id}
                                        onClick={() => router.visit(`/users/${user.id}/edit`)}
                                        className="cursor-pointer border-b border-pink-800 transition hover:bg-pink-900/20"
                                    >
                                        {' '}
                                        <td className="px-2 py-3 sm:px-4">
                                            <UserAvatar name={user.name} src={user.avatar} size={32} />
                                        </td>
                                        <td className="max-w-[160px] px-4 py-3 text-pink-200 md:max-w-none">
                                            <span className="block truncate">{user.name}</span>
                                            {/* En móvil el email va debajo del nombre (su columna se oculta) */}
                                            <span className="block truncate text-xs text-pink-400/80 md:hidden">{user.email}</span>
                                        </td>
                                        <td className="hidden truncate px-4 py-3 text-pink-300 md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                <span className="truncate">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="hidden px-4 py-3 text-pink-300 md:table-cell">
                                            {user.has2fa ? <UserRoundCheck className="text-green-400" /> : <UserRoundX className="text-red-400" />}
                                        </td>
                                        <td className="px-4 py-3 text-pink-300">
                                            <div className="flex flex-wrap gap-1">
                                                {user.roles.length ? (
                                                    user.roles.map((role) => <RoleBadge key={role} role={role} size="xs" />)
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
                                        <td className="hidden px-4 py-3 text-pink-300 md:table-cell">
                                            <div className="flex items-center gap-1 font-semibold">
                                                <UsersRound className="h-4 w-4" /> {user.subusers}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2 text-pink-400">
                                                <button onClick={() => router.visit(`/users/${user.id}/edit`)}>
                                                    <Pencil className="h-4 w-4" />
                                                </button>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteUser(user.id, user.name);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        <tfoot>
                            <tr>
                                <td colSpan={8}>
                                    <div className="flex items-center justify-between px-4 py-3 text-sm text-pink-500">
                                        <span>
                                            Showing {users.data.length} of {users.total} users
                                        </span>
                                        <nav className="flex items-center gap-2">
                                            {users.links.map((link, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => router.get(link.url || '', {}, { preserveScroll: true })}
                                                    className={`rounded px-3 py-1 ${
                                                        link.active ? 'bg-pink-600 text-white' : 'bg-pink-200 text-pink-800 hover:bg-pink-300'
                                                    }`}
                                                >
                                                    {link.label.includes('Previous') ? (
                                                        <ChevronLeft className="h-4 w-4" />
                                                    ) : link.label.includes('Next') ? (
                                                        <ChevronRight className="h-4 w-4" />
                                                    ) : (
                                                        link.label
                                                    )}
                                                </button>
                                            ))}
                                        </nav>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>

                        
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
