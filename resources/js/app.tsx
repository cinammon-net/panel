import '../css/app.css';
import './lib/cinammon-fx.css';
import './lib/cinammon-fx.js'; // ojo para ver contraseñas y animaciones en todas las páginas

import { createInertiaApp, router } from '@inertiajs/react';
import axios from 'axios';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { initServerIntro } from './lib/server-intro';

const appName = import.meta.env.VITE_APP_NAME || 'Cinammon';

/*
 * Token CSRF del panel en cada petición (X-CSRF-TOKEN) y en la etiqueta meta. Laravel lo prefiere a la cookie
 * XSRF-TOKEN, que puede venir repetida desde la tienda (.cinammon.net) y daba "419 Page Expired".
 */
function setCsrf(token: unknown) {
    if (typeof token !== 'string' || token === '') return;
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token;
    document.querySelector('meta[name="csrf-token"]')?.setAttribute('content', token);
}
router.on('navigate', (event) => setCsrf(event.detail.page.props.csrf_token));

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        setCsrf(props.initialPage.props.csrf_token);
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
