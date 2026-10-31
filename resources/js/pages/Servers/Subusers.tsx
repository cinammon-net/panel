import ServerLayout from '@/layouts/server-layout';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeftRight,
    Check,
    Crown,
    KeyRound,
    Pencil,
    Plus,
    Power,
    Shield,
    Terminal,
    Trash2,
    UserCheck,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface SubuserItem {
    id: number;
    user_id: number;
    name: string;
    email: string;
    avatar?: string | null;
    permissions: string[];
    created_at?: string;
}

interface PageProps {
    server: {
        id: number;
        name: string;
        uuid: string;
        owner_id?: number;
    };
    subusers: SubuserItem[];
    owner: {
        id?: number;
        name?: string;
        email?: string;
    };
    availableUsers?: Array<{
        id: number;
        name: string;
        email: string;
    }>;
}

const PERMISSION_DEFINITIONS = [
    {
        group: 'Consola y Comandos',
        icon: Terminal,
        items: [
            { id: 'console.view', label: 'Ver consola en tiempo real', desc: 'Permite leer los registros y output de la consola.' },
            { id: 'console.commands', label: 'Enviar comandos', desc: 'Permite ejecutar órdenes en la consola interactiva.' },
        ],
    },
    {
        group: 'Control de Energía',
        icon: Power,
        items: [
            { id: 'power.start', label: 'Iniciar servidor', desc: 'Permite encender el contenedor del servidor.' },
            { id: 'power.stop', label: 'Detener servidor', desc: 'Permite apagar el servidor.' },
            { id: 'power.restart', label: 'Reiniciar servidor', desc: 'Permite reiniciar el servidor rápidamente.' },
        ],
    },
    {
        group: 'Gestor de Archivos',
        icon: KeyRound,
        items: [
            { id: 'files.read', label: 'Ver y descargar archivos', desc: 'Permite explorar el explorador de archivos y descargarlos.' },
            { id: 'files.write', label: 'Crear y editar archivos', desc: 'Permite subir, guardar cambios y renombrar archivos.' },
        ],
    },
];

const ALL_PERMISSION_KEYS = PERMISSION_DEFINITIONS.flatMap((g) => g.items.map((i) => i.id));

