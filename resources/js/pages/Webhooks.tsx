import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronLeft,
    Copy,
    Eye,
    EyeOff,
    KeyRound,
    Play,
    Plus,
    RefreshCw,
    Save,
    Settings2,
    Trash2,
    Webhook as WebhookIcon,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface WebhookItem {
    id: number;
    name: string;
    url: string;
    secret?: string;
    format?: 'discord' | 'slack' | 'json';
    method?: 'POST' | 'PUT';
    events: string[];
    headers?: Record<string, string>;
    retry_count?: number;
    timeout?: number;
    enabled: boolean;
    last_triggered_at?: string | null;
    last_status_code?: number | null;
    created_at: string;
}

interface Props {
    webhooks: WebhookItem[];
}

const EVENT_GROUPS = [
    {
        category: 'Servidores',
        events: [
            { id: 'server.created', label: 'Servidor creado (server.created)' },
            { id: 'server.deleted', label: 'Servidor eliminado (server.deleted)' },
            { id: 'server.power', label: 'Cambio de energía start/stop/restart (server.power)' },
            { id: 'server.reinstalled', label: 'Servidor reinstalado (server.reinstalled)' },
        ],
    },
    {
        category: 'Nodos & Demonio Wings',
        events: [
            { id: 'node.heartbeat', label: 'Latido de nodo recibido (node.heartbeat)' },
            { id: 'node.offline', label: 'Nodo desconectado / alerta (node.offline)' },
            { id: 'node.allocation', label: 'Asignación IP/Puerto modificada (node.allocation)' },
        ],
    },
    {
        category: 'Usuarios & Seguridad',
        events: [
            { id: 'user.created', label: 'Nuevo usuario registrado (user.created)' },
            { id: 'user.login', label: 'Inicio de sesión en el panel (user.login)' },
            { id: 'apikey.created', label: 'API Key generada (apikey.created)' },
        ],
    },
    {
        category: 'Bases de Datos & Backups',
        events: [
            { id: 'database.created', label: 'Base de datos creada (database.created)' },
            { id: 'backup.completed', label: 'Copia de seguridad completada (backup.completed)' },
        ],
    },
];

