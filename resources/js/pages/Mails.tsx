import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { ExternalLink, Inbox, Mail } from 'lucide-react';

/*
 * Mis correos: todo lo que te ha enviado Cinammon (panel y tienda). Cada correo se vuelve a dibujar
 * al abrirlo, así que los antiguos también se ven con el diseño nuevo.
 */

interface MailRow {
    source: 'panel' | 'billing';
    uuid: string;
    to: string;
    subject: string;
    label: string;
    sent_at: string;
    url: string;
}

interface Props {
    mails: MailRow[];
    mailboxes: string[];
    storeOnline: boolean;
    [key: string]: unknown;
}

const fmt = (iso: string) =>
    new Date(iso).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Mails() {
    const { mails, mailboxes, storeOnline } = usePage<Props>().props;
    const shared = mailboxes.length > 1;

    return (
        <AppLayout breadcrumbs={[{ title: 'Mis correos', href: '/correos' }]}>
            <Head title="Mis correos" />

            <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6">
                <header className="flex flex-col gap-2">
                    <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-fuchsia-400 uppercase">
                        <Mail className="h-4 w-4" />
                        Tu buzón de Cinammon
                    </p>
                    <h1 className="font-[Orbitron] text-3xl font-bold text-neutral-900 sm:text-4xl dark:text-white">Mis correos</h1>
                    <p className="max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
                        Los correos que te hemos enviado desde el panel y la tienda. Al abrirlos se ven siempre con el diseño más nuevo, aunque sean antiguos.
                    </p>
                    {!storeOnline && <p className="text-xs text-amber-500">La tienda no responde ahora mismo: sus correos aparecerán cuando vuelva.</p>}
                </header>

                {mails.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 px-6 py-16 text-center dark:border-white/15">
                        <Inbox className="h-10 w-10 text-neutral-400" />
                        <p className="text-sm text-neutral-500">Todavía no te hemos enviado ningún correo.</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-neutral-900/60">
                        {mails.map((m) => (
                            <li key={`${m.source}-${m.uuid}`}>
                                <a
                                    href={m.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group flex items-center gap-4 px-5 py-4 transition hover:bg-neutral-50 dark:hover:bg-white/5"
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/10 text-fuchsia-500">
                                        <Mail className="h-5 w-5" />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold tracking-wider text-violet-500 uppercase">
                                                {m.label}
                                            </span>
                                            <span className="text-[11px] text-neutral-500">{m.source === 'billing' ? 'Tienda' : 'Panel'}</span>
                                            {shared && <span className="text-[11px] text-neutral-500">· para {m.to}</span>}
                                        </span>
                                        <span className="mt-1 block truncate text-sm font-semibold text-neutral-900 dark:text-white">{m.subject}</span>
                                    </span>
                                    <span className="hidden shrink-0 text-xs text-neutral-500 sm:block">{fmt(m.sent_at)}</span>
                                    <ExternalLink className="h-4 w-4 shrink-0 text-neutral-400 transition group-hover:text-fuchsia-500" />
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </AppLayout>
    );
}
