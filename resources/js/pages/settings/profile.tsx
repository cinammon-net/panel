import { type BreadcrumbItem, type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { ChangeEvent, FormEventHandler, useRef, useState } from 'react';

import BirthdaySettings, { type BirthdayInfo } from '@/components/birthday-settings';
import DeleteUser from '@/components/delete-user';
import { LinkedAccounts } from '@/components/social-login';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: '/settings/profile',
    },
];

type ProfileForm = {
    name: string;
    email: string;
}

export default function Profile({ mustVerifyEmail, status, connections = {}, birthday }: { mustVerifyEmail: boolean; status?: string; connections?: Record<string, boolean>; birthday?: BirthdayInfo }) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm<Required<ProfileForm>>({
        name: auth.user.name,
        email: auth.user.email,
    });

    // ── Foto de perfil ────────────────────────────────────────────────
    const fileInput = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const uploadAvatar = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setPreview(URL.createObjectURL(file));
        setAvatarError(null);
        setUploading(true);

        const formData = new FormData();
        formData.append('avatar', file);

        router.post(route('profile.avatar.update'), formData, {
            preserveScroll: true,
            forceFormData: true,
            onError: (errs) => setAvatarError(errs.avatar ?? 'No se pudo subir la imagen.'),
            onFinish: () => {
                setUploading(false);
                setPreview(null);
                if (fileInput.current) fileInput.current.value = '';
            },
        });
    };

    const removeAvatar = () => {
        router.delete(route('profile.avatar.destroy'), { preserveScroll: true });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'), {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Profile information" description="Update your name and email address" />

                    {/* FOTO DE PERFIL */}
                    <div className="flex items-center gap-5 rounded-lg border border-pink-500/30 bg-black/40 p-4">
                        <div className="relative">
                            {preview || auth.user.avatar ? (
                                <img
                                    src={preview ?? auth.user.avatar ?? ''}
                                    alt={auth.user.name}
                                    className="h-20 w-20 rounded-full border-2 border-pink-500/50 object-cover"
                                />
                            ) : (
                                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-pink-500/50 bg-neutral-800 text-2xl font-bold text-pink-400">
                                    {auth.user.name?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 text-xs text-white">
                                    Subiendo…
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-white">Foto de perfil</p>
                            <p className="text-xs text-neutral-400">JPG, PNG, WebP o GIF · máx. 2 MB</p>
                            <div className="flex gap-2">
                                <Button type="button" size="sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
                                    <Camera className="mr-1 h-4 w-4" />
                                    Cambiar foto
                                </Button>
                                {auth.user.avatar && (
                                    <Button type="button" size="sm" variant="destructive" onClick={removeAvatar}>
                                        <Trash2 className="mr-1 h-4 w-4" />
                                        Quitar
                                    </Button>
                                )}
                            </div>
                            {avatarError && <p className="text-xs text-red-400">{avatarError}</p>}
                            <input
                                ref={fileInput}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={uploadAvatar}
                            />
                        </div>
                    </div>

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>

                            <Input
                                id="name"
                                className="mt-1 block w-full"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Full name"
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block w-full"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Email address"
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <div>
                                <p className="text-muted-foreground -mt-4 text-sm">
                                    Your email address is unverified.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                    >
                                        Click here to resend the verification email.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="mt-2 text-sm font-medium text-green-600">
                                        A new verification link has been sent to your email address.
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button disabled={processing}>Save</Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-sm text-neutral-600">Saved</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                {birthday && <BirthdaySettings birthday={birthday} />}

                <LinkedAccounts connections={connections} />

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
