import { router, usePage } from '@inertiajs/react';
import { KeyRound, Link2, Unlink } from 'lucide-react';

// Logos de marca de bootstrap-icons (MIT), en un solo color como el resto de iconos de línea.
const PATHS: Record<string, string[]> = {
    discord: [
        'M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612',
    ],
    google: [
        'M15.545 6.558a9.4 9.4 0 0 1 .139 1.626c0 2.434-.87 4.492-2.384 5.885h.002C11.978 15.292 10.158 16 8 16A8 8 0 1 1 8 0a7.7 7.7 0 0 1 5.352 2.082l-2.284 2.284A4.35 4.35 0 0 0 8 3.166c-2.087 0-3.86 1.408-4.492 3.304a4.8 4.8 0 0 0 0 3.063h.003c.635 1.893 2.405 3.301 4.492 3.301 1.078 0 2.004-.276 2.722-.764h-.003a3.7 3.7 0 0 0 1.599-2.431H8v-3.08z',
    ],
    microsoft: ['M7.462 0H0v7.19h7.462zM16 0H8.538v7.19H16zM7.462 8.211H0V16h7.462zm8.538 0H8.538V16H16z'],
    github: [
        'M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8',
    ],
    gitlab: [
        'm15.734 6.1-.022-.058L13.534.358a.57.57 0 0 0-.563-.356.6.6 0 0 0-.328.122.6.6 0 0 0-.193.294l-1.47 4.499H5.025l-1.47-4.5A.572.572 0 0 0 2.47.358L.289 6.04l-.022.057A4.044 4.044 0 0 0 1.61 10.77l.007.006.02.014 3.318 2.485 1.64 1.242 1 .755a.67.67 0 0 0 .814 0l1-.755 1.64-1.242 3.338-2.5.009-.007a4.05 4.05 0 0 0 1.34-4.668Z',
    ],
    twitch: [
        'M3.857 0 1 2.857v10.286h3.429V16l2.857-2.857H9.57L14.714 8V0zm9.714 7.429-2.285 2.285H9l-2 2v-2H4.429V1.143h9.142z',
        'M11.857 3.143h-1.143V6.57h1.143zm-3.143 0H7.571V6.57h1.143z',
    ],
    cloudflare: [
        'M11.006 11.23c.098-.338.06-.647-.104-.877-.15-.21-.403-.333-.708-.347l-5.773-.075a.104.104 0 0 1-.089-.048.105.105 0 0 1-.014-.104c.019-.056.075-.098.135-.103l5.824-.075c.69-.033 1.44-.591 1.703-1.276l.332-.867a.17.17 0 0 0 .01-.075C11.945 5.01 10.382 3.667 8.502 3.667c-1.731 0-3.208 1.122-3.728 2.678a1.77 1.77 0 0 0-1.237-.347 1.837 1.837 0 0 0-1.642 1.642c-.01.155 0 .305.028.454C.85 8.127 0 9.004 0 10.083c0 .099.009.197.019.295.01.047.047.085.098.085h10.706a.14.14 0 0 0 .127-.094l.056-.197z',
        'M12.793 8.204c-.051 0-.107 0-.16.005a.104.104 0 0 0-.084.065l-.225.783c-.098.338-.06.647.103.877.15.211.403.333.708.347l1.228.075c.037 0 .07.019.089.047.019.028.023.066.014.104-.019.056-.075.098-.135.103l-1.28.075c-.694.033-1.44.591-1.702 1.276l-.094.238c-.019.047.014.094.066.094h4.398a.115.115 0 0 0 .113-.085c.075-.267.117-.548.117-.844 0-1.708-1.394-3.093-3.156-3.093z',
    ],
};

export function BrandIcon({ provider, className = 'h-4 w-4' }: { provider: string; className?: string }) {
    return (
        <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden="true">
            {(PATHS[provider] ?? []).map((d) => (
                <path key={d.slice(0, 12)} d={d} />
            ))}
        </svg>
    );
}

type Provider = { key: string; name: string };

