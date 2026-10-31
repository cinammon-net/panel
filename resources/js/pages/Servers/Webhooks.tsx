import ServerLayout from '@/layouts/server-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    Activity,
    Bell,
    Check,
    Copy,
    Globe,
    MessageSquare,
    Play,
    Plus,
    Send,
    Trash2,
    Webhook,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface WebhookItem {
    id: string;
    name: string;
    url: string;
    events: string[];
    enabled: boolean;
    last_triggered_at?: string | null;
}

interface PageProps {
    server: {
        id: number;
        name: string;
        uuid: string;
        owner_id?: number;
    };
    webhooks: WebhookItem[];
}

const AVAILABLE_EVENTS = [
    { key: 'server:start', label: 'Inicio del Servidor' },
    { key: 'server:stop', label: 'Detención del Servidor' },
    { key: 'server:crash', label: 'Cierre Inesperado / Crash' },
    { key: 'server:backup.create', label: 'Copia de Seguridad Completada' },
];

export default function WebhooksPage({ server, webhooks = [] }: PageProps) {
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [testingId, setTestingId] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        url: '',
        events: ['server:start', 'server:stop', 'server:crash'],
    });

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/servers/${server.id}/webhooks`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Webhook registrado correctamente.');
                setIsCreateOpen(false);
                reset();
            },
            onError: (err) => {
                toast.error(err.url || err.name || 'Error al guardar webhook.');
            },
        });
    };

    const handleTestWebhook = (wh: WebhookItem) => {
        setTestingId(wh.id);
        router.post(
            `/servers/${server.id}/webhooks/${wh.id}/test`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setTestingId(null);
                    toast.success(`Mensaje de prueba enviado a ${wh.name}.`);
                },
                onError: (err: any) => {
                    setTestingId(null);
                    toast.error(err.webhook || 'Error al probar webhook.');
                },
            }
        );
    };

    const handleDelete = (wh: WebhookItem) => {
        if (!confirm(`¿Estás seguro de eliminar el webhook "${wh.name}"?`)) {
            return;
        }

        router.delete(`/servers/${server.id}/webhooks/${wh.id}`, {
            preserveScroll: true,
            onSuccess: () => toast.success('Webhook eliminado.'),
            onError: (err: any) => toast.error(err.webhook || 'Error al eliminar.'),
        });
    };

    const toggleEvent = (eventKey: string) => {
        const current = data.events;
        if (current.includes(eventKey)) {
            setData('events', current.filter((e) => e !== eventKey));
        } else {
            setData('events', [...current, eventKey]);
        }
    };

    return (
        <ServerLayout server={server} section="webhooks">
            <Head title={`${server.name} · Webhooks - Cinammon`} />

            <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-cyan-900/60 pb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Webhook className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-white uppercase">
                                Webhooks de Notificación
                            </h1>
                            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                                Envía notificaciones automáticas a canales de Discord o endpoints HTTP cuando ocurran eventos en tu servidor.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold uppercase tracking-wider text-black transition-all hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.35)]"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Añadir Webhook</span>
                    </button>
                </div>

                {/* Webhooks List */}
                <div className="space-y-4">
                    {webhooks.map((wh) => {
                        const isTesting = testingId === wh.id;

                        return (
                            <div
                                key={wh.id}
                                className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 p-5 transition-all shadow-lg hover:border-cyan-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                                            {wh.name}
                                        </h3>
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                                            ACTIVO
                                        </span>
                                    </div>

                                    <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-xl">
                                        {wh.url.replace(/(https:\/\/discord\.com\/api\/webhooks\/\d+\/)[a-zA-Z0-9_-]+/, '$1••••••••')}
                                    </p>

                                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                        <span className="text-[10px] uppercase font-bold text-neutral-500">Eventos:</span>
                                        {wh.events.map((ev) => (
                                            <span
                                                key={ev}
                                                className="rounded-md border border-cyan-800/60 bg-cyan-950/30 px-2 py-0.5 text-[10px] font-medium text-cyan-300"
                                            >
                                                {ev}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end md:self-center">
                                    <button
                                        onClick={() => handleTestWebhook(wh)}
                                        disabled={isTesting}
                                        className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                    >
                                        <Send className={`h-3.5 w-3.5 ${isTesting ? 'animate-pulse' : ''}`} />
                                        <span>{isTesting ? 'Probando...' : 'Enviar Prueba'}</span>
                                    </button>

                                    <button
                                        onClick={() => handleDelete(wh)}
                                        className="rounded-lg border border-neutral-300 dark:border-neutral-700 p-2 text-neutral-400 hover:text-red-400 hover:border-red-500/50 transition-colors"
                                        title="Eliminar webhook"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {webhooks.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 dark:border-cyan-900/60 bg-neutral-50 dark:bg-neutral-900/30 p-12 text-center">
                        <Webhook className="h-12 w-12 text-neutral-400 dark:text-cyan-500/40 mb-3" />
                        <h3 className="text-base font-semibold text-neutral-800 dark:text-white">
                            No hay webhooks configurados
                        </h3>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-md">
                            Añade un webhook de Discord para enterarte al instante de inicios, paradas y alertas del servidor.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal Crear Webhook */}
            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-white dark:bg-neutral-950 p-6 shadow-[0_0_40px_rgba(34,211,238,0.25)] space-y-5">
                        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-cyan-900/60 pb-3">
                            <div className="flex items-center gap-2">
                                <Webhook className="h-5 w-5 text-cyan-400" />
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                                    Nuevo Webhook
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsCreateOpen(false)}
                                className="rounded-lg p-1 text-neutral-400 hover:text-white hover:bg-neutral-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-cyan-300 uppercase tracking-wider mb-2">
                                    Nombre Identificador
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ej: Discord Notificaciones Servidor"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    className="w-full rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-cyan-300 uppercase tracking-wider mb-2">
                                    URL del Webhook (Discord / HTTP)
                                </label>
                                <input
                                    type="url"
                                    required
                                    placeholder="https://discord.com/api/webhooks/..."
                                    value={data.url}
                                    onChange={(e) => setData('url', e.target.value)}
                                    className="w-full rounded-xl border border-neutral-300 dark:border-cyan-800/80 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-2.5 text-sm text-neutral-900 dark:text-white focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-neutral-700 dark:text-cyan-300 uppercase tracking-wider mb-2">
                                    Eventos a Notificar
                                </label>
                                <div className="space-y-2">
                                    {AVAILABLE_EVENTS.map((ev) => {
                                        const checked = data.events.includes(ev.key);
                                        return (
                                            <div
                                                key={ev.key}
                                                onClick={() => toggleEvent(ev.key)}
                                                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                                                    checked
                                                        ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-200'
                                                        : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-800/50 text-neutral-400'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {}}
                                                    className="h-4 w-4 rounded border-cyan-500 text-cyan-500 focus:ring-cyan-400"
                                                />
                                                <span className="text-xs font-medium">{ev.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200 dark:border-cyan-900/60">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateOpen(false)}
                                    className="rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-2 text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] disabled:opacity-50"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>{processing ? 'Guardando...' : 'Crear Webhook'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </ServerLayout>
    );
}
