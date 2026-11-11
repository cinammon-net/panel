import { router } from '@inertiajs/react';
import { CreditCard, HelpCircle, Server, ShieldAlert, UserCog, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface Ticket {
    id?: number;
    subject: string;
    status: 'open' | 'pending' | 'closed';
    message?: string;
    category?: string | null;
    server_id?: number | null;
}

export type TicketCategory = { key: string; label: string; hint: string };

interface Props {
    isOpen: boolean;
    closeModal: () => void;
    ticket?: Ticket | null;
    categories?: TicketCategory[];
    servers?: { id: number; name: string }[];
}

const ICONS: Record<string, typeof Server> = { servidor: Server, pagos: CreditCard, cuenta: UserCog, reporte: ShieldAlert, otro: HelpCircle };

// Qué pedir en cada tipo para que el equipo pueda ayudar sin ir y volver con preguntas.
const PLACEHOLDER: Record<string, string> = {
    servidor: 'Qué pasa, desde cuándo y el error exacto de la consola (puedes pegarlo). Si cambiaste algo antes, cuéntalo.',
    pagos: 'Número de factura, método de pago y qué ha pasado (cobro duplicado, pago no reflejado...).',
    cuenta: 'Qué necesitas cambiar o qué no te deja hacer. Nunca escribas tu contraseña.',
    reporte: 'A quién reportas (nombre o ID), qué ha hecho y dónde. Añade capturas si las tienes.',
    otro: 'Cuéntanos qué necesitas con el mayor detalle posible.',
};

export default function TicketFormModal({ isOpen, closeModal, ticket, categories = [], servers = [] }: Props) {
    const isEdit = !!ticket?.id;
    const [formData, setFormData] = useState<Ticket>({ subject: '', message: '', status: 'open', category: null, server_id: null });

    useEffect(() => {
        setFormData(
            ticket
                ? { subject: ticket.subject, message: ticket.message ?? '', status: ticket.status, category: ticket.category ?? null, server_id: ticket.server_id ?? null }
                : { subject: '', message: '', status: 'open', category: null, server_id: null },
        );
    }, [ticket, isOpen]);

    const set = (patch: Partial<Ticket>) => setFormData((f) => ({ ...f, ...patch }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isEdit && !formData.category) {
            toast.error('Elige el tipo de ticket');
            return;
        }
        router.visit(isEdit ? `/tickets/${ticket!.id}` : '/tickets', {
            method: isEdit ? 'put' : 'post',
            data: {
                subject: formData.subject,
                message: formData.message ?? '',
                status: formData.status,
                ...(isEdit ? {} : { category: formData.category, server_id: formData.server_id }),
            },
            preserveScroll: true,
            onSuccess: () => {
                closeModal();
                toast.success(isEdit ? 'Ticket actualizado' : 'Ticket enviado. Te avisaremos cuando haya respuesta.');
            },
            onError: () => toast.error('Revisa los campos e inténtalo de nuevo'),
        });
    };

    if (!isOpen) return null;

    const category = formData.category ?? '';
    const input =
        'w-full rounded-md border border-yellow-300 bg-white px-3 py-2 text-black shadow-sm focus:ring-2 focus:ring-yellow-400 dark:border-yellow-700 dark:bg-neutral-800 dark:text-white';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 font-[Orbitron]" onClick={closeModal}>
            <div
                className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900 dark:text-white"
                onClick={(e) => e.stopPropagation()}
            >
                <button type="button" onClick={closeModal} className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-200" aria-label="Cerrar">
                    <X className="h-5 w-5" />
                </button>
                <h2 className="mb-1 text-xl font-bold text-yellow-700 dark:text-yellow-300">{isEdit ? 'Editar ticket' : 'Nuevo ticket'}</h2>
                {!isEdit && <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">Solo lo ve el equipo. También puedes abrirlo desde el Discord de Cinammon.</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isEdit && categories.length > 0 && (
                        <div>
                            <label className="mb-2 block text-sm font-semibold">1. ¿De qué trata?</label>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {categories.map((c) => {
                                    const Icon = ICONS[c.key] ?? HelpCircle;
                                    const active = category === c.key;
                                    return (
                                        <button
                                            type="button"
                                            key={c.key}
                                            onClick={() => set({ category: c.key, server_id: c.key === 'servidor' ? formData.server_id : null })}
                                            className={`flex items-start gap-3 rounded-lg border px-3 py-2 text-left transition ${
                                                active
                                                    ? 'border-yellow-500 bg-yellow-500/15'
                                                    : 'border-yellow-300/50 hover:border-yellow-500 dark:border-yellow-700/60'
                                            }`}
                                        >
                                            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-400" />
                                            <span>
                                                <span className="block text-sm font-semibold">{c.label}</span>
                                                <span className="block text-xs text-neutral-500 dark:text-neutral-400">{c.hint}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!isEdit && category === 'servidor' && (
                        <div>
                            <label className="mb-1 block text-sm font-semibold">¿Qué servidor?</label>
                            {servers.length ? (
                                <select
                                    value={formData.server_id ?? ''}
                                    onChange={(e) => set({ server_id: e.target.value ? Number(e.target.value) : null })}
                                    className={input}
                                >
                                    <option value="">Elige uno</option>
                                    {servers.map((s) => (
                                        <option key={s.id} value={s.id}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-neutral-500">No tienes servidores todavía; cuéntanos en el mensaje qué necesitas.</p>
                            )}
                        </div>
                    )}

                    {(isEdit || category) && (
                        <>
                            <div>
                                <label className="mb-1 block text-sm font-semibold">{isEdit ? 'Asunto' : '2. Resúmelo en una frase'}</label>
                                <input
                                    type="text"
                                    value={formData.subject}
                                    onChange={(e) => set({ subject: e.target.value })}
                                    className={input}
                                    maxLength={120}
                                    placeholder="Ej.: Mi servidor de Minecraft no arranca"
                                    required
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-semibold">{isEdit ? 'Mensaje' : '3. Cuéntanos los detalles'}</label>
                                <textarea
                                    value={formData.message}
                                    onChange={(e) => set({ message: e.target.value })}
                                    className={`${input} resize-none`}
                                    rows={5}
                                    placeholder={PLACEHOLDER[category] ?? PLACEHOLDER.otro}
                                    required
                                />
                            </div>
                        </>
                    )}

                    {isEdit && (
                        <div>
                            <label className="mb-1 block text-sm font-semibold">Estado</label>
                            <select value={formData.status} onChange={(e) => set({ status: e.target.value as Ticket['status'] })} className={input}>
                                <option value="open">Abierto</option>
                                <option value="pending">Pendiente</option>
                                <option value="closed">Cerrado</option>
                            </select>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded-md border border-neutral-400 bg-neutral-200 px-4 py-2 text-black hover:bg-neutral-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={!isEdit && !category}
                            className="rounded-md border border-yellow-500 bg-yellow-700 px-4 py-2 text-white shadow hover:bg-yellow-600 disabled:opacity-40 dark:border-yellow-400 dark:bg-yellow-600 dark:hover:bg-yellow-500"
                        >
                            {isEdit ? 'Guardar' : 'Enviar ticket'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
