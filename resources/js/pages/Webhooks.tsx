import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Plus, Trash2, Webhook as WebhookIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface WebhookItem {
    id: number;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    created_at: string;
}

interface Props {
    webhooks: WebhookItem[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Webhooks', href: '/webhooks' }];

export default function Webhooks({ webhooks = [] }: Props) {
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            '/webhooks',
            {
                name,
                url,
                events: ['server.created', 'server.power', 'node.heartbeat'],
                enabled: true,
            },
            {
                onSuccess: () => {
                    setName('');
                    setUrl('');
                    toast.success('Webhook creado con éxito');
                },
            },
        );
    };

    const handleDelete = (id: number) => {
        router.delete(`/webhooks/${id}`, {
            onSuccess: () => toast.success('Webhook eliminado'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Webhooks" />
            <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="flex items-center justify-between border-b border-orange-500/30 pb-4">
                    <div className="flex items-center gap-3">
                        <WebhookIcon className="h-8 w-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-wider text-orange-400">WEBHOOKS</h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Notificaciones HTTP en tiempo real hacia Discord, Slack o servicios externos
                            </p>
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="flex flex-col gap-4 rounded-xl border border-orange-500/40 bg-neutral-900/90 p-5 sm:flex-row sm:items-end"
                >
                    <div className="flex-1">
                        <label className="mb-1 block text-xs text-orange-300">Nombre del Webhook</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Alertas Discord"
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <div className="flex-[2]">
                        <label className="mb-1 block text-xs text-orange-300">Endpoint URL</label>
                        <input
                            type="url"
                            required
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://discord.com/api/webhooks/..."
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
                    >
                        <Plus className="h-4 w-4" /> Añadir Webhook
                    </button>
                </form>

                <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5">
                    {webhooks.length === 0 ? (
                        <p className="py-8 text-center text-sm text-neutral-400">No hay webhooks configurados.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Nombre</th>
                                        <th className="px-4 py-3">URL</th>
                                        <th className="px-4 py-3">Eventos</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {webhooks.map((w) => (
                                        <tr key={w.id} className="hover:bg-orange-500/5">
                                            <td className="px-4 py-3 text-neutral-400">#{w.id}</td>
                                            <td className="px-4 py-3 font-semibold text-white">{w.name}</td>
                                            <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-cyan-400">{w.url}</td>
                                            <td className="px-4 py-3 text-xs text-neutral-300">{(w.events || []).join(', ')}</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400">
                                                    Activo
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(w.id)}
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

