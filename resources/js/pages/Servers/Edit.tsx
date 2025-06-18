/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { ChevronDown, Egg, MapPinned, MapPinPlus, PlusIcon, Server, Star, StarOff, Terminal, Trash, User } from 'lucide-react';
import { ChangeEvent, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';


const tabs = [
    { id: 'info', title: 'Information' },
    { id: 'egg', title: 'Egg Configuration' },
    { id: 'env', title: 'Environment Configuration' },
    { id: 'mounts', title: 'Mounts' },
    { id: 'databases', title: 'Databases' },
    { id: 'actions', title: 'Actions' },
];
export default function CreateServer() {
    const {
        nodes = [],
        owners = [],
        allocations = [],
        eggs = [],
    } = usePage().props as {
        nodes?: any[];
        owners?: any[];
        allocations?: any[];
        eggs?: any[];
        dockerImages?: Record<string, string>;
    };

    const [activeTab, setActiveTab] = useState('info');

    // Estado general de servidor
    const { server: initialServer } = usePage().props as any;

    const [server, setServer] = useState<any>({
        name: initialServer.name || '',
        externalId: initialServer.external_id || '',
        nodeId: initialServer.node_id || '',
        ownerId: initialServer.owner_id || '',
        primaryAllocationId: initialServer.primary_allocation || '',
        additionalAllocationIds: initialServer.additional_allocation_ids || [],
        description: initialServer.description || '',
        egg: initialServer.egg_id || '',
        runInstallScript: initialServer.run_install_script ?? true,
        startAfterInstall: initialServer.start_after_install ?? true,
        startupCommand: initialServer.startup || '',
        cpuLimit: initialServer.cpu_limit === 0 ? 'unlimited' : 'custom',
        memoryLimit: initialServer.memory_limit === 0 ? 'unlimited' : 'custom',
        diskLimit: initialServer.disk_limit === 0 ? 'unlimited' : 'custom',
        cpuPinning: initialServer.cpu_pinning ?? false,
        swapMemory: initialServer.swap_memory || 'unlimited',
        oomKiller: initialServer.oom_killer ?? false,
        backups: initialServer.backups || 0,
        dockerImage: initialServer.image || '',
        installScript: initialServer.install_script || '',
        uuid: initialServer.uuid || '',
        short_uuid: initialServer.short_uuid || '',
    });


    console.log(eggs);

    // Validaciones básicas para permitir pasar de pestaña
    const handlePrimarySelect = (allocationId: number) => {
        setServer((prev: any) => ({
            ...prev,
            primaryAllocationId: allocationId,
        }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target;
        const { name, value, type } = target;
        if (type === 'select-multiple' && 'options' in target) {
            const values = Array.from(target.options)
                .filter((o) => o.selected)
                .map((o) => o.value);
            setServer((prev: any) => ({ ...prev, [name]: values }));
        } else if (type === 'checkbox' && target instanceof HTMLInputElement) {
            setServer((prev: any) => ({ ...prev, [name]: target.checked }));
        } else {
            setServer((prev: any) => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = () => {
        const payload = {
            uuid: server.uuid,
            name: server.name,
            external_id: server.externalId || null,
            node_id: server.nodeId,
            owner_id: server.ownerId,
            allocation_id: server.primaryAllocationId,
            additional_allocation_ids: server.additionalAllocationIds,
            description: server.description || null,
            egg_id: server.egg,
            run_install_script: server.runInstallScript ? 1 : 0,
            start_after_install: server.startAfterInstall ? 1 : 0,
            startup: server.startupCommand,
            cpu_limit: server.cpuLimit === 'unlimited' ? 0 : 1,
            memory_limit: server.memoryLimit === 'unlimited' ? 0 : 1,
            disk_limit: server.diskLimit === 'unlimited' ? 0 : 1,
            cpu_pinning: server.cpuPinning ? 1 : 0,
            swap_memory: server.swapMemory,
            oom_killer: server.oomKiller ? 1 : 0,
            backups: server.backups,
            image: server.dockerImage,
            install_script: server.installScript,
        };

        router.post('/servers', payload, {
            onSuccess: () => {
                toast.success(server.uuid ? 'Servidor actualizado' : 'Servidor creado');
                router.visit('/servers');
            },
            onError: (errors) => {
                toast.error('❌ Error al guardar: ' + JSON.stringify(errors));
            },
        });
    };
    
    
    const [selectedNode] = useState<string>(() => {
        const { server } = usePage().props as any;
        return server?.node?.name || 'Unknown Node';
    });

    // State to control the visibility of the variables section in the Egg tab
    const [showVariables, setShowVariables] = useState(false);
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Servers', href: '/servers' },
                { title: 'Edit Server', href: '/servers/edit' },
            ]}
        >
            <Head title="Create Server">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between border-cyan-600">
                    <h1 className="text-2xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400 dark:drop-shadow-[0_0_5px_#0ff]">
                        EDIT SERVER
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                if (confirm('¿Estás segura de que quieres eliminar este servidor?')) {
                                    router.delete(`/servers/${server.uuid}`, {
                                        onSuccess: () => {
                                            toast.success('✅ Server deleted!');
                                            router.visit('/servers');
                                        },
                                        onError: (errors) => {
                                            console.error(errors);
                                            toast.error('❌ Error deleting server');
                                        },
                                    });
                                }
                            }}
                            className="rounded border border-red-400 bg-red-100/50 px-4 py-1.5 text-sm text-red-800 transition hover:bg-red-200/70 dark:border-red-500 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-700/50"
                        >
                            Delete
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="rounded border border-cyan-400 bg-cyan-100/50 px-4 py-1.5 text-sm text-cyan-800 transition hover:bg-cyan-200/70 dark:border-cyan-500 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-700/50"
                        >
                            <Terminal className="inline-block mr-1 h-4 w-4" />
                            Console
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="rounded border border-cyan-400 bg-cyan-100/50 px-4 py-1.5 text-sm text-cyan-800 transition hover:bg-cyan-200/70 dark:border-cyan-500 dark:bg-cyan-900/30 dark:text-cyan-300 dark:hover:bg-cyan-700/50"
                        >
                            Save Server
                        </button>
                    </div>
                </div>
                <div className="">
                    <div className="rounded-lg border border-cyan-500 bg-black/90 p-6">
                        {/* Tabs */}
                        <div className="mb-6 flex flex-col space-y-2 border-b-2 border-cyan-500 sm:flex-row sm:space-y-0 sm:space-x-8">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    className={`flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors duration-200 ${activeTab === tab.id
                                        ? 'border-b-2 border-cyan-500 text-cyan-400'
                                        : 'text-gray-400 hover:text-cyan-400'
                                        }`}
                                    onClick={() => setActiveTab(tab.id)}
                                >
                                    {tab.title}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="space-y-6">
                            {activeTab === 'info' && (
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-1">
                                    {/* Nombre y Propietario */}
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        {/* Nombre */}
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold" htmlFor="name">Name <span className="text-red-500">*</span></label>
                                            <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 hover:border-cyan-400">
                                                <Server className="ml-2 h-5 w-5 text-cyan-500" />
                                                <input
                                                    id="name"
                                                    name="name"
                                                    type="text"
                                                    placeholder="Server Name"
                                                    value={server.name}
                                                    onChange={handleChange}
                                                    className="border-l bg-black px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                                />
                                            </div>
                                        </div>

                                        {/* Propietario */}
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold" htmlFor="ownerId">Owner <span className="text-red-500">*</span></label>
                                            <div className="relative flex items-center gap-2 rounded border border-cyan-600 bg-black/90 px-3 py-2 text-sm text-cyan-400">
                                                <User className="h-5 w-5 text-cyan-500" />
                                                <select
                                                    id="ownerId"
                                                    name="ownerId"
                                                    value={server.ownerId}
                                                    onChange={handleChange}
                                                    className="w-full bg-black text-cyan-400 appearance-none outline-none"
                                                >
                                                    <option value="">Select Owner</option>
                                                    {owners.map((owner: any) => (
                                                        <option key={owner.id} value={owner.id}>
                                                            {owner.name || owner.email || `User #${owner.id}`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400 pointer-events-none" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Descripción */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="description">Description</label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            rows={2}
                                            placeholder="Server Description"
                                            value={server.description}
                                            onChange={handleChange}
                                            className="w-full rounded border border-cyan-600 bg-black px-3 py-2 text-sm text-cyan-200 placeholder:text-cyan-600 focus:outline-none"
                                        />
                                    </div>

                                    {/* UUIDs y Node */}
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold" htmlFor="uuid">UUID <span className="text-red-500">*</span></label>
                                            <input
                                                id="uuid"
                                                name="uuid"
                                                type="text"
                                                readOnly
                                                placeholder="Server UUID"
                                                value={server.uuid}
                                                className="w-full rounded border border-cyan-600 bg-black px-3 py-2 text-sm text-cyan-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold" htmlFor="shortUuid">Short UUID <span className="text-red-500">*</span></label>
                                            <input
                                                id="shortUuid"
                                                name="shortUuid"
                                                type="text"
                                                readOnly
                                                placeholder="Short UUID"
                                                value={server.short_uuid}
                                                className="w-full rounded border border-cyan-600 bg-black px-3 py-2 text-sm text-cyan-400"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-1 block text-sm font-semibold" htmlFor="nodeId">
                                                Node <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    id="nodeId"
                                                    name="nodeId"
                                                    value={server.nodeId}
                                                    disabled
                                                    className="w-full appearance-none rounded border border-cyan-600 bg-black px-3 py-2 pr-8 text-sm text-cyan-400 cursor-not-allowed"
                                                >
                                                    <option value={server.nodeId}>
                                                        {selectedNode || 'Selected Node'}
                                                    </option>
                                                </select>
                                                <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400 pointer-events-none" />
                                            </div>

                                            {/* Campo oculto para que el valor sí se envíe en el formulario */}
                                            <input type="hidden" name="nodeId" value={server.nodeId} />
                                        </div>

                                        {/* External ID */}
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold" htmlFor="externalId">External ID</label>
                                            <input
                                                id="externalId"
                                                name="externalId"
                                                type="text"
                                                value={server.externalId}
                                                onChange={handleChange}
                                                className="w-full rounded border border-cyan-600 bg-black px-3 py-2 text-sm text-cyan-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'egg' && (
                                <div className="lg:grid-cols grid-cols grid gap-6 lg:grid-cols-1">
                                    {/* Fila superior: Name + Run Script + Start After Install */}
                                    <div className="grid grid-cols-3 gap-6">
                                        {/* Select Egg */}
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold" htmlFor="egg">
                                                Name <span className="text-red-400">*</span>
                                            </label>
                                            <div className="relative flex items-center rounded border border-cyan-600 bg-black/90 hover:border-cyan-400 transition">
                                                <Egg className="absolute left-2 h-5 w-5 text-cyan-500 pointer-events-none" />
                                                <select
                                                    id="egg"
                                                    name="egg"
                                                    value={server.egg}
                                                    onChange={(e) => {
                                                        const selectedId = Number(e.target.value);
                                                        const selectedEgg = eggs.find((egg) => egg.id === selectedId);

                                                        const defaultVars: any = {};
                                                        selectedEgg?.variables?.forEach((v: any) => {
                                                            const key = v.env_variable || (typeof v.name === 'string' ? v.name.replace(/\s+/g, '_').toUpperCase() : '');
                                                            defaultVars[key] = v.default_value || '';
                                                        });

                                                        const dockerImages = selectedEgg?.docker_images || {};
                                                        const firstImage = Object.values(dockerImages)[0] || '';

                                                        setServer({
                                                            ...server,
                                                            egg: selectedId,
                                                            startupCommand: selectedEgg?.startup || '',
                                                            variables: defaultVars,
                                                            dockerImage: firstImage,
                                                            dockerImageOptions: dockerImages,
                                                        });
                                                    }}
                                                    className="w-full appearance-none pl-10 pr-6 py-2 bg-black text-sm text-cyan-600 dark:text-cyan-400 focus:outline-none"
                                                >
                                                    <option value="">Select Egg</option>
                                                    {[...eggs]
                                                        .sort((a, b) => a.name.localeCompare(b.name))
                                                        .map((egg) => (
                                                            <option key={egg.id} value={egg.id}>
                                                                {egg.name}
                                                            </option>
                                                        ))}
                                                </select>

                                                <ChevronDown className="absolute right-2 h-4 w-4 text-cyan-500 pointer-events-none" />
                                            </div>
                                        </div>

                                        {/* Run Install Script */}
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold">
                                                Run Install Script? <span className="text-red-400">*</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, runInstallScript: true })}
                                                    className={`px-4 py-2 rounded border ${server.runInstallScript
                                                        ? 'bg-cyan-500 text-black border-cyan-400'
                                                        : 'bg-black text-cyan-200 border-cyan-600'
                                                        }`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, runInstallScript: false })}
                                                    className={`px-4 py-2 rounded border ${!server.runInstallScript
                                                        ? 'bg-cyan-500 text-black border-cyan-400'
                                                        : 'bg-black text-cyan-200 border-cyan-600'
                                                        }`}
                                                >
                                                    Skip
                                                </button>
                                            </div>
                                        </div>

                                        {/* Start After Install */}
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold">
                                                Start After Install? <span className="text-red-400">*</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, startAfterInstall: true })}
                                                    className={`px-4 py-2 rounded border ${server.startAfterInstall
                                                        ? 'bg-cyan-500 text-black border-cyan-400'
                                                        : 'bg-black text-cyan-200 border-cyan-600'
                                                        }`}
                                                >
                                                    Yes
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, startAfterInstall: false })}
                                                    className={`px-4 py-2 rounded border ${!server.startAfterInstall
                                                        ? 'bg-cyan-500 text-black border-cyan-400'
                                                        : 'bg-black text-cyan-200 border-cyan-600'
                                                        }`}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mostras el startup command del egg seleccionado */}
                                    {server.egg && (
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold" htmlFor="startupCommand">
                                                Startup Command
                                            </label>
                                            <div className="relative flex items-start rounded border border-cyan-600 bg-black/90 hover:border-cyan-400 transition">
                                                <Terminal className="absolute left-2 h-5 w-5 text-cyan-500 pointer-events-none" />
                                                <textarea
                                                    id="startupCommand"
                                                    name="startupCommand"
                                                    readOnly
                                                    value={eggs.find((e) => e.id === Number(server.egg))?.startup || ''}
                                                    className="w-full appearance-none pl-10 pr-6 py-2 bg-black text-sm text-cyan-600 dark:text-cyan-400 focus:outline-none resize-none overflow-hidden"
                                                    rows={2 + (eggs.find((e) => e.id === Number(server.egg))?.startup || '').split('\n').length}
                                                    style={{ height: 'auto' }}
                                                    onInput={(e) => {
                                                        const target = e.target as HTMLTextAreaElement;
                                                        target.style.height = 'auto';
                                                        target.style.height = `${target.scrollHeight}px`;
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {/* Variables del Egg */}
                                    {server.egg && (
                                        <div>
                                            <div
                                                onClick={() => setShowVariables(!showVariables)}
                                                className="flex items-center justify-between cursor-pointer"
                                            >
                                                <label className="block text-sm font-semibold" htmlFor="variables">
                                                    Variables <span className="text-red-400">*</span>
                                                </label>
                                                <ChevronDown className={`h-4 w-4 transform transition-transform ${showVariables ? 'rotate-180' : ''
                                                    } text-cyan-400`}
                                                />
                                            </div>

                                            {/* Contenido desplegable */}
                                            {showVariables && (
                                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 border border-cyan-600 p-4 rounded bg-black/90 hover:border-cyan-400 transition">
                                                    {eggs.find((e) => e.id === Number(server.egg))?.variables.map((v: {
                                                        default_value: any; env_variable: any; name: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; description: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined;
                                                    }, index: Key | null | undefined) => {
                                                        const key = v.env_variable || (
                                                            typeof v.name === 'string'
                                                                ? v.name.replace(/\s+/g, '_').toUpperCase()
                                                                : ''
                                                        );

                                                        return (
                                                            <div key={index}>
                                                                <label className="mb-1 block text-sm font-semibold">
                                                                    {v.name} <span className="text-red-400">*</span>
                                                                </label>

                                                                <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
                                                                    <div className="ml-2 text-sm text-cyan-500 whitespace-nowrap">
                                                                        {`{{${key}}}`}
                                                                    </div>
                                                                    <input
                                                                        type="text"
                                                                        name={key}
                                                                        value={server.variables?.[key] ?? v.default_value ?? ''}
                                                                        onChange={(e) =>
                                                                            setServer((prev: any) => ({
                                                                                ...prev,
                                                                                variables: {
                                                                                    ...prev.variables,
                                                                                    [key]: e.target.value,
                                                                                },
                                                                            }))
                                                                        }
                                                                        className="w-full border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                                                    />
                                                                </div>

                                                                <p className="mt-1 text-xs text-cyan-500">{v.description}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'env' && (
                                <div className="space-y-8">
                                    {/* Resource Limits */}
                                    <fieldset className="border border-cyan-700 rounded-lg p-4 shadow-sm">
                                        <legend className="text-lg font-bold text-cyan-400 mb-2">Resource Limits</legend>
                                        <div className="grid grid-cols-1 sm:grid-cols-1 gap-6">
                                            {['cpuLimit', 'memoryLimit', 'diskLimit'].map((key, idx) => (
                                                <div key={key}>
                                                    <label className="mb-1 block text-sm font-semibold capitalize" htmlFor={key}>
                                                        {['CPU', 'Memory', 'Disk Space'][idx]}
                                                    </label>
                                                    <div className="flex gap-2">
                                                        {['unlimited', 'limited'].map((value) => (
                                                            <button
                                                                key={value}
                                                                onClick={() => setServer({ ...server, [key]: value })}
                                                                className={`px-4 py-2 rounded border font-medium ${server[key] === value
                                                                    ? 'bg-cyan-500 text-black border-cyan-400'
                                                                    : 'bg-black text-cyan-200 border-cyan-600'
                                                                    }`}
                                                            >
                                                                {value.charAt(0).toUpperCase() + value.slice(1)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Advanced Limits */}
                                    <fieldset className="border border-cyan-700 rounded-lg p-4 shadow-sm">
                                        <legend className="text-lg font-bold text-cyan-400 mb-2">Advanced Limits</legend>
                                        <div className="grid grid-cols-1 sm:grid-cols-1 gap-6">
                                            {/* CPU Pinning */}
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold">CPU Pinning</label>
                                                <div className="flex gap-2">
                                                    {[false, true].map((val) => (
                                                        <button
                                                            key={val.toString()}
                                                            onClick={() => setServer({ ...server, cpuPinning: val })}
                                                            className={`px-4 py-2 rounded border font-medium ${server.cpuPinning === val
                                                                ? 'bg-green-500 text-black border-green-400'
                                                                : 'bg-black text-cyan-200 border-cyan-600'
                                                                }`}
                                                        >
                                                            {val ? 'Enabled' : 'Disabled'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Swap Memory */}
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold">Swap Memory</label>
                                                <div className="flex gap-2">
                                                    {['unlimited', 'limited', 'disabled'].map((value) => (
                                                        <button
                                                            key={value}
                                                            onClick={() => setServer({ ...server, swapMemory: value })}
                                                            className={`px-4 py-2 rounded border font-medium ${server.swapMemory === value
                                                                ? value === 'disabled'
                                                                    ? 'bg-red-500 text-white border-red-400'
                                                                    : 'bg-cyan-500 text-black border-cyan-400'
                                                                : 'bg-black text-cyan-200 border-cyan-600'
                                                                }`}
                                                        >
                                                            {value.charAt(0).toUpperCase() + value.slice(1)}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* OOM Killer */}
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold">OOM Killer</label>
                                                <div className="flex gap-2">
                                                    {[false, true].map((val) => (
                                                        <button
                                                            key={val.toString()}
                                                            onClick={() => setServer({ ...server, oomKiller: val })}
                                                            className={`px-4 py-2 rounded border font-medium ${server.oomKiller === val
                                                                ? 'bg-green-500 text-black border-green-400'
                                                                : 'bg-black text-cyan-200 border-cyan-600'
                                                                }`}
                                                        >
                                                            {val ? 'Enabled' : 'Disabled'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </fieldset>

                                    {/* Feature Limits */}
                                    <fieldset className="border border-cyan-700 rounded-lg p-4 shadow-sm">
                                        <legend className="text-lg font-bold text-cyan-400 mb-2">Feature Limits</legend>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            {['Allocations', 'Databases', 'Backups'].map((label, i) => (
                                                <div key={label}>
                                                    <label className="mb-1 block text-sm font-semibold">
                                                        {label} <span className="text-red-400">*</span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        className="w-full rounded border border-cyan-600 bg-black px-4 py-2 text-sm text-cyan-200 focus:outline-none"
                                                        value={server[label.toLowerCase()] ?? 0}
                                                        onChange={(e) =>
                                                            setServer({ ...server, [label.toLowerCase()]: parseInt(e.target.value) || 0 })
                                                        }
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {/* Docker Settings */}
                                    <fieldset className="border border-cyan-700 rounded-lg p-4 shadow-sm mt-6">
                                        <legend className="text-lg font-bold text-cyan-400 mb-2">Docker Settings</legend>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            {/* Image Name como SELECT */}
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold text-white">Image Name</label>
                                                <select
                                                    className="w-full rounded border border-cyan-600 bg-black px-4 py-2 text-sm text-cyan-200 focus:outline-none"
                                                    value={server.dockerImage}
                                                    onChange={(e) => setServer({ ...server, dockerImage: e.target.value })}
                                                >
                                                    <option value="">Select Image</option>
                                                    {server.dockerImageOptions &&
                                                        Object.entries(server.dockerImageOptions).map(([name, url]) => (
                                                            <option key={name} value={url as string}>
                                                                {name}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Campo para la URL de la imagen */}
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold text-white">
                                                    Image <span className="text-red-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full rounded border border-cyan-600 bg-black px-4 py-2 text-sm text-cyan-200 focus:outline-none"
                                                    value={server.dockerImage || ''}
                                                    onChange={(e) => setServer({ ...server, dockerImage: e.target.value })}
                                                />
                                            </div>

                                            {/* Tabla de container labels */}
                                            <div className="sm:col-span-2">
                                                <label className="mb-1 block text-sm font-semibold text-white">Container Labels</label>
                                                <table className="w-full border-collapse border border-cyan-700 text-sm text-cyan-200">
                                                    <thead>
                                                        <tr>
                                                            <th className="border border-cyan-600 px-2 py-1 text-left">Title</th>
                                                            <th className="border border-cyan-600 px-2 py-1 text-left">Description</th>
                                                            <th className="border border-cyan-600 px-2 py-1 text-left w-12"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {server.labels?.map((label: any, index: number) => (
                                                            <tr key={index}>
                                                                <td className="border border-cyan-600 p-1">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-black px-1 py-1 text-cyan-200 border-none focus:outline-none"
                                                                        value={label.title}
                                                                        onChange={(e) => {
                                                                            const updated = [...server.labels];
                                                                            updated[index].title = e.target.value;
                                                                            setServer({ ...server, labels: updated });
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="border border-cyan-600 p-1">
                                                                    <input
                                                                        type="text"
                                                                        className="w-full bg-black px-1 py-1 text-cyan-200 border-none focus:outline-none"
                                                                        value={label.description}
                                                                        onChange={(e) => {
                                                                            const updated = [...server.labels];
                                                                            updated[index].description = e.target.value;
                                                                            setServer({ ...server, labels: updated });
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="border rounded border-cyan-600 p-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            const updated = [...server.labels];
                                                                            updated.splice(index, 1);
                                                                            setServer({ ...server, labels: updated });
                                                                        }}
                                                                        className="text-red-500 hover:text-red-700"
                                                                    >
                                                                        <Trash size={16} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        <tr>
                                                            <td colSpan={3} className="text-center py-2">
                                                                <button
                                                                    onClick={() => {
                                                                        const updated = [...(server.labels || [])];
                                                                        updated.push({ title: '', description: '' });
                                                                        setServer({ ...server, labels: updated });
                                                                    }}
                                                                    className="text-cyan-400 hover:underline"
                                                                >
                                                                    Add row
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </fieldset>
                                </div>
                            )}

                            {activeTab === 'mounts' && (
                                <div className="lg:grid-cols grid-cols grid gap-6 lg:grid-cols-1">
                                    {(server.mountPath && server.mountPath.trim() !== '') ? (
                                        <>
                                            {/* Campo Mount Path */}
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold" htmlFor="mountPath">
                                                    Mount Path <span className="text-red-400">*</span>
                                                </label>
                                                <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition hover:border-cyan-400">
                                                    <MapPinPlus className="ml-2 h-5 w-5 text-cyan-500" />
                                                    <input
                                                        type="text"
                                                        id="mountPath"
                                                        name="mountPath"
                                                        placeholder="/mnt/mydrive"
                                                        value={server.mountPath}
                                                        onChange={(e) =>
                                                            setServer((prev: any) => ({
                                                                ...prev,
                                                                mountPath: e.target.value,
                                                            }))
                                                        }
                                                        className="w-full border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                                    />
                                                </div>
                                            </div>

                                            {/* Campo Read Only */}
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold" htmlFor="mountReadOnly">
                                                    Read Only?
                                                </label>
                                                <div className="flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setServer({ ...server, mountReadOnly: true })}
                                                        className={`px-4 py-2 rounded border ${server.mountReadOnly
                                                            ? 'bg-cyan-500 text-black border-cyan-400'
                                                            : 'bg-black text-cyan-200 border-cyan-600'
                                                            }`}
                                                    >
                                                        Yes
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setServer({ ...server, mountReadOnly: false })}
                                                        className={`px-4 py-2 rounded border ${!server.mountReadOnly
                                                            ? 'bg-cyan-500 text-black border-cyan-400'
                                                            : 'bg-black text-cyan-200 border-cyan-600'
                                                            }`}
                                                    >
                                                        No
                                                    </button>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-cyan-500">No mount path configured for this server.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'databases' && (
                                <div className="rounded border border-cyan-600 bg-black/90 p-4">
                                    <h2 className="mb-4 text-lg font-semibold text-cyan-400">Databases</h2>

                                    {server.databases && server.databases.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full table-auto text-left text-sm text-cyan-300">
                                                <thead className="border-b border-cyan-600">
                                                    <tr>
                                                        <th className="px-4 py-2">Name</th>
                                                        <th className="px-4 py-2">User</th>
                                                        <th className="px-4 py-2">Host</th>
                                                        <th className="px-4 py-2">Port</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {server.databases.map((db: any, i: number) => (
                                                        <tr key={i} className="border-b border-cyan-800 hover:bg-cyan-950">
                                                            <td className="px-4 py-2">{db.name}</td>
                                                            <td className="px-4 py-2">{db.user}</td>
                                                            <td className="px-4 py-2">{db.host}</td>
                                                            <td className="px-4 py-2">{db.port}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-cyan-500">No databases have been created or assigned to this server.</p>
                                    )}
                                </div>
                            )}

                            {activeTab === 'actions' && (
                                <fieldset className="border border-cyan-600 rounded p-6 space-y-6">
                                    <legend className="px-2 text-base font-semibold text-cyan-400">Actions</legend>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {/* Toggle Install */}
                                        <div>
                                            <button
                                                type="button"
                                                className="w-full px-4 py-2 rounded bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition"
                                                onClick={() => {
                                                    router.post(`/servers/${server.uuid}/toggle-install`, {}, {
                                                        onSuccess: () => toast.success("✅ Install status toggled"),
                                                        onError: () => toast.error("❌ Failed to toggle install status")
                                                    });
                                                }}
                                            >
                                                Toggle Install Status
                                            </button>
                                            <p className="mt-2 text-sm text-cyan-300">
                                                Change the install status from uninstalled to installed, or vice versa.
                                            </p>
                                        </div>

                                        {/* Suspend */}
                                        <div>
                                            <button
                                                type="button"
                                                className="w-full px-4 py-2 rounded bg-yellow-500 text-black font-bold hover:bg-yellow-400 transition"
                                                onClick={() => {
                                                    router.post(`/servers/${server.uuid}/suspend`, {}, {
                                                        onSuccess: () => toast.success("✅ Server suspended"),
                                                        onError: () => toast.error("❌ Failed to suspend server")
                                                    });
                                                }}
                                            >
                                                Suspend
                                            </button>
                                            <p className="mt-2 text-sm text-cyan-300">
                                                This will suspend the server and block user access.
                                            </p>
                                        </div>

                                        {/* Transfer */}
                                        <div>
                                            <button
                                                type="button"
                                                className="w-full px-4 py-2 rounded bg-blue-500 text-white font-bold hover:bg-blue-400 transition"
                                                onClick={() => {
                                                    router.post(`/servers/${server.uuid}/transfer`, {}, {
                                                        onSuccess: () => toast.success("✅ Transfer initiated"),
                                                        onError: () => toast.error("❌ Transfer failed")
                                                    });
                                                }}
                                            >
                                                Transfer
                                            </button>
                                            <p className="mt-2 text-sm text-cyan-300">
                                                Move this server to another node. Backup recommended.
                                            </p>
                                        </div>

                                        {/* Reinstall */}
                                        <div>
                                            <button
                                                type="button"
                                                className="w-full px-4 py-2 rounded bg-red-500 text-white font-bold hover:bg-red-400 transition"
                                                onClick={() => {
                                                    router.post(`/servers/${server.uuid}/reinstall`, {}, {
                                                        onSuccess: () => toast.success("✅ Server reinstallation started"),
                                                        onError: () => toast.error("❌ Reinstallation failed")
                                                    });
                                                }}
                                            >
                                                Reinstall
                                            </button>
                                            <p className="mt-2 text-sm text-cyan-300">
                                                This will reinstall the server using its assigned egg script.
                                            </p>
                                        </div>
                                    </div>
                                </fieldset>
                            )} 
                        </div>
                    </div>

                    {/* Tabla de Allocations */}
                    <div className="border border-cyan-600 p-4 rounded-lg bg-black/90 mt-4">
                        <h2 className="mb-4 text-lg font-semibold text-cyan-400">
                            Allocations
                        </h2>
                        <div className="overflow-x-auto">
                            <table className="w-full table-auto text-left">
                                <thead>
                                    <tr className="border-b border-cyan-600">
                                        <th className="px-4 py-2 text-sm font-semibold text-cyan-400">IP Address</th>
                                        <th className="px-4 py-2 text-sm font-semibold text-cyan-400">Port</th>
                                        <th className="px-4 py-2 text-sm font-semibold text-cyan-400">Alias</th>
                                        <th className="px-4 py-2 text-sm font-semibold text-cyan-400">Primary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allocations.map((allocation: any) => (
                                        <tr key={allocation.id} className="border-b border-cyan-600">
                                            <td className="px-4 py-2 text-sm text-cyan-200">{allocation.ip}</td>
                                            <td className="px-4 py-2 text-sm text-cyan-200">{allocation.port}</td>
                                            <td className="px-4 py-2 text-sm text-cyan-200">{allocation.alias || '-'}</td>
                                            {/* Botón para seleccionar como Primary */}
                                            <td className="px-4 py-2">
                                                <button
                                                    onClick={() => handlePrimarySelect(allocation.id)}
                                                    className={`text-xs font-semibold px-3 py-1 rounded ${server.primaryAllocationId === allocation.id
                                                        ? 'bg-yellow-500 text-white'
                                                        : 'bg-gray-700 hover:bg-gray-600'
                                                        }`}
                                                >
                                                    {server.primaryAllocationId === allocation.id ? <Star className="inline h-4 w-4" /> : <StarOff className="inline h-4 w-4" />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}