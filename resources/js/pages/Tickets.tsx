import TicketFormModal, { TicketCategory } from '@/components/TicketFormModal';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    Filter,
    Headphones,
    MessageCirclePlus,
    MessageSquare,
    Pencil,
    Plus,
    Search,
    Server as ServerIcon,
    ShieldAlert,
    Sparkles,
    Tag,
    Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tickets', href: '/tickets' }];

type Ticket = {
    id: number;
    subject: string;
    message: string;
    status: 'open' | 'pending' | 'closed';
    priority?: boolean;
    category?: string | null;
    category_label?: string | null;
    server_id?: number | null;
    created_at?: string;
    messages?: Array<{ id: number }>;
};

const STATUS_CONFIG: Record<Ticket['status'], { label: string; badgeCls: string; icon: typeof Clock }> = {
    open: {
        label: 'Abierto',
        badgeCls: 'border-emerald-500/60 bg-emerald-950/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
        icon: CheckCircle2,
    },
    pending: {
        label: 'Esperando respuesta',
        badgeCls: 'border-amber-500/60 bg-amber-950/60 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.25)]',
        icon: Clock,
    },
    closed: {
        label: 'Cerrado',
        badgeCls: 'border-neutral-700 bg-neutral-900/80 text-neutral-400',
        icon: ShieldAlert,
    },
};

