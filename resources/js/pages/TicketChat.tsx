import AppLayout from '@/layouts/app-layout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { Mic, SendHorizonal, Trash2, Reply } from 'lucide-react';
import { router } from '@inertiajs/react'; 
import { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Tickets', href: '/tickets' },
    { title: 'Chat', href: '#' },
];
export type Message = {
    id: number;
    sender_name: string;
    sender_avatar: string | null;
    message: string;
    created_at: string;
    sender_id: number;
    reply_to?: Message;
    audio_url?: string;
};

type Ticket = {
    id: number;
    subject: string;
    status: string;
    messages: Message[];
    user: { name: string; avatar: string | null };
};

export default function TicketChat() {
    const { ticket, auth, recentTickets } = usePage<{
        ticket: Ticket;
        auth: { user: { id: number; name: string; avatar?: string | null } };
        recentTickets: Ticket[];
    }>().props;

    const messageEndRef = useRef<HTMLDivElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const { data, setData, reset } = useForm({ message: '', reply_to_id: null as number | null });

    const submitMessage = () => {
        if (ticket.status === 'closed') {
            toast.error('No se puede enviar un mensaje a un ticket cerrado');
            return;
        }

        if (!data.message.trim() && !audioBlob) {
            toast.error('Debes escribir un mensaje o grabar un audio');
            return;
        }

        const form = new FormData();
        form.append('message', data.message);
        if (data.reply_to_id) form.append('reply_to_id', data.reply_to_id.toString());
        if (audioBlob) form.append('audio', new File([audioBlob], 'grabacion.webm', { type: 'audio/webm' }));

        fetch(`/tickets/${ticket.id}/messages`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement).content,
            },
            body: form,
        })
            .then((res) => {
                if (res.ok) {
                    toast.success('Mensaje enviado');
                    reset();
                    setReplyTo(null);
                    setAudioBlob(null);
                    router.reload({ only: ['ticket'] });
                } else {
                    toast.error('Error al enviar el mensaje');
                }
            })
            .catch(() => toast.error('Error de red'));
    };

    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [ticket.messages]);

    const getAvatar = (avatar: string | null | undefined, name: string) => {
        return avatar?.startsWith('http')
            ? avatar
            : avatar
            ? `/storage/avatars/${avatar}`
            : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=333&color=fff`;
    };
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            const chunks: BlobPart[] = [];

            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                setAudioBlob(blob);
                setIsRecording(false);
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
            setIsRecording(true);

            setTimeout(() => {
                if (mediaRecorderRef.current?.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            }, 10000);
        } catch (err) {
            toast.error('No se pudo acceder al micrófono');
            console.error('Error al acceder al micrófono:', err);
        }
    };


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Chat - ${ticket.subject}`}>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;800&display=swap" rel="stylesheet" />
            </Head>
            <Toaster position="top-center" />

            <div className="flex h-[80vh] gap-4 pt-4 pr-6 pl-6 font-[Orbitron]">
                <aside className="w-1/3 max-w-xs overflow-y-auto rounded-lg bg-[#1e1e1e] p-4 text-white shadow-md">
                    <h2 className="mb-4 text-lg font-semibold">Chats recientes</h2>
                    {recentTickets.length === 0 ? (
                        <p className="text-sm text-gray-400">No hay tickets recientes</p>
                    ) : (
                        <ul className="space-y-2">
                            {recentTickets.map((t) => {
                                const lastMsg = t.messages.at(-1);
                                return (
                                    <Link
                                        href={`/tickets/${t.id}`}
                                        key={t.id}
                                        className={`flex items-start gap-3 rounded-md px-3 py-2 transition ${
                                            t.id === ticket.id ? 'bg-[#2c2c2c]' : 'hover:bg-[#2c2c2c]'
                                        }`}
                                    >
                                        <img
                                            src={getAvatar(t.user?.avatar, t.user?.name)}
                                            alt={t.user?.name}
                                            className="h-9 w-9 rounded-full border border-gray-600 object-cover"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="truncate font-medium">{t.subject}</span>
                                                <span
                                                    className={`rounded px-2 py-1 text-xs ${
                                                        t.status === 'open'
                                                            ? 'bg-green-600 text-white'
                                                            : t.status === 'pending'
                                                              ? 'bg-yellow-500 text-black'
                                                              : 'bg-red-600 text-white'
                                                    }`}
                                                >
                                                    {t.status}
                                                </span>
                                            </div>
                                            <p className="truncate text-sm text-gray-400">{lastMsg?.message || 'Sin mensajes'}</p>
                                            <p className="text-xs text-gray-500">
                                                {lastMsg?.sender_name || 'Usuario'} -{' '}
                                                {lastMsg?.created_at ? new Date(lastMsg.created_at).toLocaleTimeString() : ''}
                                            </p>
                                        </div>
                                    </Link>
                                );
                            })}
                        </ul>
                    )}
                </aside>

                {/* Panel de chat actual */}
                <main className="flex flex-1 flex-col rounded-lg bg-[#1f1f1f] p-6 text-white shadow-md dark:bg-[#333]">
                    {/* Cabecera */}
                    <div className="flex items-center justify-between border-b border-[#333] pb-4">
                        <div className="flex items-center gap-4">
                            <img
                                src={auth.user ? getAvatar(auth.user.avatar, auth.user.name) : ''}
                                alt="Tu avatar"
                                className="h-10 w-10 rounded-full border border-gray-500 object-cover"
                            />
                            <div>
                                <h2 className="text-lg font-semibold">{ticket.subject}</h2>
                                <p className="text-sm text-gray-400">{auth.user?.name ?? 'Usuario'}</p>
                            </div>
                        </div>
                        <span
                            className={`rounded-md px-3 py-1 text-xs font-bold uppercase ${
                                ticket.status === 'open'
                                    ? 'bg-green-600 text-white'
                                    : ticket.status === 'pending'
                                      ? 'bg-yellow-500 text-black'
                                      : 'bg-red-600 text-white'
                            }`}
                        >
                            {ticket.status}
                        </span>
                    </div>

                    {/* Lista de mensajes */}
                    <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
                        {ticket.messages.length > 0 ? (
                            ticket.messages.map((msg) => {
                                const isCurrentUser = msg.sender_id === auth.user.id;
                                const nameToUse = isCurrentUser ? auth.user.name : msg.sender_name;
                                const avatarToUse = isCurrentUser ? auth.user.avatar : msg.sender_avatar;

                                return (
                                    <div key={msg.id} className={`group flex items-end gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                        <img
                                            src={getAvatar(avatarToUse, nameToUse)}
                                            alt={nameToUse}
                                            className="h-8 w-8 rounded-full border border-gray-600 object-cover"
                                        />
                                        <div
                                            className={`max-w-[60%] rounded-lg px-4 py-2 text-sm ${isCurrentUser ? 'bg-blue-600 text-white' : 'bg-[#2c2c2c] text-white'}`}
                                        >
                                            {msg.reply_to && (
                                                <div className="mb-2 rounded bg-[#444] p-2 text-xs text-gray-300 italic">
                                                    En respuesta a: <strong>{msg.reply_to.sender_name}</strong>
                                                    <br />“{msg.reply_to.message}”
                                                </div>
                                            )}
                                            <p>{msg.message}</p>
                                            <div className="mt-1 text-xs text-gray-400">{new Date(msg.created_at).toLocaleTimeString()}</div>

                                            {msg.audio_url && (
                                                <audio controls className="mt-2 w-full rounded bg-[#333] p-2">
                                                    <source src={msg.audio_url} type="audio/webm" />
                                                    Tu navegador no soporta el elemento de audio.
                                                </audio>
                                            )}

                                            {msg.audio_url && (
                                                <div className="mt-2 flex items-center gap-2">
                                                    <a
                                                        href={msg.audio_url}
                                                        download
                                                        className="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
                                                    >
                                                        Descargar audio
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                        {!isCurrentUser && (
                                            <div className="-mt-1 hidden justify-end pr-3 group-hover:flex">
                                                <button
                                                    onClick={() => {
                                                        setReplyTo(msg);
                                                        setData('reply_to_id', msg.id);
                                                    }}
                                                    className="text-gray-400 transition hover:text-blue-400"
                                                    title="Responder"
                                                >
                                                    <Reply className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}

                                        {!isCurrentUser && (
                                            <div className="-mt-1 hidden justify-end pr-3 group-hover:flex">
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const res = await fetch(`/tickets/${ticket.id}/messages/${msg.id}`, {
                                                                method: 'DELETE',
                                                                headers: {
                                                                    'X-CSRF-TOKEN': (
                                                                        document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
                                                                    ).content,
                                                                    Accept: 'application/json',
                                                                },
                                                            });

                                                            if (res.ok) {
                                                                toast.success('Mensaje eliminado');
                                                                router.reload();
                                                            } else {
                                                                toast.error('No se pudo eliminar');
                                                            }
                                                        } catch (error) {
                                                            toast.error('Error al eliminar');
                                                            console.error('Error al eliminar el mensaje:', error);
                                                        }
                                                    }}
                                                    className="text-gray-400 transition hover:text-red-400"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-gray-400">Sin mensajes aún.</p>
                        )}
                        <div ref={messageEndRef} />
                    </div>

                    {/* Vista de respuesta activa */}
                    {replyTo && (
                        <div className="mt-2 mb-2 flex items-start justify-between rounded bg-[#333] p-3 text-sm text-white">
                            <div>
                                <p className="text-xs text-gray-400">
                                    Respondiendo a <strong>{replyTo.sender_name}</strong>:
                                </p>
                                <p className="truncate text-xs text-gray-300 italic">“{replyTo.message}”</p>
                            </div>
                            <button
                                onClick={() => {
                                    setReplyTo(null);
                                    setData('reply_to_id', null);
                                }}
                                className="ml-4 text-xs text-red-400 hover:underline"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}

                    {/* Input */}
                    {ticket.status !== 'closed' && (
                        <div className="mt-4 flex items-center gap-2">
                            <textarea
                                value={data.message}
                                onChange={(e) => setData('message', e.target.value)}
                                className="w-full rounded-md border border-[#333] bg-[#2c2c2c] p-2 text-white placeholder-gray-400 focus:ring focus:ring-blue-500 focus:outline-none"
                                rows={1}
                                placeholder="Escribe tu mensaje..."
                            />
                            <button
                                onClick={startRecording}
                                className={`rounded-md p-2 ${isRecording ? 'bg-red-600' : 'bg-neutral-700'} text-white`}
                                title="Grabar audio"
                            >
                                <Mic className="h-5 w-5" />
                            </button>
                            <button
                                onClick={submitMessage}
                                className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700"
                            >
                                <SendHorizonal className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </main>
            </div>
        </AppLayout>
    );
}
