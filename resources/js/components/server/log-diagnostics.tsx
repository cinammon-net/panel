import { Link } from '@inertiajs/react';
import { AlertOctagon, AlertTriangle, Info, Stethoscope, X } from 'lucide-react';
import { useMemo, useState } from 'react';

type Level = 'error' | 'warning' | 'info';
type Finding = { id: string; level: Level; title: string; detail: string; link?: { href: string; label: string } };

// Quita los códigos de color ANSI para buscar en el texto.
const strip = (s: string) => s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '');

/**
 * Busca en las últimas líneas del registro problemas conocidos de Minecraft y los explica en español.
 * Solo patrones claros, para no asustar con falsos positivos.
 */
function diagnose(logs: string, serverId: number): Finding[] {
    const lines = strip(logs).split('\n').slice(-400);
    const text = lines.join('\n');
    const found: Finding[] = [];
    const add = (f: Finding) => !found.some((x) => x.id === f.id) && found.push(f);
    const base = `/servers/${serverId}`;

    if (/OutOfMemoryError|Java heap space|GC overhead limit exceeded/.test(text)) {
        add({
            id: 'oom',
            level: 'error',
            title: 'Al servidor se le ha acabado la memoria RAM',
            detail: 'Baja la distancia de visión, quita plugins o mods pesados o amplía la RAM de tu plan.',
            link: { href: `${base}/game`, label: 'Ajustes del juego' },
        });
    }

    const java = text.match(/compiled by a more recent version of the Java Runtime \(class file version ([\d.]+)\)|UnsupportedClassVersionError|requires (?:running the server with )?Java (\d+)|Java (\d+) or (?:newer|later|above) is required/i);
    if (java) {
        const needed = java[2] || java[3] || (java[1] ? String(Math.round(parseFloat(java[1])) - 44) : null);
        add({
            id: 'java',
            level: 'error',
            title: `Versión de Java incorrecta${needed ? ` (hace falta Java ${needed})` : ''}`,
            detail: 'El servidor o algún plugin/mod necesita otra versión de Java. Cámbiala en Inicio → imagen de Docker.',
            link: { href: `${base}/startup`, label: 'Cambiar Java' },
        });
    }

    if (/FAILED TO BIND TO PORT|Address already in use|BindException/i.test(text)) {
        add({
            id: 'port',
            level: 'error',
            title: 'El puerto del servidor ya está en uso',
            detail: 'Revisa que server-port en server.properties coincide con el puerto asignado, o que no hay otro proceso usando ese puerto.',
            link: { href: `${base}/network`, label: 'Red y puertos' },
        });
    }

    const missingDep = text.match(/Unknown\/missing dependency plugins: \[([^\]]+)\]|depends on '?([\w-]+)'? which is (?:missing|not installed)|Could not load '?plugins\/([^'\s]+)'?.*?(?:UnknownDependencyException|missing dependency)/s);
    if (missingDep) {
        add({
            id: 'dep',
            level: 'error',
            title: `Falta una dependencia${missingDep[1] || missingDep[2] ? `: ${missingDep[1] || missingDep[2]}` : ''}`,
            detail: 'Algún plugin necesita otro plugin para funcionar. Instálalo desde Plugins → Explorar.',
            link: { href: `${base}/addons`, label: 'Plugins' },
        });
    }

    const badPlugin = text.match(/Could not load '?plugins\/([^'\s]+)'?/);
    if (badPlugin && !found.some((f) => f.id === 'dep')) {
        add({
            id: 'plugin',
            level: 'warning',
            title: `No se ha podido cargar ${badPlugin[1]}`,
            detail: 'Suele ser un plugin para otra versión de Minecraft. Actualízalo o desactívalo.',
            link: { href: `${base}/addons`, label: 'Plugins' },
        });
    }

    const dup = text.match(/Ambiguous plugin name [`']([^`']+)[`']/);
    if (dup) {
        add({
            id: 'dup',
            level: 'warning',
            title: `Plugin duplicado: ${dup[1]}`,
            detail: 'Hay dos archivos del mismo plugin en /plugins. Borra la versión antigua.',
            link: { href: `${base}/addons`, label: 'Plugins' },
        });
    }

    if (/Mod resolution failed|Incompatible mods? (?:found|set)|Missing or unsupported mandatory dependencies|ModLoadingException|requires (?:any version of |version [\d.]+ or later of )?[\w-]+, which is missing/i.test(text)) {
        add({
            id: 'mods',
            level: 'error',
            title: 'Hay mods incompatibles o falta un mod necesario',
            detail: 'Revisa el mensaje justo encima en la consola: indica qué mod falta o qué versión necesita.',
            link: { href: `${base}/addons`, label: 'Mods' },
        });
    }

    if (/session\.lock|already locked|The server is already running|Failed to lock the world/i.test(text)) {
        add({
            id: 'lock',
            level: 'error',
            title: 'El mundo está bloqueado',
            detail: 'El servidor no se cerró bien. Detenlo del todo (Matar) y vuelve a iniciarlo.',
        });
    }

    const lag = lines.filter((l) => /Can't keep up! Is the server overloaded\?/.test(l)).length;
    if (lag >= 3) {
        add({
            id: 'lag',
            level: 'warning',
            title: 'El servidor va con lag',
            detail: `Aviso de sobrecarga ${lag} veces. Baja la distancia de visión/simulación o revisa granjas y plugins pesados.`,
            link: { href: `${base}/game`, label: 'Ajustes del juego' },
        });
    }

    if (/Exception in server tick loop|This crash report has been saved to|Encountered an unexpected exception/.test(text)) {
        add({
            id: 'crash',
            level: 'error',
            title: 'El servidor se ha cerrado por un error',
            detail: 'El informe completo está en la carpeta crash-reports. Suele deberse al último plugin o mod que instalaste.',
            link: { href: `${base}/files`, label: 'Ver archivos' },
        });
    }

    if (/Authentication servers are down|Couldn't verify username because servers are unavailable/.test(lines.slice(-60).join('\n'))) {
        add({
            id: 'mojang',
            level: 'info',
            title: 'Los servidores de Mojang no responden',
            detail: 'Es un fallo temporal de Mojang, no de tu servidor. Prueba a entrar de nuevo en unos segundos.',
        });
    }

    const order: Record<Level, number> = { error: 0, warning: 1, info: 2 };
    return found.sort((a, b) => order[a.level] - order[b.level]).slice(0, 3);
}

