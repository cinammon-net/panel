import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { type BreadcrumbItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import {
    Eye,
    Shield,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import AppLogo from './app-logo';

interface AppHeaderProps {
    breadcrumbs?: BreadcrumbItem[];
}

export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
    const page = usePage<SharedData>();
    const { auth } = page.props as any;
    const getInitials = useInitials();

    const userRoles: string[] = auth?.user?.roles ?? [];
    const isOwner = userRoles.includes('Owner');
    const isAdmin = isOwner || userRoles.includes('Admin') || userRoles.includes('Moderator');

    const [eyeComfort, setEyeComfort] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return window.localStorage.getItem('cinammon_eye_comfort') === '1';
        }
        return false;
    });

    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('eye-comfort', eyeComfort);
            window.localStorage.setItem('cinammon_eye_comfort', eyeComfort ? '1' : '0');
        }
    }, [eyeComfort]);

    return (
        <>
            <header className="border-b border-neutral-200 bg-white font-[Orbitron] transition-colors dark:border-cyan-950 dark:bg-black">
                <div className="mx-auto flex h-16 items-center justify-between px-4 sm:px-6 w-full max-w-7xl">
                    <div className="flex items-center gap-4">
                        {/* Brand Logo */}
                        <Link href="/servers" className="flex items-center gap-2">
                            <AppLogo />
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Botón Acceso a Zona Admin (Solo para Administradores) */}
                        {isAdmin && (
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 rounded-lg border border-purple-500/50 bg-purple-950/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:border-purple-400 hover:bg-purple-900/50 shadow-[0_0_12px_rgba(168,85,247,0.2)] transition-all"
                                title="Ir a la Zona de Administración"
                            >
                                <Shield className="h-3.5 w-3.5 text-purple-400" />
                                <span>Zona Admin</span>
                            </Link>
                        )}

                        {/* Toggle Descanso Visual */}
                        <button
                            type="button"
                            onClick={() => setEyeComfort((v) => !v)}
                            title="Alternar filtro de Descanso Visual"
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
                                eyeComfort
                                    ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
                                    : 'border-neutral-300 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900/80 text-neutral-600 dark:text-slate-300 hover:text-cyan-400'
                            }`}
                        >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{eyeComfort ? 'Descanso: ON' : 'Descanso'}</span>
                        </button>

                        {/* Menú Usuario */}
                        {auth?.user && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-9 w-9 rounded-full p-0.5 border border-cyan-800/50 hover:border-cyan-400 transition">
                                        <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                            <AvatarImage src={auth.user.avatar} alt={auth.user.name} />
                                            <AvatarFallback className="bg-neutral-800 text-xs font-bold text-cyan-300">
                                                {getInitials(auth.user.name)}
                                            </AvatarFallback>
                                        </Avatar>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-56 font-[Orbitron] bg-neutral-950 border-cyan-800" align="end">
                                    <UserMenuContent user={auth.user} />
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </header>

            {breadcrumbs.length > 1 && (
                <div className="border-b border-neutral-200 dark:border-cyan-950/80 bg-neutral-50 dark:bg-neutral-950/40">
                    <div className="mx-auto flex h-10 w-full items-center justify-start px-4 sm:px-6 max-w-7xl">
                        <Breadcrumbs breadcrumbs={breadcrumbs} />
                    </div>
                </div>
            )}
        </>
    );
}
export default AppHeader;
