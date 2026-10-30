import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Link, usePage } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

type NavGroup = 'main' | 'servers' | 'users' | 'advanced' | 'extra';

type NavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
    group: NavGroup;
    groupColor: string;
    roles?: string[];
    permissions?: string[];
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
    const isSponsor = userRoles.includes('Sponsors');
    const isMember = userRoles.includes('Members');

    // Establecer los grupos permitidos según el rol
    let allowedGroups: NavGroup[] = ['main'];
    if (isOwner) {
        allowedGroups = ['main', 'servers', 'users', 'advanced', 'extra'];
    } else if (isAdmin || isModerator) {
        allowedGroups = ['main', 'servers', 'users', 'advanced', 'extra'];
    } else if (isHelper) {
        allowedGroups = ['main', 'servers', 'users', 'advanced'];
    }
    else if (isSponsor) {
        allowedGroups = ['main', 'servers', 'advanced', 'extra'];
    } else if (isMember) {
        allowedGroups = ['main', 'servers', 'extra'];
    }

    const grouped: Record<NavGroup, NavItem[]> = {
        main: [],
        servers: [],
        users: [],
        advanced: [],
        extra: [],
    };

    for (const item of items) {
        const group = item.group;
        const allowedRoles = item.roles ?? [];
        const requiredPermissions = item.permissions ?? [];

        const hasRoleAccess =
            isOwner || allowedRoles.length === 0 || allowedRoles.some((r) => userRoles.includes(r));

        const hasPermissionAccess =
            isOwner || requiredPermissions.every((p) => userPermissions.includes(p));

        if (allowedGroups.includes(group) && hasRoleAccess && hasPermissionAccess) {
            grouped[group].push(item);
        } else {
            console.warn(`⛔ NO SE MOSTRÓ: ${item.title}`);
        }
    }

    return (
        <SidebarGroup className="px-2 py-1">
            {Object.entries(grouped).map(([key, items]) =>
                items.length > 0 ? (
                    <div key={key}>
                        {key !== 'main' && (
                            <SidebarGroupLabel className="mt-3 mb-1 px-2 text-xs font-bold text-pink-500">
                                {key.charAt(0).toUpperCase() + key.slice(1)}
                            </SidebarGroupLabel>
                        )}
                        <SidebarMenu>
                            {items.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={item.href === page.url}
                                        tooltip={{ children: item.title }}
                                    >
                                        <Link href={item.href}>
                                            {item.icon && (
                                                <item.icon
                                                    className={`h-4 w-4 ${item.groupColor ?? 'text-white'}`}
                                                    style={{
                                                        filter: 'drop-shadow(0 0 6px currentColor)',
                                                    }}
                                                />
                                            )}
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </div>
                ) : null,
            )}
        </SidebarGroup>
    );
}

export default NavMain;
