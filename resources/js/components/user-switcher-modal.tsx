import { router, usePage } from '@inertiajs/react';
import { ArrowLeftRight, Check, Shield, User as UserIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface SwitchableUser {
    id: number;
    name: string;
    email: string;
    avatar?: string | null;
    roles?: string[];
}

interface UserSwitcherModalProps {
    open: boolean;
    onClose: () => void;
}

export function UserSwitcherModal({ open, onClose }: UserSwitcherModalProps) {
    const { auth } = usePage().props as any;
    const currentUserId = auth?.user?.id;

    const [users, setUsers] = useState<SwitchableUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [switchingId, setSwitchingId] = useState<number | null>(null);

    useEffect(() => {
        if (open) {
            setLoading(true);
            fetch('/api/switchable-users')
                .then((res) => res.json())
                .then((data) => {
                    setUsers(Array.isArray(data) ? data : []);
                })
                .catch(() => {
                    toast.error('Error cargando lista de usuarios');
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [open]);

    if (!open) return null;

    const handleSwitch = (user: SwitchableUser) => {
        if (user.id === currentUserId) {
            onClose();
            return;
        }

        setSwitchingId(user.id);
        router.post(
            '/api/switch-user',
            { user_id: user.id },
            {
                preserveScroll: false,
                onSuccess: () => {
                    toast.success(`Sesión cambiada a ${user.name}`);
                    onClose();
                },
                onError: () => {
                    toast.error('No se pudo cambiar de usuario.');
                    setSwitchingId(null);
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 font-[Orbitron]">
            <div className="w-full max-w-md rounded-2xl border border-cyan-700/80 bg-[#090e17] text-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-cyan-900/60 p-4 sm:p-5">
                    <div className="flex items-center gap-2.5">
                        <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-2 text-cyan-400">
                            <ArrowLeftRight className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Cambiar de Usuario</h3>
                            <p className="text-xs text-neutral-400">Cambia de cuenta de forma inmediata</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-neutral-800 p-1.5 text-neutral-400 hover:text-white transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Lista de usuarios */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
                    {loading ? (
                        <div className="py-12 text-center text-xs text-cyan-400">
                            Cargando usuarios registrados...
                        </div>
                    ) : users.length === 0 ? (
                        <div className="py-12 text-center text-xs text-neutral-400">
                            No hay otros usuarios registrados en el sistema.
                        </div>
                    ) : (
                        users.map((u) => {
                            const isCurrent = u.id === currentUserId;
                            const isSwitching = switchingId === u.id;
                            const primaryRole = u.roles?.[0] || 'User';

                            return (
                                <button
                                    key={u.id}
                                    type="button"
                                    disabled={isSwitching}
                                    onClick={() => handleSwitch(u)}
                                    className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                                        isCurrent
                                            ? 'border-cyan-500/80 bg-cyan-950/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]'
                                            : 'border-neutral-800 bg-black/40 hover:border-cyan-500/50 hover:bg-neutral-900/80'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 font-bold text-cyan-300 text-sm">
                                            {u.avatar ? (
                                                <img
                                                    src={u.avatar}
                                                    alt={u.name}
                                                    className="h-full w-full rounded-xl object-cover"
                                                />
                                            ) : (
                                                <UserIcon size={18} />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-white text-sm truncate">
                                                    {u.name}
                                                </span>
                                                <span className="rounded bg-neutral-800/80 border border-neutral-700 px-1.5 py-0.5 text-[9px] font-mono text-cyan-400">
                                                    {primaryRole}
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-400 font-mono truncate">
                                                {u.email}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="shrink-0">
                                        {isCurrent ? (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/50 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 font-mono">
                                                <Check size={11} /> ACTIVO
                                            </span>
                                        ) : isSwitching ? (
                                            <span className="text-[11px] text-cyan-400 animate-pulse font-mono">
                                                Cambiando...
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-neutral-400 group-hover:text-cyan-300 font-mono">
                                                Seleccionar →
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-cyan-900/60 p-4 bg-neutral-950/60 text-xs">
                    <span className="text-neutral-500 text-[11px]">Cambio de rol instantáneo</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-1.5 text-neutral-300 hover:text-white transition"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

