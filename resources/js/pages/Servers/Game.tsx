import ServerLayout from '@/layouts/server-layout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { AlertTriangle, CalendarClock, ImagePlus, Loader2, RotateCw, Save, SlidersHorizontal, Trash2, Users } from 'lucide-react';
import { ChangeEvent, CSSProperties, Fragment, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type Field = {
    key: string;
    type: 'bool' | 'int' | 'enum' | 'text' | 'url';
    group: string;
    label: string;
    help: string | null;
    options: Record<string, string> | null;
    min: number | null;
    max: number | null;
    value: boolean | number | string | null;
};

const GROUPS: { key: string; title: string }[] = [
    { key: 'general', title: 'General' },
    { key: 'juego', title: 'Juego' },
    { key: 'mundo', title: 'Mundo' },
    { key: 'rendimiento', title: 'Rendimiento' },
    { key: 'chat', title: 'Chat y paquete de recursos' },
];

const COLORS: Record<string, string> = {
    '0': '#000000', '1': '#0000AA', '2': '#00AA00', '3': '#00AAAA', '4': '#AA0000', '5': '#AA00AA', '6': '#FFAA00', '7': '#AAAAAA',
    '8': '#555555', '9': '#5555FF', a: '#55FF55', b: '#55FFFF', c: '#FF5555', d: '#FF55FF', e: '#FFFF55', f: '#FFFFFF',
};

const errorMessage = (error: unknown, fallback: string) =>
    axios.isAxiosError(error) ? (error.response?.data?.message as string) || fallback : fallback;

/** Pinta un texto con códigos de color de Minecraft (&a, &l...) como en el juego. */
function McText({ text }: { text: string }) {
    const parts: ReactNode[] = [];
    let style: CSSProperties = { color: '#AAAAAA' };
    let buffer = '';
    const flush = (key: number) => {
        if (buffer) parts.push(<span key={key} style={style}>{buffer}</span>);
        buffer = '';
    };
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if ((c === '&' || c === '§') && i + 1 < text.length && /[0-9a-fk-or]/i.test(text[i + 1])) {
            flush(i);
            const code = text[++i].toLowerCase();
            if (COLORS[code]) style = { color: COLORS[code] };
            else if (code === 'l') style = { ...style, fontWeight: 700 };
            else if (code === 'o') style = { ...style, fontStyle: 'italic' };
            else if (code === 'n') style = { ...style, textDecoration: 'underline' };
            else if (code === 'm') style = { ...style, textDecoration: 'line-through' };
            else if (code === 'r') style = { color: '#AAAAAA' };
            continue;
        }
        buffer += c;
    }
    flush(text.length);
    return <>{parts}</>;
}

const DAYS: [number, string][] = [
    [1, 'L'],
    [2, 'M'],
    [3, 'X'],
    [4, 'J'],
    [5, 'V'],
    [6, 'S'],
    [0, 'D'],
];

