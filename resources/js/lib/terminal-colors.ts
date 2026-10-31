/**
 * Terminal ANSI & Pterodactyl Log Colorizer
 * Converts ANSI escape sequences and server log syntax into colored HTML.
 */

const ANSI_COLORS: Record<number, string> = {
    // Standard 8 colors
    30: '#1e293b', // Black / Dark Slate
    31: '#f87171', // Red
    32: '#4ade80', // Green
    33: '#facc15', // Yellow
    34: '#60a5fa', // Blue
    35: '#f472b6', // Magenta / Pink
    36: '#22d3ee', // Cyan
    37: '#f8fafc', // White

    // Bright 8 colors
    90: '#94a3b8', // Bright Black / Gray
    91: '#fca5a5', // Bright Red
    92: '#86efac', // Bright Green
    93: '#fef08a', // Bright Yellow
    94: '#93c5fd', // Bright Blue
    95: '#fbcfe8', // Bright Magenta
    96: '#67e8f9', // Bright Cyan
    97: '#ffffff', // Bright White
};

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function colorizeLogs(rawLogs: string): string {
    if (!rawLogs) return '';

    const lines = rawLogs.split('\n');
    const coloredLines = lines.map((line) => {
        // Strip out any residual npm spinner loops or leading spinner junk
        line = line.replace(/^[\s\\|\/\-]+(?=[a-zA-Z0-9\[\(])/, '');
        if (/^[\s\\|\/\-]+$/.test(line)) {
            return '';
        }

        // 1. If line has ANSI escape codes, parse them
        if (line.includes('\x1b') || line.includes('\u001b')) {
            return parseAnsiLine(line);
        }

        // 2. Otherwise apply Pterodactyl-style semantic log coloring (matches Bexx Studios)
        const safe = escapeHtml(line);

        // Server marked as starting line -> Yellow/Gold
        if (safe.includes('Server marked as starting...')) {
            return `<span style="color: #facc15; font-weight: 600;">${safe}</span>`;
        }

        // Shell prompt line
        if (safe.startsWith(':/home/container$') || safe.includes(':/home/container$')) {
            return safe.replace(
                ':/home/container$',
                '<span style="color: #22d3ee; font-weight: 600;">:/home/container$</span>'
            );
        }

        // NPM notice
        if (safe.startsWith('npm notice') || safe.includes('npm notice')) {
            return `<span style="color: #38bdf8;">${safe}</span>`;
        }

        // NPM warn / warnings
        if (safe.startsWith('npm warn') || safe.includes('npm warn') || safe.includes('DeprecationWarning')) {
            return `<span style="color: #facc15;">${safe}</span>`;
        }

        // NPM ERR / Error
        if (safe.startsWith('npm ERR!') || safe.includes('npm ERR!') || safe.includes('Error:')) {
            return `<span style="color: #f87171; font-weight: 600;">${safe}</span>`;
        }

        // Audit & packages
        if (safe.includes('audited') || safe.includes('up to date')) {
            return `<span style="color: #4ade80;">${safe}</span>`;
        }
        if (safe.includes('vulnerabilities')) {
            return `<span style="color: #fbbf24;">${safe}</span>`;
        }

        // Bot Ready / Success
        if (safe.includes('READY!') || safe.includes('en línea')) {
            return `<span style="color: #4ade80; font-weight: 600;">${safe}</span>`;
        }

        // Custom tags like [INFO], [GuildProtection], [CinammonBot/V2]
        if (safe.includes('[INFO]')) {
            return safe.replace(
                /\[INFO\]/g,
                '<span style="color: #22d3ee; font-weight: 600;">[INFO]</span>'
            );
        }
        if (safe.includes('[WARN]')) {
            return safe.replace(
                /\[WARN\]/g,
                '<span style="color: #facc15; font-weight: 600;">[WARN]</span>'
            );
        }
        if (safe.includes('[ERROR]')) {
            return safe.replace(
                /\[ERROR\]/g,
                '<span style="color: #f87171; font-weight: 600;">[ERROR]</span>'
            );
        }
        if (safe.includes('[GuildProtection]')) {
            return safe.replace(
                /\[GuildProtection\]/g,
                '<span style="color: #34d399; font-weight: 600;">[GuildProtection]</span>'
            );
        }

        // Generic bracket tags like [2026-10-31 ...] or [SomeTag]
        if (/^\[[^\]]+\]/.test(safe)) {
            return safe.replace(
                /^(\[[^\]]+\])/,
                '<span style="color: #94a3b8; font-weight: 500;">$1</span>'
            );
        }

        return safe;
    });

    return coloredLines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n');
}

function parseAnsiLine(line: string): string {
    // Regex matches ANSI sequences like \x1b[32m, \x1b[1;33m, \x1b[0m
    const ansiRegex = /(?:\x1b|\u001b)\[([0-9;]*)m/g;
    let result = '';
    let currentColor = '';
    let isBold = false;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = ansiRegex.exec(line)) !== null) {
        const textBefore = line.substring(lastIndex, match.index);
        if (textBefore) {
            result += wrapSpan(escapeHtml(textBefore), currentColor, isBold);
        }
        lastIndex = ansiRegex.lastIndex;

        const codes = match[1] ? match[1].split(';').map(Number) : [0];
        for (const code of codes) {
            if (code === 0) {
                currentColor = '';
                isBold = false;
            } else if (code === 1) {
                isBold = true;
            } else if (code === 22) {
                isBold = false;
            } else if (ANSI_COLORS[code]) {
                currentColor = ANSI_COLORS[code];
            }
        }
    }

    const remaining = line.substring(lastIndex);
    if (remaining) {
        result += wrapSpan(escapeHtml(remaining), currentColor, isBold);
    }

    return result;
}

function wrapSpan(text: string, color: string, bold: boolean): string {
    if (!color && !bold) return text;
    const styles: string[] = [];
    if (color) styles.push(`color: ${color}`);
    if (bold) styles.push(`font-weight: 600`);
    return `<span style="${styles.join('; ')}">${text}</span>`;
}
