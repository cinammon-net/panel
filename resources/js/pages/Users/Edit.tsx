import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function EditUser() {
    const { user, roles } = usePage().props as unknown as {
        user: {
            id: number;
            name: string;
            email: string;
            roles: string[];
        };
        roles: { id: number; name: string }[];
    };

    const [form, setForm] = useState({
        name: user.name,
        email: user.email,
        password: '',
        roles: user.roles,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const toggleRole = (roleName: string) => {
        setForm((prev) => {
            const exists = prev.roles.includes(roleName);
            const updatedRoles = exists ? prev.roles.filter((r) => r !== roleName) : [...prev.roles, roleName];

            return { ...prev, roles: updatedRoles };
        });
    };

    const handleSubmit = () => {
        if (!form.name || !form.email) {
            toast.error('Name and email are required');
            return;
        }

        router.put(`/users/${user.id}`, form, {
            onSuccess: () => toast.success('User updated successfully'),
            onError: (err) => toast.error(err?.name || 'Failed to update user'),
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Users', href: '/users' },
                { title: 'Edit', href: `/users/${user.id}/edit` },
                { title: user.name, href: `/users/${user.id}` },
            ]}
        >
            <Head title={`Edit ${user.name}`}>
                <meta name="description" content="Roles management page" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold tracking-widest text-pink-800 drop-shadow-none dark:text-pink-400 dark:drop-shadow-[0_0_6px_#f0f]">
                        EDIT USER {user.name}
                    </h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSubmit}
                            className="rounded-lg border border-pink-500 bg-pink-100 px-4 py-2 text-sm font-semibold text-pink-800 transition-all hover:scale-[1.03] hover:bg-pink-200 dark:border-pink-500 dark:bg-pink-900/50 dark:text-pink-300 dark:hover:bg-pink-700/70"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <div className="inline-block min-w-full overflow-hidden rounded-lg border border-pink-300 shadow-none transition dark:border-pink-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                        <div className="space-y-6 p-6">
                            {/* Fieldset: User Info */}
                            <fieldset className="rounded-lg border border-pink-700 p-6">
                                <legend className="px-2 text-sm font-semibold text-pink-600 dark:text-pink-400">User Information</legend>

                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <div>
                                        <label className="block font-semibold text-pink-600 dark:text-pink-300">Username*</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={form.name}
                                            onChange={handleChange}
                                            className="w-full rounded border border-pink-500 bg-gray-100 px-3 py-2 text-black dark:bg-neutral-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-pink-600 dark:text-pink-300">Email*</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={form.email}
                                            onChange={handleChange}
                                            className="w-full rounded border border-pink-500 bg-gray-100 px-3 py-2 text-black dark:bg-neutral-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-pink-600 dark:text-pink-300">Password</label>
                                        <input
                                            type="password"
                                            name="password"
                                            placeholder="Leave blank to keep current"
                                            value={form.password}
                                            onChange={handleChange}
                                            className="w-full rounded border border-pink-500 bg-gray-100 px-3 py-2 text-black dark:bg-neutral-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </fieldset>

                            {/* Fieldset: Roles */}
                            <fieldset className="rounded-lg border border-pink-700 p-6">
                                <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-pink-600 dark:text-pink-400">
                                    Assign Roles
                                    <span className="group relative cursor-help text-sm text-pink-400 dark:text-pink-300">
                                        🛈
                                        <div className="absolute top-6 left-0 z-10 hidden w-[200px] rounded bg-white p-2 text-xs text-gray-800 shadow-lg group-hover:block dark:bg-neutral-800 dark:text-white">
                                            Select the roles to assign to this user.
                                        </div>
                                    </span>
                                </legend>

                                <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 md:grid-cols-3">
                                    {roles.map((role) => (
                                        <label
                                            key={role.id}
                                            className="flex cursor-pointer items-center gap-2 rounded-md border border-pink-400 bg-pink-100 px-3 py-2 text-sm text-pink-700 transition hover:bg-pink-200 dark:border-pink-700 dark:bg-pink-900/40 dark:text-pink-200 dark:hover:bg-pink-900"
                                        >
                                            <input
                                                type="checkbox"
                                                className="accent-pink-600"
                                                checked={form.roles.includes(role.name)}
                                                onChange={() => toggleRole(role.name)}
                                            />
                                            {role.name}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