/** Botones "Entrar con ..." (login y registro). No se muestra nada si no hay proveedores configurados. */
export function SocialLogin({ label = 'O entra con' }: { label?: string }) {
    const { socialProviders = [], errors } = usePage<{ socialProviders?: Provider[]; errors: Record<string, string> }>().props;
    if (!socialProviders.length) return null;

    return (
        <div className="grid gap-3">
            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-pink-300/70">
                <span className="h-px flex-1 bg-pink-600/30" />
                {label}
                <span className="h-px flex-1 bg-pink-600/30" />
            </div>
            <div className={`grid gap-2 ${socialProviders.length > 1 ? 'grid-cols-2' : ''}`}>
                {socialProviders.map((p) => (
                    // Enlace normal (no Inertia): el proveedor hace su propia redirección.
                    <a
                        key={p.key}
                        href={`/auth/${p.key}/redirect`}
                        className="flex items-center justify-center gap-2 rounded border border-pink-600/30 bg-black/80 px-3 py-2 text-sm text-white transition-colors hover:border-pink-500 hover:bg-pink-600/10"
                    >
                        <BrandIcon provider={p.key} />
                        {p.name}
                    </a>
                ))}
            </div>
            {errors?.social && <p className="text-center text-sm text-red-400">{errors.social}</p>}
        </div>
    );
}

/** Ajustes → Perfil: vincular o desvincular proveedores. */
export function LinkedAccounts({ connections }: { connections: Record<string, boolean> }) {
    const { socialProviders = [], errors, flash } = usePage<{ socialProviders?: Provider[]; errors: Record<string, string>; flash?: { discordCode?: string } }>().props;
    const names: Record<string, string> = {
        discord: 'Discord',
        google: 'Google',
        microsoft: 'Microsoft',
        github: 'GitHub',
        cloudflare: 'Cloudflare',
        gitlab: 'GitLab',
        twitch: 'Twitch',
    };
    const enabled = new Set(socialProviders.map((p) => p.key));
    // Se muestran los configurados y los que ya tenías vinculados aunque se hayan desactivado.
    // Discord siempre: se puede vincular con un código y /vincular aunque no haya OAuth.
    const keys = Object.keys(names).filter((k) => k === 'discord' || enabled.has(k) || connections[k]);
    const code = flash?.discordCode;

    return (
        <div className="space-y-4">
            <div>
                <h3 className="mb-0.5 text-base font-medium">Cuentas vinculadas</h3>
                <p className="text-sm text-muted-foreground">Entra con un clic y, con Discord, recibe tus roles y usa el bot.</p>
            </div>
            <div className="divide-y divide-pink-600/20 rounded-lg border border-pink-600/30">
                {keys.map((k) => (
                    <div key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <BrandIcon provider={k} className="h-5 w-5" />
                            <div>
                                <p className="text-sm font-medium">{names[k]}</p>
                                <p className="text-xs text-muted-foreground">{connections[k] ? 'Vinculada' : 'Sin vincular'}</p>
                            </div>
                        </div>
                        {connections[k] ? (
                            <button
                                type="button"
                                onClick={() => router.delete(`/auth/${k}`, { preserveScroll: true })}
                                className="flex items-center gap-1.5 rounded border border-red-500/40 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
                            >
                                <Unlink className="h-3.5 w-3.5" />
                                Desvincular
                            </button>
                        ) : (
                            <div className="flex items-center gap-2">
                                {k === 'discord' && (
                                    <button
                                        type="button"
                                        onClick={() => router.post('/settings/profile/discord-code', {}, { preserveScroll: true })}
                                        className="flex items-center gap-1.5 rounded border border-pink-500/40 px-3 py-1.5 text-xs text-pink-200 hover:bg-pink-500/10"
                                    >
                                        <KeyRound className="h-3.5 w-3.5" />
                                        Código para el bot
                                    </button>
                                )}
                                {enabled.has(k) && (
                                    <a href={`/auth/${k}/redirect`} className="flex items-center gap-1.5 rounded border border-pink-500/40 px-3 py-1.5 text-xs text-pink-200 hover:bg-pink-500/10">
                                        <Link2 className="h-3.5 w-3.5" />
                                        Vincular
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {code && !connections.discord && (
                <div className="rounded-lg border border-pink-500/40 bg-pink-500/5 px-4 py-3 text-sm">
                    <p>
                        Escribe esto en cualquier canal del Discord de Cinammon (caduca en 15 minutos):
                    </p>
                    <p className="mt-2 select-all font-mono text-base tracking-wider text-pink-200">/vincular codigo:{code}</p>
                </div>
            )}
            {errors?.social && <p className="text-sm text-red-400">{errors.social}</p>}
        </div>
    );
}
