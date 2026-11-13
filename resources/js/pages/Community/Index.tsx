import UserAvatar from '@/components/user-avatar';
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { CheckCircle2, Eye, HelpCircle, Lightbulb, MessageCircle, MessagesSquare, Plus, Search, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CategoryChip, QuestionSummary, StatusChips, timeAgo } from './shared';

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
}

interface Props {
    questions: Paginated<QuestionSummary>;
    filters: { q: string; categoria: string; ver: string };
    categories: Record<string, string>;
    stats: { total: number; solved: number; answers: number };
    flash?: { success?: string };
    [key: string]: unknown;
}

interface Similar {
    id: number;
    title: string;
    solved: boolean;
    answers: number;
}

const VIEWS = [
    ['', 'Todas'],
    ['resueltas', 'Resueltas'],
    ['sin-responder', 'Sin responder'],
] as const;

export default function CommunityIndex() {
    const { questions, filters, categories, stats, flash } = usePage<Props>().props;
    const [search, setSearch] = useState(filters.q);
    const [asking, setAsking] = useState(false);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
    }, [flash]);

    const go = (patch: Partial<Props['filters']>) => {
        const next = { ...filters, ...patch };
        const params = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
        router.get('/dudas', params, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Dudas de la comunidad', href: '/dudas' }]}>
            <Head title="Dudas de la comunidad" />
            <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.3em] text-pink-400 uppercase">
                            <MessagesSquare className="h-4 w-4" /> Comunidad
                        </p>
                        <h1 className="text-2xl font-bold text-white sm:text-3xl">Dudas de la comunidad</h1>
                        <p className="max-w-2xl text-sm text-neutral-400">
                            Preguntas de otros usuarios con sus respuestas. Busca antes de preguntar: lo más probable es que alguien ya lo haya resuelto. Si sabes la respuesta a algo, ayuda.
                        </p>
                        <p className="text-xs text-neutral-500">
                            {stats.total} preguntas · {stats.solved} resueltas · {stats.answers} respuestas · También en #soporte de Discord
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAsking((v) => !v)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-500"
                    >
                        {asking ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {asking ? 'Cerrar' : 'Hacer una pregunta'}
                    </button>
                </header>

                {asking && <AskForm categories={categories} initial={search} />}

                <div className="space-y-3">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            go({ q: search.trim() });
                        }}
                        className="relative"
                    >
                        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Busca tu duda: java, plugins, sftp, dominio, puerto..."
                            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 py-2.5 pr-24 pl-10 text-sm text-white placeholder:text-neutral-600 focus:border-pink-600 focus:outline-none"
                        />
                        <button type="submit" className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700">
                            Buscar
                        </button>
                    </form>
                    <div className="flex flex-wrap items-center gap-2">
                        {VIEWS.map(([k, label]) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => go({ ver: k })}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${filters.ver === k ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-400 hover:text-white'}`}
                            >
                                {label}
                            </button>
                        ))}
                        <span className="mx-1 h-4 w-px bg-neutral-800" />
                        <select
                            value={filters.categoria}
                            onChange={(e) => go({ categoria: e.target.value })}
                            className="rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300 focus:outline-none"
                        >
                            <option value="">Todas las categorías</option>
                            {Object.entries(categories).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v}
                                </option>
                            ))}
                        </select>
                        {(filters.q || filters.categoria || filters.ver) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch('');
                                    router.get('/dudas');
                                }}
                                className="text-xs text-neutral-500 hover:text-white"
                            >
                                Quitar filtros
                            </button>
                        )}
                    </div>
                </div>

                {questions.data.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center">
                        <HelpCircle className="mx-auto h-8 w-8 text-neutral-600" />
                        <p className="mt-3 text-sm text-neutral-300">{filters.q ? 'No hay nada parecido todavía.' : 'Aún no hay preguntas.'}</p>
                        <p className="mt-1 text-xs text-neutral-500">Sé la primera persona en preguntarlo: así le servirá a los siguientes.</p>
                        {!asking && (
                            <button type="button" onClick={() => setAsking(true)} className="mt-4 rounded-lg bg-pink-600 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-500">
                                Hacer una pregunta
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-neutral-900 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950/60">
                        {questions.data.map((q) => (
                            <li key={q.id}>
                                <Link href={`/dudas/${q.id}`} className="flex gap-4 p-4 transition hover:bg-neutral-900/60">
                                    <div
                                        className={`flex w-14 shrink-0 flex-col items-center justify-center rounded-lg border text-center ${q.solved ? 'border-emerald-700/60 bg-emerald-500/10 text-emerald-300' : q.answers ? 'border-neutral-700 text-neutral-300' : 'border-neutral-800 text-neutral-500'}`}
                                    >
                                        {q.solved ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-base font-bold">{q.answers}</span>}
                                        <span className="mt-0.5 text-[10px]">{q.answers === 1 ? 'respuesta' : 'respuestas'}</span>
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <p className="font-semibold text-white">{q.title}</p>
                                        {q.excerpt && <p className="line-clamp-2 text-xs text-neutral-400">{q.excerpt}</p>}
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                                            <CategoryChip cat={q.category} label={categories[q.category] ?? q.category} />
                                            <StatusChips q={q} />
                                            <span className="inline-flex items-center gap-1.5">
                                                <UserAvatar name={q.author.name} src={q.author.avatar} size={16} />
                                                {q.author.name}
                                            </span>
                                            <span>{timeAgo(q.at)}</span>
                                            <span className="inline-flex items-center gap-1">
                                                <Eye className="h-3 w-3" /> {q.views}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                {questions.last_page > 1 && (
                    <nav className="flex flex-wrap justify-center gap-1">
                        {questions.links.map((l, i) => (
                            <Link
                                key={i}
                                href={l.url ?? '#'}
                                preserveScroll
                                className={`rounded-md px-3 py-1.5 text-xs ${l.active ? 'bg-pink-600 text-white' : l.url ? 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800' : 'pointer-events-none text-neutral-700'}`}
                            >
                                {l.label.replace('&laquo;', '‹').replace('&raquo;', '›').replace('Previous', '').replace('Next', '').trim() || (i === 0 ? '‹' : '›')}
                            </Link>
                        ))}
                    </nav>
                )}
            </div>
        </AppLayout>
    );
}

function AskForm({ categories, initial }: { categories: Record<string, string>; initial: string }) {
    const form = useForm({ title: initial, body: '', category: 'general' });
    const [similar, setSimilar] = useState<Similar[]>([]);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        clearTimeout(timer.current);
        const q = form.data.title.trim();
        if (q.length < 4) {
            setSimilar([]);
            return;
        }
        timer.current = setTimeout(() => {
            fetch(`/dudas/parecidas?q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } })
                .then((r) => (r.ok ? r.json() : []))
                .then(setSimilar)
                .catch(() => setSimilar([]));
        }, 350);
        return () => clearTimeout(timer.current);
    }, [form.data.title]);

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.post('/dudas');
            }}
            className="space-y-4 rounded-xl border border-pink-900/50 bg-pink-950/10 p-5"
        >
            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Tu pregunta en una frase</label>
                <input
                    value={form.data.title}
                    onChange={(e) => form.setData('title', e.target.value)}
                    maxLength={140}
                    placeholder="Ej.: ¿Cómo cambio la versión de Java de mi servidor de Minecraft?"
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-pink-600 focus:outline-none"
                />
                {form.errors.title && <p className="text-xs text-red-400">{form.errors.title}</p>}
            </div>

            {similar.length > 0 && (
                <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                        <Lightbulb className="h-3.5 w-3.5" /> Puede que ya esté respondida
                    </p>
                    <ul className="mt-2 space-y-1">
                        {similar.map((s) => (
                            <li key={s.id}>
                                <Link href={`/dudas/${s.id}`} className="flex items-center gap-2 text-sm text-neutral-200 hover:text-white">
                                    {s.solved ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" /> : <MessageCircle className="h-3.5 w-3.5 shrink-0 text-neutral-500" />}
                                    <span className="truncate">{s.title}</span>
                                    <span className="shrink-0 text-[11px] text-neutral-500">{s.answers} resp.</span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">Detalles</label>
                <textarea
                    value={form.data.body}
                    onChange={(e) => form.setData('body', e.target.value)}
                    rows={5}
                    maxLength={4000}
                    placeholder="Juego y versión, el error exacto de la consola (entre ``` ```) y qué has probado ya."
                    className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus:border-pink-600 focus:outline-none"
                />
                {form.errors.body && <p className="text-xs text-red-400">{form.errors.body}</p>}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <select
                    value={form.data.category}
                    onChange={(e) => form.setData('category', e.target.value)}
                    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-neutral-200 focus:outline-none"
                >
                    {Object.entries(categories).map(([k, v]) => (
                        <option key={k} value={k}>
                            {v}
                        </option>
                    ))}
                </select>
                <button
                    type="submit"
                    disabled={form.processing || form.data.title.trim().length < 10}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-600 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-500 disabled:opacity-50"
                >
                    <Send className="h-4 w-4" /> Publicar pregunta
                </button>
            </div>
            <p className="text-[11px] text-neutral-500">
                Es público para todos los usuarios con cuenta y sale en #soporte de Discord. No pongas contraseñas, correos ni datos de pago: para eso abre un ticket.
            </p>
        </form>
    );
}
