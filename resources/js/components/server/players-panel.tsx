import axios from 'axios';
import { Ban, Crown, Globe, Loader2, LogOut, Plus, RefreshCw, ShieldCheck, ShieldOff, UserCheck, Users, X } from 'lucide-react';
import { FormEvent, ReactNode, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

type Player = { name: string; uuid: string; level?: number };
type BanEntry = { name: string; reason: string; source: string; created: string; expires: string };
type Lists = {
    ops: Player[];
    whitelist: Player[];
    whitelist_enabled: boolean;
    whitelist_enforced: boolean;
    banned: BanEntry[];
    banned_ips: BanEntry[];
};
type Tab = 'ops' | 'whitelist' | 'banned';

const errorMessage = (error: unknown, fallback: string) =>
    axios.isAxiosError(error) ? (error.response?.data?.message as string) || fallback : fallback;

/** Cabeza del jugador (mc-heads.net) con la inicial como respaldo. */
function Head({ name, uuid }: { name: string; uuid?: string }) {
    const [failed, setFailed] = useState(false);
    if (failed || !/^[A-Za-z0-9_]{3,16}$/.test(name)) {
        return (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-purple-600 text-xs font-black text-white">
                {name.charAt(0).toUpperCase() || '?'}
            </span>
        );
    }
    return (
        <img
            src={`https://mc-heads.net/avatar/${uuid || name}/32`}
            alt=""
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-8 w-8 shrink-0 rounded-md bg-neutral-800 [image-rendering:pixelated]"
        />
    );
}

export default function PlayersPanel({ serverId, running }: { serverId: number; running: boolean }) {
    const base = `/servers/${serverId}/players`;
    const [lists, setLists] = useState<Lists | null>(null);
    const [tab, setTab] = useState<Tab>('ops');
    const [name, setName] = useState('');
    const [reason, setReason] = useState('');
    const [banIp, setBanIp] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await axios.get<Lists>(base);
            setLists(data);
            setError('');
        } catch (e) {
            setError(errorMessage(e, 'No se pudieron leer las listas.'));
        } finally {
            setLoading(false);
        }
    }, [base]);

    useEffect(() => {
        void load();
    }, [load]);

    /** Envía la acción; el servidor tarda un momento en guardar el archivo, así que se recarga dos veces. */
    const act = async (action: string, target = '', why = '') => {
        const key = `${action}:${target}`;
        setBusy(key);
        try {
            const { data } = await axios.post<{ command: string }>(base, { action, target, reason: why });
            toast.success(`/${data.command}`);
            window.setTimeout(() => void load(), 1200);
            window.setTimeout(() => void load(), 4000);
            return true;
        } catch (e) {
            toast.error(errorMessage(e, 'No se pudo ejecutar.'));
            return false;
        } finally {
            setBusy(null);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        const target = name.trim();
        if (!target) return;
        const action = tab === 'ops' ? 'op' : tab === 'whitelist' ? 'whitelist_add' : banIp ? 'ban_ip' : 'ban';
        if (await act(action, target, tab === 'banned' ? reason.trim() : '')) {
            setName('');
            setReason('');
        }
    };

    const kick = async () => {
        const target = name.trim();
        if (!target) return;
        if (await act('kick', target, reason.trim())) setName('');
    };

    const tabs: { key: Tab; label: string; icon: typeof Crown; count: number }[] = [
        { key: 'ops', label: 'Operadores', icon: Crown, count: lists?.ops.length ?? 0 },
        { key: 'whitelist', label: 'Whitelist', icon: UserCheck, count: lists?.whitelist.length ?? 0 },
        { key: 'banned', label: 'Baneados', icon: Ban, count: (lists?.banned.length ?? 0) + (lists?.banned_ips.length ?? 0) },
    ];

    const row = (key: string, left: ReactNode, onRemove: () => void, removeLabel: string) => (
        <li key={key} className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2">
            {left}
            <button
                type="button"
                disabled={!running || busy !== null}
                onClick={onRemove}
                title={running ? removeLabel : 'Enciende el servidor'}
                className="ml-auto flex shrink-0 items-center gap-1 rounded-md border border-red-500/30 px-2 py-1 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {busy === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />} {removeLabel}
            </button>
        </li>
    );

    const empty = (text: string) => <li className="rounded-lg border border-dashed border-neutral-800 px-3 py-6 text-center text-xs text-neutral-500">{text}</li>;

    return (
        <section aria-label="Gestión de jugadores" className="space-y-4 rounded-xl border border-cyan-800/80 bg-[#080d16] p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-sm font-bold tracking-wider text-cyan-300 uppercase">
                    <Users className="h-4 w-4" /> Gestión de jugadores
                </h2>
                <div className="flex items-center gap-2">
                    {!running && <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">Enciende el servidor para hacer cambios</span>}
                    <button
                        type="button"
                        onClick={() => void load()}
                        title="Recargar listas"
                        className="rounded-lg border border-neutral-700 p-1.5 text-neutral-400 transition hover:border-cyan-500 hover:text-cyan-300"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="flex gap-1 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900/60 p-1">
                {tabs.map(({ key, label, icon: Icon, count }) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setTab(key)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold whitespace-nowrap uppercase transition ${
                            tab === key ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40' : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                        <Icon className="h-4 w-4" /> {label}
                        <span className="rounded-md bg-black/40 px-1.5 py-0.5 text-[10px]">{count}</span>
                    </button>
                ))}
            </div>

            {tab === 'whitelist' && lists && (
                <div
                    className={`flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between ${
                        lists.whitelist_enabled ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : 'border-neutral-800 bg-neutral-900/60 text-neutral-400'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        {lists.whitelist_enabled ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : <ShieldOff className="h-4 w-4" />}
                        {lists.whitelist_enabled ? 'Whitelist activada: solo entran los jugadores de la lista.' : 'Whitelist desactivada: puede entrar cualquiera.'}
                    </span>
                    <button
                        type="button"
                        disabled={!running || busy !== null}
                        onClick={() => void act(lists.whitelist_enabled ? 'whitelist_off' : 'whitelist_on')}
                        className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            lists.whitelist_enabled ? 'border border-neutral-600 text-neutral-200 hover:bg-white/5' : 'bg-emerald-500 text-black hover:bg-emerald-400'
                        }`}
                    >
                        {lists.whitelist_enabled ? 'Desactivar' : 'Activar whitelist'}
                    </button>
                </div>
            )}

            {/* Añadir */}
            <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={45}
                    placeholder={tab === 'banned' && banIp ? 'IP o nombre del jugador' : 'Nombre del jugador'}
                    className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2 font-mono text-sm text-white placeholder:text-neutral-500 focus:border-cyan-500 focus:outline-none"
                />
                {tab === 'banned' && (
                    <input
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        maxLength={100}
                        placeholder="Motivo (opcional)"
                        className="min-w-0 flex-1 rounded-lg border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-cyan-500 focus:outline-none"
                    />
                )}
                <div className="flex gap-2">
                    <button
                        type="submit"
                        disabled={!running || busy !== null || !name.trim()}
                        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none ${
                            tab === 'banned' ? 'bg-red-500 text-white hover:bg-red-400' : 'bg-cyan-500 text-black hover:bg-cyan-400'
                        }`}
                    >
                        {busy && !busy.startsWith('kick') ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tab === 'banned' ? <Ban className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                        {tab === 'ops' ? 'Dar OP' : tab === 'whitelist' ? 'Añadir' : banIp ? 'Banear IP' : 'Banear'}
                    </button>
                    {tab === 'banned' && (
                        <button
                            type="button"
                            onClick={() => void kick()}
                            disabled={!running || busy !== null || !name.trim()}
                            title="Expulsar sin banear"
                            className="flex items-center gap-1.5 rounded-lg border border-amber-500/50 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <LogOut className="h-3.5 w-3.5" /> Expulsar
                        </button>
                    )}
                </div>
            </form>
            {tab === 'banned' && (
                <label className="flex w-fit cursor-pointer items-center gap-2 text-xs text-neutral-400">
                    <input type="checkbox" checked={banIp} onChange={(e) => setBanIp(e.target.checked)} className="rounded border-neutral-700 bg-neutral-900 text-red-500" />
                    Banear por IP (escribe una IP o el nombre de un jugador conectado)
                </label>
            )}

            {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

            {/* Listas */}
            {loading && !lists ? (
                <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-12 animate-pulse rounded-lg border border-neutral-800 bg-neutral-900/60" />
                    ))}
                </div>
            ) : lists ? (
                <ul className="grid gap-2 md:grid-cols-2">
                    {tab === 'ops' &&
                        (lists.ops.length
                            ? lists.ops.map((p) =>
                                  row(
                                      `deop:${p.name}`,
                                      <>
                                          <Head name={p.name} uuid={p.uuid} />
                                          <span className="min-w-0">
                                              <span className="block truncate font-mono text-sm text-white">{p.name}</span>
                                              <span className="text-[10px] text-amber-300">Nivel {p.level ?? 4}</span>
                                          </span>
                                      </>,
                                      () => void act('deop', p.name),
                                      'Quitar OP',
                                  ),
                              )
                            : empty('Nadie tiene OP. Los operadores pueden usar todos los comandos del juego.'))}

                    {tab === 'whitelist' &&
                        (lists.whitelist.length
                            ? lists.whitelist.map((p) =>
                                  row(
                                      `whitelist_remove:${p.name}`,
                                      <>
                                          <Head name={p.name} uuid={p.uuid} />
                                          <span className="truncate font-mono text-sm text-white">{p.name}</span>
                                      </>,
                                      () => void act('whitelist_remove', p.name),
                                      'Quitar',
                                  ),
                              )
                            : empty('La whitelist está vacía.'))}

                    {tab === 'banned' && (
                        <>
                            {lists.banned.map((b) =>
                                row(
                                    `pardon:${b.name}`,
                                    <>
                                        <Head name={b.name} />
                                        <span className="min-w-0">
                                            <span className="block truncate font-mono text-sm text-white">{b.name}</span>
                                            <span className="block truncate text-[10px] text-neutral-500">{b.reason || 'Sin motivo'}</span>
                                        </span>
                                    </>,
                                    () => void act('pardon', b.name),
                                    'Desbanear',
                                ),
                            )}
                            {lists.banned_ips.map((b) =>
                                row(
                                    `pardon_ip:${b.name}`,
                                    <>
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-500/15 text-red-300">
                                            <Globe className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate font-mono text-sm text-white">{b.name}</span>
                                            <span className="block truncate text-[10px] text-neutral-500">IP · {b.reason || 'Sin motivo'}</span>
                                        </span>
                                    </>,
                                    () => void act('pardon_ip', b.name),
                                    'Desbanear',
                                ),
                            )}
                            {lists.banned.length + lists.banned_ips.length === 0 && empty('No hay jugadores ni IPs baneados.')}
                        </>
                    )}
                </ul>
            ) : null}
        </section>
    );
}
