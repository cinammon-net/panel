import UserAvatar from '@/components/user-avatar';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Bot, CheckCircle2, ExternalLink, Eye, Pin, PinOff, Send, ThumbsUp, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { Author, CategoryChip, QuestionSummary, RichText, StatusChips, timeAgo } from './shared';

interface Answer {
    id: number;
    body: string;
    source: 'web' | 'discord' | 'assistant';
    author: Author;
    helpful: number;
    voted: boolean;
    best: boolean;
    mine: boolean;
    can_delete: boolean;
    at: string;
}

interface Props {
    question: QuestionSummary & { body: string | null; discord_url: string | null; can_mark: boolean; can_delete: boolean };
    answers: Answer[];
    related: { id: number; title: string }[];
    isStaff: boolean;
    categories: Record<string, string>;
    flash?: { success?: string };
    [key: string]: unknown;
}

const SOURCE_LABEL = { web: null, discord: 'Desde Discord', assistant: 'Respuesta automática' } as const;

export default function CommunityShow() {
    const { question: q, answers, related, isStaff, categories, flash } = usePage<Props>().props;
    const form = useForm({ body: '' });

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
    }, [flash]);

    const post = (url: string) => router.post(url, {}, { preserveScroll: true });
    const remove = (url: string, what: string) => {
        if (confirm(`¿Borrar ${what}? No se puede deshacer.`)) router.delete(url, { preserveScroll: true });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Dudas de la comunidad', href: '/dudas' },
                { title: q.title.length > 40 ? q.title.slice(0, 40) + '…' : q.title, href: `/dudas/${q.id}` },
            ]}
        >
            <Head title={q.title} />
            <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_260px]">
                <div className="min-w-0 space-y-6">
                    <Link href="/dudas" className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white">
                        <ArrowLeft className="h-3.5 w-3.5" /> Todas las dudas
                    </Link>

                    <article className="space-y-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-5">
                        <div className="flex flex-wrap items-center gap-2">
                            <CategoryChip cat={q.category} label={categories[q.category] ?? q.category} />
                            <StatusChips q={q} />
                        </div>
                        <h1 className="text-xl font-bold text-white sm:text-2xl">{q.title}</h1>
                        {q.body && <RichText text={q.body} />}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-900 pt-3">
                            <div className="flex items-center gap-2 text-xs text-neutral-500">
                                <UserAvatar name={q.author.name} src={q.author.avatar} size={22} />
                                <span className="text-neutral-300">{q.author.name}</span>
                                <span>{timeAgo(q.at)}</span>
                                <span className="inline-flex items-center gap-1">
                                    <Eye className="h-3 w-3" /> {q.views}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {q.discord_url && (
                                    <a
                                        href={q.discord_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-300 hover:bg-indigo-500/20"
                                    >
                                        <ExternalLink className="h-3 w-3" /> Ver en Discord
                                    </a>
                                )}
                                {q.can_mark && !answers.some((a) => a.best) && (
                                    <button
                                        type="button"
                                        onClick={() => post(`/dudas/${q.id}/resuelta`)}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:text-white"
                                    >
                                        <CheckCircle2 className="h-3 w-3" /> {q.solved ? 'Reabrir' : 'Ya lo resolví'}
                                    </button>
                                )}
                                {isStaff && (
                                    <button
                                        type="button"
                                        onClick={() => router.patch(`/dudas/${q.id}`, { pinned: !q.pinned }, { preserveScroll: true })}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-neutral-300 hover:text-white"
                                    >
                                        {q.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />} {q.pinned ? 'Desfijar' : 'Fijar'}
                                    </button>
                                )}
                                {isStaff && (
                                    <select
                                        value={q.category}
                                        onChange={(e) => router.patch(`/dudas/${q.id}`, { category: e.target.value }, { preserveScroll: true })}
                                        className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-300"
                                    >
                                        {Object.entries(categories).map(([k, v]) => (
                                            <option key={k} value={k}>
                                                {v}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                {q.can_delete && (
                                    <button
                                        type="button"
                                        onClick={() => remove(`/dudas/${q.id}`, 'la pregunta')}
                                        className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-red-400 hover:bg-red-950/40"
                                    >
                                        <Trash2 className="h-3 w-3" /> Borrar
                                    </button>
                                )}
                            </div>
                        </div>
                    </article>

                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold text-neutral-300">
                            {answers.length ? `${answers.length} ${answers.length === 1 ? 'respuesta' : 'respuestas'}` : 'Todavía nadie ha respondido'}
                        </h2>
                        {answers.map((a) => (
                            <div key={a.id} className={`space-y-3 rounded-xl border p-4 ${a.best ? 'border-emerald-700/60 bg-emerald-950/15' : 'border-neutral-800 bg-neutral-950/40'}`}>
                                {a.best && (
                                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> La que le sirvió a quien preguntó
                                    </p>
                                )}
                                <RichText text={a.body} />
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
                                    <div className="flex items-center gap-2">
                                        {a.source === 'assistant' ? (
                                            <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-pink-600/20 text-pink-300">
                                                <Bot className="h-3 w-3" />
                                            </span>
                                        ) : (
                                            <UserAvatar name={a.author.name} src={a.author.avatar} size={20} />
                                        )}
                                        <span className="text-neutral-300">{a.author.name}</span>
                                        {SOURCE_LABEL[a.source] && <span className="rounded bg-neutral-900 px-1.5 py-px text-[10px]">{SOURCE_LABEL[a.source]}</span>}
                                        <span>{timeAgo(a.at)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={a.mine}
                                            title={a.mine ? 'No puedes votar tu propia respuesta' : 'Me sirvió'}
                                            onClick={() => post(`/dudas/respuestas/${a.id}/voto`)}
                                            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 ${a.voted ? 'bg-pink-600/20 text-pink-300' : 'bg-neutral-900 text-neutral-400 hover:text-white'} disabled:cursor-default disabled:opacity-60`}
                                        >
                                            <ThumbsUp className="h-3 w-3" /> Me sirvió{a.helpful ? ` · ${a.helpful}` : ''}
                                        </button>
                                        {q.can_mark && (
                                            <button
                                                type="button"
                                                onClick={() => post(`/dudas/${q.id}/mejor/${a.id}`)}
                                                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 ${a.best ? 'bg-emerald-600/20 text-emerald-300' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
                                            >
                                                <CheckCircle2 className="h-3 w-3" /> {a.best ? 'Desmarcar' : 'Esta me sirvió'}
                                            </button>
                                        )}
                                        {a.can_delete && (
                                            <button type="button" title="Borrar" onClick={() => remove(`/dudas/respuestas/${a.id}`, 'la respuesta')} className="rounded-md p-1 text-neutral-600 hover:text-red-400">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </section>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post(`/dudas/${q.id}/respuestas`, { preserveScroll: true, onSuccess: () => form.reset() });
                        }}
                        className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4"
                    >
                        <label className="text-xs font-semibold text-neutral-300">¿Sabes cómo se hace? Responde</label>
                        <textarea
                            value={form.data.body}
                            onChange={(e) => form.setData('body', e.target.value)}
                            rows={4}
                            maxLength={4000}
                            placeholder="Explica los pasos. Puedes poner código entre ``` ```."
                            className="w-full rounded-lg border border-neutral-800 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-pink-600 focus:outline-none"
                        />
                        {form.errors.body && <p className="text-xs text-red-400">{form.errors.body}</p>}
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] text-neutral-500">{q.discord_url ? 'Tu respuesta también sale en el hilo de Discord.' : 'Nada de contraseñas ni datos personales.'}</p>
                            <button
                                type="submit"
                                disabled={form.processing || form.data.body.trim().length < 2}
                                className="inline-flex items-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" /> Responder
                            </button>
                        </div>
                    </form>
                </div>

                <aside className="space-y-4">
                    {related.length > 0 && (
                        <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
                            <p className="text-xs font-semibold text-neutral-300">Dudas parecidas resueltas</p>
                            <ul className="mt-2 space-y-2">
                                {related.map((r) => (
                                    <li key={r.id}>
                                        <Link href={`/dudas/${r.id}`} className="flex gap-2 text-sm text-neutral-400 hover:text-white">
                                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                            <span>{r.title}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 p-4 text-xs leading-relaxed text-neutral-400">
                        <p className="font-semibold text-neutral-300">Cómo funciona</p>
                        <p className="mt-2">Quien pregunta marca la respuesta que le sirvió. Los demás pulsan «Me sirvió» en las que les ayudan, y las mejores suben.</p>
                        <p className="mt-2">Si es algo de tu cuenta o un pago, mejor un ticket: aquí lo ve todo el mundo.</p>
                        <Link href="/tickets" className="mt-2 inline-block text-pink-300 hover:text-pink-200">
                            Abrir un ticket
                        </Link>
                    </div>
                </aside>
            </div>
        </AppLayout>
    );
}
