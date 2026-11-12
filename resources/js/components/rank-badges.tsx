import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useEffect, useId, useState } from 'react';

export interface Badge {
    name: string;
    kind: 'rank' | 'auto' | 'staff' | 'special';
    color: string;
    icon: string;
    hint: string | null;
    expires_at: string | null;
}

export interface RoleMeta {
    key: string;
    name: string;
    kind: 'rank' | 'auto' | 'staff' | 'special' | 'default';
    color: string;
    secondary: string;
    icon: string;
    label: string;
}

export const ROLE_META_LIST: RoleMeta[] = [
    // Rangos VIP comprables (10 iconos originales diseñados a medida)
    { key: 'chispa', name: 'Chispa', kind: 'rank', color: '#f59e0b', secondary: '#fde047', icon: 'sparkles', label: 'Rango VIP' },
    { key: 'neon', name: 'Neón', kind: 'rank', color: '#e879f9', secondary: '#f43f5e', icon: 'zap', label: 'Rango VIP' },
    { key: 'synthwave', name: 'Synthwave', kind: 'rank', color: '#d946ef', secondary: '#fb923c', icon: 'audio-waveform', label: 'Rango VIP' },
    { key: 'cibercanela', name: 'Cibercanela', kind: 'rank', color: '#fb7185', secondary: '#f59e0b', icon: 'flame', label: 'Rango VIP' },
    { key: 'leyenda', name: 'Leyenda Cinammon', kind: 'rank', color: '#facc15', secondary: '#ec4899', icon: 'crown', label: 'Rango VIP' },
    { key: 'arquitecto', name: 'Arquitecto de Mundos', kind: 'rank', color: '#34d399', secondary: '#a7f3d0', icon: 'blocks', label: 'Rango VIP' },
    { key: 'comandante', name: 'Comandante de Clan', kind: 'rank', color: '#f97316', secondary: '#facc15', icon: 'swords', label: 'Rango VIP' },
    { key: 'creador', name: 'Creador de Contenido', kind: 'rank', color: '#f43f5e', secondary: '#c084fc', icon: 'video', label: 'Rango VIP' },
    { key: 'desarrollador', name: 'Desarrollador', kind: 'rank', color: '#818cf8', secondary: '#e879f9', icon: 'code', label: 'Rango VIP' },
    { key: 'mecenas', name: 'Mecenas', kind: 'rank', color: '#eab308', secondary: '#f472b6', icon: 'gem', label: 'Rango VIP' },

    // Roles automáticos por servicios
    { key: 'cliente', name: 'Cliente Cinammon', kind: 'auto', color: '#a78bfa', secondary: '#f472b6', icon: 'badge-check', label: 'Insignia Automática' },
    { key: 'minecraft', name: 'Constructor', kind: 'auto', color: '#4ade80', secondary: '#bef264', icon: 'box', label: 'Insignia Automática' },
    { key: 'games', name: 'Gamer', kind: 'auto', color: '#f472b6', secondary: '#c084fc', icon: 'gamepad-2', label: 'Insignia Automática' },
    { key: 'bots', name: 'Domador de Bots', kind: 'auto', color: '#a855f7', secondary: '#f472b6', icon: 'bot', label: 'Insignia Automática' },
    { key: 'database', name: 'Guardián de Datos', kind: 'auto', color: '#c084fc', secondary: '#818cf8', icon: 'database', label: 'Insignia Automática' },
    { key: 'voice', name: 'Voz de la Comunidad', kind: 'auto', color: '#10b981', secondary: '#6ee7b7', icon: 'mic', label: 'Insignia Automática' },
    { key: 'web', name: 'Webmaster', kind: 'auto', color: '#fbbf24', secondary: '#fb7185', icon: 'globe', label: 'Insignia Automática' },
    { key: 'software', name: 'Tecnomante', kind: 'auto', color: '#818cf8', secondary: '#c084fc', icon: 'app-window', label: 'Insignia Automática' },
    { key: 'coleccionista', name: 'Coleccionista', kind: 'auto', color: '#fb923c', secondary: '#fde047', icon: 'layers', label: 'Insignia Automática' },
    { key: 'veterano', name: 'Veterano', kind: 'auto', color: '#e879f9', secondary: '#facc15', icon: 'medal', label: 'Insignia Automática' },

    // Reconocimiento que solo concede el Owner
    { key: 'amigo', name: 'Amigo de Cinammon', kind: 'special', color: '#38bdf8', secondary: '#f472b6', icon: 'amigo', label: 'Amigo de Cinammon' },

    // Staff y sistema
    { key: 'owner', name: 'Owner', kind: 'staff', color: '#facc15', secondary: '#f43f5e', icon: 'owner', label: 'Staff' },
    { key: 'admin', name: 'Admin', kind: 'staff', color: '#f43f5e', secondary: '#fb923c', icon: 'shield', label: 'Staff' },
    { key: 'members', name: 'Members', kind: 'default', color: '#a1a1aa', secondary: '#e4e4e7', icon: 'users', label: 'Miembro' },
];

