import { BlurredLockOverlay, ServerConsolePreview } from '@/components/server-lock-preview';
import { Head, Link } from '@inertiajs/react';
import { Clock, Crown, Hammer, KeyRound, Lock, LockOpen, ShieldCheck, User, Users } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

const DEMO_CODE = 'demo1234';
const LOCK_DAYS = 30;
const MAX_ATTEMPTS = 5;
const STORAGE_KEY = 'cinammon_demo_security_unlock_until';

type Actor = 'owner' | 'subuser' | 'admin' | 'other';
type Access = 'open' | 'needs-code' | 'protected' | 'forbidden';

const ACTORS: { key: Actor; label: string; icon: typeof User }[] = [
    { key: 'owner', label: 'El cliente (dueño)', icon: Crown },
    { key: 'subuser', label: 'Subusuario del cliente', icon: Users },
    { key: 'admin', label: 'Administrador de Cinammon', icon: Hammer },
    { key: 'other', label: 'Otro cliente', icon: User },
];

const REMEMBER_OPTIONS = [
    { minutes: 1, label: '1 minuto (prueba rápida)' },
    { minutes: 5, label: '5 minutos' },
    { minutes: 30, label: '30 minutos (por defecto)' },
];

// Reglas reales de EnsureServerUnlocked + authorizeServer del panel.
function resolveAccess(actor: Actor, lockActive: boolean, unlocked: boolean): Access {
    if (actor === 'subuser') return 'open';
    if (actor === 'owner') return lockActive && !unlocked ? 'needs-code' : 'open';
    if (actor === 'admin') return lockActive ? 'protected' : 'open';
    return lockActive ? 'protected' : 'forbidden';
}

function readStoredUnlockUntil(): number {
    if (typeof window === 'undefined') return 0;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        const until = raw ? Number(raw) : 0;
        return Number.isFinite(until) && until > Date.now() ? until : 0;
    } catch {
        return 0;
    }
}

function writeStoredUnlockUntil(until: number): void {
    if (typeof window === 'undefined') return;
    try {
        if (until > Date.now()) {
            window.localStorage.setItem(STORAGE_KEY, String(until));
        } else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    } catch {
        // Ignorar si el almacenamiento local está restringido.
    }
}

