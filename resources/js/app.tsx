import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { initServerIntro } from './lib/server-intro';

const appName = import.meta.env.VITE_APP_NAME || 'Cinammon';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();

// Pantalla de entrada al abrir un servidor (icono y nombre del egg).
initServerIntro();
