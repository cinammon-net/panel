import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Eye, EyeOff, Info, Lock, LockOpen, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SecurityLockState {
    has_code: boolean;
    active: boolean;
    until: string | null;
    set_at: string | null;
}

export default function EditUser() {
    const { user, roles, canManageSecurityLock } = usePage().props as unknown as {
        user: {
            id: number;
            name: string;
            email: string;
            roles: string[];
            security_lock?: SecurityLockState | null;
        };
        roles: { id: number; name: string }[];
        canManageSecurityLock?: boolean;
    };

    const [form, setForm] = useState({
        name: user.name,
        email: user.email,
        password: '',
        roles: user.roles,
    });
    const [lockCode, setLockCode] = useState('');
    const [showLockCode, setShowLockCode] = useState(false);
    const [activateLock, setActivateLock] = useState(true);
    const [savingLock, setSavingLock] = useState(false);

    const handleLockAction = (action: 'set' | 'disable' | 'reset') => {
        if (action === 'set' && lockCode.trim().length < 4) {
            toast.error('El código de seguridad debe tener al menos 4 caracteres.');
            return;
        }
        setSavingLock(true);
        router.put(
            `/users/${user.id}/security-lock`,
            {
                action,
                code: action === 'set' ? lockCode.trim() : undefined,
                activate: action === 'set' ? activateLock : undefined,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    if (action === 'set') setLockCode('');
                    toast.success(
                        action === 'set'
                            ? 'Código de seguridad actualizado'
                            : action === 'disable'
                              ? 'Bloqueo temporal desactivado'
                              : 'Código de seguridad restablecido',
                    );
                },
                onError: (err) => toast.error(Object.values(err)[0] || 'No se pudo actualizar el código de seguridad'),
                onFinish: () => setSavingLock(false),
            },
        );
    };

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
                                        <Info className="h-4 w-4" aria-label="Información" />
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

                            {canManageSecurityLock && user.security_lock && (
                                <fieldset className="rounded-lg border border-pink-700 p-6">
                                    <legend className="flex items-center gap-2 px-2 text-sm font-semibold text-pink-600 dark:text-pink-400">
                                        <Lock className="h-4 w-4" />
                                        Código de seguridad de servidores (Solo Owner)
                                    </legend>

                                    <div className="space-y-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-pink-500/30 bg-black/30 px-4 py-3 text-xs">
                                            <div>
                                                <span className="font-semibold text-pink-300">Estado actual: </span>
                                                <span className="text-neutral-200">
                                                    {!user.security_lock.has_code
                                                        ? 'Sin código configurado (se le pedirá crear uno al entrar a su servidor)'
                                                        : user.security_lock.active
                                                          ? `Bloqueo activo hasta ${user.security_lock.until ? new Date(user.security_lock.until).toLocaleString('es-ES') : 'fin de mes'}`
                                                          : 'Tiene código guardado, bloqueo temporal desactivado'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-pink-600 dark:text-pink-300">
                                                    Nuevo código de seguridad (4–32 caracteres)
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showLockCode ? 'text' : 'password'}
                                                        value={lockCode}
                                                        onChange={(e) => setLockCode(e.target.value)}
                                                        placeholder="Escribe un nuevo código para este cliente"
                                                        className="w-full rounded border border-pink-500 bg-gray-100 py-2 pr-10 pl-3 text-sm text-black dark:bg-neutral-900 dark:text-white"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowLockCode((v) => !v)}
                                                        className="absolute inset-y-0 right-2.5 flex items-center text-neutral-400 hover:text-neutral-200"
                                                    >
                                                        {showLockCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs text-neutral-300">
                                                    <input
                                                        type="checkbox"
                                                        className="accent-pink-600"
                                                        checked={activateLock}
                                                        onChange={(e) => setActivateLock(e.target.checked)}
                                                    />
                                                    Activar bloqueo durante 1 mes al guardar el código
                                                </label>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    disabled={savingLock}
                                                    onClick={() => handleLockAction('set')}
                                                    className="inline-flex items-center gap-1.5 rounded border border-pink-500 bg-pink-900/50 px-3.5 py-2 text-xs font-semibold text-pink-200 hover:bg-pink-700/70 disabled:opacity-50"
                                                >
                                                    <Lock className="h-3.5 w-3.5" />
                                                    Guardar código
                                                </button>

                                                {user.security_lock.active && (
                                                    <button
                                                        type="button"
                                                        disabled={savingLock}
                                                        onClick={() => handleLockAction('disable')}
                                                        className="inline-flex items-center gap-1.5 rounded border border-amber-500/60 bg-amber-950/40 px-3.5 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-900/50 disabled:opacity-50"
                                                    >
                                                        <LockOpen className="h-3.5 w-3.5" />
                                                        Desactivar bloqueo
                                                    </button>
                                                )}

                                                {user.security_lock.has_code && (
                                                    <button
                                                        type="button"
                                                        disabled={savingLock}
                                                        onClick={() => handleLockAction('reset')}
                                                        className="inline-flex items-center gap-1.5 rounded border border-neutral-600 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-neutral-200 hover:border-pink-500/60 disabled:opacity-50"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        Restablecer código
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </fieldset>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
