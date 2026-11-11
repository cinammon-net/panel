import { useCallback, useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

const prefersDark = () => {
    if (typeof window === 'undefined') {
        return false;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const setCookie = (name: string, value: string, days = 365) => {
    if (typeof document === 'undefined') {
        return;
    }

    const maxAge = days * 24 * 60 * 60;
    document.cookie = `${name}=${value};path=/;max-age=${maxAge};SameSite=Lax`;
};

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
};

const mediaQuery = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return window.matchMedia('(prefers-color-scheme: dark)');
};

const handleSystemThemeChange = () => {
    const currentAppearance = localStorage.getItem('appearance') as Appearance;
    applyTheme(currentAppearance || 'system');
};

export function applyFont(font: string) {
    if (!font) return;
    document.documentElement.style.setProperty('--app-font', `'${font}', sans-serif`);
    try {
        localStorage.setItem('app-font', font);
    } catch {}

    const systemFonts = [
        'Arial', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Times New Roman',
        'Georgia', 'Courier New', 'Lucida Console', 'Segoe UI',
        'Palatino Linotype', 'Impact', 'Gill Sans', 'Franklin Gothic Medium',
        'Calibri', 'Cambria'
    ];

    let link = document.getElementById('cinammon-font-link') as HTMLLinkElement | null;
    if (!systemFonts.includes(font) && font !== 'Orbitron') {
        if (!link) {
            link = document.createElement('link');
            link.id = 'cinammon-font-link';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        link.href = `https://fonts.googleapis.com/css2?family=${font.replaceAll(' ', '+')}:wght@400;600;700&display=swap`;
    } else if (link && link.parentNode) {
        link.parentNode.removeChild(link);
    }
}

export function initializeFont() {
    try {
        const savedFont = localStorage.getItem('app-font');
        if (savedFont) {
            applyFont(savedFont);
        }
    } catch {}
}

export function initializeTheme() {
    const savedAppearance = (localStorage.getItem('appearance') as Appearance) || 'system';

    applyTheme(savedAppearance);
    initializeFont();

    // Add the event listener for system theme changes...
    mediaQuery()?.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>('system');

    const updateAppearance = useCallback((mode: Appearance) => {
        setAppearance(mode);

        // Store in localStorage for client-side persistence...
        localStorage.setItem('appearance', mode);

        // Store in cookie for SSR...
        setCookie('appearance', mode);

        applyTheme(mode);
    }, []);

    useEffect(() => {
        const savedAppearance = localStorage.getItem('appearance') as Appearance | null;
        updateAppearance(savedAppearance || 'system');

        return () => mediaQuery()?.removeEventListener('change', handleSystemThemeChange);
    }, [updateAppearance]);

    return { appearance, updateAppearance } as const;
}
