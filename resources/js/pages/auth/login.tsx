import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';
import {
  LoaderCircle, UsersRound, Crown, Hammer, ShieldCheck,
  Handshake, Gem, User, ChevronDown, Check
} from 'lucide-react';

import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Listbox } from '@headlessui/react';

function AuthLayout({ description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 font-sans text-white">
            <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-br from-pink-500/10 via-purple-700/10 to-blue-500/10" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,#ff44cc33_1px,transparent_1px)] bg-[length:20px_20px] opacity-10" />
            <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-pink-500/20 p-8 shadow-2xl">
                <div className="animate-spin-slow absolute top-[-50%] left-[-50%] z-[-2] h-[200%] w-[200%] bg-[conic-gradient(from_0deg,#ff44cc,#5500ff,#44ccff,#ff44cc)]" />
                <div className="absolute inset-1 z-[-1] rounded-[0.625rem] bg-black/90" />
                <div className="mb-6 text-center">
                    <div className="mb-4 flex justify-center">
                        <Link href="/">
                            <img src="/favicon.ico" alt="Cinammon.net Logo" className="h-20 sm:h-22" draggable={false} />
                        </Link>
                    </div>
                    <h1 className="font-[Orbitron] text-3xl font-bold tracking-wide text-pink-400">Sign In</h1>
                    {description && <p className="font-[Orbitron] mt-2 text-sm text-pink-200">{description}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

type LoginForm = {
    email: string;
    password: string;
    remember: boolean;
};

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

const roles = [
    { name: 'Owner', email: 'owner@cinammon.net', icon: Crown },
    { name: 'Admin', email: 'admin@cinammon.net', icon: Hammer },
    { name: 'Moderator', email: 'moderator@cinammon.net', icon: ShieldCheck },
    { name: 'Helper', email: 'helper@cinammon.net', icon: Handshake },
    { name: 'Sponsors', email: 'sponsors@cinammon.net', icon: Gem },
    { name: 'Members', email: 'members@cinammon.net', icon: User },
];

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const [selectedRole, setSelectedRole] = useState<typeof roles[0] | null>(null);

    const handleRoleChange = (role: typeof roles[0]) => {
        setSelectedRole(role);
        setData('email', role.email);
        setData('password', 'cinammon');
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout description="Enter your email and password to access the panel" title="">
            <Head title="Login">
                <meta name="description" content="Enter your credentials to access the cinammon.net panel" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <form className="flex flex-col gap-6 font-[Orbitron]" onSubmit={submit}>
                <div className="grid gap-6">
                    {/* ROLE SELECTOR */}
                    <div className="grid gap-2">
                        <Label htmlFor="user-type" className="flex items-center gap-2 text-sm text-white">
                            <UsersRound className="h-4 w-4 text-pink-400" />
                            User Role
                        </Label>
                        <Listbox value={selectedRole} onChange={handleRoleChange}>
                            <div className="relative">
                                <Listbox.Button className="relative w-full cursor-pointer rounded border border-pink-600/30 bg-black/80 py-2 pl-3 pr-10 text-left text-white focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500">
                                    {selectedRole ? (
                                        <div className="flex items-center gap-2">
                                            <selectedRole.icon className="h-4 w-4 text-pink-400" />
                                            {selectedRole.name}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400">Select a role</span>
                                    )}
                                    <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-white" />
                                </Listbox.Button>
                                <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-black shadow-lg ring-1 ring-pink-500 ring-opacity-10 focus:outline-none">
                                    {roles.map((role) => (
                                        <Listbox.Option
                                            key={role.name}
                                            value={role}
                                            className={({ active }) =>
                                                `cursor-pointer select-none px-4 py-2 ${active ? 'bg-pink-600 text-white' : 'text-white'}`
                                            }
                                        >
                                            {({ selected }) => (
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <role.icon className="h-4 w-4 text-pink-400" />
                                                        {role.name}
                                                    </div>
                                                    {selected && <Check className="h-4 w-4 text-pink-300" />}
                                                </div>
                                            )}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </div>
                        </Listbox>
                    </div>

                    {/* EMAIL */}
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="your@email.com"
                            className="border-pink-600/30 bg-black/80 text-white focus:border-pink-500 focus-visible:ring-pink-500"
                        />
                        <InputError message={errors.email} />
                    </div>

                    {/* PASSWORD */}
                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            {canResetPassword && (
                                <TextLink href={route('password.request')} className="ml-auto text-sm text-pink-400 hover:underline">
                                    Forgot your password?
                                </TextLink>
                            )}
                        </div>
                        <Input
                            id="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="********"
                            className="border-pink-600/30 bg-black/80 text-white focus:border-pink-500 focus-visible:ring-pink-500"
                        />
                        <InputError message={errors.password} />
                    </div>

                    {/* REMEMBER ME */}
                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            name="remember"
                            checked={data.remember}
                            onClick={() => setData('remember', !data.remember)}
                        />
                        <Label htmlFor="remember">Remember me</Label>
                    </div>

                    {/* BUTTON */}
                    <Button type="submit" className="mt-4 w-full bg-pink-600 font-[Orbitron] transition-all hover:bg-pink-700" disabled={processing}>
                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Sign in to panel
                    </Button>
                </div>

                {/* REGISTER */}
                <div className="text-center text-sm text-pink-300 mt-6">
                    Don’t have an account?{' '}
                    <TextLink href={route('register')} className="text-pink-400 hover:underline">
                        Register
                    </TextLink>
                </div>

                {status && <div className="mt-4 text-center text-sm font-medium text-green-500">{status}</div>}
            </form>
        </AuthLayout>
    );
}
