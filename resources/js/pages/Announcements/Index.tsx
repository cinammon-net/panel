import { TYPE_STYLES, type AnnouncementInfo, type AnnouncementPlace, type AnnouncementType } from '@/components/announcement-bar';
import { fmtDate } from '@/components/maintenance-banner';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Eye, Megaphone, MousePointerClick, Pause, Pencil, Play, Trash2, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Row extends AnnouncementInfo {
    enabled: boolean;
    status: 'live' | 'scheduled' | 'finished' | 'paused';
    clicks: number;
    created_by: string | null;
}

interface Props {
    announcements: Row[];
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Anuncios', href: '/announcements' }];

const PLACES: { id: AnnouncementPlace; label: string; hint: string }[] = [
    { id: 'web', label: 'Web', hint: 'cinammon.net (visitantes)' },
    { id: 'panel', label: 'Panel', hint: 'clientes con sesión' },
    { id: 'store', label: 'Tienda', hint: 'billing (vía API)' },
];

const STATUS: Record<Row['status'], { label: string; cls: string }> = {
    live: { label: 'Publicado', cls: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' },
    scheduled: { label: 'Programado', cls: 'border-amber-500/50 bg-amber-500/10 text-amber-300' },
    paused: { label: 'Pausado', cls: 'border-neutral-700 bg-neutral-800/40 text-neutral-400' },
    finished: { label: 'Terminado', cls: 'border-neutral-700 bg-neutral-900/40 text-neutral-500' },
};

function toLocalInput(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Form = {
    type: AnnouncementType;
    title: string;
    message: string;
    highlight: string;
    coupon_code: string;
    cta_label: string;
    cta_url: string;
    places: AnnouncementPlace[];
    popup: boolean;
    enabled: boolean;
    starts_at: string;
    ends_at: string;
};

const emptyForm = (): Form => ({
    type: 'offer',
    title: '',
    message: '',
    highlight: '',
    coupon_code: '',
    cta_label: 'Ver planes',
    cta_url: 'https://cinammon.net/#planes',
    places: ['web', 'panel', 'store'],
    popup: false,
    enabled: true,
    starts_at: toLocalInput(new Date()),
    ends_at: '',
});

/** Plantillas rápidas ultra-visuales (poco texto, máximo impacto). */
const TEMPLATES: { name: string; data: Partial<Form>; days?: number }[] = [
    {
        name: '🎮 Servidor Gratis (Fijo)',
        data: {
            type: 'new',
            title: '¡CREA TU SERVIDOR 100% GRATIS!',
            highlight: '0,00 €',
            coupon_code: '',
            message: 'Sin tarjeta · Gana monedas en 1 clic y despliega al instante.',
            cta_label: '🚀 Crear servidor gratis',
            cta_url: 'https://billing.cinammon.net/free',
            places: ['web', 'panel', 'store'],
            popup: true,
        },
    },
    {
        name: '🛒 Black Friday (-30%)',
        days: 14,
        data: {
            type: 'offer',
            title: 'BLACK FRIDAY · TODO AL -30%',
            highlight: '-30%',
            coupon_code: '',
            message: 'Servidores, Bots, Web y Rangos VIP rebajados automáticamente.',
            cta_label: '🔥 Ver ofertas -30%',
            cta_url: 'https://billing.cinammon.net/store',
            places: ['web', 'panel', 'store'],
            popup: true,
        },
    },
    {
        name: '🎄 Calendario de Adviento',
        days: 24,
        data: {
            type: 'event',
            title: 'CALENDARIO DE ADVIENTO · 24 REGALOS',
            highlight: '24 🎁',
            coupon_code: '',
            message: 'Abre 1 regalo al día: monedas gratis y hasta +13 días en tu servidor.',
            cta_label: '🎄 Abrir regalo de hoy',
            cta_url: 'https://billing.cinammon.net/advent',
            places: ['web', 'panel', 'store'],
            popup: true,
        },
    },
    {
        name: '🎅 Especial Navidad (-25%)',
        days: 11,
        data: {
            type: 'offer',
            title: 'ESPECIAL NAVIDAD · -25% EN TODO',
            highlight: '-25%',
            coupon_code: '',
            message: 'Descuento directo en toda la tienda + 2x recompensas VIP en Adviento.',
            cta_label: '🎅 Aprovechar -25%',
            cta_url: 'https://billing.cinammon.net/store',
            places: ['web', 'panel', 'store'],
            popup: true,
        },
    },
    {
        name: '🥂 Nochevieja y Año Nuevo (-20%)',
        days: 7,
        data: {
            type: 'offer',
            title: 'ESPECIAL FIN DE AÑO · -20% EN TODO',
            highlight: '-20%',
            coupon_code: '',
            message: 'Despide el año y empieza el nuevo estrenando servidor al mejor precio.',
            cta_label: '🥂 Ver planes en oferta',
            cta_url: 'https://billing.cinammon.net/store',
            places: ['web', 'panel', 'store'],
            popup: true,
        },
    },
    {
        name: '⚡ Oferta Flash con cupón',
        days: 3,
        data: {
            type: 'offer',
            title: 'OFERTA FLASH EN TODOS LOS PLANES',
            highlight: '-30%',
            coupon_code: 'CINAMMON30',
            message: 'Solo por tiempo limitado. ¡Despliega en 60 segundos!',
            cta_label: '🔥 Usar descuento',
            popup: true,
        },
    },
];

export default function AnnouncementsIndex() {
    const { announcements } = usePage<Props>().props;
    const [form, setForm] = useState<Form>(emptyForm);
    const [editing, setEditing] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

    const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

    const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
        const start = new Date();
        setForm(() => ({
            ...emptyForm(),
            ...t.data,
            starts_at: toLocalInput(start),
            ends_at: t.days ? toLocalInput(new Date(start.getTime() + t.days * 86400000)) : '',
        }));
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.places.length === 0) return toast.error('Elige al menos dónde mostrarlo.');
        const payload = {
            ...form,
            starts_at: new Date(form.starts_at).toISOString(),
            ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
            highlight: form.highlight || null,
            coupon_code: form.coupon_code || null,
            cta_label: form.cta_label || null,
            cta_url: form.cta_url || null,
            message: form.message || null,
        };
        const opts = {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onSuccess: () => {
                toast.success(editing ? 'Anuncio actualizado' : 'Anuncio publicado');
                setEditing(null);
                setForm(emptyForm());
            },
            onError: (errors: Record<string, string>) => toast.error(Object.values(errors)[0] || 'No se pudo guardar'),
        };
        if (editing) router.put(`/announcements/${editing}`, payload, opts);
        else router.post('/announcements', payload, opts);
    };

    const edit = (a: Row) => {
        setEditing(a.id);
        setForm({
            type: a.type,
            title: a.title,
            message: a.message ?? '',
            highlight: a.highlight ?? '',
            coupon_code: a.coupon_code ?? '',
            cta_label: a.cta_label ?? '',
            cta_url: a.cta_url ?? '',
            places: a.places,
            popup: a.popup,
            enabled: a.enabled,
            starts_at: toLocalInput(new Date(a.starts_at)),
            ends_at: a.ends_at ? toLocalInput(new Date(a.ends_at)) : '',
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggle = (a: Row) => router.post(`/announcements/${a.id}/toggle`, {}, { preserveScroll: true, onSuccess: () => toast.success(a.enabled ? 'Pausado' : 'Reanudado') });
    const remove = (a: Row) => {
        if (!confirm(`¿Eliminar el anuncio "${a.title}"?`)) return;
        router.delete(`/announcements/${a.id}`, { preserveScroll: true, onSuccess: () => toast.success('Eliminado') });
    };

    const input = 'w-full rounded border border-pink-900 bg-[#111] p-2 text-sm text-pink-50 placeholder-neutral-600 focus:border-pink-500 focus:outline-none';
    const preview = TYPE_STYLES[form.type];
    const PreviewIcon = preview.icon;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Anuncios" />
            <div className="space-y-6 p-6 font-[Orbitron] text-white">
                <div className="flex items-center gap-3">
                    <Megaphone className="h-7 w-7 text-pink-400" />
                    <div>
                        <h1 className="text-2xl font-semibold tracking-widest text-pink-300">ANUNCIOS</h1>
                        <p className="font-sans text-xs text-neutral-400">
                            Publica ofertas, novedades y eventos. Salen en una barra arriba de la web, el panel y la tienda; la ventana emergente atrae a los visitantes de la
                            landing.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4 rounded-2xl border border-pink-500/30 bg-neutral-950/80 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-sm font-bold tracking-wider text-pink-300">{editing ? 'EDITAR ANUNCIO' : 'NUEVO ANUNCIO'}</h2>
                        {!editing && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <Wand2 className="h-3.5 w-3.5 text-neutral-500" />
                                {TEMPLATES.map((t) => (
                                    <button
                                        type="button"
                                        key={t.name}
                                        onClick={() => applyTemplate(t)}
                                        className="rounded border border-neutral-800 px-2 py-1 font-sans text-[10px] text-neutral-300 hover:border-pink-500/60 hover:text-pink-200"
                                    >
                                        {t.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {(Object.keys(TYPE_STYLES) as AnnouncementType[]).map((t) => {
                            const s = TYPE_STYLES[t];
                            const Icon = s.icon;
                            const on = form.type === t;
                            return (
                                <button
                                    type="button"
                                    key={t}
                                    onClick={() => set('type', t)}
                                    aria-pressed={on}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition ${
                                        on ? 'border-pink-400 bg-pink-500/15 text-pink-100' : 'border-neutral-800 bg-black/40 text-neutral-400 hover:border-pink-500/50'
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" /> {s.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        <label className="space-y-1 md:col-span-2">
                            <span className="text-xs font-semibold">Título</span>
                            <input className={input} value={form.title} maxLength={120} onChange={(e) => set('title', e.target.value)} placeholder="Ej.: Descuento en todos los planes" required />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold">Reclamo (opcional)</span>
                            <input className={input} value={form.highlight} maxLength={20} onChange={(e) => set('highlight', e.target.value)} placeholder="-30%, GRATIS, 2x1, NUEVO" />
                        </label>
                        <label className="space-y-1 md:col-span-3">
                            <span className="text-xs font-semibold">Mensaje (opcional)</span>
                            <textarea
                                className={`${input} font-sans`}
                                rows={2}
                                maxLength={1000}
                                value={form.message}
                                onChange={(e) => set('message', e.target.value)}
                                placeholder="Ej.: Solo este fin de semana. Sin permanencia."
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold">Cupón (opcional)</span>
                            <input
                                className={`${input} font-mono uppercase`}
                                value={form.coupon_code}
                                maxLength={40}
                                onChange={(e) => set('coupon_code', e.target.value.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase())}
                                placeholder="CINAMMON30"
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold">Texto del botón</span>
                            <input className={input} value={form.cta_label} maxLength={40} onChange={(e) => set('cta_label', e.target.value)} placeholder="Ver planes" />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold">Enlace del botón</span>
                            <input className={input} value={form.cta_url} maxLength={500} onChange={(e) => set('cta_url', e.target.value)} placeholder="https://billing.cinammon.net" />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold">Empieza</span>
                            <input type="datetime-local" className={input} value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} required />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold">Termina (vacío = sin fin)</span>
                            <input type="datetime-local" className={input} value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
                        </label>
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs font-semibold">Dónde se muestra</span>
                        <div className="flex flex-wrap gap-2">
                            {PLACES.map((p) => {
                                const on = form.places.includes(p.id);
                                return (
                                    <button
                                        type="button"
                                        key={p.id}
                                        aria-pressed={on}
                                        onClick={() => set('places', on ? form.places.filter((x) => x !== p.id) : [...form.places, p.id])}
                                        className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                                            on ? 'border-pink-400 bg-pink-500/15 text-pink-100' : 'border-neutral-800 bg-black/40 text-neutral-400 hover:border-pink-500/50'
                                        }`}
                                    >
                                        <span className="block font-bold">{p.label}</span>
                                        <span className="font-sans text-[10px] opacity-70">{p.hint}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-lg border border-pink-900/60 bg-pink-950/20 p-3">
                        <input type="checkbox" className="mt-0.5" checked={form.popup} onChange={(e) => set('popup', e.target.checked)} />
                        <span className="text-xs">
                            <strong className="text-pink-300">Cartel en grande (Ventana emergente multi-anuncio)</strong>
                            <span className="block font-sans text-[11px] text-neutral-400">
                                Puedes tener varios activos a la vez (por ejemplo, el anuncio fijo de <strong>Servidores Gratis</strong> + la <strong>Oferta esporádica</strong> del momento). El cartel grande muestra ambos de forma visual y directa.
                            </span>
                        </span>
                    </label>

                    {/* Vista previa de la barra */}
                    <div className="space-y-1">
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400">
                            <Eye className="h-3.5 w-3.5" /> Vista previa
                        </span>
                        <div className={`flex flex-wrap items-center justify-center gap-2.5 rounded-lg border bg-gradient-to-r px-4 py-2 text-xs ${preview.bar}`}>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${preview.chip}`}>
                                <PreviewIcon className="h-3 w-3" /> {preview.label}
                            </span>
                            {form.highlight && <span className="text-sm font-extrabold text-yellow-300">{form.highlight}</span>}
                            <strong>{form.title || 'Título del anuncio'}</strong>
                            {form.coupon_code && <span className="rounded border border-dashed border-white/50 px-2 py-0.5 font-mono text-[11px]">{form.coupon_code}</span>}
                            {form.cta_url && <span className="rounded-md border border-white/40 bg-white/10 px-2.5 py-0.5 font-bold">{form.cta_label || 'Ver más'} →</span>}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={busy}
                            className="rounded-lg border border-pink-400 bg-pink-500/20 px-4 py-2 text-xs font-bold text-pink-100 transition hover:bg-pink-400 hover:text-black disabled:opacity-50"
                        >
                            {editing ? 'Guardar cambios' : 'Publicar anuncio'}
                        </button>
                        {editing && (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditing(null);
                                    setForm(emptyForm());
                                }}
                                className="rounded-lg border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:border-neutral-500"
                            >
                                Cancelar edición
                            </button>
                        )}
                    </div>
                </form>

                <div className="space-y-3">
                    {announcements.length === 0 && <p className="font-sans text-sm text-neutral-500">Todavía no hay anuncios. Usa una plantilla para crear el primero.</p>}
                    {announcements.map((a) => {
                        const s = TYPE_STYLES[a.type] ?? TYPE_STYLES.news;
                        return (
                            <div key={a.id} className="rounded-xl border border-neutral-800 bg-black/40 p-4">
                                <div className="flex flex-wrap items-center gap-2.5">
                                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS[a.status].cls}`}>{STATUS[a.status].label}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${s.chip}`}>{s.label}</span>
                                    {a.highlight && <span className="text-sm font-extrabold text-yellow-300">{a.highlight}</span>}
                                    <span className="text-sm font-bold">{a.title}</span>
                                    {a.coupon_code && <span className="rounded border border-dashed border-neutral-600 px-1.5 font-mono text-[10px] text-neutral-300">{a.coupon_code}</span>}
                                    {a.popup && <span className="rounded bg-pink-500/15 px-1.5 py-0.5 text-[10px] text-pink-300">emergente</span>}
                                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-cyan-300" title="Clics en el botón">
                                        <MousePointerClick className="h-3.5 w-3.5" /> {a.clicks}
                                    </span>
                                </div>
                                <p className="mt-1.5 font-mono text-[11px] text-neutral-400">
                                    {fmtDate(a.starts_at)} → {a.ends_at ? fmtDate(a.ends_at) : 'sin fin'} · {a.places.join(', ')}
                                    {a.created_by && <> · por {a.created_by}</>}
                                </p>
                                {a.message && <p className="mt-2 font-sans text-xs text-neutral-300">{a.message}</p>}
                                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                    <button onClick={() => edit(a)} className="inline-flex items-center gap-1 rounded border border-cyan-700 px-2.5 py-1 text-cyan-300 hover:bg-cyan-900/40">
                                        <Pencil className="h-3 w-3" /> Editar
                                    </button>
                                    {a.status !== 'finished' && (
                                        <button onClick={() => toggle(a)} className="inline-flex items-center gap-1 rounded border border-amber-700 px-2.5 py-1 text-amber-300 hover:bg-amber-900/40">
                                            {a.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />} {a.enabled ? 'Pausar' : 'Reanudar'}
                                        </button>
                                    )}
                                    <button onClick={() => remove(a)} className="inline-flex items-center gap-1 rounded border border-red-800 px-2.5 py-1 text-red-300 hover:bg-red-900/30">
                                        <Trash2 className="h-3 w-3" /> Eliminar
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
