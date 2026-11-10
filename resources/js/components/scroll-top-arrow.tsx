import { useEffect, useState } from 'react';

/** Flecha para volver arriba (la misma de la página principal). Aparece al bajar un poco. */
export default function ScrollTopArrow() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => setVisible(window.scrollY > 400);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    return (
        <button
            type="button"
            aria-label="Subir arriba"
            title="Subir arriba"
            onClick={() => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })}
            className={`fixed right-4 bottom-4 z-50 p-3 transition-all duration-300 hover:opacity-90 sm:right-6 sm:bottom-6 ${
                visible ? 'pointer-events-auto translate-y-0 animate-bounce opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
            }`}
        >
            <img
                src="https://img.icons8.com/?size=100&id=71020&format=png&color=ff4da6"
                alt=""
                className="h-8 w-8 drop-shadow-[0_0_6px_#ff4da6] sm:h-9 sm:w-9"
                draggable={false}
            />
        </button>
    );
}
