import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { UserSwitcherModal } from '@/components/user-switcher-modal';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';
import { Link, router } from '@inertiajs/react';
import { ArrowLeftRight, LogOut, Settings, Shield } from 'lucide-react';
import { useState } from 'react';

interface UserMenuContentProps {
    user: User;
}

export function UserMenuContent({ user }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();
    const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    const roles: string[] = (user as any)?.roles ?? [];
    const isAdmin = roles.includes('Owner') || roles.includes('Admin') || roles.includes('Moderator');

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link className="block w-full cursor-pointer" href={route('profile.edit')} as="button" prefetch onClick={cleanup}>
                        <Settings className="mr-2 h-4 w-4" />
                        Perfil y Ajustes
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                    onSelect={(e) => {
                        e.preventDefault();
                        setIsSwitcherOpen(true);
                    }}
                    className="cursor-pointer text-cyan-300 hover:text-cyan-200"
                >
                    <ArrowLeftRight className="mr-2 h-4 w-4 text-cyan-400" />
                    Cambiar de usuario
                </DropdownMenuItem>
                {isAdmin && (
                    <DropdownMenuItem asChild>
                        <Link className="block w-full cursor-pointer text-purple-300 hover:text-purple-200" href="/dashboard" as="button" onClick={cleanup}>
                            <Shield className="mr-2 h-4 w-4 text-purple-400" />
                            Administración
                        </Link>
                    </DropdownMenuItem>
                )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link className="block w-full cursor-pointer text-red-400 hover:text-red-300" method="post" href={route('logout')} as="button" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                </Link>
            </DropdownMenuItem>

            {isSwitcherOpen && (
                <UserSwitcherModal open={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />
            )}
        </>
    );
}
