import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

export default function EditRole() {
    const { role } = usePage<{ role: { id: number; name: string; is_default: boolean } }>().props;
    const [name, setName] = useState(role.name);
    const [errors, setErrors] = useState<string | null>(null);

    const isDefault = role.is_default;

    const handleSave = () => {
        router.put(
            `/roles/${role.id}`,
            { name },
            {
                onSuccess: () => setErrors(null),
                onError: (err) => setErrors('Error: ' + JSON.stringify(err)),
            },
        );
    };

    const handleDelete = () => {
        if (confirm('¿Estás segura que deseas eliminar este rol?')) {
            router.delete(`/roles/${role.id}`);
        }
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Roles', href: '/roles' },
                { title: role.name, href: `/roles/${role.id}` },
            ]}
        >
            <Head title={`Edit ${role.name}`}>
                <meta name="description" content="User management page" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-3xl font-semibold tracking-widest text-pink-800 drop-shadow-none dark:text-pink-400 dark:drop-shadow-[0_0_6px_#f0f]">
                        EDIT ROLE {role.name}
                    </h1>

                    <div className="flex flex-wrap gap-3">
                        {isDefault ? (
                            <button
                                disabled
                                className="cursor-not-allowed rounded bg-red-300/70 px-4 py-2 text-red-700 dark:bg-red-800/70 dark:text-red-200"
                            >
                                Default Role - Cannot Delete
                            </button>
                        ) : (
                            <button
                                onClick={handleDelete}
                                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600"
                            >
                                Delete Role
                            </button>
                        )}

                        <button
                            onClick={handleSave}
                            disabled={isDefault}
                            className={`rounded border px-4 py-2 ${
                                isDefault
                                    ? 'cursor-not-allowed border-gray-400 bg-gray-200 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300'
                                    : 'border-pink-500 bg-pink-200 text-pink-900 hover:bg-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:hover:bg-pink-700/60'
                            }`}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>

                {errors && (
                    <div className="mb-4 rounded border border-red-700 bg-red-600 px-4 py-2 text-sm text-white shadow-md dark:border-red-900">
                        {errors}
                    </div>
                )}

                <div className="mb-4">
                    <label className="mb-1 block font-semibold text-pink-700 dark:text-pink-300">Role Name</label>
                    <input
                        type="text"
                        className="w-full rounded border border-pink-500 bg-gray-100 px-3 py-2 text-black dark:bg-neutral-900 dark:text-white"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isDefault}
                    />
                </div>

                <div className="mt-6 text-sm text-pink-700 italic dark:text-pink-300">
                    {isDefault ? 'Este rol es predeterminado y no se puede modificar ni eliminar.' : 'Este rol puede ser editado y personalizado.'}
                </div>
            </div>
        </AppLayout>
    );
}