export default function Subusers({ server, subusers = [], owner, availableUsers = [] }: PageProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubuser, setEditingSubuser] = useState<SubuserItem | null>(null);
    const [isDeletingId, setIsDeletingId] = useState<number | null>(null);

    // Estado para transferir propiedad
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [selectedNewOwnerId, setSelectedNewOwnerId] = useState<string>('');
    const [isTransferring, setIsTransferring] = useState(false);

    const handleTransferSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedNewOwnerId) {
            toast.error('Selecciona el nuevo propietario.');
            return;
        }

        setIsTransferring(true);
        router.post(
            `/servers/${server.id}/transfer-owner`,
            { user_id: selectedNewOwnerId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Propietario del servidor actualizado correctamente.');
                    setIsTransferModalOpen(false);
                    setSelectedNewOwnerId('');
                },
                onError: (err: any) => {
                    toast.error(err.user_id || 'Error al transferir la propiedad del servidor.');
                },
                onFinish: () => {
                    setIsTransferring(false);
                },
            }
        );
    };

    const { data, setData, post, put, processing, errors, reset, clearErrors } = useForm({
        email: '',
        permissions: [...ALL_PERMISSION_KEYS] as string[],
    });

    const openCreateModal = () => {
        setEditingSubuser(null);
        clearErrors();
        setData({
            email: '',
            permissions: [...ALL_PERMISSION_KEYS],
        });
        setIsModalOpen(true);
    };

    const openEditModal = (subuser: SubuserItem) => {
        setEditingSubuser(subuser);
        clearErrors();
        setData({
            email: subuser.email,
            permissions: [...(subuser.permissions || [])],
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSubuser(null);
        reset();
    };

    const handleTogglePermission = (permId: string) => {
        if (data.permissions.includes(permId)) {
            setData('permissions', data.permissions.filter((p) => p !== permId));
        } else {
            setData('permissions', [...data.permissions, permId]);
        }
    };

    const handleSelectAll = () => {
        setData('permissions', [...ALL_PERMISSION_KEYS]);
    };

    const handleSelectReadOnly = () => {
        setData('permissions', ['console.view', 'files.read']);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingSubuser) {
            put(`/servers/${server.id}/subusers/${editingSubuser.id}`, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Permisos actualizados con éxito.');
                    closeModal();
                },
                onError: () => {
                    toast.error('Ocurrió un error al actualizar los permisos.');
                },
            });
        } else {
            post(`/servers/${server.id}/subusers`, {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Acceso compartido concedido.');
                    closeModal();
                },
                onError: (err) => {
                    toast.error(err.email || 'No se pudo otorgar acceso al usuario.');
                },
            });
        }
    };

    const handleDelete = (subuser: SubuserItem) => {
        if (!confirm(`¿Estás seguro de que deseas revocar el acceso a ${subuser.name}?`)) {
            return;
        }

        setIsDeletingId(subuser.id);
        router.delete(`/servers/${server.id}/subusers/${subuser.id}`, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(`Acceso revocado a ${subuser.name}.`);
                setIsDeletingId(null);
            },
            onError: () => {
                toast.error('Error al revocar acceso.');
                setIsDeletingId(null);
            },
        });
    };

    return (
        <ServerLayout server={server} section="users">
            <Head title={`${server.name} - Subusuarios y Accesos`} />

            <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-[Orbitron]">
                {/* Cabecera Principal */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-cyan-900/60 pb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-2 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                                <Users className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold tracking-wider text-white">
                                    Control de Accesos (Subusuarios)
                                </h1>
                                <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                                    Gestiona colaboradores para que puedan administrar este servidor según sus permisos asignados.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openCreateModal}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-400 bg-cyan-500/20 px-4 py-2.5 text-xs sm:text-sm font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-black transition-all duration-200 shadow-[0_0_15px_rgba(34,211,238,0.25)]"
                    >
                        <UserPlus size={16} />
                        <span>Invitar Usuario</span>
                    </button>
                </div>

                {/* Tarjeta del Propietario Principal */}
                <div className="rounded-2xl border border-cyan-700/60 bg-gradient-to-r from-cyan-950/20 via-neutral-900/40 to-neutral-950/60 p-5 shadow-lg">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/50 bg-cyan-900/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                                <Crown className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-base font-bold text-white">{owner?.name || 'Propietario'}</span>
                                    <span className="rounded-full border border-cyan-500/50 bg-cyan-950/80 px-2 py-0.5 text-[10px] font-bold text-cyan-300 tracking-wider">
                                        PROPIETARIO PRINCIPAL
                                    </span>
                                </div>
                                <p className="text-xs text-neutral-400 font-mono mt-0.5">{owner?.email || '–'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                            <div className="text-xs text-neutral-400 hidden sm:flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-neutral-800">
                                <Shield size={14} className="text-cyan-400" />
                                <span>Acceso total</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsTransferModalOpen(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/60 bg-cyan-950/50 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500 hover:text-black transition shadow-sm"
                                title="Transferir la propiedad de este servidor a otro usuario"
                            >
                                <ArrowLeftRight size={13} />
                                <span>Cambiar Dueño</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Lista de Subusuarios */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                            <span>Subusuarios con Acceso ({subusers.length})</span>
                        </h2>
                    </div>

                    {subusers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-cyan-900/60 bg-neutral-950/40 py-16 text-center">
                            <div className="rounded-full border border-cyan-800/40 bg-neutral-900/60 p-4 mb-3 text-cyan-500/60">
                                <Users className="h-8 w-8" />
                            </div>
                            <h3 className="text-base font-bold text-neutral-200">No hay subusuarios asignados</h3>
                            <p className="mt-1 text-xs text-neutral-400 max-w-md">
                                Puedes conceder acceso a amigos o administradores con permisos granulares para encender, ver consola o editar archivos.
                            </p>
                            <button
                                type="button"
                                onClick={openCreateModal}
                                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-950/40 px-4 py-2 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:bg-cyan-900/60 transition"
                            >
                                <Plus size={14} />
                                <span>Añadir el primer colaborador</span>
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {subusers.map((subuser) => {
                                const perms = subuser.permissions || [];
                                return (
                                    <div
                                        key={subuser.id}
                                        className="group relative flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-[#080d16] p-5 transition-all hover:border-cyan-500/60 hover:shadow-[0_0_25px_rgba(34,211,238,0.15)]"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-800/60 bg-cyan-950/40 font-bold text-cyan-300">
                                                {subuser.avatar ? (
                                                    <img
                                                        src={subuser.avatar}
                                                        alt={subuser.name}
                                                        className="h-full w-full rounded-xl object-cover"
                                                    />
                                                ) : (
                                                    <UserCheck size={20} />
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                                                        {subuser.name}
                                                    </span>
                                                    <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] font-mono text-neutral-400">
                                                        ID: {subuser.user_id}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-neutral-400 font-mono">{subuser.email}</p>

                                                {/* Permisos Chips */}
                                                <div className="mt-3 flex flex-wrap gap-1.5 pt-1">
                                                    {perms.map((p) => (
                                                        <span
                                                            key={p}
                                                            className="rounded-md border border-cyan-800/60 bg-cyan-950/30 px-2 py-0.5 text-[11px] font-mono text-cyan-300"
                                                        >
                                                            {p}
                                                        </span>
                                                    ))}
                                                    {perms.length === 0 && (
                                                        <span className="text-[11px] text-amber-400 italic">
                                                            Sin permisos asignados
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Acciones */}
                                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 border-t md:border-t-0 border-neutral-800 pt-3 md:pt-0 w-full md:w-auto justify-end">
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(subuser)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:border-cyan-400 hover:text-cyan-300 transition"
                                                title="Modificar permisos"
                                            >
                                                <Pencil size={13} />
                                                <span>Editar</span>
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isDeletingId === subuser.id}
                                                onClick={() => handleDelete(subuser)}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-950/30 px-3 py-1.5 text-xs font-semibold text-red-400 hover:border-red-400 hover:bg-red-900/40 transition disabled:opacity-50"
                                                title="Revocar acceso"
                                            >
                                                <Trash2 size={13} />
                                                <span>Revocar</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Modal para Conceder / Editar Acceso */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl border border-cyan-700/80 bg-[#090e17] text-white shadow-2xl overflow-hidden font-[Orbitron]">
                            {/* Header del Modal */}
                            <div className="flex items-center justify-between border-b border-cyan-900/60 p-5">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/40 p-2 text-cyan-400">
                                        <KeyRound className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">
                                            {editingSubuser ? `Editar permisos de ${editingSubuser.name}` : 'Conceder Acceso Compartido'}
                                        </h3>
                                        <p className="text-xs text-neutral-400">
                                            {editingSubuser
                                                ? 'Modifica las facultades de administración sobre el servidor.'
                                                : 'Busca al usuario por correo o nombre y elige sus permisos.'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Formulario */}
                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
                                {/* Email / Usuario */}
                                <div>
                                    <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                                        Correo Electrónico o Nombre de Usuario
                                    </label>
                                    <input
                                        type="text"
                                        disabled={!!editingSubuser}
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="ejemplo@cinammon.net o usuario"
                                        className="w-full rounded-xl border border-cyan-800/80 bg-black/60 px-4 py-2.5 text-sm text-cyan-100 placeholder-neutral-600 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 disabled:opacity-60"
                                    />
                                    {errors.email && (
                                        <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                                    )}
                                </div>

                                {/* Acciones Rápidas de Selección */}
                                <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                                    <span className="text-xs font-bold uppercase text-neutral-300">Permisos Granulares</span>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleSelectAll}
                                            className="text-[11px] text-cyan-400 hover:underline"
                                        >
                                            Seleccionar todos
                                        </button>
                                        <span className="text-neutral-600">|</span>
                                        <button
                                            type="button"
                                            onClick={handleSelectReadOnly}
                                            className="text-[11px] text-neutral-400 hover:text-cyan-300"
                                        >
                                            Solo lectura
                                        </button>
                                    </div>
                                </div>

                                {/* Grupos de Permisos */}
                                <div className="space-y-4">
                                    {PERMISSION_DEFINITIONS.map((group) => {
                                        const GroupIcon = group.icon;
                                        return (
                                            <div
                                                key={group.group}
                                                className="rounded-xl border border-neutral-800/80 bg-black/40 p-4 space-y-3"
                                            >
                                                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                                                    <GroupIcon size={14} />
                                                    <span>{group.group}</span>
                                                </div>

                                                <div className="space-y-2.5">
                                                    {group.items.map((item) => {
                                                        const isChecked = data.permissions.includes(item.id);
                                                        return (
                                                            <label
                                                                key={item.id}
                                                                className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition ${
                                                                    isChecked
                                                                        ? 'border-cyan-500/50 bg-cyan-950/20 text-white'
                                                                        : 'border-neutral-850 bg-neutral-900/30 text-neutral-400 hover:border-neutral-700'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => handleTogglePermission(item.id)}
                                                                    className="mt-1 h-4 w-4 rounded border-cyan-800 bg-black text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                                                                />
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-semibold text-neutral-200">
                                                                            {item.label}
                                                                        </span>
                                                                        <span className="font-mono text-[10px] text-cyan-500/70">
                                                                            {item.id}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-[11px] text-neutral-400 mt-0.5">
                                                                        {item.desc}
                                                                    </p>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Botones del Modal */}
                                <div className="flex items-center justify-end gap-3 border-t border-cyan-900/60 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white hover:border-neutral-500 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center gap-2 rounded-xl border border-cyan-400 bg-cyan-500 px-5 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition-all shadow-[0_0_12px_rgba(34,211,238,0.25)] disabled:opacity-50"
                                    >
                                        <Check size={14} />
                                        <span>{editingSubuser ? 'Guardar Cambios' : 'Conceder Acceso'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
                {/* Modal para Transferir Propiedad del Servidor */}
                {isTransferModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="w-full max-w-md rounded-2xl border border-cyan-700/80 bg-[#090e17] text-white shadow-2xl overflow-hidden flex flex-col font-[Orbitron]">
                            <div className="flex items-center justify-between border-b border-cyan-900/60 p-4 sm:p-5">
                                <div className="flex items-center gap-2.5">
                                    <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/40 p-2 text-cyan-400">
                                        <Crown className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-white">Transferir Servidor</h3>
                                        <p className="text-xs text-neutral-400">Cambia el propietario principal</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-white transition"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleTransferSubmit} className="p-5 space-y-4">
                                <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3 text-xs text-amber-300 space-y-1">
                                    <p className="font-bold">⚠️ Atención:</p>
                                    <p className="text-[11px] text-neutral-300">
                                        Al transferir el servidor, el nuevo usuario se convertirá en el Propietario Principal con control total e irrevocable.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2">
                                        Selecciona el Nuevo Propietario
                                    </label>
                                    <select
                                        value={selectedNewOwnerId}
                                        onChange={(e) => setSelectedNewOwnerId(e.target.value)}
                                        className="w-full rounded-xl border border-cyan-800/80 bg-black/70 px-4 py-2.5 text-xs text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    >
                                        <option value="">-- Elige un usuario registrado --</option>
                                        {availableUsers
                                            .filter((u) => u.id !== owner?.id)
                                            .map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name} ({u.email})
                                                </option>
                                            ))}
                                    </select>
                                </div>

                                <div className="flex items-center justify-end gap-2.5 border-t border-cyan-900/60 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsTransferModalOpen(false)}
                                        className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-300 hover:text-white transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isTransferring || !selectedNewOwnerId}
                                        className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400 bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 transition shadow-[0_0_12px_rgba(34,211,238,0.25)] disabled:opacity-40"
                                    >
                                        <Check size={14} />
                                        <span>Confirmar Transferencia</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </ServerLayout>
    );
}

