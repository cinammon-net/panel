import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link, usePage } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export type NavGroup = 'principal' | 'comunidad' | 'infraestructura' | 'gestion' | 'ajustes';

export type NavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    group: NavGroup;
    groupColor?: string;
    roles?: string[];
    permissions?: string[];
    /** Navegación completa (sin Inertia): rutas que redirigen a otro dominio o descargas. */
    external?: boolean;
    badge?: string;
};

export interface NavGroupMeta {
    title: string;
    dotColor: string;
}

export const NAV_GROUPS_CONFIG: Record<NavGroup, NavGroupMeta> = {
    principal: {
        title: 'Principal',
        dotColor: 'bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]',
    },
    comunidad: {
        title: 'Comunidad & Soporte',
        dotColor: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    },
    infraestructura: {
        title: 'Servidores & Infraestructura',
        dotColor: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]',
    },
    gestion: {
        title: 'Gestión & Administración',
        dotColor: 'bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.6)]',
    },
    ajustes: {
        title: 'Sistema & Ajustes',
        dotColor: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
    },
};

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const page = usePage();
    const { auth } = page.props as {
        auth?: {
            user?: {
                roles?: string[];
                permissions?: string[];
            };
        };
    };

    const userRoles: string[] = auth?.user?.roles ?? [];
    const userPermissions: string[] = auth?.user?.permissions ?? [];

    const isOwner = userRoles.includes('Owner');
    const isAdmin = userRoles.includes('Admin');
    const isModerator = userRoles.includes('Moderator');
    const isHelper = userRoles.includes('Helper');

    // Grupos permitidos por nivel de rol
    const allowedGroups: NavGroup[] = isOwner || isAdmin || isModerator
        ? ['principal', 'comunidad', 'infraestructura', 'gestion', 'ajustes']
        : isHelper
          ? ['principal', 'comunidad', 'infraestructura', 'gestion', 'ajustes']
          : ['principal', 'comunidad', 'ajustes'];

    const grouped: Record<NavGroup, NavItem[]> = {
        principal: [],
        comunidad: [],
        infraestructura: [],
        gestion: [],
        ajustes: [],
    };

    for (const item of items) {
        const group = item.group;
        if (!grouped[group]) continue;

        const allowedRoles = item.roles ?? [];
        const requiredPermissions = item.permissions ?? [];

        const hasRoleAccess =
            isOwner || allowedRoles.length === 0 || allowedRoles.some((r) => userRoles.includes(r));

        const hasPermissionAccess =
            isOwner || requiredPermissions.length === 0 || requiredPermissions.every((p) => userPermissions.includes(p));

        if (allowedGroups.includes(group) && hasRoleAccess && hasPermissionAccess) {
            grouped[group].push(item);
        }
    }

    const currentUrl = page.url;

    const isItemActive = (href: string) => {
        if (href === currentUrl) return true;
        if (href !== '/' && href !== '/dashboard' && currentUrl.startsWith(href)) return true;
        return false;
    };

    return (
        <div className="space-y-4 px-2 py-1 font-sans">
            {Object.entries(grouped).map(([key, groupItems]) => {
                if (groupItems.length === 0) return null;
                const groupKey = key as NavGroup;
                const meta = NAV_GROUPS_CONFIG[groupKey];

                return (
                    <SidebarGroup key={key} className="p-0">
                        <SidebarGroupLabel className="mb-1.5 px-2.5 text-[10px] font-bold tracking-widest uppercase text-neutral-400 select-none">
                            <span className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 rounded-full ${meta.dotColor}`} />
                                <span>{meta.title}</span>
                            </span>
                        </SidebarGroupLabel>

                        <SidebarMenu className="space-y-0.5">
                            {groupItems.map((item) => {
                                const active = isItemActive(item.href);

                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={active}
                                            tooltip={{ children: item.title }}
                                            className={`group/btn relative flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                                                active
                                                    ? 'bg-yellow-500/15 text-yellow-300 font-semibold shadow-[0_0_15px_rgba(234,179,8,0.12)] border border-yellow-500/40'
                                                    : 'text-neutral-300 hover:bg-neutral-900/90 hover:text-white hover:border-neutral-800 border border-transparent'
                                            }`}
                                        >
                                            {item.href.startsWith('http') ? (
                                                <a href={item.href} target="_blank" rel="noopener noreferrer">
                                                    {item.icon && (
                                                        <item.icon
                                                            className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:scale-110 ${
                                                                active ? 'text-yellow-400' : item.groupColor ?? 'text-neutral-400'
                                                            }`}
                                                            style={{
                                                                filter: active ? 'drop-shadow(0 0 6px rgba(250,204,21,0.6))' : 'none',
                                                            }}
                                                        />
                                                    )}
                                                    <span className="truncate">{item.title}</span>
                                                    {item.badge && (
                                                        <span className="ml-auto rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </a>
                                            ) : item.external ? (
                                                <a href={item.href}>
                                                    {item.icon && (
                                                        <item.icon
                                                            className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:scale-110 ${
                                                                active ? 'text-yellow-400' : item.groupColor ?? 'text-neutral-400'
                                                            }`}
                                                            style={{
                                                                filter: active ? 'drop-shadow(0 0 6px rgba(250,204,21,0.6))' : 'none',
                                                            }}
                                                        />
                                                    )}
                                                    <span className="truncate">{item.title}</span>
                                                    {item.badge && (
                                                        <span className="ml-auto rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </a>
                                            ) : (
                                                <Link href={item.href}>
                                                    {item.icon && (
                                                        <item.icon
                                                            className={`h-4 w-4 shrink-0 transition-transform duration-200 group-hover/btn:scale-110 ${
                                                                active ? 'text-yellow-400' : item.groupColor ?? 'text-neutral-400'
                                                            }`}
                                                            style={{
                                                                filter: active ? 'drop-shadow(0 0 6px rgba(250,204,21,0.6))' : 'none',
                                                            }}
                                                        />
                                                    )}
                                                    <span className="truncate">{item.title}</span>
                                                    {item.badge && (
                                                        <span className="ml-auto rounded-full bg-yellow-500/20 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </Link>
                                            )}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                );
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                );
            })}
        </div>
    );
}
