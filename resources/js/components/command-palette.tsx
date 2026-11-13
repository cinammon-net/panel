import { router, usePage } from '@inertiajs/react';
import {
    Activity,
    BookOpen,
    Boxes,
    Cpu,
    CreditCard,
    Database,
    Egg,
    Eye,
    FolderGit2,
    HardDrive,
    HelpCircle,
    Key,
    Layers,
    LayoutDashboard,
    LifeBuoy,
    Lightbulb,
    Lock,
    LogOut,
    Mail,
    Megaphone,
    Palette,
    PlusCircle,
    Radio,
    Search,
    Server,
    Shield,
    ShieldCheck,
    Sparkles,
    Star,
    Ticket,
    User,
    Users,
    Webhook,
    Wrench,
    X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface PaletteItem {
    id: string;
    title: string;
    description?: string;
    icon: React.ComponentType<{ className?: string }>;
    href?: string;
    action?: () => void;
    adminOnly?: boolean;
    category: 'Navegación' | 'Servidores' | 'Comunidad' | 'Ajustes y Cuenta' | 'Administración' | 'Acciones';
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { auth } = usePage<{ auth?: { user?: { roles?: string[] } | null } }>().props;
    const userRoles = auth?.user?.roles ?? [];
    const isAdmin = userRoles.includes('Owner') || userRoles.includes('Admin');

    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const items: PaletteItem[] = useMemo(
        () => [
            // Navegación principal
            {
                id: 'dashboard',
                title: 'Dashboard',
                description: 'Panel de control principal y resumen de actividad',
                icon: LayoutDashboard,
                href: '/dashboard',
                category: 'Navegación',
            },
            {
                id: 'servers',
                title: 'Mis Servidores',
                description: 'Ver todos tus servidores de juegos y su estado',
                icon: Server,
                href: '/servers',
                category: 'Servidores',
            },
            {
                id: 'create-server',
                title: 'Crear Servidor',
                description: 'Desplegar un nuevo servidor de juego o bot',
                icon: PlusCircle,
                href: '/servers/create',
                category: 'Servidores',
            },
            {
                id: 'status',
                title: 'Estado de la Red en Vivo',
                description: 'Monitor en tiempo real de nodos, Wings y latencia',
                icon: Activity,
                href: '/estado',
                category: 'Navegación',
            },
            {
                id: 'billing',
                title: 'Tienda y Facturación',
                description: 'Planes, monedas, compras y suscripciones',
                icon: CreditCard,
                href: '/billing/redirect',
                category: 'Navegación',
            },

            // Comunidad y soporte
            {
                id: 'tickets',
                title: 'Tickets de Soporte',
                description: 'Abrir una consulta con el equipo técnico',
                icon: Ticket,
                href: '/tickets',
                category: 'Comunidad',
            },
            {
                id: 'guides',
                title: 'Guías en Vídeo',
                description: 'Tutoriales paso a paso y configuración de servidores',
                icon: BookOpen,
                href: '/guias',
                category: 'Comunidad',
            },
            {
                id: 'community-questions',
                title: 'Dudas de la Comunidad',
                description: 'Preguntas y respuestas sincronizadas con Discord',
                icon: HelpCircle,
                href: '/dudas',
                category: 'Comunidad',
            },
            {
                id: 'suggestions',
                title: 'Sugerencias',
                description: 'Propón ideas y vota las mejoras para Cinammon',
                icon: Lightbulb,
                href: '/sugerencias',
                category: 'Comunidad',
            },
            {
                id: 'reviews',
                title: 'Reseñas de Usuarios',
                description: 'Opiniones y valoraciones de la comunidad',
                icon: Star,
                href: '/reviews',
                category: 'Comunidad',
            },
            {
                id: 'mails',
                title: 'Mis Correos Recibidos',
                description: 'Historial de correos y avisos del sistema',
                icon: Mail,
                href: '/correos',
                category: 'Comunidad',
            },
            {
                id: 'friends-corner',
                title: 'Rincón de Amigos',
                description: 'Sección especial para miembros con rol Amigo',
                icon: Sparkles,
                href: '/amigos',
                category: 'Comunidad',
            },

            // Ajustes
            {
                id: 'settings-profile',
                title: 'Ajustes de Perfil',
                description: 'Nombre, avatar y correo electrónico',
                icon: User,
                href: '/settings/profile',
                category: 'Ajustes y Cuenta',
            },
            {
                id: 'settings-security',
                title: 'Seguridad y 2FA',
                description: 'Doble factor de autenticación, sesiones y bloqueo',
                icon: Lock,
                href: '/settings/security',
                category: 'Ajustes y Cuenta',
            },
            {
                id: 'settings-appearance',
                title: 'Apariencia y Tipografía',
                description: 'Personaliza la fuente y estética del panel',
                icon: Palette,
                href: '/settings/appearance',
                category: 'Ajustes y Cuenta',
            },

            // Acciones rápidas
            {
                id: 'toggle-comfort',
                title: 'Alternar Descanso Visual',
                description: 'Activar o desactivar el filtro de descanso ocular',
                icon: Eye,
                action: () => {
                    const current = window.localStorage.getItem('cinammon_eye_comfort') === '1';
                    const next = !current;
                    document.documentElement.classList.toggle('eye-comfort', next);
                    window.localStorage.setItem('cinammon_eye_comfort', next ? '1' : '0');
                },
                category: 'Acciones',
            },

            // Administración
            {
                id: 'admin-nodes',
                title: 'Gestor de Nodos',
                description: 'Servidores dedicados y daemon de Wings',
                icon: Cpu,
                href: '/nodes',
                adminOnly: true,
                category: 'Administración',
            },
            {
                id: 'admin-users',
                title: 'Gestor de Usuarios',
                description: 'Roles, permisos y cuentas registradas',
                icon: Users,
                href: '/users',
                adminOnly: true,
                category: 'Administración',
            },
            {
                id: 'admin-eggs',
                title: 'Eggs y Plantillas',
                description: 'Configuraciones de juegos (Minecraft, Node, Rust...)',
                icon: Egg,
                href: '/eggs',
                adminOnly: true,
                category: 'Administración',
            },
            {
                id: 'admin-updates',
                title: 'Actualizaciones del Sistema',
                description: 'Estado de releases y actualizaciones de panel y Wings',
                icon: Wrench,
                href: '/updates',
                adminOnly: true,
                category: 'Administración',
            },
            {
                id: 'admin-oauth',
                title: 'Inicio Social (OAuth)',
                description: 'Configurar Discord, Google, Cloudflare, etc.',
                icon: ShieldCheck,
                href: '/auth-providers',
                adminOnly: true,
                category: 'Administración',
            },
            {
                id: 'admin-announcements',
                title: 'Anuncios y Banners',
                description: 'Publicar noticias y ofertas en la web y panel',
                icon: Megaphone,
                href: '/announcements',
                adminOnly: true,
                category: 'Administración',
            },
            {
                id: 'admin-maintenance',
                title: 'Mantenimientos',
                description: 'Avisos de mantenimiento programado y paradas',
                icon: Radio,
                href: '/maintenance',
                adminOnly: true,
                category: 'Administración',
            },
            {
                id: 'admin-health',
                title: 'Diagnóstico y Salud',
                description: 'Métricas de CPU, memoria y salud del panel',
                icon: Activity,
                href: '/health',
                adminOnly: true,
                category: 'Administración',
            },
        ],
        []
    );

    // Filtrar por texto y por permisos de admin
    const filteredItems = useMemo(() => {
        const cleanQuery = query.toLowerCase().trim();
        return items.filter((item) => {
            if (item.adminOnly && !isAdmin) return false;
            if (!cleanQuery) return true;
            return (
                item.title.toLowerCase().includes(cleanQuery) ||
                (item.description && item.description.toLowerCase().includes(cleanQuery)) ||
                item.category.toLowerCase().includes(cleanQuery)
            );
        });
    }, [items, query, isAdmin]);

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const executeItem = (item: PaletteItem) => {
        onClose();
        if (item.action) {
            item.action();
        } else if (item.href) {
            if (item.href.startsWith('http')) {
                window.open(item.href, '_blank');
            } else {
                router.visit(item.href);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const item = filteredItems[selectedIndex];
            if (item) executeItem(item);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
            {/* Backdrop oscuro con blur */}
            <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Caja modal del Command Palette */}
            <div
                className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-pink-500/30 bg-[#0c0c0e] shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_35px_rgba(236,72,153,0.15)] animate-in fade-in-0 zoom-in-95"
                onKeyDown={handleKeyDown}
            >
                {/* Cabecera con input de búsqueda */}
                <div className="flex items-center border-b border-neutral-800/80 px-4 py-3">
                    <Search className="h-4 w-4 shrink-0 text-pink-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Buscar sección, acción o ajuste... (ej: servidores, 2fa, estado)"
                        className="ml-3 w-full bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
                    />
                    <kbd className="hidden rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-400 sm:inline-block">
                        ESC
                    </kbd>
                </div>

                {/* Lista de resultados */}
                <div className="max-h-[380px] overflow-y-auto p-2">
                    {filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-sm text-neutral-500">
                            No se encontraron resultados para «{query}»
                        </div>
                    ) : (
                        filteredItems.map((item, index) => {
                            const isSelected = index === selectedIndex;
                            const IconComponent = item.icon;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => executeItem(item)}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 transition-all ${
                                        isSelected
                                            ? 'bg-pink-500/15 text-pink-300 border border-pink-500/30 shadow-sm'
                                            : 'text-neutral-300 hover:bg-neutral-900 border border-transparent'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                                isSelected
                                                    ? 'border-pink-500/50 bg-pink-500/20 text-pink-300'
                                                    : 'border-neutral-800 bg-neutral-900 text-neutral-400'
                                            }`}
                                        >
                                            <IconComponent className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-xs sm:text-sm text-white truncate">
                                                {item.title}
                                            </div>
                                            {item.description && (
                                                <div className="text-[11px] text-neutral-400 truncate">
                                                    {item.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <span
                                        className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            isSelected
                                                ? 'bg-pink-500/20 text-pink-300'
                                                : 'bg-neutral-800/80 text-neutral-500'
                                        }`}
                                    >
                                        {item.category}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer del Command Palette */}
                <div className="flex items-center justify-between border-t border-neutral-800/60 bg-black/40 px-4 py-2 text-[11px] text-neutral-500">
                    <div className="flex items-center gap-2">
                        <span>Navegar: <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5">↑</kbd> <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5">↓</kbd></span>
                        <span>·</span>
                        <span>Seleccionar: <kbd className="rounded border border-neutral-700 bg-neutral-800 px-1 py-0.5">↵</kbd></span>
                    </div>
                    <span className="font-mono text-pink-400/80">Cinammon Spotlight</span>
                </div>
            </div>
        </div>
    );
}
