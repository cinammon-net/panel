import { AppWindow, Bot, Box, Code2, Database, Egg, Gamepad2, Globe, Mic, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
    minecraft: Box,
    games: Gamepad2,
    bots: Bot,
    database: Database,
    databases: Database,
    generic: Code2,
    software: AppWindow,
    voice: Mic,
    web: Globe,
};

interface EggIconProps {
    src?: string | null;
    category?: string | null;
    name?: string;
    size?: number;
    className?: string;
}

/** Icono de un egg con respaldo por categoría si no tiene imagen o no carga. */
export default function EggIcon({ src, category, name, size = 32, className = '' }: EggIconProps) {
    const [failed, setFailed] = useState(false);
    const Fallback = CATEGORY_ICONS[(category || '').toLowerCase()] ?? Egg;
    const box = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md ${className}`;

    if (src && !failed) {
        return (
            <img
                src={src}
                alt={name ? `Icono de ${name}` : ''}
                width={size}
                height={size}
                loading="lazy"
                decoding="async"
                onError={() => setFailed(true)}
                className={`${box} object-cover`}
                style={{ width: size, height: size }}
            />
        );
    }

    return (
        <span
            className={`${box} border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-300`}
            style={{ width: size, height: size }}
            aria-hidden="true"
        >
            <Fallback style={{ width: size * 0.6, height: size * 0.6 }} />
        </span>
    );
}
