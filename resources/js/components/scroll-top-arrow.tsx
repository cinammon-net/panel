import { ChevronUp } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Flecha para volver arriba con diseño cyber glassmorphism. Aparece al bajar un poco. */
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
            className={`fixed right-4 bottom-4 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-pink-500/40 bg-black/80 backdrop-blur-md text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all duration-300 hover:bg-pink-500 hover:text-white hover:scale-110 sm:right-6 sm:bottom-6 sm:h-12 sm:w-12 ${
                visible ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
            }`}
        >
            <ChevronUp className="h-5 w-5" />
        </button>
    );
}
