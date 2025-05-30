import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export interface Ticket {
    id?: number;
    subject: string;
    status: 'open' | 'pending' | 'closed';
    message?: string;
}

interface Props {
    isOpen: boolean;
    closeModal: () => void;
    ticket?: Ticket | null;
}

export default function TicketFormModal({ isOpen, closeModal, ticket }: Props) {
    const [formData, setFormData] = useState<Ticket>({
        subject: '',
        message: '',
        status: 'open',
    });

    useEffect(() => {
        if (ticket) {
            setFormData({
                subject: ticket.subject,
                message: ticket.message ?? '',
                status: ticket.status,
            });
        } else {
            setFormData({ subject: '', message: '', status: 'open' });
        }
    }, [ticket]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const isEdit = !!ticket?.id;
        const method = isEdit ? 'put' : 'post';
        const url = isEdit ? `/tickets/${ticket.id}` : '/tickets';

        const data = {
            subject: formData.subject,
            message: formData.message ?? '',
            status: formData.status,
        };

        router.visit(url, {
            method,
            data,
            preserveScroll: true,
            onFinish: () => {
                closeModal();
                toast.success(isEdit ? 'Ticket actualizado' : 'Ticket creado');
                router.reload();
            },
            onError: () => {
                toast.error('Error al guardar');
            },
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 font-[Orbitron]">
            <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900 dark:text-white">
                <h2 className="mb-4 text-xl font-bold text-yellow-700 dark:text-yellow-300">{ticket ? 'Editar Ticket' : 'Nuevo Ticket'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-semibold">Asunto</label>
                        <input
                            type="text"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            className="w-full rounded-md border border-yellow-300 bg-white px-3 py-2 text-black shadow-sm focus:ring-2 focus:ring-yellow-400 dark:border-yellow-700 dark:bg-neutral-800 dark:text-white"
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold">Mensaje</label>
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            className="w-full resize-none rounded-md border border-yellow-300 bg-white px-3 py-2 text-black shadow-sm focus:ring-2 focus:ring-yellow-400 dark:border-yellow-700 dark:bg-neutral-800 dark:text-white"
                            rows={5}
                            required
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-semibold">Estado</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full rounded-md border border-yellow-300 bg-white px-3 py-2 text-black dark:border-yellow-700 dark:bg-neutral-800 dark:text-white"
                        >
                            <option value="open">Abierto</option>
                            <option value="pending">Pendiente</option>
                            <option value="closed">Cerrado</option>
                        </select>
                    </div>

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
                            className="rounded-md border border-yellow-500 bg-yellow-700 px-4 py-2 text-white shadow hover:bg-yellow-600 dark:border-yellow-400 dark:bg-yellow-600 dark:hover:bg-yellow-500"
                        >
                            {ticket ? 'Actualizar' : 'Crear'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