export default function Tickets() {
    const { tickets = [], flash, categories = [], myServers = [] } = usePage<{
        tickets: Ticket[];
        flash?: { success?: string; error?: string };
        categories?: TicketCategory[];
        myServers?: { id: number; name: string }[];
    }>().props;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'pending' | 'closed' | 'priority'>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const openModal = (ticket: Ticket | null = null) => {
        setSelectedTicket(ticket);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (!confirm('¿Estás seguro de que deseas eliminar este ticket?')) return;
        router.delete(`/tickets/${id}`, {
            onSuccess: () => {
                toast.success('Ticket eliminado con éxito');
            },
            onError: () => toast.error('Error al eliminar el ticket'),
        });
    };

    // Estadísticas
    const stats = useMemo(() => {
        const total = tickets.length;
        const open = tickets.filter((t) => t.status === 'open').length;
        const pending = tickets.filter((t) => t.status === 'pending').length;
        const closed = tickets.filter((t) => t.status === 'closed').length;
        const priority = tickets.filter((t) => t.priority).length;
        return { total, open, pending, closed, priority };
    }, [tickets]);

    // Filtrado
    const filteredTickets = useMemo(() => {
        return tickets.filter((t) => {
            // Filtro por estado
            if (statusFilter === 'priority' && !t.priority) return false;
            if (statusFilter !== 'all' && statusFilter !== 'priority' && t.status !== statusFilter) return false;

            // Filtro por categoría
            if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;

            // Filtro por texto
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchesSubject = t.subject.toLowerCase().includes(q);
                const matchesMessage = (t.message || '').toLowerCase().includes(q);
                const matchesId = String(t.id).includes(q);
                if (!matchesSubject && !matchesMessage && !matchesId) return false;
            }

            return true;
        });
    }, [tickets, statusFilter, categoryFilter, searchQuery]);

    // Mapeo rápido de nombres de servidores
    const serverMap = useMemo(() => {
        const map = new Map<number, string>();
        myServers.forEach((s) => map.set(s.id, s.name));
        return map;
    }, [myServers]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tickets de Soporte — Cinammon" />
            <Toaster position="top-center" richColors />

            <div className="mx-auto max-w-6xl p-4 md:p-8 space-y-6 font-sans">
                {/* Cabecera futurista estilo Sugerencias */}
                <header className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-neutral-950 via-[#16120d] to-neutral-950 p-6 md:p-8 shadow-2xl">
                    <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-yellow-500/10 blur-3xl" />
                    <div className="absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-pink-500/10 blur-2xl" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold tracking-wider text-yellow-400 uppercase">
                                <Headphones className="h-3.5 w-3.5" />
                                Soporte & Asistencia
                            </div>
                            <h1 className="mt-2 font-[Orbitron] text-2xl md:text-3xl font-bold tracking-wide text-white drop-shadow-[0_0_12px_rgba(250,204,21,0.25)]">
                                SISTEMA DE TICKETS
                            </h1>
                            <p className="mt-2 text-sm text-neutral-300 max-w-2xl leading-relaxed">
                                Comunícate directamente con nuestro equipo técnico. Atendemos consultas sobre servidores, pagos, configuración y soporte prioritario.
                            </p>
                        </div>

                        <button
                            onClick={() => openModal()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-400 bg-gradient-to-r from-yellow-500 to-amber-500 px-5 py-3 text-sm font-bold text-black shadow-[0_0_20px_rgba(234,179,8,0.35)] transition-all hover:scale-[1.02] hover:shadow-[0_0_28px_rgba(234,179,8,0.5)] active:scale-95"
                        >
                            <Plus className="h-4 w-4 stroke-[3]" />
                            Crear Ticket
                        </button>
                    </div>

                    {/* Contadores rápidos de estadísticas */}
                    <div className="mt-6 pt-5 border-t border-yellow-500/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                        <div className="rounded-lg border border-neutral-800 bg-black/40 p-2.5">
                            <span className="text-xl font-bold text-white font-[Orbitron]">{stats.total}</span>
                            <p className="text-xs text-neutral-400">Total tickets</p>
                        </div>
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-2.5">
                            <span className="text-xl font-bold text-emerald-400 font-[Orbitron]">{stats.open}</span>
                            <p className="text-xs text-emerald-300/80">Abiertos</p>
                        </div>
                        <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-2.5">
                            <span className="text-xl font-bold text-amber-400 font-[Orbitron]">{stats.pending}</span>
                            <p className="text-xs text-amber-300/80">Esperando respuesta</p>
                        </div>
                        <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-2.5">
                            <span className="text-xl font-bold text-purple-400 font-[Orbitron]">{stats.closed}</span>
                            <p className="text-xs text-purple-300/80">Resueltos / Cerrados</p>
                        </div>
                    </div>
                </header>

                {/* Filtros y búsqueda */}
                <div className="space-y-3">
                    {/* Pestañas de estado */}
                    <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-2">
                        {[
                            { key: 'all', label: 'Todos' },
                            { key: 'open', label: 'Abiertos' },
                            { key: 'pending', label: 'Esperando respuesta' },
                            { key: 'closed', label: 'Cerrados' },
                            ...(stats.priority > 0 ? [{ key: 'priority', label: 'Prioritarios ⭐' }] : []),
                        ].map((tab) => {
                            const active = statusFilter === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setStatusFilter(tab.key as typeof statusFilter)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                                        active
                                            ? 'border border-yellow-500/50 bg-yellow-500/20 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.2)]'
                                             : 'text-neutral-400 hover:bg-neutral-900 hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Barra de búsqueda y categorías */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-neutral-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar por asunto, contenido o #ID…"
                                className="w-full rounded-xl border border-neutral-800 bg-neutral-950/80 py-2 pl-9 pr-3 text-sm text-white placeholder-neutral-500 transition focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                            />
                        </div>

                        {categories.length > 0 && (
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="rounded-xl border border-neutral-800 bg-neutral-950/80 px-3 py-2 text-xs font-medium text-neutral-200 transition focus:border-yellow-500 focus:outline-none"
                            >
                                <option value="all">Todas las categorías</option>
                                {categories.map((c) => (
                                    <option key={c.key} value={c.key}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Lista de Tickets en tarjetas estilo Sugerencias */}
                {filteredTickets.length > 0 ? (
                    <div className="space-y-4">
                        {filteredTickets.map((ticket) => {
                            const statusInfo = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open;
                            const StatusIcon = statusInfo.icon;
                            const serverName = ticket.server_id ? serverMap.get(ticket.server_id) : null;

                            return (
                                <article
                                    key={ticket.id}
                                    className="group relative overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-5 md:p-6 backdrop-blur transition-all duration-200 hover:border-yellow-500/40 hover:shadow-[0_0_25px_rgba(234,179,8,0.08)]"
                                >
                                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            {/* Badges superiores */}
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs font-semibold text-neutral-500">
                                                    #{ticket.id}
                                                </span>

                                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusInfo.badgeCls}`}>
                                                    <StatusIcon className="h-3 w-3" />
                                                    {statusInfo.label}
                                                </span>

                                                {ticket.priority && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/60 bg-fuchsia-950/60 px-2.5 py-0.5 text-xs font-bold text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.3)]">
                                                        <Sparkles className="h-3 w-3" />
                                                        PRIORITARIO
                                                    </span>
                                                )}

                                                {ticket.category_label && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900 px-2.5 py-0.5 text-xs font-medium text-neutral-300">
                                                        <Tag className="h-3 w-3 text-neutral-400" />
                                                        {ticket.category_label}
                                                    </span>
                                                )}

                                                {serverName && (
                                                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-800/60 bg-cyan-950/60 px-2.5 py-0.5 text-xs font-medium text-cyan-300">
                                                        <ServerIcon className="h-3 w-3" />
                                                        {serverName}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Asunto */}
                                            <h2
                                                onClick={() => router.get(`/tickets/${ticket.id}`)}
                                                className="cursor-pointer font-[Orbitron] text-lg font-bold text-white transition-colors group-hover:text-yellow-400"
                                            >
                                                {ticket.subject}
                                            </h2>

                                            {/* Mensaje */}
                                            {ticket.message && (
                                                <p className="line-clamp-2 text-sm leading-relaxed text-neutral-300 font-sans">
                                                    {ticket.message}
                                                </p>
                                            )}
                                        </div>

                                        {/* Botones de acción */}
                                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0">
                                            <button
                                                onClick={() => router.get(`/tickets/${ticket.id}`)}
                                                className="inline-flex items-center gap-2 rounded-xl border border-yellow-500/50 bg-yellow-500/10 px-4 py-2 text-xs font-bold text-yellow-300 transition hover:bg-yellow-500 hover:text-black shadow-[0_0_15px_rgba(234,179,8,0.15)]"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5" />
                                                Abrir conversación
                                            </button>

                                            <button
                                                onClick={() => openModal(ticket)}
                                                title="Editar ticket"
                                                className="rounded-xl border border-neutral-700 bg-neutral-900 p-2 text-neutral-300 transition hover:border-yellow-500 hover:text-yellow-300"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </button>

                                            <button
                                                onClick={() => handleDelete(ticket.id)}
                                                title="Eliminar ticket"
                                                className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-2 text-rose-400 transition hover:bg-rose-900/60 hover:text-white"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 p-12 text-center">
                        <MessageSquare className="mx-auto h-12 w-12 text-yellow-500/30" />
                        <h3 className="mt-3 font-[Orbitron] text-lg font-bold text-white">
                            No se encontraron tickets
                        </h3>
                        <p className="mt-1 text-sm text-neutral-400">
                            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                                ? 'No hay tickets que coincidan con los filtros aplicados.'
                                : '¿Tienes alguna duda o incidencia? Abre un ticket y te ayudamos.'}
                        </p>
                        <button
                            onClick={() => openModal()}
                            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-yellow-400 bg-yellow-500 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-400 transition"
                        >
                            <Plus className="h-4 w-4" /> Crear nuevo ticket
                        </button>
                    </div>
                )}
            </div>

            <TicketFormModal
                isOpen={isModalOpen}
                closeModal={() => setIsModalOpen(false)}
                ticket={selectedTicket}
                categories={categories}
                servers={myServers}
            />
        </AppLayout>
    );
}
