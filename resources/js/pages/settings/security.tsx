import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { KeyRound, Lock, LockOpen, Monitor, ShieldCheck } from 'lucide-react';
import { FormEventHandler } from 'react';

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

type ServerLock = { has_code: boolean; active: boolean; until: string | null; unlocked: boolean };

const formatUntil = (value: string | null) =>
    value ? new Date(value).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' }) : '';

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
                            <Button type="button" variant="outline" size="sm" disabled={relock.processing} onClick={() => relock.post(route('server-lock.relock'), { preserveScroll: true })}>
                                Bloquear ahora
                            </Button>
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
