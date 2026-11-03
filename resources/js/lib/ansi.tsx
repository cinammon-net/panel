import type { ReactNode } from 'react';

/**
 * Renderiza códigos ANSI SGR básicos (colores 30-37/90-97, brillo, reset) como
 * spans coloreados, para mostrar la salida real de una terminal en la web.
 */
const ANSI_COLORS: Record<number, string> = {
    30: '#6b7280', 31: '#f87171', 32: '#34d399', 33: '#fbbf24',
    34: '#60a5fa', 35: '#e879f9', 36: '#22d3ee', 37: '#e5e7eb',
    90: '#9ca3af', 91: '#fca5a5', 92: '#6ee7b7', 93: '#fde68a',
    94: '#93c5fd', 95: '#f0abfc', 96: '#67e8f9', 97: '#ffffff',
};

const ANSI_BG: Record<number, string> = {
    40: '#111827', 41: '#7f1d1d', 42: '#064e3b', 43: '#78350f',
    44: '#1e3a8a', 45: '#701a75', 46: '#164e63', 47: '#e5e7eb',
};

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[([0-9;]*)m/g;

export function renderAnsi(text: string): ReactNode[] {
    const nodes: ReactNode[] = [];
    let color: string | undefined;
    let background: string | undefined;
    let bold = false;
    let last = 0;
    let key = 0;

    const push = (chunk: string) => {
        if (!chunk) return;
        if (!color && !background && !bold) {
            nodes.push(chunk);
        } else {
            nodes.push(
                <span key={key++} style={{ color, backgroundColor: background, fontWeight: bold ? 700 : undefined }}>
                    {chunk}
                </span>,
            );
        }
    };

    for (const match of text.matchAll(ANSI_RE)) {
        push(text.slice(last, match.index));
        last = (match.index ?? 0) + match[0].length;
        for (const code of (match[1] || '0').split(';').map(Number)) {
            if (code === 0) {
                color = background = undefined;
                bold = false;
            } else if (code === 1) bold = true;
            else if (code === 22) bold = false;
            else if (code === 39) color = undefined;
            else if (code === 49) background = undefined;
            else if (ANSI_COLORS[code]) color = ANSI_COLORS[code];
            else if (ANSI_BG[code]) background = ANSI_BG[code];
        }
    }
    push(text.slice(last));

    return nodes;
}