export function getRoleMeta(roleName: string): RoleMeta {
    const lower = (roleName || '').trim().toLowerCase();
    const found = ROLE_META_LIST.find((r) => r.name.toLowerCase() === lower || r.key === lower);
    if (found) return found;
    return {
        key: 'default',
        name: roleName,
        kind: 'default',
        color: '#f472b6',
        secondary: '#c084fc',
        icon: 'shield',
        label: 'Rol',
    };
}

/**
 * Iconos vectoriales originales diseñados exclusivamente para los rangos VIP y roles de Cinammon.
 * Cada emblema combina geometría cyberpunk, gradientes propios y siluetas únicas.
 */
export function RankIcon({
    icon,
    role,
    className = 'h-4 w-4',
}: {
    icon?: string;
    role?: string;
    className?: string;
}) {
    const uid = useId().replace(/:/g, '');
    const meta = role ? getRoleMeta(role) : ROLE_META_LIST.find((r) => r.icon === icon || r.key === icon) ?? ROLE_META_LIST[4];
    const key = icon || meta.icon;
    const c1 = meta.color;
    const c2 = meta.secondary;

    return (
        <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
            <defs>
                <linearGradient id={`rg-${uid}`} x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor={c2} />
                    <stop offset="55%" stopColor={c1} />
                    <stop offset="100%" stopColor={c2} />
                </linearGradient>
                <radialGradient id={`rc-${uid}`} cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="60%" stopColor={c2} stopOpacity="0.85" />
                    <stop offset="100%" stopColor={c1} stopOpacity="0" />
                </radialGradient>
            </defs>

            {/* 1. CHISPA — Núcleo de Plasma Estelar en Anillo Orbital */}
            {(key === 'sparkles' || key === 'chispa') && (
                <>
                    <polygon points="16,2 28,16 16,30 4,16" stroke={`url(#rg-${uid})`} strokeWidth="1.6" strokeDasharray="3 1.5" fill={c1} fillOpacity="0.12" />
                    <path d="M16 3L19.2 12.8L29 16L19.2 19.2L16 29L12.8 19.2L3 16L12.8 12.8L16 3Z" fill={`url(#rg-${uid})`} />
                    <path d="M7 7L13 13M25 7L19 13M7 25L13 19M25 25L19 19" stroke={c2} strokeWidth="1.6" strokeLinecap="round" />
                    <circle cx="16" cy="16" r="4" fill={`url(#rc-${uid})`} />
                    <circle cx="7" cy="7" r="1.5" fill={c2} />
                    <circle cx="25" cy="7" r="1.5" fill={c2} />
                    <circle cx="7" cy="25" r="1.5" fill={c2} />
                    <circle cx="25" cy="25" r="1.5" fill={c2} />
                </>
            )}

            {/* 2. NEÓN — Prisma Cyber-Pulso de Doble Rayo */}
            {(key === 'zap' || key === 'neon') && (
                <>
                    <polygon points="16,2 28,9 28,23 16,30 4,23 4,9" stroke={`url(#rg-${uid})`} strokeWidth="1.8" fill={c1} fillOpacity="0.14" />
                    <path d="M18.5 3.5L7.5 17H15.5L13 28.5L24.5 14.5H16.5L18.5 3.5Z" fill={`url(#rg-${uid})`} stroke="#ffffff" strokeWidth="0.8" strokeLinejoin="round" />
                    <path d="M4 13H8M24 19H28" stroke={c2} strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="16" cy="16" r="2.3" fill="#ffffff" />
                </>
            )}

            {/* 3. SYNTHWAVE — Horizonte Outrun + Sol Cibernético + Ondas */}
            {(key === 'audio-waveform' || key === 'synthwave') && (
                <>
                    <circle cx="16" cy="14" r="9.5" fill={`url(#rg-${uid})`} />
                    <path d="M5 13.5H27M5 16.5H27M6 19.5H26" stroke="#090414" strokeWidth="1.5" />
                    <path d="M2 23H30" stroke={c2} strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M4 28L11 23M28 28L21 23M16 23V29" stroke={c1} strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M8 12L11 8L14 13L16 6L18 13L21 9L24 12" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}

            {/* 4. CIBERCANELA — Llama Espiral de Canela & Circuito */}
            {(key === 'flame' || key === 'cibercanela') && (
                <>
                    <path
                        d="M16 2.5C16 2.5 25.5 9.5 25.5 18.5C25.5 24.3 21.2 29 16 29C10.8 29 6.5 24.3 6.5 18.5C6.5 14 9.5 10.5 11.5 8.5C11.2 12 13.5 13.5 14.5 12C15.8 10 14.2 5.8 16 2.5Z"
                        fill={`url(#rg-${uid})`}
                    />
                    <path
                        d="M16 12.5C19.5 12.5 21.5 15.2 21.5 18.5C21.5 21.5 19 24 16 24C13.5 24 11.8 22.2 11.8 19.8C11.8 17.8 13.4 16.4 15.2 16.4C16.8 16.4 17.8 17.5 17.5 19C17.2 20.2 15.8 20.5 15 19.6"
                        stroke="#090414"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <circle cx="16" cy="19" r="2.2" fill="#ffffff" />
                    <circle cx="8" cy="7" r="1.3" fill={c2} />
                    <circle cx="24" cy="7" r="1.3" fill={c2} />
                </>
            )}

            {/* 5. LEYENDA CINAMMON — Corona Soberana Alada con Gemas Levitantes */}
            {(key === 'crown' || key === 'leyenda' || key === 'owner') && (
                <>
                    <path d="M16 2L18.5 6.5L16 9.5L13.5 6.5L16 2Z" fill={c2} />
                    <path
                        d="M3.5 11L9.5 17.5L16 9.5L22.5 17.5L28.5 11L25.5 24.5H6.5L3.5 11Z"
                        fill={`url(#rg-${uid})`}
                        stroke="#ffffff"
                        strokeWidth="0.9"
                        strokeLinejoin="round"
                    />
                    <rect x="6" y="26" width="20" height="3" rx="1.5" fill={c1} />
                    <circle cx="16" cy="17.5" r="2.2" fill="#ffffff" />
                    <circle cx="10" cy="20" r="1.4" fill={c2} />
                    <circle cx="22" cy="20" r="1.4" fill={c2} />
                    <circle cx="4" cy="8.5" r="1.3" fill={c2} />
                    <circle cx="28" cy="8.5" r="1.3" fill={c2} />
                </>
            )}

            {/* 6. ARQUITECTO DE MUNDOS — Teseracto Voxel Isométrico Levitante */}
            {(key === 'blocks' || key === 'arquitecto') && (
                <>
                    <polygon points="16,3 27,9.5 27,22.5 16,29 5,22.5 5,9.5" fill={c1} fillOpacity="0.18" stroke={`url(#rg-${uid})`} strokeWidth="1.6" />
                    <polygon points="16,3 27,9.5 16,16 5,9.5" fill={`url(#rg-${uid})`} fillOpacity="0.85" />
                    <polygon points="5,9.5 16,16 16,29 5,22.5" fill={c1} fillOpacity="0.65" />
                    <polygon points="27,9.5 16,16 16,29 27,22.5" fill={c2} fillOpacity="0.45" />
                    <polygon points="16,9 21.5,12.2 16,15.5 10.5,12.2" fill="#ffffff" />
                    <path d="M16 16V29M5 9.5L16 16L27 9.5" stroke="#090414" strokeWidth="1.4" />
                </>
            )}

            {/* 7. COMANDANTE DE CLAN — Escudo Táctico + Alabardas de Plasma Cruzadas */}
            {(key === 'swords' || key === 'comandante') && (
                <>
                    <path d="M5 5L27 27M27 5L5 27" stroke={c2} strokeWidth="2.4" strokeLinecap="round" />
                    <polygon points="4,4 9,5 5,9" fill={c2} />
                    <polygon points="28,4 23,5 27,9" fill={c2} />
                    <path
                        d="M16 5.5L24.5 9V16.5C24.5 22 20.8 26.2 16 28C11.2 26.2 7.5 22 7.5 16.5V9L16 5.5Z"
                        fill={`url(#rg-${uid})`}
                        stroke="#ffffff"
                        strokeWidth="1"
                    />
                    <path d="M12 15.5L16 11.5L20 15.5L16 22.5L12 15.5Z" fill="#090414" />
                    <circle cx="16" cy="16" r="2" fill="#ffffff" />
                </>
            )}

            {/* 8. CREADOR DE CONTENIDO — Lente Holográfica & Prisma de Emisión */}
            {(key === 'video' || key === 'creador') && (
                <>
                    <circle cx="16" cy="16" r="12" stroke={`url(#rg-${uid})`} strokeWidth="1.8" strokeDasharray="5 2.5" fill={c1} fillOpacity="0.12" />
                    <circle cx="16" cy="16" r="8.5" fill={`url(#rg-${uid})`} />
                    <polygon points="13.5,11.5 21.5,16 13.5,20.5" fill="#ffffff" />
                    <circle cx="24.5" cy="7.5" r="2.2" fill="#f43f5e" stroke="#ffffff" strokeWidth="0.9" />
                </>
            )}

            {/* 9. DESARROLLADOR — Núcleo Cuántico Neural & Matriz de Código */}
            {(key === 'code' || key === 'desarrollador') && (
                <>
                    <rect x="7" y="7" width="18" height="18" rx="4" fill={`url(#rg-${uid})`} stroke="#ffffff" strokeWidth="0.9" />
                    <path d="M11 3V7M16 3V7M21 3V7M11 25V29M16 25V29M21 25V29M3 11H7M3 16H7M3 21H7M25 11H29M25 16H29M25 21H29" stroke={c2} strokeWidth="1.8" strokeLinecap="round" />
                    <path d="M13 12.5L9.8 16L13 19.5M19 12.5L22.2 16L19 19.5M17 11.5L15 20.5" stroke="#090414" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}

            {/* 10. MECENAS — Reliquia Imperial de Diamante Astral & Halo Dorado */}
            {(key === 'gem' || key === 'mecenas') && (
                <>
                    <circle cx="16" cy="16" r="13" stroke={c1} strokeWidth="1.3" strokeDasharray="2 2" />
                    <polygon points="10,6 22,6 28,13 16,28 4,13" fill={`url(#rg-${uid})`} stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" />
                    <path d="M4 13H28M10 6L13 13L16 28L19 13L22 6" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.75" strokeLinejoin="round" />
                    <circle cx="16" cy="11" r="2" fill="#ffffff" />
                </>
            )}

            {/* ROLES AUTOMÁTICOS Y STAFF CON ICONOS VECTORIALES ORIGINALES */}
            {key === 'badge-check' && (
                <>
                    <polygon points="16,2.5 20.5,6 26,6.5 27.5,12 30,16 27.5,20 26,25.5 20.5,26 16,29.5 11.5,26 6,25.5 4.5,20 2,16 4.5,12 6,6.5 11.5,6" fill={`url(#rg-${uid})`} />
                    <path d="M11.5 16.2L14.5 19.2L21 12.8" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}
            {key === 'box' && (
                <>
                    <polygon points="16,3.5 27,9.5 27,22.5 16,28.5 5,22.5 5,9.5" fill={`url(#rg-${uid})`} />
                    <path d="M5 9.5L16 15.5L27 9.5M16 15.5V28.5" stroke="#090414" strokeWidth="2" />
                    <polygon points="16,5.5 23.5,9.5 16,13.5 8.5,9.5" fill="#ffffff" fillOpacity="0.45" />
                </>
            )}
            {key === 'gamepad-2' && (
                <>
                    <path d="M7 10H25C27.5 10 29.5 12.5 29 15.5L27.5 23C27 25.5 24.5 26.5 22.5 24.5L19.5 21.5H12.5L9.5 24.5C7.5 26.5 5 25.5 4.5 23L3 15.5C2.5 12.5 4.5 10 7 10Z" fill={`url(#rg-${uid})`} />
                    <path d="M10 13.5V18.5M7.5 16H12.5" stroke="#090414" strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="21.5" cy="14.5" r="1.5" fill="#ffffff" />
                    <circle cx="24" cy="17" r="1.5" fill="#ffffff" />
                </>
            )}
            {key === 'bot' && (
                <>
                    <line x1="16" y1="3" x2="16" y2="8" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
                    <circle cx="16" cy="3" r="2" fill="#ffffff" />
                    <rect x="5" y="8" width="22" height="18" rx="5" fill={`url(#rg-${uid})`} />
                    <circle cx="11.5" cy="16" r="2.5" fill="#ffffff" />
                    <circle cx="20.5" cy="16" r="2.5" fill="#ffffff" />
                    <path d="M11.5 22H20.5" stroke="#090414" strokeWidth="2.2" strokeLinecap="round" />
                </>
            )}
            {key === 'database' && (
                <>
                    <ellipse cx="16" cy="7.5" rx="10" ry="4" fill={`url(#rg-${uid})`} />
                    <path d="M6 12.5C6 14.7 10.5 16.5 16 16.5C21.5 16.5 26 14.7 26 12.5V17.5C26 19.7 21.5 21.5 16 21.5C10.5 21.5 6 19.7 6 17.5V12.5Z" fill={c1} />
                    <path d="M6 21.5C6 23.7 10.5 25.5 16 25.5C21.5 25.5 26 23.7 26 21.5V25C26 27.2 21.5 29 16 29C10.5 29 6 27.2 6 25V21.5Z" fill={`url(#rg-${uid})`} />
                    <circle cx="21" cy="15" r="1.2" fill="#ffffff" />
                    <circle cx="21" cy="24" r="1.2" fill="#ffffff" />
                </>
            )}
            {key === 'mic' && (
                <>
                    <rect x="11" y="4" width="10" height="15" rx="5" fill={`url(#rg-${uid})`} />
                    <path d="M7 15C7 20 11 23.5 16 23.5C21 23.5 25 20 25 15M16 23.5V28M11 28H21" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
                </>
            )}
            {key === 'globe' && (
                <>
                    <circle cx="16" cy="16" r="12" stroke={`url(#rg-${uid})`} strokeWidth="2.2" fill={c1} fillOpacity="0.18" />
                    <ellipse cx="16" cy="16" rx="5.5" ry="12" stroke={c2} strokeWidth="1.8" />
                    <path d="M4.5 12.5H27.5M4.5 19.5H27.5" stroke={c1} strokeWidth="1.8" />
                </>
            )}
            {key === 'app-window' && (
                <>
                    <rect x="4" y="6" width="24" height="20" rx="4" fill={`url(#rg-${uid})`} />
                    <path d="M4 12H28" stroke="#090414" strokeWidth="2" />
                    <circle cx="8" cy="9" r="1.2" fill="#ffffff" />
                    <circle cx="11.5" cy="9" r="1.2" fill="#ffffff" />
                    <path d="M12 17L15 19.5L12 22M17 22H21" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}
            {key === 'layers' && (
                <>
                    <polygon points="16,4 28,10 16,16 4,10" fill={`url(#rg-${uid})`} />
                    <path d="M4 16L16 22L28 16M4 21.5L16 27.5L28 21.5" stroke={c2} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}
            {(key === 'amigo' || key === 'heart-handshake') && (
                <>
                    <path
                        d="M16 27.5C16 27.5 4 20.6 4 12.4C4 8.3 7.1 5 11 5C13.2 5 15 6.1 16 7.8C17 6.1 18.8 5 21 5C24.9 5 28 8.3 28 12.4C28 20.6 16 27.5 16 27.5Z"
                        fill={`url(#rg-${uid})`}
                        stroke="#ffffff"
                        strokeWidth="1"
                        strokeLinejoin="round"
                    />
                    <path d="M16 11.5L17.3 14.7L20.5 16L17.3 17.3L16 20.5L14.7 17.3L11.5 16L14.7 14.7Z" fill="#ffffff" />
                </>
            )}
            {key === 'medal' && (
                <>
                    <path d="M10 3L14 11H18L22 3" stroke={c2} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="16" cy="19.5" r="8.5" fill={`url(#rg-${uid})`} stroke="#ffffff" strokeWidth="1" />
                    <polygon points="16,14 17.7,17.5 21.5,18 18.7,20.6 19.4,24.4 16,22.5 12.6,24.4 13.3,20.6 10.5,18 14.3,17.5" fill="#ffffff" />
                </>
            )}
            {key === 'shield' && (
                <>
                    <path d="M16 3.5L26.5 7.5V16C26.5 22.2 22 26.8 16 29C10 26.8 5.5 22.2 5.5 16V7.5L16 3.5Z" fill={`url(#rg-${uid})`} />
                    <path d="M12 16L15 19L21 13" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </>
            )}
            {key === 'users' && (
                <>
                    <circle cx="12" cy="11" r="4" fill={`url(#rg-${uid})`} />
                    <circle cx="21" cy="12" r="3" fill={c2} />
                    <path d="M5 25C5 20.8 8.2 18 12 18C15.8 18 19 20.8 19 25" fill={`url(#rg-${uid})`} />
                    <path d="M18 25C18 21.8 20.2 19.5 23 19.5C25.5 19.5 27.5 21.8 27.5 25" stroke={c2} strokeWidth="2.2" strokeLinecap="round" />
                </>
            )}
        </svg>
    );
}

export function RoleBadge({ role, size = 'sm' }: { role: string; size?: 'xs' | 'sm' | 'md' }) {
    const meta = getRoleMeta(role);
    const isVip = meta.kind === 'rank';
    const isStaff = meta.kind === 'staff';
    const sizeCls =
        size === 'xs'
            ? 'px-2 py-0.5 text-[9px] gap-1'
            : size === 'md'
              ? 'px-3 py-1 text-xs gap-1.5'
              : 'px-2.5 py-0.5 text-[10px] gap-1.5';
    const iconCls = size === 'xs' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

    return (
        <span
            title={`${meta.label}: ${meta.name}`}
            className={`inline-flex items-center rounded-full border font-[Orbitron] font-bold tracking-wide ${sizeCls} ${
                isVip || isStaff ? 'uppercase' : ''
            }`}
            style={{
                color: meta.color,
                borderColor: `${meta.color}${isVip || isStaff ? '99' : '66'}`,
                backgroundColor: `${meta.color}${isVip || isStaff ? '24' : '14'}`,
                boxShadow: isVip || isStaff ? `0 0 10px ${meta.color}45` : undefined,
            }}
        >
            <RankIcon icon={meta.icon} role={meta.name} className={iconCls} />
            <span>{role}</span>
        </span>
    );
}

const COMPACT_KEY = 'cinammon_badges_compact';

/**
 * Insignias del usuario: rangos comprados (con icono original y brillo) y roles automáticos.
 * Por defecto van comprimidas (solo iconos, el nombre al pasar el ratón); se pueden desplegar y se recuerda.
 */
export default function RankBadges({ max = 6 }: { max?: number }) {
    const { badges = [], billingUrl } = usePage<{ badges?: Badge[]; billingUrl?: string }>().props;
    const hasRank = badges.some((b) => b.kind === 'rank');
    // Con el rango más alto (el Owner lo tiene siempre) no hay nada que mejorar.
    const isTop = badges.some((b) => b.name === 'Leyenda Cinammon');

    const [compact, setCompact] = useState(true);
    useEffect(() => {
        try {
            setCompact(localStorage.getItem(COMPACT_KEY) !== '0');
        } catch {
            /* sin almacenamiento: comprimidas */
        }
    }, []);
    const toggle = () =>
        setCompact((v) => {
            try {
                localStorage.setItem(COMPACT_KEY, v ? '0' : '1');
            } catch {
                /* sin almacenamiento */
            }
            return !v;
        });

    const shown = compact ? badges : badges.slice(0, max);
    const rest = badges.length - shown.length;
    const titleOf = (b: Badge) => {
        const until = b.expires_at ? ` · hasta ${new Date(b.expires_at).toLocaleDateString('es-ES')}` : '';
        return b.kind === 'rank'
            ? `Rango VIP ${b.name}${until}`
            : b.kind === 'special'
              ? `${b.name} · ${b.hint ?? 'lo concede el Owner'}${until}`
              : `${b.name} · ${b.hint ?? 'insignia automática'}`;
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2 group-data-[collapsible=icon]:hidden" aria-label="Tus rangos e insignias">
            {shown.map((b) => {
                // Los rangos VIP y el rol Amigo llevan brillo; las insignias automáticas no.
                const isRank = b.kind === 'rank' || b.kind === 'special';
                const style = {
                    color: b.color,
                    borderColor: `${b.color}${isRank ? '99' : '66'}`,
                    backgroundColor: `${b.color}${isRank ? '26' : '14'}`,
                    boxShadow: isRank ? `0 0 10px ${b.color}55` : undefined,
                };
                if (compact) {
                    return (
                        <span key={b.name} title={titleOf(b)} aria-label={b.name} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition hover:scale-110" style={style}>
                            <RankIcon icon={b.icon} role={b.name} className="h-4 w-4" />
                        </span>
                    );
                }
                return (
                    <span
                        key={b.name}
                        title={titleOf(b)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-[Orbitron] text-[9px] font-bold tracking-wide ${
                            isRank ? 'uppercase' : ''
                        }`}
                        style={style}
                    >
                        <RankIcon icon={b.icon} role={b.name} className="h-3.5 w-3.5 shrink-0" />
                        <span>{b.name}</span>
                    </span>
                );
            })}
            {rest > 0 && <span className="px-1 text-[9px] text-neutral-500">+{rest}</span>}
            {badges.length > 0 && (
                <button
                    type="button"
                    onClick={toggle}
                    title={compact ? 'Ver los nombres' : 'Comprimir'}
                    aria-label={compact ? 'Ver los nombres de tus insignias' : 'Comprimir tus insignias'}
                    aria-expanded={!compact}
                    className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-white/5 hover:text-fuchsia-400"
                >
                    <ChevronDown className={`h-4 w-4 transition-transform ${compact ? '' : 'rotate-180'}`} />
                </button>
            )}
            {billingUrl && !isTop && (
                <a
                    href={`${billingUrl}/store/ranks`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={hasRank ? 'Mejorar mi rango' : 'Conseguir un rango VIP'}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md border border-yellow-500/50 bg-yellow-500/10 px-2 py-1 text-center font-[Orbitron] text-[10px] font-bold text-yellow-300 transition hover:bg-yellow-400 hover:text-black"
                >
                    <RankIcon icon="crown" role="Leyenda Cinammon" className="h-3.5 w-3.5 shrink-0" />
                    <span>{hasRank ? 'Mejorar mi rango' : 'Conseguir un rango VIP'}</span>
                </a>
            )}
        </div>
    );
}