const STYLE: Record<Level, { box: string; icon: typeof AlertOctagon; color: string }> = {
    error: { box: 'border-red-500/40 bg-red-500/10', icon: AlertOctagon, color: 'text-red-400' },
    warning: { box: 'border-amber-500/40 bg-amber-500/10', icon: AlertTriangle, color: 'text-amber-400' },
    info: { box: 'border-cyan-500/40 bg-cyan-500/10', icon: Info, color: 'text-cyan-400' },
};

export default function LogDiagnostics({ logs, serverId }: { logs: string; serverId: number }) {
    const [dismissed, setDismissed] = useState<string[]>([]);
    const findings = useMemo(() => diagnose(logs, serverId).filter((f) => !dismissed.includes(f.id)), [logs, serverId, dismissed]);
    if (!findings.length) return null;

    return (
        <section aria-label="Diagnóstico" className="space-y-2">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
                <Stethoscope className="h-3.5 w-3.5" /> Diagnóstico automático
            </p>
            {findings.map((f) => {
                const { box, icon: Icon, color } = STYLE[f.level];
                return (
                    <div key={f.id} className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${box}`}>
                        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white">{f.title}</p>
                            <p className="font-sans text-xs text-neutral-300">{f.detail}</p>
                        </div>
                        {f.link && (
                            <Link href={f.link.href} className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10">
                                {f.link.label}
                            </Link>
                        )}
                        <button type="button" onClick={() => setDismissed((d) => [...d, f.id])} aria-label="Ocultar" className="shrink-0 rounded p-1 text-neutral-400 hover:text-white">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                );
            })}
        </section>
    );
}
