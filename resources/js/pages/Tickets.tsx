import TicketFormModal from '@/components/TicketFormModal';
import AppLayout from '@/layouts/app-layout';
import { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { MessageCirclePlus, Pencil, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tickets', href: '/tickets' }];

type Ticket = {
    id: number;
    subject: string;
    message: string;
    status: 'open' | 'pending' | 'closed';
};

export default function Tickets() {
    const { tickets, flash } = usePage<{ tickets: Ticket[]; flash?: { success?: string; error?: string } }>().props;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const openModal = (ticket: Ticket | null = null) => {
        setSelectedTicket(ticket);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        router.delete(`/tickets/${id}`, {
            onSuccess: () => {
                toast.success('Ticket eliminado');
                router.reload();
            },
            onError: () => toast.error('Error al eliminar el ticket'),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tickets">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <Toaster position="top-center" richColors />

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="flex items-center justify-between border-yellow-600 pb-4">
                    <h1 className="text-3xl font-semibold tracking-widest text-yellow-700 drop-shadow-none dark:text-yellow-400 dark:drop-shadow-[0_0_5px_#facc15]">
                        TICKETS
                    </h1>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 rounded border border-yellow-500 bg-yellow-500 px-4 py-2 text-sm text-black shadow-md transition hover:bg-yellow-600 dark:border-yellow-600 dark:hover:bg-yellow-600"
                    >
                        <MessageCirclePlus className="h-4 w-4" /> Crear Ticket
                    </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-yellow-300 bg-white shadow-none transition dark:border-yellow-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#facc1533]">
                    <table className="min-w-full table-auto text-sm">
                        <thead className="bg-yellow-100 tracking-wide text-yellow-700 uppercase dark:bg-yellow-900 dark:text-yellow-300">
                            <tr>
                                <th className="px-4 py-3 text-left">ID</th>
                                <th className="px-4 py-3 text-left">Asunto</th>
                                <th className="hidden px-4 py-3 text-left sm:table-cell">Mensaje</th>
                                <th className="px-4 py-3 text-left">Estado</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.length ? (
                                tickets.map((ticket) => (
                                    <tr
                                        key={ticket.id}
                                        className="border-t border-yellow-300 transition hover:bg-yellow-50 dark:border-yellow-700 dark:hover:bg-yellow-800/10"
                                    >
                                        <td className="px-4 py-3 text-yellow-800 dark:text-yellow-100">{ticket.id}</td>
                                        <td className="px-4 py-3 text-yellow-800 dark:text-yellow-100">{ticket.subject}</td>
                                        <td className="line-clamp-2 hidden max-w-xs px-4 py-3 text-yellow-700 sm:table-cell dark:text-yellow-200">
                                            {ticket.message || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-yellow-600 capitalize dark:text-yellow-400">{ticket.status}</td>
                                        <td className="px-4 py-3 text-right">
                                            {/* Escritorio */}
                                            <div className="hidden justify-end gap-2 sm:flex">
                                                <button
                                                    onClick={() => openModal(ticket)}
                                                    className="rounded border border-yellow-500 bg-yellow-500 p-1.5 text-black transition hover:bg-yellow-400 dark:border-yellow-600 dark:hover:bg-yellow-500"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => router.get(`/tickets/${ticket.id}`)}
                                                    className="rounded border border-yellow-400 bg-yellow-400 p-1.5 text-black transition hover:bg-yellow-300 dark:border-yellow-500 dark:hover:bg-yellow-400"
                                                >
                                                    <MessageCirclePlus className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ticket.id)}
                                                    className="rounded border border-red-500 bg-transparent p-1.5 text-red-500 transition hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Móvil */}
                                            <div className="mt-2 flex justify-end gap-1 sm:hidden">
                                                <button
                                                    onClick={() => openModal(ticket)}
                                                    className="rounded border border-yellow-500 bg-yellow-500 px-2 py-1 text-xs text-black hover:bg-yellow-400 dark:border-yellow-600 dark:hover:bg-yellow-500"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => router.get(`/tickets/${ticket.id}`)}
                                                    className="rounded border border-yellow-400 bg-yellow-400 px-2 py-1 text-xs text-black hover:bg-yellow-300 dark:border-yellow-500 dark:hover:bg-yellow-400"
                                                >
                                                    <MessageCirclePlus className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ticket.id)}
                                                    className="rounded border border-red-500 px-2 py-1 text-xs text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-yellow-500 dark:text-yellow-400">
                                        No hay tickets disponibles.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TicketFormModal isOpen={isModalOpen} closeModal={() => setIsModalOpen(false)} ticket={selectedTicket} />
        </AppLayout>
    );
}
