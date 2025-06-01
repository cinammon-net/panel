import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function CreateUser() {
    const { roles } = usePage<{ roles: { id: number; name: string }[] }>().props;

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        roles: [] as string[],
    });

    const [errors, setErrors] = useState<string | null>(null);

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
        if (!form.name || !form.email || !form.password) {
            toast.error('All fields are required');
            return;
        } else if (form.roles.length === 0) {
            toast.error('At least one role must be selected');
            return;
        }

        router.post(
            '/users',
            {
                name: form.name.trim(),
                email: form.email.trim(),
                password: form.password,
                roles: form.roles,
            },
            {
                onSuccess: () => {
                    toast.success('User created successfully');
                    setForm({ name: '', email: '', password: '', roles: [] });
                    setErrors(null);
                },
                onError: (err) => {
                    const msg = typeof err === 'string' ? err : err?.name || 'Failed to create user';
                    setErrors(msg);
                    toast.error(msg);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Users', href: '/users' }]}>
            <Head title="Create User">
                <meta name="description" content="Roles management page" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold tracking-widest text-pink-800 drop-shadow-none dark:text-pink-400 dark:drop-shadow-[0_0_6px_#f0f]">
                        CREATE USER
                    </h1>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSubmit}
                            className="rounded-lg border border-pink-500 bg-pink-100 px-4 py-2 text-sm font-semibold text-pink-800 transition-all hover:scale-[1.03] hover:bg-pink-200 dark:border-pink-500 dark:bg-pink-900/50 dark:text-pink-300 dark:hover:bg-pink-700/70"
                        >
                            ＋ Create User
                        </button>
                    </div>
                </div>

                {errors && <div className="mb-4 rounded bg-red-600 px-4 py-2 text-sm text-white">{errors}</div>}

                <div className="overflow-x-auto">
                    <div className="bg-pink inline-block min-w-full overflow-hidden rounded-lg border border-pink-300 shadow-none transition dark:border-pink-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#0ff3]">
                        <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                            <div className="col-span-1 md:col-span-3">
                                <fieldset className="rounded-lg border border-pink-700 p-4">
                                    <legend className="px-2 text-sm font-semibold text-pink-600 dark:text-pink-400">User Information</legend>

                                    <div className="grid grid-cols-1 gap-6  md:grid-cols-3">
                                        <div>
                                            <label className="block font-semibold text-pink-600 dark:text-pink-300">Username*</label>
                                            <input
                                                type="text"
                                                name="name"
                                                placeholder="Cinammon"
                                                required
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
                                                placeholder="email@domain.es"
                                                required
                                                value={form.email}
                                                onChange={handleChange}
                                                className="w-full rounded border border-pink-500 bg-gray-100 px-3 py-2 text-black dark:bg-neutral-900 dark:text-white"
                                            />
                                        </div>

                                        <div>
                                            <label className="block font-semibold text-pink-600 dark:text-pink-300">Password*</label>
                                            <input
                                                type="password"
                                                name="password"
                                                placeholder="*********"
                                                value={form.password}
                                                security="true"
                                                autoComplete="new-password"
                                                autoFocus
                                                required
                                                onChange={handleChange}
                                                className="w-full rounded border border-pink-500 bg-gray-100 px-3 py-2 text-black dark:bg-neutral-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                            <div className="col-span-1 mt-6 md:col-span-3">
                                <fieldset className="rounded-lg border border-pink-700 p-4">
                                    <legend className="px-2 text-sm font-semibold text-pink-600 dark:text-pink-400">Assign Roles</legend>

                                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 md:grid-cols-3">
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
            </div>
        </AppLayout>
    );
}
