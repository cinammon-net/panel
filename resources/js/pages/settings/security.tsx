import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Check, Copy, KeyRound, Lock, LockOpen, Monitor, QrCode, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

import HeadingSmall from '@/components/heading-small';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Security settings',
        href: '/settings/security',
    },
];

type Session = {
    id: string;
    ip_address: string | null;
    user_agent: string;
    last_activity: string;
    is_current: boolean;
};

type LoginLog = {
    id: number;
    ip_address: string | null;
    user_agent: string;
    created_at: string;
};

type ServerLock = { has_code: boolean; active: boolean; until: string | null; unlocked: boolean; unlocked_until?: string | null };

const formatUntil = (value: string | null) =>
    value ? new Date(value).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }) : '';

const formatUnlockTime = (value?: string | null) =>
    value ? new Date(value).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

function TwoFactorAuthSection() {
    const { twoFactorEnabled: initialEnabled } = usePage<{ twoFactorEnabled?: boolean }>().props;
    const [enabled, setEnabled] = useState(Boolean(initialEnabled));
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'idle' | 'enabling' | 'confirmed'>('idle');
    const [qrData, setQrData] = useState<{ secret: string; qr_url: string; otpauth_url: string } | null>(null);
    const [verificationCode, setVerificationCode] = useState('');
    const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const [disablePassword, setDisablePassword] = useState('');
    const [isDisabling, setIsDisabling] = useState(false);

    const getCsrfToken = () => {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        return match ? decodeURIComponent(match[1]) : '';
    };

    const startEnabling = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/user/two-factor-authentication', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                    Accept: 'application/json',
                },
            });
            const data = await res.json();
            if (res.ok) {
                setQrData(data);
                setStep('enabling');
            } else {
                setErrorMsg(data.error || 'No se pudo iniciar la activación de 2FA.');
            }
        } catch {
            setErrorMsg('Error de red al conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    };

    const confirm2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/user/confirmed-two-factor-authentication', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                    Accept: 'application/json',
                },
                body: JSON.stringify({ code: verificationCode }),
            });
            const data = await res.json();
            if (res.ok) {
                setEnabled(true);
                setRecoveryCodes(data.recovery_codes || []);
                setStep('confirmed');
            } else {
                setErrorMsg(data.error || 'El código introducido no es válido.');
            }
        } catch {
            setErrorMsg('Error de red al verificar el código.');
        } finally {
            setLoading(false);
        }
    };

    const disable2FA = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/user/two-factor-authentication', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                    Accept: 'application/json',
                },
                body: JSON.stringify({ password: disablePassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setEnabled(false);
                setIsDisabling(false);
                setDisablePassword('');
                setStep('idle');
            } else {
                setErrorMsg(data.error || 'La contraseña es incorrecta.');
            }
        } catch {
            setErrorMsg('Error de conexión al desactivar.');
        } finally {
            setLoading(false);
        }
    };

    const copyRecoveryCodes = () => {
        navigator.clipboard.writeText(recoveryCodes.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <HeadingSmall
                title="Autenticación en Dos Pasos (2FA)"
                description="Añade una capa de máxima seguridad a tu cuenta exigiendo un código temporal generado por tu móvil (Google Authenticator, Authy, etc.) cada vez que inicies sesión."
            />

            {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3.5 text-xs font-medium text-rose-300">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {!enabled && step === 'idle' && (
                <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-neutral-800 bg-black/40 p-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400">
                            <Smartphone className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="font-semibold text-white">2FA Desactivado</p>
                            <p className="text-xs text-neutral-400">
                                Tu cuenta solo está protegida por tu contraseña y los inicios sociales.
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        onClick={startEnabling}
                        disabled={loading}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 font-semibold text-white shadow-md shadow-pink-500/20 hover:from-pink-600 hover:to-purple-700"
                    >
                        <QrCode className="mr-2 h-4 w-4" />
                        {loading ? 'Generando...' : 'Activar 2FA con Código QR'}
                    </Button>
                </div>
            )}

            {step === 'enabling' && qrData && (
                <div className="space-y-5 rounded-xl border border-pink-500/30 bg-neutral-950/70 p-6 backdrop-blur-sm">
                    <div className="flex items-center gap-2 text-pink-400 font-semibold text-sm">
                        <QrCode className="h-4 w-4" />
                        Paso 1: Escanea este código QR con tu app de autenticación
                    </div>

                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                        <div className="overflow-hidden rounded-xl border-2 border-pink-500/30 bg-[#09090b] p-3 shadow-lg shadow-pink-500/10">
                            <img src={qrData.qr_url} alt="Código QR 2FA" className="h-44 w-44" />
                        </div>

                        <div className="flex-1 space-y-4 text-xs text-neutral-300">
                            <p>
                                Abre <strong>Google Authenticator</strong>, <strong>Authy</strong> o cualquier app compatible y pulsa en <strong>«Escanear código QR»</strong>.
                            </p>
                            <div>
                                <span className="block text-neutral-400 mb-1">¿No puedes escanear el QR? Escribe esta clave manualmente:</span>
                                <div className="flex items-center gap-2">
                                    <code className="rounded-lg border border-pink-500/30 bg-black/80 px-3 py-1.5 font-mono text-sm tracking-widest text-pink-300">
                                        {qrData.secret}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={() => navigator.clipboard.writeText(qrData.secret)}
                                        className="rounded-lg border border-neutral-700 bg-neutral-800 p-2 text-neutral-300 hover:text-white"
                                        title="Copiar clave"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={confirm2FA} className="border-t border-neutral-800/80 pt-5">
                        <div className="space-y-2">
                            <Label htmlFor="two_factor_code" className="text-xs font-semibold text-white">
                                Paso 2: Introduce el código de 6 dígitos generado por tu móvil
                            </Label>
                            <div className="flex max-w-xs items-center gap-3">
                                <Input
                                    id="two_factor_code"
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="border-pink-500/30 bg-neutral-900 text-center font-mono text-xl tracking-[0.25em] text-white focus:border-pink-500"
                                />
                                <Button
                                    type="submit"
                                    disabled={loading || verificationCode.length !== 6}
                                    className="bg-pink-500 hover:bg-pink-600"
                                >
                                    {loading ? 'Comprobando...' : 'Confirmar'}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep('idle')}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {enabled && (
                <div className="space-y-4">
                    <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-5 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
                                <ShieldCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-white">Autenticación en Dos Pasos Activada</p>
                                <p className="text-xs text-neutral-400">
                                    Tu cuenta está completamente protegida con código temporal por aplicación móvil.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => setIsDisabling(true)}
                        >
                            Desactivar 2FA
                        </Button>
                    </div>

                    {step === 'confirmed' && recoveryCodes.length > 0 && (
                        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <h4 className="font-bold text-amber-300 text-sm">¡Guarda tus códigos de recuperación!</h4>
                                    <p className="text-xs text-neutral-400">
                                        Si alguna vez pierdes o cambias de teléfono, necesitarás uno de estos códigos para poder entrar.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={copyRecoveryCodes}
                                    className="gap-1.5 text-xs"
                                >
                                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                    {copied ? '¡Copiados!' : 'Copiar códigos'}
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
                                {recoveryCodes.map((code, idx) => (
                                    <div key={idx} className="rounded-lg border border-neutral-800 bg-black/60 px-2.5 py-1.5 text-center text-amber-200">
                                        {code}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {isDisabling && (
                        <form onSubmit={disable2FA} className="rounded-xl border border-neutral-800 bg-black/50 p-5 space-y-4">
                            <h4 className="font-semibold text-white text-sm">Confirma tu contraseña para desactivar el 2FA</h4>
                            <div className="max-w-md space-y-2">
                                <Input
                                    type="password"
                                    value={disablePassword}
                                    onChange={(e) => setDisablePassword(e.target.value)}
                                    placeholder="Introduce tu contraseña actual"
                                    className="bg-neutral-900 border-neutral-700"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <Button type="submit" variant="destructive" disabled={loading || !disablePassword}>
                                    {loading ? 'Desactivando...' : 'Confirmar desactivación'}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setIsDisabling(false)}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    );
}

function CodeField({ id, label, value, onChange, error }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string }) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type="password" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} className="block w-full" placeholder="••••••" />
            <InputError message={error} />
        </div>
    );
}

function ServerLockSection() {
    const { serverLock } = usePage<{ serverLock: ServerLock | null }>().props;
    const create = useForm({ code: '', code_confirmation: '' });
    const enable = useForm({ code: '' });
    const disable = useForm({ code: '' });
    const change = useForm({ current_code: '', code: '', code_confirmation: '' });
    const relock = useForm({});

    if (!serverLock) return null;

    return (
        <div className="space-y-6">
            <HeadingSmall
                title="Bloqueo de seguridad de tus servidores"
                description="Con el bloqueo activo solo tú, con tu código, puedes abrir tus servidores. Si quieres dar acceso a otra persona, añádela como usuario en la pestaña «Usuarios» de tu servidor: ella no necesitará el código."
            />

            {!serverLock.has_code ? (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        create.post(route('server-lock.store'), { preserveScroll: true, onSuccess: () => create.reset() });
                    }}
                    className="space-y-5 rounded-md border border-pink-500/30 bg-black/40 p-4"
                >
                    <p className="text-sm text-neutral-300">
                        Crea tu código de seguridad (4 dígitos o más). Lo necesitarás cada vez que abras un servidor mientras el bloqueo esté activo.
                    </p>
                    <CodeField id="new_code" label="Código" value={create.data.code} onChange={(v) => create.setData('code', v)} error={create.errors.code} />
                    <CodeField id="new_code_confirmation" label="Repite el código" value={create.data.code_confirmation} onChange={(v) => create.setData('code_confirmation', v)} />
                    <Button disabled={create.processing} className="gap-2">
                        <Lock className="h-4 w-4" />
                        Crear código y activar bloqueo
                    </Button>
                </form>
            ) : (
                <div className="space-y-6">
                    <div
                        className={`flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm ${
                            serverLock.active ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-amber-500/50 bg-amber-500/5'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            {serverLock.active ? <Lock className="h-5 w-5 text-emerald-400" /> : <LockOpen className="h-5 w-5 text-amber-400" />}
                            <div>
                                <p className="font-semibold">{serverLock.active ? 'Bloqueo activo' : 'Bloqueo desactivado'}</p>
                                <p className="text-xs text-neutral-400">
                                    {serverLock.active
                                        ? `Se desactivará solo el ${formatUntil(serverLock.until)}. Después podrás reactivarlo con tu mismo código.`
                                        : 'Tus servidores no piden código. Reactívalo cuando quieras con tu mismo código.'}
                                </p>
                            </div>
                        </div>
                        {serverLock.active && serverLock.unlocked && (
                            <div className="flex flex-col items-end gap-1">
                                <Button type="button" variant="outline" size="sm" disabled={relock.processing} onClick={() => relock.post(route('server-lock.relock'), { preserveScroll: true })}>
                                    Bloquear ahora
                                </Button>
                                {serverLock.unlocked_until && (
                                    <span className="text-[11px] text-emerald-300">
                                        Código guardado hasta las {formatUnlockTime(serverLock.unlocked_until)}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {serverLock.active ? (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                disable.post(route('server-lock.disable'), { preserveScroll: true, onSuccess: () => disable.reset() });
                            }}
                            className="space-y-4"
                        >
                            <CodeField id="disable_code" label="Tu código para desactivar el bloqueo" value={disable.data.code} onChange={(v) => disable.setData('code', v)} error={disable.errors.code} />
                            <Button variant="outline" disabled={disable.processing} className="gap-2">
                                <LockOpen className="h-4 w-4" />
                                Desactivar bloqueo
                            </Button>
                        </form>
                    ) : (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                enable.post(route('server-lock.enable'), { preserveScroll: true, onSuccess: () => enable.reset() });
                            }}
                            className="space-y-4"
                        >
                            <CodeField id="enable_code" label="Tu código para reactivar el bloqueo un mes" value={enable.data.code} onChange={(v) => enable.setData('code', v)} error={enable.errors.code} />
                            <Button disabled={enable.processing} className="gap-2">
                                <Lock className="h-4 w-4" />
                                Reactivar bloqueo (1 mes)
                            </Button>
                        </form>
                    )}

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            change.put(route('server-lock.code'), { preserveScroll: true, onSuccess: () => change.reset() });
                        }}
                        className="space-y-4 border-t border-pink-500/20 pt-6"
                    >
                        <h3 className="flex items-center gap-2 text-sm font-semibold">
                            <KeyRound className="h-4 w-4 text-pink-400" />
                            Cambiar código
                        </h3>
                        <CodeField id="current_code" label="Código actual" value={change.data.current_code} onChange={(v) => change.setData('current_code', v)} error={change.errors.current_code} />
                        <CodeField id="change_code" label="Código nuevo" value={change.data.code} onChange={(v) => change.setData('code', v)} error={change.errors.code} />
                        <CodeField id="change_code_confirmation" label="Repite el código nuevo" value={change.data.code_confirmation} onChange={(v) => change.setData('code_confirmation', v)} />
                        <Button variant="outline" disabled={change.processing}>
                            Guardar código nuevo
                        </Button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default function Security() {
    const { sessions, loginHistory } = usePage<{ sessions: Session[]; loginHistory: LoginLog[] }>().props;

    const { data, setData, errors, post, reset, processing, recentlySuccessful } = useForm({
        password: '',
    });

    const logoutOthers: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('security.logout-others'), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Security settings" />

            <SettingsLayout>
                <div className="space-y-10">
                    <TwoFactorAuthSection />

                    <ServerLockSection />

                    {/* SESIONES ACTIVAS */}
                    <div className="space-y-6">
                        <HeadingSmall
                            title="Sesiones activas"
                            description="Estos son los dispositivos con sesión abierta en tu cuenta"
                        />

                        <div className="space-y-3">
                            {sessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm ${
                                        session.is_current
                                            ? 'border-emerald-500/50 bg-emerald-500/5'
                                            : 'border-pink-500/30 bg-black/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Monitor className={`h-5 w-5 ${session.is_current ? 'text-emerald-400' : 'text-pink-400'}`} />
                                        <div>
                                            <p className="font-semibold">{session.user_agent}</p>
                                            <p className="text-xs text-neutral-400">
                                                {session.ip_address ?? 'IP desconocida'} · Última actividad: {session.last_activity}
                                            </p>
                                        </div>
                                    </div>
                                    {session.is_current && (
                                        <span className="rounded-full border border-emerald-500/50 px-3 py-0.5 text-xs font-semibold text-emerald-400">
                                            Este dispositivo
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* CERRAR OTRAS SESIONES */}
                    <div className="space-y-6">
                        <HeadingSmall
                            title="Cerrar otras sesiones"
                            description="Cierra la sesión en el resto de dispositivos introduciendo tu contraseña"
                        />

                        <form onSubmit={logoutOthers} className="space-y-6">
                            <div className="grid gap-2">
                                <Label htmlFor="password">Contraseña actual</Label>

                                <Input
                                    id="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    type="password"
                                    className="mt-1 block w-full"
                                    autoComplete="current-password"
                                    placeholder="Contraseña"
                                />

                                <InputError message={errors.password} />
                            </div>

                            <div className="flex items-center gap-4">
                                <Button disabled={processing} className="gap-2">
                                    <ShieldCheck className="h-4 w-4" />
                                    Cerrar otras sesiones
                                </Button>

                                <Transition
                                    show={recentlySuccessful}
                                    enter="transition ease-in-out"
                                    enterFrom="opacity-0"
                                    leave="transition ease-in-out"
                                    leaveTo="opacity-0"
                                >
                                    <p className="text-sm text-emerald-400">Sesiones cerradas.</p>
                                </Transition>
                            </div>
                        </form>
                    </div>

                    {/* HISTORIAL DE ACCESOS */}
                    <div className="space-y-6">
                        <HeadingSmall
                            title="Historial de accesos"
                            description="Últimos inicios de sesión registrados en tu cuenta"
                        />

                        {(loginHistory ?? []).length === 0 ? (
                            <p className="text-sm text-neutral-400">Todavía no hay accesos registrados.</p>
                        ) : (
                            <div className="space-y-2">
                                {loginHistory.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-center justify-between rounded-md border border-pink-500/20 bg-black/40 px-4 py-2 text-sm"
                                    >
                                        <span className="font-semibold">{log.user_agent}</span>
                                        <span className="text-xs text-neutral-400">
                                            {log.ip_address ?? 'IP desconocida'} · {log.created_at}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
