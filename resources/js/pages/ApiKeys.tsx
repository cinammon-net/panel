import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Copy, Eye, EyeOff, KeyRound, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface ApiKeyItem {
    id: number;
    public: string;
    secret_preview: string;
    secret: string;
    allowed_ips: string | null;
    created_at: string;
}

interface Props {
    apiKeys: ApiKeyItem[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'API Keys', href: '/api-keys' }];

export default function ApiKeys({ apiKeys = [] }: Props) {
    const [allowedIps, setAllowedIps] = useState('');
    const [revealed, setRevealed] = useState<Record<number, boolean>>({});
    const [submitting, setSubmitting] = useState(false);

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        router.post(
            '/api-keys',
            { allowed_ips: allowedIps },
            {
                onSuccess: () => {
                    setAllowedIps('');
                    toast.success('API Key generada con éxito');
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const handleDelete = (id: number) => {
        router.delete(`/api-keys/${id}`, {
            onSuccess: () => toast.success('API Key eliminada'),
        });
    };

    const copyToClipboard = (value: string, label: string) => {
        navigator.clipboard.writeText(value);
        toast.success(`${label} copiado al portapapeles`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="API Keys" />
            <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="flex items-center justify-between border-b border-orange-500/30 pb-4">
                    <div className="flex items-center gap-3">
                        <KeyRound className="h-8 w-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-wider text-orange-400">APPLICATION API KEYS</h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Gestiona las claves de acceso para la API administrativa del panel
                            </p>
                        </div>
                    </div>
                </div>

                <form
                    onSubmit={handleCreate}
                    className="flex flex-col gap-4 rounded-xl border border-orange-500/40 bg-neutral-900/90 p-5 sm:flex-row sm:items-end"
                >
                    <div className="flex-1">
                        <label className="mb-1 block text-xs font-semibold text-orange-300">
                            IPs Permitidas (opcional, separadas por coma — vacío para todas)
                        </label>
                        <input
                            type="text"
                            value={allowedIps}
                            onChange={(e) => setAllowedIps(e.target.value)}
                            placeholder="Ej: 127.0.0.1, 192.168.1.10"
                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-2 text-sm font-bold text-black transition hover:bg-orange-400 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        Generar Nueva API Key
                    </button>
                </form>

                <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5">
                    {apiKeys.length === 0 ? (
                        <p className="py-8 text-center text-sm text-neutral-400">No hay claves API creadas todavía.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                    <tr>
                                        <th className="px-4 py-3">ID</th>
                                        <th className="px-4 py-3">Public Identifier</th>
                                        <th className="px-4 py-3">Secret Token</th>
                                        <th className="px-4 py-3">Allowed IPs</th>
                                        <th className="px-4 py-3">Creada</th>
                                        <th className="px-4 py-3 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {apiKeys.map((key) => (
                                        <tr key={key.id} className="hover:bg-orange-500/5">
                                            <td className="px-4 py-3 text-neutral-400">#{key.id}</td>
                                            <td className="px-4 py-3 font-mono text-cyan-400">{key.public}</td>
                                            <td className="px-4 py-3 font-mono text-neutral-200">
                                                <div className="flex items-center gap-2">
                                                    <span>{revealed[key.id] ? key.secret : key.secret_preview}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRevealed((prev) => ({ ...prev, [key.id]: !prev[key.id] }))}
                                                        className="text-neutral-400 hover:text-orange-400"
                                                    >
                                                        {revealed[key.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(key.secret, 'Secret Token')}
                                                        className="text-neutral-400 hover:text-cyan-400"
                                                    >
                                                        <Copy className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-neutral-300">{key.allowed_ips || 'Todas (*)'}</td>
                                            <td className="px-4 py-3 text-neutral-400">{key.created_at || 'Reciente'}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(key.id)}
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

