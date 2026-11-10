import { useEffect, useState } from 'react';

/** URL utilizable de una foto de perfil: las subidas se guardan como "avatars/x.png" y se sirven en /storage/. */
export function avatarUrl(src?: string | null): string | null {
    const value = (src || '').trim();
    if (!value) return null;
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('/') || value.startsWith('data:') || value.startsWith('blob:')) return value;
    return `/storage/${value.replace(/^\/+/, '')}`;
}

/** Iniciales (máx. 2) para cuando la persona no tiene foto. */
export function initialsOf(name?: string | null): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const letters = parts.length === 1 ? parts[0].slice(0, 1) : parts[0][0] + parts[parts.length - 1][0];
    return letters.toUpperCase();
}

interface Props {
    name?: string | null;
    src?: string | null;
    /** Tamaño en px (cuadrado). */
    size?: number;
    className?: string;
    /** Clases del círculo con las iniciales (color de fondo/texto). */
    fallbackClassName?: string;
    title?: string;
}

/**
 * Foto de perfil de un usuario con las iniciales como respaldo (si no tiene foto o no carga).
 * Se usa en todo el panel para que cada persona se vea igual en todas partes.
 */
export default function UserAvatar({ name, src, size = 32, className = '', fallbackClassName = 'bg-pink-700 text-white', title }: Props) {
    const url = avatarUrl(src);
    const [failed, setFailed] = useState(false);
    useEffect(() => setFailed(false), [url]);

    const style = { width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) };

    if (url && !failed) {
        return (
            <img
                src={url}
                alt={name ? `Foto de ${name}` : ''}
                title={title ?? name ?? undefined}
                onError={() => setFailed(true)}
                loading="lazy"
                draggable={false}
                referrerPolicy="no-referrer"
                style={style}
                className={`shrink-0 rounded-full object-cover ${className}`}
            />
        );
    }

    return (
        <span
            title={title ?? name ?? undefined}
            aria-label={name ?? undefined}
            style={style}
            className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold uppercase select-none ${fallbackClassName} ${className}`}
        >
            {initialsOf(name)}
        </span>
    );
}