export default function Webhooks({ webhooks = [] }: Props) {
    const [selectedWebhook, setSelectedWebhook] = useState<WebhookItem | null>(null);
    const [showSecret, setShowSecret] = useState(false);

    // Estado para crear un nuevo webhook
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [format, setFormat] = useState<'discord' | 'slack' | 'json'>('discord');

    // Estado de configuración cuando se abre un webhook
    const [configForm, setConfigForm] = useState<{
        name: string;
        url: string;
        secret: string;
        format: 'discord' | 'slack' | 'json';
        method: 'POST' | 'PUT';
        events: string[];
        headersText: string;
        retry_count: number;
        timeout: number;
        enabled: boolean;
    }>({
        name: '',
        url: '',
        secret: '',
        format: 'discord',
        method: 'POST',
        events: ['server.created', 'server.power', 'node.heartbeat'],
        headersText: JSON.stringify({ 'X-Cinammon-Instance': 'Cinammon-Panel', 'Content-Type': 'application/json' }, null, 2),
        retry_count: 3,
        timeout: 10,
        enabled: true,
    });

    const openConfig = (w: WebhookItem) => {
        setSelectedWebhook(w);
        setShowSecret(false);
        setConfigForm({
            name: w.name,
            url: w.url,
            secret: w.secret || 'whsec_cinammon_default_secret',
            format: (w.format as 'discord' | 'slack' | 'json') || 'discord',
            method: (w.method as 'POST' | 'PUT') || 'POST',
            events: Array.isArray(w.events) ? w.events : ['server.created', 'server.power'],
            headersText: JSON.stringify(
                w.headers && Object.keys(w.headers).length > 0
                    ? w.headers
                    : { 'X-Cinammon-Instance': 'Cinammon-Panel', 'Content-Type': 'application/json' },
                null,
                2,
            ),
            retry_count: w.retry_count ?? 3,
            timeout: w.timeout ?? 10,
            enabled: w.enabled ?? true,
        });
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(
            '/webhooks',
            {
                name,
                url,
                format,
                method: 'POST',
                events: ['server.created', 'server.power', 'node.heartbeat'],
                enabled: true,
            },
            {
                onSuccess: () => {
                    setName('');
                    setUrl('');
                    toast.success('Webhook creado con éxito. Haz clic sobre él para ver o editar su configuración.');
                },
            },
        );
    };

    const handleSaveConfig = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedWebhook) return;

        let parsedHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        try {
            parsedHeaders = JSON.parse(configForm.headersText);
        } catch {
            toast.error('El formato de Cabeceras HTTP (JSON) no es válido');
            return;
        }

        router.put(
            `/webhooks/${selectedWebhook.id}`,
            {
                name: configForm.name,
                url: configForm.url,
                secret: configForm.secret,
                format: configForm.format,
                method: configForm.method,
                events: configForm.events,
                headers: parsedHeaders,
                retry_count: configForm.retry_count,
                timeout: configForm.timeout,
                enabled: configForm.enabled,
            },
            {
                onSuccess: () => {
                    toast.success('Configuración del Webhook guardada correctamente');
                    setSelectedWebhook(null);
                },
            },
        );
    };

    const handleTestWebhook = (id: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        router.post(
            `/webhooks/${id}/test`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Payload de prueba enviado al endpoint correctamente'),
            },
        );
    };

    const handleDelete = (id: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        router.delete(`/webhooks/${id}`, {
            onSuccess: () => {
                if (selectedWebhook?.id === id) setSelectedWebhook(null);
                toast.success('Webhook eliminado');
            },
        });
    };

    const toggleEvent = (eventId: string) => {
        setConfigForm((prev) => ({
            ...prev,
            events: prev.events.includes(eventId)
                ? prev.events.filter((id) => id !== eventId)
                : [...prev.events, eventId],
        }));
    };

    const buildSamplePayload = () => {
        if (configForm.format === 'discord') {
            return JSON.stringify(
                {
                    username: 'Cinammon Panel',
                    embeds: [
                        {
                            title: `🔔 Evento: ${configForm.events[0] || 'server.power'}`,
                            description: `Notificación enviada por **${configForm.name || 'Webhook'}**`,
                            color: 16484412,
                            fields: [
                                { name: 'Servidor', value: 'Minecraft Paper Local', inline: true },
                                { name: 'Nodo', value: 'Cinammon Nodo', inline: true },
                                { name: 'Estado', value: 'running', inline: true },
                            ],
                            timestamp: new Date().toISOString(),
                        },
                    ],
                },
                null,
                2,
            );
        }
        return JSON.stringify(
            {
                event: configForm.events[0] || 'server.power',
                webhook: configForm.name,
                timestamp: new Date().toISOString(),
                signature_header: 'X-Cinammon-Signature-256',
                data: {
                    server: 'Minecraft Paper Local',
                    node: 'Cinammon Nodo',
                    status: 'online',
                },
            },
            null,
            2,
        );
    };

    const breadcrumbs: BreadcrumbItem[] = selectedWebhook
        ? [
              { title: 'Webhooks', href: '/webhooks' },
              { title: selectedWebhook.name, href: `/webhooks` },
          ]
        : [{ title: 'Webhooks', href: '/webhooks' }];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={selectedWebhook ? `${selectedWebhook.name} · Configuración Webhook` : 'Webhooks'} />

            <div className="flex flex-col gap-6 bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-orange-500/30 pb-4">
                    <div className="flex items-center gap-3">
                        <WebhookIcon className="h-8 w-8 text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-wider text-orange-400">
                                {selectedWebhook ? `CONFIGURACIÓN: ${selectedWebhook.name.toUpperCase()}` : 'WEBHOOKS'}
                            </h1>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {selectedWebhook
                                    ? 'Configura el endpoint, firma HMAC, cabeceras HTTP, eventos suscritos y formato del payload'
                                    : 'Haz clic sobre cualquier Webhook de la lista para abrir su configuración detallada'}
                            </p>
                        </div>
                    </div>

                    {selectedWebhook && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleTestWebhook(selectedWebhook.id)}
                                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/15 px-3.5 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-500 hover:text-black"
                            >
                                <Play className="h-3.5 w-3.5" /> Probar Webhook
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedWebhook(null)}
                                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-neutral-900 px-3.5 py-2 text-xs font-semibold text-gray-200 transition hover:bg-neutral-800"
                            >
                                <ChevronLeft className="h-4 w-4" /> Volver a Webhooks
                            </button>
                        </div>
                    )}
                </div>

                {/* VISTA DE CONFIGURACIÓN DETALLADA DEL WEBHOOK SELECCIONADO */}
                {selectedWebhook ? (
                    <form onSubmit={handleSaveConfig} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Columna principal (2/3): Endpoint, Seguridad, Eventos */}
                        <div className="space-y-6 lg:col-span-2">
                            <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5 space-y-4">
                                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-orange-400">
                                    <Settings2 className="h-4 w-4" /> Parámetros Generales y Endpoint
                                </h2>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs text-orange-300">Nombre del Webhook</label>
                                        <input
                                            type="text"
                                            required
                                            value={configForm.name}
                                            onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-900 px-3 py-2 text-sm text-white"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="mb-1 block text-xs text-orange-300">Formato Payload</label>
                                            <select
                                                value={configForm.format}
                                                onChange={(e) =>
                                                    setConfigForm({
                                                        ...configForm,
                                                        format: e.target.value as 'discord' | 'slack' | 'json',
                                                    })
                                                }
                                                className="w-full rounded-lg border border-orange-500/40 bg-neutral-900 px-3 py-2 text-sm text-white"
                                            >
                                                <option value="discord">Discord Embed</option>
                                                <option value="slack">Slack Blocks</option>
                                                <option value="json">JSON Estándar</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs text-orange-300">Método HTTP</label>
                                            <select
                                                value={configForm.method}
                                                onChange={(e) =>
                                                    setConfigForm({ ...configForm, method: e.target.value as 'POST' | 'PUT' })
                                                }
                                                className="w-full rounded-lg border border-orange-500/40 bg-neutral-900 px-3 py-2 text-sm text-white"
                                            >
                                                <option value="POST">POST</option>
                                                <option value="PUT">PUT</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs text-orange-300">Endpoint URL de destino</label>
                                    <input
                                        type="url"
                                        required
                                        value={configForm.url}
                                        onChange={(e) => setConfigForm({ ...configForm, url: e.target.value })}
                                        className="w-full rounded-lg border border-orange-500/40 bg-neutral-900 px-3 py-2 font-mono text-sm text-cyan-300"
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="mb-1 block text-xs text-orange-300">Reintentos automáticos</label>
                                        <input
                                            type="number"
                                            min={0}
                                            max={10}
                                            value={configForm.retry_count}
                                            onChange={(e) => setConfigForm({ ...configForm, retry_count: Number(e.target.value) })}
                                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-900 px-3 py-2 text-sm text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-orange-300">Timeout (segundos)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={60}
                                            value={configForm.timeout}
                                            onChange={(e) => setConfigForm({ ...configForm, timeout: Number(e.target.value) })}
                                            className="w-full rounded-lg border border-orange-500/40 bg-neutral-900 px-3 py-2 text-sm text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs text-orange-300">Estado del Webhook</label>
                                        <button
                                            type="button"
                                            onClick={() => setConfigForm({ ...configForm, enabled: !configForm.enabled })}
                                            className={`w-full rounded-lg border px-3 py-2 text-xs font-bold transition ${
                                                configForm.enabled
                                                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                                                    : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                                            }`}
                                        >
                                            {configForm.enabled ? '● ACTIVO (Recibiendo eventos)' : '○ PAUSADO'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Firma de Seguridad HMAC */}
                            <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5 space-y-3">
                                <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-orange-400">
                                    <KeyRound className="h-4 w-4" /> Firma de Seguridad (Signing Secret HMAC-SHA256)
                                </h2>
                                <p className="text-xs text-neutral-400">
                                    Se envía en la cabecera <code className="text-cyan-300">X-Cinammon-Signature-256</code> para verificar la autenticidad de cada petición.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        type={showSecret ? 'text' : 'password'}
                                        value={configForm.secret}
                                        onChange={(e) => setConfigForm({ ...configForm, secret: e.target.value })}
                                        className="flex-1 rounded-lg border border-orange-500/40 bg-neutral-900 px-3 py-2 font-mono text-sm text-emerald-300"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowSecret(!showSecret)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-xs text-gray-200 hover:bg-neutral-800"
                                    >
                                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        {showSecret ? 'Ocultar' : 'Mostrar'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(configForm.secret);
                                            toast.success('Signing Secret copiado al portapapeles');
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-neutral-900 px-3 py-2 text-xs text-gray-200 hover:bg-neutral-800"
                                    >
                                        <Copy className="h-4 w-4" /> Copiar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setConfigForm({
                                                ...configForm,
                                                secret: 'whsec_' + Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14),
                                            })
                                        }
                                        className="inline-flex items-center gap-1 rounded-lg border border-orange-500/40 bg-orange-500/10 px-3 py-2 text-xs text-orange-300 hover:bg-orange-500 hover:text-black"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5" /> Regenerar
                                    </button>
                                </div>
                            </div>

                            {/* Selección de Eventos */}
                            <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-400">
                                        Eventos Suscritos ({configForm.events.length} seleccionados)
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allIds = EVENT_GROUPS.flatMap((g) => g.events.map((e) => e.id));
                                            setConfigForm({
                                                ...configForm,
                                                events: configForm.events.length === allIds.length ? ['server.created'] : allIds,
                                            });
                                        }}
                                        className="text-xs text-cyan-400 hover:underline"
                                    >
                                        Alternar todos
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                    {EVENT_GROUPS.map((group) => (
                                        <div key={group.category} className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-3.5">
                                            <h3 className="mb-2.5 text-xs font-bold text-orange-300">{group.category}</h3>
                                            <div className="space-y-2">
                                                {group.events.map((ev) => {
                                                    const checked = configForm.events.includes(ev.id);
                                                    return (
                                                        <label
                                                            key={ev.id}
                                                            className="flex cursor-pointer items-center gap-2.5 text-xs text-neutral-200 hover:text-white"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => toggleEvent(ev.id)}
                                                                className="h-4 w-4 accent-orange-500"
                                                            />
                                                            <span className="font-mono">{ev.label}</span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Columna lateral (1/3): Cabeceras HTTP, Vista previa de Payload y Botón Guardar */}
                        <div className="space-y-6">
                            <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5 space-y-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-400">
                                    Cabeceras HTTP Personalizadas (JSON)
                                </h2>
                                <textarea
                                    rows={5}
                                    value={configForm.headersText}
                                    onChange={(e) => setConfigForm({ ...configForm, headersText: e.target.value })}
                                    className="w-full rounded-lg border border-orange-500/30 bg-neutral-900 p-3 font-mono text-xs text-cyan-300"
                                />
                            </div>

                            <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5 space-y-3">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-orange-400">
                                    Vista Previa del Payload ({configForm.format.toUpperCase()})
                                </h2>
                                <pre className="max-h-72 overflow-auto rounded-lg border border-neutral-800 bg-black p-3 font-mono text-[11px] leading-relaxed text-emerald-300">
                                    {buildSamplePayload()}
                                </pre>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-black shadow-[0_0_20px_rgba(251,146,60,0.3)] transition hover:bg-orange-400"
                                >
                                    <Save className="h-4 w-4" /> Guardar Configuración del Webhook
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(selectedWebhook.id)}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-600/15 px-5 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-600 hover:text-white"
                                >
                                    <Trash2 className="h-4 w-4" /> Eliminar este Webhook
                                </button>
                            </div>
                        </div>
                    </form>
                ) : (
                    /* VISTA PRINCIPAL: CREAR WEBHOOK + TABLA DE WEBHOOKS CONFIGURADOS */
                    <>
                        <form
                            onSubmit={handleCreate}
                            className="grid grid-cols-1 gap-4 rounded-xl border border-orange-500/40 bg-neutral-900/90 p-5 sm:grid-cols-4"
                        >
                            <div>
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
                            <div className="sm:col-span-2">
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
                            <div className="flex items-end gap-2">
                                <div className="flex-1">
                                    <label className="mb-1 block text-xs text-orange-300">Formato</label>
                                    <select
                                        value={format}
                                        onChange={(e) => setFormat(e.target.value as 'discord' | 'slack' | 'json')}
                                        className="w-full rounded-lg border border-orange-500/40 bg-neutral-950 px-3 py-2 text-sm text-white"
                                    >
                                        <option value="discord">Discord</option>
                                        <option value="slack">Slack</option>
                                        <option value="json">JSON</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    className="flex items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black transition hover:bg-orange-400"
                                >
                                    <Plus className="h-4 w-4" /> Añadir
                                </button>
                            </div>
                        </form>

                        <div className="rounded-xl border border-orange-500/40 bg-neutral-950 p-5">
                            <h2 className="mb-3 text-base font-semibold text-orange-400">Webhooks Configurados</h2>
                            {webhooks.length === 0 ? (
                                <p className="py-8 text-center text-sm text-neutral-400">No hay webhooks configurados.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-orange-500/30 text-xs uppercase text-orange-300">
                                            <tr>
                                                <th className="px-4 py-3">ID</th>
                                                <th className="px-4 py-3">Nombre</th>
                                                <th className="px-4 py-3">Endpoint URL</th>
                                                <th className="px-4 py-3">Formato / Método</th>
                                                <th className="px-4 py-3">Eventos</th>
                                                <th className="px-4 py-3">Último Envío</th>
                                                <th className="px-4 py-3">Estado</th>
                                                <th className="px-4 py-3 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-800">
                                            {webhooks.map((w) => (
                                                <tr
                                                    key={w.id}
                                                    onClick={() => openConfig(w)}
                                                    className="cursor-pointer transition hover:bg-orange-500/10"
                                                >
                                                    <td className="px-4 py-3 text-neutral-400">#{w.id}</td>
                                                    <td className="px-4 py-3 font-semibold text-orange-300 underline decoration-orange-500/40 underline-offset-4">
                                                        {w.name}
                                                    </td>
                                                    <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-cyan-400">
                                                        {w.url}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-neutral-300">
                                                        <span className="rounded border border-white/10 bg-neutral-900 px-2 py-0.5 uppercase">
                                                            {w.format || 'discord'} · {w.method || 'POST'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-neutral-300">
                                                        {(w.events || []).length} eventos ({(w.events || []).slice(0, 2).join(', ')}
                                                        {(w.events || []).length > 2 ? '…' : ''})
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-neutral-400">
                                                        {w.last_status_code ? (
                                                            <span className="inline-flex items-center gap-1 text-emerald-400">
                                                                <CheckCircle2 className="h-3.5 w-3.5" /> HTTP {w.last_status_code}
                                                            </span>
                                                        ) : (
                                                            'Sin envíos aún'
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {w.enabled ? (
                                                            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs text-emerald-400">
                                                                Activo
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-neutral-800 px-2.5 py-0.5 text-xs text-neutral-400">
                                                                Pausado
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="flex justify-end gap-2 px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openConfig(w);
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded border border-orange-500/50 bg-orange-500/15 px-3 py-1 text-xs text-orange-300 hover:bg-orange-500 hover:text-black"
                                                        >
                                                            <Settings2 className="h-3.5 w-3.5" /> Configurar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleTestWebhook(w.id, e)}
                                                            className="inline-flex items-center gap-1 rounded border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-500 hover:text-black"
                                                        >
                                                            <Play className="h-3 w-3" /> Probar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDelete(w.id, e)}
                                                            className="inline-flex items-center gap-1 rounded bg-red-600/20 px-2.5 py-1 text-xs text-red-400 hover:bg-red-600 hover:text-white"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