function formatRemaining(ms: number): string {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function CodeForm({
    onSubmit,
    label,
    error,
    disabled,
    showRemember = false,
}: {
    onSubmit: (code: string, rememberMinutes: number) => void;
    label: string;
    error: string | null;
    disabled?: boolean;
    showRemember?: boolean;
}) {
    const [code, setCode] = useState('');
    const [rememberMinutes, setRememberMinutes] = useState(30);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(code, rememberMinutes);
        setCode('');
    };

    return (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-pink-500/35 bg-neutral-950/85 p-4 text-left">
            <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••••"
                autoComplete="off"
                disabled={disabled}
                className="w-full rounded border border-neutral-700 bg-black px-3 py-2 font-mono text-sm text-white outline-none focus:border-pink-500 disabled:opacity-50"
            />
            {showRemember && (
                <label className="flex items-center justify-between gap-2 text-[11px] text-neutral-300">
                    <span className="inline-flex items-center gap-1 text-neutral-400">
                        <Clock className="h-3 w-3 text-pink-300" />
                        Guardar acceso:
                    </span>
                    <select
                        value={rememberMinutes}
                        onChange={(e) => setRememberMinutes(Number(e.target.value))}
                        className="rounded border border-neutral-700 bg-black px-2 py-1 text-[11px] text-neutral-200 focus:border-pink-500 focus:outline-none"
                    >
                        {REMEMBER_OPTIONS.map((opt) => (
                            <option key={opt.minutes} value={opt.minutes}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </label>
            )}
            {error && <p className="text-xs text-amber-300">{error}</p>}
            <button type="submit" disabled={disabled} className="w-full rounded bg-pink-600 px-3 py-2 text-xs font-bold text-white hover:bg-pink-500 disabled:opacity-50">
                {label}
            </button>
            <p className="text-center text-[11px] text-neutral-400">
                Código de la demo: <span className="font-mono font-bold text-pink-300">{DEMO_CODE}</span>
            </p>
        </form>
    );
}

function Scenario({
    title,
    subtitle,
    tone,
    actor,
    lockActive,
    unlockedUntil,
    nowMs,
    onUnlock,
    onRelock,
    banner,
}: {
    title: string;
    subtitle: string;
    tone: 'pink' | 'amber';
    actor: Actor;
    lockActive: boolean;
    unlockedUntil: number;
    nowMs: number;
    onUnlock: (minutes: number) => void;
    onRelock: () => void;
    banner?: string;
}) {
    const [attempts, setAttempts] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const unlocked = unlockedUntil > nowMs;
    const access = resolveAccess(actor, lockActive, unlocked);
    const blockedByAttempts = attempts >= MAX_ATTEMPTS;

    const tryCode = (code: string, rememberMinutes: number) => {
        if (blockedByAttempts) return;
        if (code === DEMO_CODE) {
            onUnlock(rememberMinutes);
            setError(null);
            setAttempts(0);
            return;
        }
        const next = attempts + 1;
        setAttempts(next);
        setError(next >= MAX_ATTEMPTS ? 'Demasiados intentos. Vuelve a probar en 15 min.' : `El código no es correcto. (${next}/${MAX_ATTEMPTS})`);
    };

    const border = tone === 'pink' ? 'border-pink-500/40' : 'border-amber-500/35';
    const accent = tone === 'pink' ? 'text-pink-300' : 'text-amber-300';

    return (
        <section className={`space-y-4 rounded-2xl border ${border} bg-neutral-950/80 p-5`}>
            <header className="flex items-start gap-3">
                {lockActive ? <Lock className={`mt-0.5 h-6 w-6 ${accent}`} /> : <LockOpen className={`mt-0.5 h-6 w-6 ${accent}`} />}
                <div>
                    <h2 className={`text-lg font-black tracking-wide uppercase ${accent}`}>{title}</h2>
                    <p className="text-xs text-neutral-400">{subtitle}</p>
                </div>
            </header>

            {banner && <p className="rounded border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">{banner}</p>}

            {access === 'open' && <ServerConsolePreview />}
            {access === 'needs-code' && (
                <BlurredLockOverlay
                    badge="Código requerido"
                    title="Servidor protegido"
                    message="La consola está lista detrás del candado. Introduce tu código para abrirla."
                    minHeightClass="min-h-[260px]"
                >
                    <CodeForm onSubmit={tryCode} label="Desbloquear" error={error} disabled={blockedByAttempts} showRemember />
                </BlurredLockOverlay>
            )}
            {access === 'protected' && (
                <BlurredLockOverlay
                    badge="Protegido con código"
                    title="Servidor bloqueado"
                    message="Este servidor está protegido por su propietario."
                    note={
                        actor === 'admin'
                            ? 'Los administradores solo pueden gestionar el servidor desde la lista (reinstalar, suspender, borrar), no abrir su consola ni sus archivos.'
                            : undefined
                    }
                />
            )}
            {access === 'forbidden' && (
                <BlurredLockOverlay
                    badge="Acceso restringido"
                    title="Servidor bloqueado"
                    message="No tienes permiso para acceder a este servidor."
                />
            )}

            {lockActive && unlocked && actor === 'owner' && (
                <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                        <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Contraseña guardada mientras no pase el tiempo límite
                        </span>
                        <span className="font-mono font-bold">{formatRemaining(unlockedUntil - nowMs)}</span>
                    </div>
                    <button
                        type="button"
                        onClick={onRelock}
                        className="w-full rounded border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:border-pink-500"
                    >
                        Volver a bloquear ahora
                    </button>
                </div>
            )}
        </section>
    );
}

const COMPARISON: { row: string; without: string; with: string }[] = [
    { row: 'Abrir consola, archivos y ajustes', without: 'Dueño, sus subusuarios y administradores', with: 'Solo el dueño (con su código) y sus subusuarios' },
    { row: 'Administradores de Cinammon', without: 'Pueden entrar para dar soporte', with: 'No pueden entrar; solo reinstalar, suspender o borrar' },
    { row: 'Otros clientes', without: 'Sin acceso', with: 'Sin acceso' },
    { row: 'Quién pone el código', without: '—', with: 'El cliente, al abrir su primer servidor' },
    { row: 'Duración', without: '—', with: '1 mes; después se apaga solo y el cliente lo reactiva con su código' },
    { row: 'Intentos fallidos', without: '—', with: 'Máximo 5 cada 15 minutos' },
    { row: 'Contraseña guardada', without: '—', with: 'Se mantiene guardada el tiempo elegido (ej. 30 min) sin volver a pedirla' },
    { row: 'Si no funciona o la olvida', without: '—', with: 'El Owner del panel puede cambiarla o restablecerla desde Usuarios' },
];

export default function DemoSecurity() {
    const [actor, setActor] = useState<Actor>('owner');
    const [day, setDay] = useState(0);
    const [reactivateError, setReactivateError] = useState<string | null>(null);
    const [unlockedUntil, setUnlockedUntil] = useState<number>(() => readStoredUnlockUntil());
    const [nowMs, setNowMs] = useState<number>(() => Date.now());
    const expired = day >= LOCK_DAYS;

    useEffect(() => {
        if (unlockedUntil <= Date.now()) {
            writeStoredUnlockUntil(0);
            return;
        }
        const timer = window.setInterval(() => {
            const current = Date.now();
            setNowMs(current);
            if (current >= unlockedUntil) {
                setUnlockedUntil(0);
                writeStoredUnlockUntil(0);
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [unlockedUntil]);

    const handleUnlock = (minutes: number) => {
        const until = Date.now() + minutes * 60_000;
        setNowMs(Date.now());
        setUnlockedUntil(until);
        writeStoredUnlockUntil(until);
    };

    const handleRelock = () => {
        setUnlockedUntil(0);
        writeStoredUnlockUntil(0);
    };

    const reactivate = (code: string) => {
        if (code === DEMO_CODE) {
            setDay(0);
            setReactivateError(null);
            handleRelock();
        } else {
            setReactivateError('El código no es correcto.');
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] px-4 py-10 font-sans text-white">
            <Head title="Demo · Seguridad con y sin código" />
            <div className="mx-auto max-w-6xl space-y-8">
                <header className="space-y-3 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/40 bg-pink-500/10 px-4 py-1.5 font-mono text-xs text-pink-300">
                        <ShieldCheck className="h-4 w-4" /> SIMULACIÓN CON DATOS DE EJEMPLO
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-wide text-pink-400 sm:text-4xl">Seguridad por cliente: con código y sin código</h1>
                    <p className="mx-auto max-w-3xl text-sm text-neutral-300">
                        Cada cliente pone un código que protege el acceso a sus servidores. Elige quién intenta entrar y compara qué ve en cada caso.
                    </p>
                    <Link href={route('login')} className="inline-block text-xs text-pink-300 hover:underline">
                        ← Volver al login de la demo
                    </Link>
                </header>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-4">
                    <p className="mb-3 flex items-center gap-2 font-mono text-xs font-bold tracking-wider text-neutral-400 uppercase">
                        <KeyRound className="h-4 w-4" /> ¿Quién intenta entrar al servidor?
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {ACTORS.map((a) => (
                            <button
                                key={a.key}
                                type="button"
                                onClick={() => setActor(a.key)}
                                className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold transition ${
                                    actor === a.key
                                        ? 'border-pink-400 bg-pink-500/15 text-pink-200'
                                        : 'border-neutral-700 bg-black/40 text-neutral-300 hover:border-pink-500/60'
                                }`}
                            >
                                <a.icon className="h-4 w-4" />
                                {a.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Scenario
                        title="Sin código"
                        subtitle="Bloqueo desactivado: el cliente no lo usa o se apagó solo al terminar el mes."
                        tone="amber"
                        actor={actor}
                        lockActive={false}
                        unlockedUntil={unlockedUntil}
                        nowMs={nowMs}
                        onUnlock={handleUnlock}
                        onRelock={handleRelock}
                    />
                    <Scenario
                        title="Con código"
                        subtitle={expired ? 'El bloqueo se apagó solo al cumplirse el mes.' : 'Bloqueo activo: solo entra quien tiene el código.'}
                        tone="pink"
                        actor={actor}
                        lockActive={!expired}
                        unlockedUntil={unlockedUntil}
                        nowMs={nowMs}
                        onUnlock={handleUnlock}
                        onRelock={handleRelock}
                        banner={expired ? 'Han pasado 30 días: el bloqueo automático se desactivó y el servidor vuelve a funcionar como el de la izquierda.' : undefined}
                    />
                </div>

                <section className="space-y-4 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-5">
                    <h2 className="font-bold text-pink-300">El bloqueo se apaga solo cada mes</h2>
                    <div className="flex items-center gap-4">
                        <input type="range" min={0} max={35} value={day} onChange={(e) => setDay(Number(e.target.value))} className="w-full accent-pink-500" />
                        <span className="w-24 shrink-0 text-right font-mono text-sm text-neutral-200">Día {day}</span>
                    </div>
                    <p className={`text-xs ${expired ? 'text-yellow-300' : 'text-emerald-300'}`}>
                        {expired ? 'Bloqueo apagado automáticamente. Para activarlo otro mes, el cliente escribe su código.' : `Bloqueo activo · se apaga solo en ${LOCK_DAYS - day} día(s).`}
                    </p>
                    {expired && (
                        <div className="max-w-sm">
                            <CodeForm onSubmit={reactivate} label="Reactivar el bloqueo un mes más" error={reactivateError} />
                        </div>
                    )}
                </section>

                <section className="overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950/80">
                    <table className="w-full min-w-[640px] text-left text-xs">
                        <thead className="border-b border-neutral-800 text-[11px] tracking-wider text-neutral-400 uppercase">
                            <tr>
                                <th className="px-4 py-3" />
                                <th className="px-4 py-3 text-amber-300">Sin código</th>
                                <th className="px-4 py-3 text-pink-300">Con código</th>
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARISON.map((c) => (
                                <tr key={c.row} className="border-b border-neutral-900 last:border-0">
                                    <td className="px-4 py-3 font-bold text-white">{c.row}</td>
                                    <td className="px-4 py-3 text-neutral-300">{c.without}</td>
                                    <td className="px-4 py-3 text-neutral-300">{c.with}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>
        </div>
    );
}
