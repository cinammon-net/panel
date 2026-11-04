import { fmtDate, type MaintenanceInfo } from '@/components/maintenance-banner';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, CalendarClock, CheckCircle2, Mail, Play, Square, Trash2, Wrench } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Row extends MaintenanceInfo {
    status: 'scheduled' | 'active' | 'finished' | 'cancelled';
    notified_at: string | null;
    created_by: string | null;
}

interface Props {
    maintenances: Row[];
    mailEnabled: boolean;
    usersCount: number;
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Mantenimiento', href: '/maintenance' }];

const SCOPES = [
    { id: 'panel', label: 'Panel', hint: 'panel.cinammon.net' },
    { id: 'store', label: 'Tienda', hint: 'store / billing' },
    { id: 'servers', label: 'Servidores de juego', hint: 'pueden reiniciarse' },
];

const STATUS: Record<Row['status'], { label: string; cls: string }> = {
    scheduled: { label: 'Programado', cls: 'border-amber-500/50 bg-amber-500/10 text-amber-300' },
    active: { label: 'En curso', cls: 'border-red-500/50 bg-red-500/10 text-red-300' },
    finished: { label: 'Terminado', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
    cancelled: { label: 'Cancelado', cls: 'border-neutral-700 bg-neutral-800/40 text-neutral-400' },
};

/** "2026-11-04T10:30" en hora local, para <input type="datetime-local">. */
function toLocalInput(d: Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = () => {
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    start.setMinutes(0, 0, 0);
    return {
        title: 'Mantenimiento programado',
        message: '',
        starts_at: toLocalInput(start),
        ends_at: toLocalInput(new Date(start.getTime() + 3600 * 1000)),
        scope: ['panel', 'store'] as string[],
        block_access: false,
        notify_email: false,
    };
};

export default function MaintenanceIndex() {
    const { maintenances, mailEnabled, usersCount } = usePage<Props>().props;
    const [form, setForm] = useState(emptyForm);
    const [editing, setEditing] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

    const set = <K extends keyof ReturnType<typeof emptyForm>>(k: K, v: ReturnType<typeof emptyForm>[K]) => setForm((f) => ({ ...f, [k]: v }));

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (form.scope.length === 0) return toast.error('Elige al menos una parte afectada.');
        const payload = {
            ...form,
            // El navegador da hora local: se envía en ISO para no depender de la zona del servidor.
            starts_at: new Date(form.starts_at).toISOString(),
            ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
        };
        const opts = {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onFinish: () => setBusy(false),
            onSuccess: () => {
                toast.success(editing ? 'Mantenimiento actualizado' : 'Mantenimiento programado: los usuarios ya ven el aviso');
                setEditing(null);
                setForm(emptyForm());
            },
            onError: (errors: Record<string, string>) => toast.error(Object.values(errors)[0] || 'No se pudo guardar'),
        };
        if (editing) router.put(`/maintenance/${editing}`, payload, opts);
        else router.post('/maintenance', payload, opts);
    };

    const edit = (m: Row) => {
        setEditing(m.id);
        setForm({
            title: m.title,
            message: m.message ?? '',
            starts_at: toLocalInput(new Date(m.starts_at)),
            ends_at: m.ends_at ? toLocalInput(new Date(m.ends_at)) : '',
            scope: m.scope,
            block_access: m.block_access,
            notify_email: false,
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const action = (m: Row, verb: 'start' | 'finish' | 'cancel') => {
        const texts = {
            start: '¿Empezar el mantenimiento ahora?',
            finish: '¿Dar por terminado el mantenimiento?',
            cancel: '¿Cancelar este mantenimiento? El aviso desaparecerá.',
        };
        if (!confirm(texts[verb])) return;
        const done = { preserveScroll: true, onSuccess: () => toast.success('Hecho') };
        if (verb === 'cancel') router.delete(`/maintenance/${m.id}`, done);
        else router.post(`/maintenance/${m.id}/${verb}`, {}, done);
    };

    const input = 'w-full rounded border border-cyan-800 bg-[#111] p-2 text-sm text-cyan-100 placeholder-cyan-700 focus:border-cyan-500 focus:outline-none';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Mantenimiento" />
            <div className="space-y-6 p-6 font-[Orbitron] text-white">
                <div className="flex items-center gap-3">
                    <Wrench className="h-7 w-7 text-amber-400" />
                    <div>
                        <h1 className="text-2xl font-semibold tracking-widest text-amber-300">MANTENIMIENTO</h1>
                        <p className="font-sans text-xs text-neutral-400">
                            Avisa a los usuarios antes de un mantenimiento. El aviso aparece en el panel, el login y la tienda desde {7} días antes.
                        </p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-4 rounded-2xl border border-amber-500/30 bg-neutral-950/80 p-5">
                    <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-amber-300">
                        <CalendarClock className="h-4 w-4" /> {editing ? 'EDITAR MANTENIMIENTO' : 'PROGRAMAR MANTENIMIENTO'}
                    </h2>

                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-1 md:col-span-2">
                            <span className="text-xs font-semibold">Título</span>
                            <input className={input} value={form.title} maxLength={120} onChange={(e) => set('title', e.target.value)} required />
                        </label>
                        <label className="space-y-1 md:col-span-2">
                            <span className="text-xs font-semibold">Mensaje para los usuarios (opcional)</span>
                            <textarea
                                className={`${input} font-sans`}
                                rows={3}
                                maxLength={2000}
                                placeholder="Ej.: Actualizamos el nodo de Miami. Los servidores se reiniciarán una vez."
                                value={form.message}
                                onChange={(e) => set('message', e.target.value)}
                            />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold">Empieza</span>
                            <input type="datetime-local" className={input} value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} required />
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold">Termina (previsto)</span>
                            <input type="datetime-local" className={input} value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
                        </label>
                    </div>

                    <div className="space-y-2">
                        <span className="text-xs font-semibold">Afecta a</span>
                        <div className="flex flex-wrap gap-2">
                            {SCOPES.map((s) => {
                                const on = form.scope.includes(s.id);
                                return (
                                    <button
                                        type="button"
                                        key={s.id}
                                        onClick={() => set('scope', on ? form.scope.filter((x) => x !== s.id) : [...form.scope, s.id])}
                                        className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                                            on ? 'border-amber-400 bg-amber-500/15 text-amber-200' : 'border-neutral-800 bg-black/40 text-neutral-400 hover:border-amber-500/50'
                                        }`}
                                        aria-pressed={on}
                                    >
                                        <span className="block font-bold">{s.label}</span>
                                        <span className="font-sans text-[10px] opacity-70">{s.hint}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-lg border border-red-900/60 bg-red-950/20 p-3">
                        <input type="checkbox" className="mt-0.5" checked={form.block_access} onChange={(e) => set('block_access', e.target.checked)} />
                        <span className="text-xs">
                            <strong className="text-red-300">Bloquear el acceso mientras dure</strong>
                            <span className="block font-sans text-[11px] text-neutral-400">
                                Los usuarios ven una página de mantenimiento (los Owner/Admin siguen entrando) y, si afecta a la tienda, no se aceptan pedidos nuevos.
                            </span>
                        </span>
                    </label>

                    <label className="flex items-start gap-3 rounded-lg border border-cyan-900/60 bg-cyan-950/20 p-3">
                        <input type="checkbox" className="mt-0.5" checked={form.notify_email} onChange={(e) => set('notify_email', e.target.checked)} />
                        <span className="text-xs">
                            <strong className="flex items-center gap-1.5 text-cyan-300">
                                <Mail className="h-3.5 w-3.5" /> Avisar por correo a los {usersCount} usuarios
                            </strong>
                            {mailEnabled ? (
                                <span className="block font-sans text-[11px] text-neutral-400">Se envía una sola vez por mantenimiento.</span>
                            ) : (
                                <span className="mt-1 flex items-center gap-1.5 font-sans text-[11px] text-amber-300">
                                    <AlertTriangle className="h-3.5 w-3.5" /> El correo no está configurado (MAIL_MAILER=log): los mensajes no llegarán hasta configurar SMTP.
                                </span>
                            )}
                        </span>
                    </label>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            disabled={busy}
                            className="rounded-lg border border-amber-400 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-400 hover:text-black disabled:opacity-50"
                        >
                            {editing ? 'Guardar cambios' : 'Programar y avisar'}
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
                    {maintenances.length === 0 && <p className="font-sans text-sm text-neutral-500">Todavía no hay mantenimientos.</p>}
                    {maintenances.map((m) => (
                        <div key={m.id} className="rounded-xl border border-neutral-800 bg-black/40 p-4">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS[m.status].cls}`}>{STATUS[m.status].label}</span>
                                <span className="text-sm font-bold">{m.title}</span>
                                {m.block_access && <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-300">bloquea acceso</span>}
                                {m.notified_at && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-cyan-400">
                                        <CheckCircle2 className="h-3 w-3" /> correo enviado
                                    </span>
                                )}
                            </div>
                            <p className="mt-1.5 font-mono text-[11px] text-neutral-400">
                                {fmtDate(m.starts_at)} → {m.ends_at ? fmtDate(m.ends_at) : 'sin fin previsto'} · {m.scope.join(', ')}
                                {m.created_by && <> · por {m.created_by}</>}
                            </p>
                            {m.message && <p className="mt-2 font-sans text-xs text-neutral-300">{m.message}</p>}
                            {(m.status === 'scheduled' || m.status === 'active') && (
                                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                    <button onClick={() => edit(m)} className="rounded border border-cyan-700 px-2.5 py-1 text-cyan-300 hover:bg-cyan-900/40">
                                        Editar
                                    </button>
                                    {m.status === 'scheduled' && (
                                        <button onClick={() => action(m, 'start')} className="inline-flex items-center gap-1 rounded border border-amber-700 px-2.5 py-1 text-amber-300 hover:bg-amber-900/40">
                                            <Play className="h-3 w-3" /> Empezar ahora
                                        </button>
                                    )}
                                    {m.status === 'active' && (
                                        <button onClick={() => action(m, 'finish')} className="inline-flex items-center gap-1 rounded border border-emerald-700 px-2.5 py-1 text-emerald-300 hover:bg-emerald-900/40">
                                            <Square className="h-3 w-3" /> Terminar ya
                                        </button>
                                    )}
                                    <button onClick={() => action(m, 'cancel')} className="inline-flex items-center gap-1 rounded border border-red-800 px-2.5 py-1 text-red-300 hover:bg-red-900/30">
                                        <Trash2 className="h-3 w-3" /> Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
