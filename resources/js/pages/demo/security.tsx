import { Head, Link } from '@inertiajs/react';
import { Crown, Hammer, KeyRound, Lock, LockOpen, ShieldAlert, ShieldCheck, Terminal, User, Users } from 'lucide-react';
import { FormEvent, useState } from 'react';

const DEMO_CODE = 'demo1234';
const LOCK_DAYS = 30;
const MAX_ATTEMPTS = 5;

type Actor = 'owner' | 'subuser' | 'admin' | 'other';
type Access = 'open' | 'needs-code' | 'protected' | 'forbidden';

const ACTORS: { key: Actor; label: string; icon: typeof User }[] = [
    { key: 'owner', label: 'El cliente (dueño)', icon: Crown },
    { key: 'subuser', label: 'Subusuario del cliente', icon: Users },
    { key: 'admin', label: 'Administrador de Cinammon', icon: Hammer },
    { key: 'other', label: 'Otro cliente', icon: User },
];

// Reglas reales de EnsureServerUnlocked + authorizeServer del panel.
function resolveAccess(actor: Actor, lockActive: boolean, unlocked: boolean): Access {
    if (actor === 'subuser') return 'open';
    if (actor === 'owner') return lockActive && !unlocked ? 'needs-code' : 'open';
    if (actor === 'admin') return lockActive ? 'protected' : 'open';
    return lockActive ? 'protected' : 'forbidden';
}

const LOG_LINES = [
    '[12:13:12 INFO]: Done (8.230s)! For help, type "help"',
    '[12:13:21 INFO]: [Server] Hola',
    '[12:14:02 INFO]: Steve joined the game',
    '[12:14:40 INFO]: Steve: bienvenido a mi servidor',
];

function FakeConsole() {
    return (
        <div className="overflow-hidden rounded-lg border border-emerald-500/30 bg-black/80">
            <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2 text-xs">
                <span className="flex items-center gap-2 text-neutral-300">
                    <Terminal className="h-3.5 w-3.5 text-emerald-400" /> mi-servidor · Consola
                </span>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300">EN LÍNEA</span>
            </div>
            <div className="space-y-1 p-3 font-mono text-[11px] text-emerald-200/90">
                {LOG_LINES.map((line) => (
                    <p key={line}>{line}</p>
                ))}
            </div>
            <p className="border-t border-neutral-800 px-3 py-2 text-[11px] text-emerald-300">✔ Acceso concedido: consola, archivos y ajustes disponibles.</p>
        </div>
    );
}

function Blocked({ status, message, note }: { status: number; message: string; note?: string }) {
    return (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 p-4 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-rose-400" />
            <p className="mt-2 font-mono text-2xl font-black text-rose-300">{status}</p>
            <p className="mt-1 text-sm text-rose-200">{message}</p>
            {note && <p className="mt-2 text-[11px] text-neutral-400">{note}</p>}
        </div>
    );
}

function CodeForm({ onSubmit, label, error, disabled }: { onSubmit: (code: string) => void; label: string; error: string | null; disabled?: boolean }) {
    const [code, setCode] = useState('');
    const submit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(code);
        setCode('');
    };
    return (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-pink-500/30 bg-black/70 p-4">
            <div className="flex items-center gap-2 text-pink-300">
                <Lock className="h-5 w-5" />
                <span className="font-bold">Servidor protegido</span>
            </div>
            <p className="text-xs text-neutral-300">Introduce tu código de seguridad para acceder a tus servidores.</p>
            <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="••••••"
                autoComplete="off"
                disabled={disabled}
                className="w-full rounded border border-neutral-700 bg-black px-3 py-2 font-mono text-sm text-white outline-none focus:border-pink-500 disabled:opacity-50"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <button type="submit" disabled={disabled} className="w-full rounded bg-pink-600 px-3 py-2 text-xs font-bold text-white hover:bg-pink-500 disabled:opacity-50">
                {label}
            </button>
            <p className="text-center text-[11px] text-neutral-400">
                Código de la demo: <span className="font-mono font-bold text-cyan-300">{DEMO_CODE}</span>
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
    banner,
}: {
    title: string;
    subtitle: string;
    tone: 'pink' | 'cyan';
    actor: Actor;
    lockActive: boolean;
    banner?: string;
}) {
    const [unlocked, setUnlocked] = useState(false);
    const [attempts, setAttempts] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const access = resolveAccess(actor, lockActive, unlocked);
    const blockedByAttempts = attempts >= MAX_ATTEMPTS;

    const tryCode = (code: string) => {
        if (blockedByAttempts) return;
        if (code === DEMO_CODE) {
            setUnlocked(true);
            setError(null);
            setAttempts(0);
            return;
        }
        const next = attempts + 1;
        setAttempts(next);
        setError(next >= MAX_ATTEMPTS ? 'Demasiados intentos. Vuelve a probar en 15 min.' : `El código no es correcto. (${next}/${MAX_ATTEMPTS})`);
    };

    const border = tone === 'pink' ? 'border-pink-500/40' : 'border-cyan-500/40';
    const accent = tone === 'pink' ? 'text-pink-300' : 'text-cyan-300';

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

            {access === 'open' && <FakeConsole />}
            {access === 'needs-code' && <CodeForm onSubmit={tryCode} label="Desbloquear" error={error} disabled={blockedByAttempts} />}
            {access === 'protected' && (
                <Blocked
                    status={403}
                    message="Este servidor está protegido por su propietario."
                    note={actor === 'admin' ? 'Los administradores solo pueden gestionar el servidor desde la lista (reinstalar, suspender, borrar), no abrir su consola ni sus archivos.' : undefined}
                />
            )}
            {access === 'forbidden' && <Blocked status={403} message="No tienes permiso para acceder a este servidor." />}

            {lockActive && unlocked && actor === 'owner' && (
                <button
                    type="button"
                    onClick={() => setUnlocked(false)}
                    className="w-full rounded border border-neutral-700 px-3 py-2 text-xs text-neutral-300 hover:border-pink-500"
                >
                    Volver a bloquear esta sesión (si no, se cierra sola a los 30 min sin actividad)
                </button>
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
    { row: 'Sesión desbloqueada', without: '—', with: 'Se cierra tras 30 minutos sin actividad' },
    { row: 'Si olvida el código', without: '—', with: 'Soporte lo restablece y el cliente crea uno nuevo' },
];

export default function DemoSecurity() {
    const [actor, setActor] = useState<Actor>('owner');
    const [day, setDay] = useState(0);
    const [reactivateError, setReactivateError] = useState<string | null>(null);
    const [resetKey, setResetKey] = useState(0);
    const expired = day >= LOCK_DAYS;

    const reactivate = (code: string) => {
        if (code === DEMO_CODE) {
            setDay(0);
            setReactivateError(null);
            setResetKey((k) => k + 1);
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
                                        ? 'border-cyan-400 bg-cyan-400/10 text-cyan-300'
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
                        key={`without-${actor}`}
                        title="Sin código"
                        subtitle="Bloqueo desactivado: el cliente no lo usa o se apagó solo al terminar el mes."
                        tone="cyan"
                        actor={actor}
                        lockActive={false}
                    />
                    <Scenario
                        key={`with-${actor}-${resetKey}-${expired}`}
                        title="Con código"
                        subtitle={expired ? 'El bloqueo se apagó solo al cumplirse el mes.' : 'Bloqueo activo: solo entra quien tiene el código.'}
                        tone="pink"
                        actor={actor}
                        lockActive={!expired}
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
                                <th className="px-4 py-3 text-cyan-300">Sin código</th>
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
