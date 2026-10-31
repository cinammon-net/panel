import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Plus, Radio, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface MountItem {
    id: number;
    uuid: string;
    name: string;
    description: string | null;
    source: string;
    target: string;
    read_only: boolean;
    user_mountable: boolean;
    eggs_count: number;
    nodes_count: number;
}

interface Props {
    mounts: MountItem[];
    eggs: { id: number; name: string }[];
    nodes: { id: number; name: string }[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Mounts', href: '/mounts' }];

export default function Mounts({ mounts = [] }: Props) {
    const [form, setForm] = useState({
        name: '',
        description: '',
        source: '/mnt/shared',
        target: '/home/container/shared',
        read_only: false,
        user_mountable: false,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/mounts', form, {
            onSuccess: () => {
                setForm({
                    name: '',
                    description: '',
                    source: '/mnt/shared',
                    target: '/home/container/shared',
                    read_only: false,
                    user_mountable: false,
                });
                toast.success('Mount creado con éxito');
            },
        });
    };

    const handleDelete = (id: number) => {
        router.delete(`/mounts/${id}`, {
            onSuccess: () => toast.success('Mount eliminado'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mounts" />
            <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="flex items-center justify-between border-b border-orange-500/30 pb-4">
                    <div className="flex items-center gap-3">
                        <Radio className="h-8 w-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-wider text-orange-400">SYSTEM MOUNTS</h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Configura puntos de montaje adicionales entre el host y los contenedores de juego
                            </p>
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="grid grid-cols-1 gap-4 rounded-xl border border-orange-500/40 bg-neutral-900/90 p-5 sm:grid-cols-2 lg:grid-cols-5"
                >
                    <div>
                        <label className="mb-1 block text-xs text-orange-300">Nombre</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Shared Assets"
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-orange-300">Source Path (Host)</label>
                        <input
                            type="text"
                            required
                            value={form.source}
                            onChange={(e) => setForm({ ...form, source: e.target.value })}
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-orange-300">Target Path (Contenedor)</label>
                        <input
                            type="text"
                            required
                            value={form.target}
                            onChange={(e) => setForm({ ...form, target: e.target.value })}
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div className="flex flex-col justify-end gap-2">
                        <label className="flex items-center gap-2 text-xs text-neutral-300">
                            <input
                                type="checkbox"
                                checked={form.read_only}
                                onChange={(e) => setForm({ ...form, read_only: e.target.checked })}
                            />
                            Solo lectura (Read Only)
                        </label>
                        <label className="flex items-center gap-2 text-xs text-neutral-300">
                            <input
                                type="checkbox"
                                checked={form.user_mountable}
                                onChange={(e) => setForm({ ...form, user_mountable: e.target.checked })}
                            />
                            Montable por usuarios
                        </label>
                    </div>
                    <div className="flex items-end">
                        <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
                        >
                            <Plus className="h-4 w-4" /> Crear Mount
                        </button>
                    </div>
                </form>

                <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5">
                    {mounts.length === 0 ? (
                        <p className="py-8 text-center text-sm text-neutral-400">No hay puntos de montaje registrados.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3">Source</th>
                                        <th className="px-4 py-3">Target</th>
                                        <th className="px-4 py-3">Modo</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {mounts.map((m) => (
                                        <tr key={m.id} className="hover:bg-orange-500/5">
                                            <td className="px-4 py-3 text-neutral-400">#{m.id}</td>
                                            <td className="px-4 py-3 font-semibold text-white">{m.name}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-cyan-400">{m.source}</td>
                                            <td className="px-4 py-3 font-mono text-xs text-emerald-400">{m.target}</td>
                                            <td className="px-4 py-3 text-xs text-neutral-300">
                                                {m.read_only ? 'Read-Only' : 'Read/Write'} ·{' '}
                                                {m.user_mountable ? 'User Mountable' : 'Admin Only'}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(m.id)}
                                                    className="inline-flex items-center gap-1 rounded bg-red-600/20 px-3 py-1 text-xs text-red-400 hover:bg-red-600 hover:text-white"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}

