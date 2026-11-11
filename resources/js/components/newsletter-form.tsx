import { Mail } from 'lucide-react';
import { type FormEvent, useState } from 'react';

// Lo atiende el Worker cinammon-mail (carpeta mail/ del monorepo).
const ENDPOINT = 'https://mail.cinammon.net/newsletter/subscribe';

export default function NewsletterForm({ source = 'landing' }: { source?: string }) {
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState(''); // trampa para bots: siempre vacío
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    async function submit(e: FormEvent) {
        e.preventDefault();
        setSending(true);
        setMessage(null);
        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source, website }),
            });
            const data = await res.json().catch(() => ({}));
            setMessage(data.message ?? 'No se ha podido completar la suscripción. Inténtalo más tarde.');
            if (res.ok) setEmail('');
        } catch {
            setMessage('No se ha podido completar la suscripción. Inténtalo más tarde.');
        } finally {
            setSending(false);
        }
    }

    return (
        <form onSubmit={submit} className="flex w-full flex-col gap-2">
            <h3 className="mb-1 flex items-center gap-2 font-semibold text-white">
                <Mail className="h-4 w-4" aria-hidden /> Novedades por correo
            </h3>
            <p className="text-neutral-400">Ofertas, eventos y cambios importantes. Sin spam.</p>
            <input
                type="text"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                className="hidden"
            />
            <div className="flex gap-2">
                <label htmlFor="newsletter-email" className="sr-only">
                    Correo electrónico
                </label>
                <input
                    id="newsletter-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-white placeholder:text-neutral-500 focus:border-fuchsia-500 focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={sending}
                    className="rounded-md bg-fuchsia-600 px-3 py-2 font-medium text-white transition hover:bg-fuchsia-500 disabled:opacity-60"
                >
                    {sending ? 'Enviando…' : 'Suscribirme'}
                </button>
            </div>
            {message && (
                <p role="status" className="text-xs text-neutral-400">
                    {message}
                </p>
            )}
        </form>
    );
}
