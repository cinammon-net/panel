import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const groupedPermissions: Record<string, string[]> = {
    'Api Key': ['view list', 'view', 'create', 'update', 'delete'],
    'Database Host': ['view list', 'view', 'create', 'update', 'delete'],
    Database: ['view list', 'view', 'create', 'update', 'delete'],
    Egg: ['view list', 'view', 'create', 'update', 'delete', 'import', 'export'],
    Mount: ['view list', 'view', 'create', 'update', 'delete'],
    Node: ['view list', 'view', 'create', 'update', 'delete'],
    Role: ['view list', 'view', 'create', 'update', 'delete'],
    Server: ['view list', 'view', 'create', 'update', 'delete'],
    User: ['view list', 'view', 'create', 'update', 'delete'],
    Webhook: ['view list', 'view', 'create', 'update', 'delete'],
    Settings: ['view', 'update'],
    Health: ['view'],
    Activity: ['see tips'],
};

const entities = Object.keys(groupedPermissions);

export default function CreateRole() {
    const [name, setName] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});
    const [expandedEntities, setExpandedEntities] = useState<Record<string, boolean>>({});
    const [errors, setErrors] = useState<string | null>(null);
    const { nodes } = usePage<{ nodes: { id: number; name: string }[] }>().props;
    const [selectedNode, setSelectedNode] = useState('');

    const togglePermission = (entity: string, perm: string) => {
        const updated = new Set(selectedPermissions[entity] || []);
        if (updated.has(perm)) {
            updated.delete(perm);
        } else {
            updated.add(perm);
        }
        setSelectedPermissions({ ...selectedPermissions, [entity]: Array.from(updated) });
    };

    const toggleAll = (entity: string) => {
        const current = selectedPermissions[entity] || [];
        const total = groupedPermissions[entity]?.length || 0;
        setSelectedPermissions({
            ...selectedPermissions,
            [entity]: current.length === total ? [] : [...(groupedPermissions[entity] || [])],
        });
    };

    const handleSubmit = () => {
        if (!name.trim()) {
            setErrors('Role name is required');
            return;
        }

        const allPermissions = Object.entries(selectedPermissions)
            .flatMap(([entity, perms]) =>
                perms.map((perm) => `${perm.replace(/\s+/g, '_').toLowerCase()}_${entity.replace(/\s+/g, '_').toLowerCase()}`),
            )
            .filter(Boolean);

        router.post(
            '/roles',
            {
                name: name.trim(),
                permissions: allPermissions,
                node_id: selectedNode || null,
            },
            {
                onSuccess: () => {
                    setName('');
                    setSelectedPermissions({});
                    setSelectedNode('');
                    setErrors(null);
                },
                onError: (err) => {
                    const message = typeof err === 'string' ? err : err?.name || 'Failed to create role';
                    setErrors(message);
                },
            },
        );
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Roles', href: '/roles' }]}>
            <Head title="Create Role">
                <meta name="description" content="Roles management page" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black dark:bg-black dark:text-white">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-bold tracking-widest text-pink-700 dark:text-pink-400">CREATE ROLE</h1>
                    <button
                        onClick={handleSubmit}
                        className="rounded border border-pink-500 bg-pink-200 px-4 py-2 text-pink-900 hover:bg-pink-300 dark:bg-pink-900/40 dark:text-pink-300 dark:hover:bg-pink-700/60"
                    >
                        + Create Role
                    </button>
                </div>

                {errors && <div className="mb-4 rounded bg-red-600 px-4 py-2 text-sm text-white">{errors}</div>}

                <div className="mb-4">
                    <label className="mb-1 block font-semibold text-pink-600 dark:text-pink-300">Role Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded border border-pink-500 bg-gray-100 px-3 py-2 text-black dark:bg-neutral-900 dark:text-white"
                        placeholder="Enter role name"
                    />
                </div>

                <fieldset className="rounded-lg border border-pink-700 p-4">
                    <legend className="px-2 text-sm font-semibold text-pink-600 dark:text-pink-400">Permissions</legend>

                    <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3 xl:grid-cols-3">
                        {entities.map((entity) => {
                            const isOpen = expandedEntities[entity] ?? false;
                            const currentCount = selectedPermissions[entity]?.length || 0;
                            const total = groupedPermissions[entity]?.length || 0;
                            const isAllSelected = currentCount === total;

                            return (
                                <div
                                    key={entity}
                                    className={`rounded transition-all duration-300 ${
                                        isOpen ? 'border border-pink-700 bg-gray-100 dark:bg-neutral-900' : 'border border-transparent bg-transparent'
                                    }`}
                                >
                                    <div
                                        className="flex cursor-pointer items-center justify-between border border-pink-500 px-4 py-2 dark:border-pink-800"
                                        onClick={() =>
                                            setExpandedEntities((prev) => ({
                                                ...prev,
                                                [entity]: !prev[entity],
                                            }))
                                        }
                                    >
                                        <div className="font-semibold text-pink-700 dark:text-pink-200">{entity}</div>
                                        <div className="flex items-center gap-2">
                                            <span className="rounded-full bg-pink-500 px-2 text-sm font-bold text-white dark:bg-pink-800 dark:text-pink-300">
                                                {currentCount}
                                            </span>
                                            {isOpen ? (
                                                <ChevronUp className="h-4 w-4 text-pink-300" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-pink-300" />
                                            )}
                                        </div>
                                    </div>

                                    {isOpen && (
                                        <div className="space-y-2 p-3" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAll(entity);
                                                }}
                                                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                                            >
                                                {isAllSelected ? 'Unselect all' : 'Select all'}
                                            </button>

                                            <div className="grid grid-cols-2 gap-1 pt-1">
                                                {(groupedPermissions[entity] || []).map((perm) => (
                                                    <label
                                                        key={perm}
                                                        className="flex items-center gap-2 text-sm text-pink-700 capitalize dark:text-pink-200"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="accent-pink-600"
                                                            checked={selectedPermissions[entity]?.includes(perm) || false}
                                                            onChange={() => togglePermission(entity, perm)}
                                                        />
                                                        {perm}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </fieldset>

                <div className="mt-6">
                    <label className="mb-1 block font-semibold text-pink-600 dark:text-pink-300">Nodes</label>
                    <select
                        value={selectedNode}
                        onChange={(e) => setSelectedNode(e.target.value)}
                        className="w-full rounded border border-pink-500 bg-gray-100 px-3 py-2 text-black dark:bg-neutral-900 dark:text-white"
                    >
                        <option value="">Select Node</option>
                        {nodes.map((node) => (
                            <option key={node.id} value={node.id}>
                                {node.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        </AppLayout>
    );
}