/** Reinicio automático diario o en días concretos, con avisos en el chat (hora de Madrid). */
function RestartSchedule({ serverId }: { serverId: number }) {
    const url = `/servers/${serverId}/game/schedule`;
    const [data, setData] = useState<{ enabled: boolean; time: string; days: number[]; warn: boolean; last_run_at: string | null } | null>(null);
    const [saved, setSaved] = useState<string>('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        axios
            .get(url)
            .then(({ data }) => {
                setData(data);
                setSaved(JSON.stringify(data));
            })
            .catch(() => setData(null));
    }, [url]);

    if (!data) return null;
    const dirty = JSON.stringify(data) !== saved;
    const toggleDay = (d: number) => {
        const all = data.days.length === 0 ? DAYS.map(([n]) => n) : data.days;
        const next = all.includes(d) ? all.filter((x) => x !== d) : [...all, d];
        setData({ ...data, days: next.length === 7 ? [] : next });
    };
    const active = (d: number) => data.days.length === 0 || data.days.includes(d);

    const save = async () => {
        if (data.enabled && data.days.length === 0 && !DAYS.some(([d]) => active(d))) return;
        setSaving(true);
        try {
            await axios.put(url, { enabled: data.enabled, time: data.time, days: data.days, warn: data.warn });
            setSaved(JSON.stringify(data));
            toast.success(data.enabled ? `Reinicio automático a las ${data.time}.` : 'Reinicio automático desactivado.');
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo guardar.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <section className="rounded-xl border border-neutral-800 bg-neutral-900/40">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3 sm:px-5">
                <h2 className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-cyan-400 uppercase">
                    <CalendarClock className="h-4 w-4" /> Reinicio automático
                </h2>
                <button
                    type="button"
                    role="switch"
                    aria-checked={data.enabled}
                    aria-label="Reinicio automático"
                    onClick={() => setData({ ...data, enabled: !data.enabled })}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${data.enabled ? 'border-emerald-400/60 bg-emerald-500/30' : 'border-neutral-700 bg-neutral-800'}`}
                >
                    <span className={`inline-block h-4 w-4 rounded-full transition ${data.enabled ? 'translate-x-6 bg-emerald-300' : 'translate-x-1 bg-neutral-500'}`} />
                </button>
            </div>
            <div className={`space-y-4 px-4 py-4 sm:px-5 ${data.enabled ? '' : 'pointer-events-none opacity-50'}`}>
                <p className="font-sans text-xs text-neutral-400">
                    Reiniciar el servidor libera memoria y evita el lag acumulado. Se guarda el mundo antes de reiniciar.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-white">
                        Hora
                        <input
                            type="time"
                            value={data.time}
                            onChange={(e) => setData({ ...data, time: e.target.value })}
                            className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none"
                        />
                        <span className="text-[11px] text-neutral-500">(hora de España)</span>
                    </label>
                    <div className="flex gap-1" role="group" aria-label="Días">
                        {DAYS.map(([d, label]) => (
                            <button
                                key={d}
                                type="button"
                                onClick={() => toggleDay(d)}
                                className={`h-8 w-8 rounded-lg border text-xs font-bold transition ${
                                    active(d) ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300' : 'border-neutral-800 text-neutral-500 hover:text-white'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-neutral-300">
                    <input type="checkbox" checked={data.warn} onChange={(e) => setData({ ...data, warn: e.target.checked })} className="rounded border-neutral-700 bg-neutral-900 text-cyan-500" />
                    Avisar en el chat 5 y 1 minutos antes
                </label>
                {data.last_run_at && <p className="text-[11px] text-neutral-500">Último reinicio automático: {new Date(data.last_run_at).toLocaleString('es-ES')}</p>}
            </div>
            {dirty && (
                <div className="flex justify-end border-t border-neutral-800 px-4 py-3 sm:px-5">
                    <button
                        type="button"
                        onClick={() => void save()}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-60"
                    >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar horario
                    </button>
                </div>
            )}
        </section>
    );
}

export default function Game({ server }: { server: { id: number; name: string; owner_id?: number; egg?: string | null } }) {
    const base = `/servers/${server.id}/game`;
    const [fields, setFields] = useState<Field[]>([]);
    const [values, setValues] = useState<Record<string, Field['value']>>({});
    const [icon, setIcon] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [exists, setExists] = useState(true);
    const [online, setOnline] = useState<{ online: number; max: number } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [iconBusy, setIconBusy] = useState(false);
    const [needsRestart, setNeedsRestart] = useState(false);
    const [restarting, setRestarting] = useState(false);
    const iconInput = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get(`${base}/settings`);
            const list: Field[] = data.fields.map((f: Field) => (f.key === 'motd' ? { ...f, value: String(f.value ?? '').replace(/§/g, '&') } : f));
            setFields(list);
            setValues(Object.fromEntries(list.map((f) => [f.key, f.value])));
            setIcon(data.icon);
            setRunning(data.running);
            setExists(data.exists);
            setError('');
        } catch (e) {
            setError(errorMessage(e, 'No se pudieron leer los ajustes.'));
        } finally {
            setLoading(false);
        }
        axios
            .get(`/servers/${server.id}/players/online`)
            .then(({ data }) => setOnline(data.reachable ? { online: data.online, max: data.max } : null))
            .catch(() => setOnline(null));
    }, [base, server.id]);

    useEffect(() => {
        void load();
    }, [load]);

    const dirty = useMemo(() => fields.filter((f) => values[f.key] !== f.value).map((f) => f.key), [fields, values]);
    const set = (key: string, value: Field['value']) => setValues((v) => ({ ...v, [key]: value }));

    const save = async () => {
        if (!dirty.length) return;
        setSaving(true);
        try {
            await axios.put(`${base}/settings`, { values: Object.fromEntries(dirty.map((k) => [k, values[k]])) });
            setFields((list) => list.map((f) => (dirty.includes(f.key) ? { ...f, value: values[f.key] } : f)));
            setNeedsRestart(true);
            toast.success('Ajustes guardados.');
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudieron guardar los ajustes.'));
        } finally {
            setSaving(false);
        }
    };

    const restart = async () => {
        setRestarting(true);
        try {
            await axios.post(`/servers/${server.id}/power`, { action: 'restart' });
            setNeedsRestart(false);
            toast.success('Reiniciando el servidor…');
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo reiniciar.'));
        } finally {
            setRestarting(false);
        }
    };

    const onIcon = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setIconBusy(true);
        try {
            const form = new FormData();
            form.append('icon', file);
            const { data } = await axios.post(`${base}/icon`, form);
            setIcon(data.icon);
            setNeedsRestart(true);
            toast.success('Icono actualizado (64×64).');
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo subir el icono.'));
        } finally {
            setIconBusy(false);
        }
    };

    const removeIcon = async () => {
        if (!window.confirm('¿Quitar el icono del servidor?')) return;
        setIconBusy(true);
        try {
            await axios.delete(`${base}/icon`);
            setIcon(null);
            setNeedsRestart(true);
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo quitar el icono.'));
        } finally {
            setIconBusy(false);
        }
    };

    const motd = String(values.motd ?? '');
    const maxPlayers = Number(values['max-players'] ?? online?.max ?? 20);

    const input = (f: Field) => {
        const v = values[f.key];
        const changed = dirty.includes(f.key);
        const ring = changed ? 'border-cyan-500/70' : 'border-neutral-800';
        if (f.type === 'bool') {
            return (
                <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(v)}
                    aria-label={f.label}
                    onClick={() => set(f.key, !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${v ? 'border-emerald-400/60 bg-emerald-500/30' : 'border-neutral-700 bg-neutral-800'}`}
                >
                    <span className={`inline-block h-4 w-4 rounded-full transition ${v ? 'translate-x-6 bg-emerald-300' : 'translate-x-1 bg-neutral-500'}`} />
                </button>
            );
        }
        if (f.type === 'enum' && f.options) {
            return (
                <select
                    value={String(v ?? '')}
                    onChange={(e) => set(f.key, e.target.value)}
                    className={`w-full rounded-lg border bg-neutral-900 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none sm:w-56 ${ring}`}
                >
                    {Object.entries(f.options).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </select>
            );
        }
        if (f.type === 'int') {
            return (
                <input
                    type="number"
                    min={f.min ?? undefined}
                    max={f.max ?? undefined}
                    value={v === null || v === undefined ? '' : Number(v)}
                    onChange={(e) => set(f.key, e.target.value === '' ? null : Number(e.target.value))}
                    className={`w-full rounded-lg border bg-neutral-900 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none sm:w-32 ${ring}`}
                />
            );
        }
        if (f.key === 'motd') {
            return (
                <textarea
                    rows={2}
                    maxLength={f.max ?? 150}
                    value={String(v ?? '')}
                    onChange={(e) => set(f.key, e.target.value.split('\n').slice(0, 2).join('\n'))}
                    className={`w-full rounded-lg border bg-neutral-900 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none ${ring}`}
                />
            );
        }
        return (
            <input
                type="text"
                maxLength={f.max ?? undefined}
                value={String(v ?? '')}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.type === 'url' ? 'https://…' : ''}
                className={`w-full rounded-lg border bg-neutral-900 px-3 py-2 font-mono text-sm text-white focus:border-cyan-500 focus:outline-none sm:w-80 ${ring}`}
            />
        );
    };

    return (
        <ServerLayout server={server} section="game">
            <Head title={`${server.name} · Ajustes del juego - Cinammon`} />
            <input ref={iconInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onIcon} />

            <div className="mx-auto max-w-5xl space-y-6 p-4 pb-28 sm:p-6 sm:pb-28 lg:p-8 lg:pb-28">
                <div className="flex items-center gap-3 border-b border-neutral-200 pb-5 dark:border-cyan-900/60">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                        <SlidersHorizontal className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-neutral-900 uppercase sm:text-2xl dark:text-white">Ajustes del juego</h1>
                        <p className="text-xs text-neutral-500 sm:text-sm dark:text-neutral-400">Nombre, icono, modo de juego, dificultad y más, sin editar archivos.</p>
                    </div>
                </div>

                {needsRestart && (
                    <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 sm:flex-row sm:items-center sm:justify-between">
                        <span className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" /> Los cambios se aplican al reiniciar el servidor.
                        </span>
                        {running && (
                            <button
                                type="button"
                                onClick={() => void restart()}
                                disabled={restarting}
                                className="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-60"
                            >
                                {restarting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />} Reiniciar ahora
                            </button>
                        )}
                    </div>
                )}

                {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {!loading && !exists && (
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-sm text-neutral-300">
                        Aún no existe <code className="text-cyan-400">server.properties</code>: arranca el servidor una vez para que se cree. Si guardas ahora, se creará con estos valores.
                    </div>
                )}

                {loading && !fields.length ? (
                    <div className="space-y-3">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="h-24 animate-pulse rounded-xl border border-neutral-800 bg-neutral-900/60" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Vista previa en la lista de servidores + icono */}
                        <section className="space-y-3 rounded-xl border border-cyan-800/60 bg-[#080d16] p-4 sm:p-5">
                            <h2 className="text-xs font-bold tracking-[0.2em] text-cyan-400 uppercase">Así te ven en la lista de servidores</h2>
                            <div className="flex items-start gap-3 rounded-md border border-neutral-700 bg-[#1e1e1e] p-2 font-mono" style={{ fontFamily: 'Minecraft, ui-monospace, monospace' }}>
                                {icon ? (
                                    <img src={icon} alt="Icono del servidor" className="h-16 w-16 shrink-0 [image-rendering:pixelated]" />
                                ) : (
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center bg-neutral-800 text-[10px] text-neutral-500">sin icono</div>
                                )}
                                <div className="min-w-0 flex-1 text-[13px] leading-5">
                                    <div className="flex justify-between gap-2">
                                        <span className="truncate text-white">{server.name}</span>
                                        <span className="flex shrink-0 items-center gap-1 text-[#AAAAAA]">
                                            {online ? online.online : 0}
                                            <span className="text-[#555555]">/</span>
                                            {Number.isFinite(maxPlayers) ? maxPlayers : '?'}
                                            <Users className="ml-1 h-3.5 w-3.5 text-emerald-400" />
                                        </span>
                                    </div>
                                    {(motd || ' ').split('\n').slice(0, 2).map((line, i) => (
                                        <div key={i} className="truncate whitespace-pre">
                                            <McText text={line || ' '} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => iconInput.current?.click()}
                                    disabled={iconBusy}
                                    className="flex items-center gap-2 rounded-lg border border-cyan-500/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
                                >
                                    {iconBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />} {icon ? 'Cambiar icono' : 'Subir icono'}
                                </button>
                                {icon && (
                                    <button
                                        type="button"
                                        onClick={() => void removeIcon()}
                                        disabled={iconBusy}
                                        className="flex items-center gap-2 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" /> Quitar
                                    </button>
                                )}
                                <span className="text-[11px] text-neutral-500">PNG, JPG o WebP; se recorta y se convierte a 64×64.</span>
                            </div>
                            <p className="text-[11px] text-neutral-500">
                                Colores en el nombre: escribe <code className="text-cyan-400">&amp;</code> + código, por ejemplo{' '}
                                <code className="text-cyan-400">&amp;dCinammon &amp;b&amp;lSMP</code>. Pulsa Intro para la segunda línea.
                            </p>
                            <div className="flex flex-wrap gap-1">
                                {Object.entries(COLORS).map(([code, color]) => (
                                    <button
                                        key={code}
                                        type="button"
                                        title={`&${code}`}
                                        onClick={() => set('motd', `${motd}&${code}`)}
                                        className="h-5 w-5 rounded border border-white/10"
                                        style={{ background: color }}
                                    />
                                ))}
                                {[
                                    ['l', 'B'],
                                    ['o', 'I'],
                                    ['n', 'U'],
                                    ['r', '×'],
                                ].map(([code, label]) => (
                                    <button
                                        key={code}
                                        type="button"
                                        title={`&${code}`}
                                        onClick={() => set('motd', `${motd}&${code}`)}
                                        className="h-5 min-w-5 rounded border border-white/10 bg-neutral-800 px-1 text-[10px] font-bold text-white"
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </section>

                        <RestartSchedule serverId={server.id} />

                        {GROUPS.map((group) => {
                            const list = fields.filter((f) => f.group === group.key);
                            if (!list.length) return null;
                            return (
                                <section key={group.key} className="rounded-xl border border-neutral-800 bg-neutral-900/40">
                                    <h2 className="border-b border-neutral-800 px-4 py-3 text-xs font-bold tracking-[0.2em] text-cyan-400 uppercase sm:px-5">{group.title}</h2>
                                    <div className="divide-y divide-neutral-800/80">
                                        {list.map((f) => (
                                            <Fragment key={f.key}>
                                                <div className={`flex flex-col gap-2 px-4 py-3 sm:px-5 ${f.key === 'motd' ? '' : 'sm:flex-row sm:items-center sm:justify-between'}`}>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-white">
                                                            {f.label}
                                                            {dirty.includes(f.key) && <span className="ml-2 text-[10px] font-bold text-cyan-400">• sin guardar</span>}
                                                        </p>
                                                        {f.help && <p className="font-sans text-xs text-neutral-500">{f.help}</p>}
                                                        {f.key === 'online-mode' && values[f.key] === false && (
                                                            <p className="mt-1 flex items-center gap-1 text-xs text-amber-300">
                                                                <AlertTriangle className="h-3.5 w-3.5" /> Usa un plugin de login (AuthMe…) para proteger las cuentas.
                                                            </p>
                                                        )}
                                                    </div>
                                                    {input(f)}
                                                </div>
                                            </Fragment>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </>
                )}
            </div>

            {/* Barra de guardado */}
            {dirty.length > 0 && (
                <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
                    <div className="flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-cyan-500/40 bg-[#070b15]/95 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur">
                        <span className="text-xs text-neutral-300">
                            {dirty.length} {dirty.length === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
                        </span>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setValues(Object.fromEntries(fields.map((f) => [f.key, f.value])))}
                                className="rounded-lg border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/5"
                            >
                                Descartar
                            </button>
                            <button
                                type="button"
                                onClick={() => void save()}
                                disabled={saving}
                                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-60"
                            >
                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ServerLayout>
    );
}
