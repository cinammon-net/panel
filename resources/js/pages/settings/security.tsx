import InputError from '@/components/input-error';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Monitor, ShieldCheck } from 'lucide-react';
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
