/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { ChevronDown, Egg, MapPinned, MapPinPlus, Server, Terminal, Trash, User } from 'lucide-react';
import { ChangeEvent, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';

const tabs = [
    { id: 'info', title: 'Information' },
    { id: 'egg', title: 'Egg Configuration' },
    { id: 'env', title: 'Environment Configuration' },
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
    const [server, setServer] = useState<any>({
        name: '',
        externalId: '',
        nodeId: '',
        ownerId: '',
        primaryAllocationId: '',
        additionalAllocationIds: [] as string[],
        description: '',
        egg: '',
        runInstallScript: true,
        startAfterInstall: true,
        startupCommand: '',
        cpuLimit: 'unlimited',
        memoryLimit: 'unlimited',
        diskLimit: 'unlimited',
        cpuPinning: false,
        swapMemory: 'unlimited',
        oomKiller: false,
        backups: 0,
        dockerImage: '',
        installScript: '',
    });

    console.log(eggs);

    // Validaciones básicas para permitir pasar de pestaña
    const isInfoValid = server.name.trim() !== '' && server.nodeId !== '' && server.ownerId !== '' && server.primaryAllocationId !== '';
    const isEggValid = server.startupCommand.trim() !== '' && server.egg !== '';
    const isEnvValid = server.cpuLimit !== '' && server.memoryLimit !== '' && server.diskLimit !== '';

    
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

    const nextTab = () => {
        if (activeTab === 'info' && !isInfoValid) return alert('Complete todos los campos obligatorios en Información');
        if (activeTab === 'egg' && !isEggValid) return alert('Complete todos los campos obligatorios en Configuración Egg');
        if (activeTab === 'info') setActiveTab('egg');
        else if (activeTab === 'egg') setActiveTab('env');
    };

    const prevTab = () => {
        if (activeTab === 'env') setActiveTab('egg');
        else if (activeTab === 'egg') setActiveTab('info');
    };

    const handleSubmit = () => {
        const payload = {
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
                toast.success('✅ Server created successfully!');
                router.visit('/servers');
            },
            onError: (errors) => {
                console.error(errors);
                toast.error('❌ Error creating server: ' + JSON.stringify(errors));
                alert('Error al crear el server: ' + JSON.stringify(errors));
            },
        });
    };
    

    const [nodeSearch, setNodeSearch] = useState('');
    const [ownerSearch, setOwnerSearch] = useState('');
    const [showNodeDropdown, setShowNodeDropdown] = useState(false); // Estado para dropdown de nodos
    const [showOwnerDropdown, setShowOwnerDropdown] = useState(false); // Estado para dropdown de propietarios
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
    const [selectedPrimaryAllocation, setSelectedPrimaryAllocation] = useState<string | null>(null);

    // Función para manejar la búsqueda de nodos
    const handleNodeSearch = (e: ChangeEvent<HTMLInputElement>) => {
        setNodeSearch(e.target.value);
    };

    // Función para manejar la búsqueda de propietarios
    const handleOwnerSearch = (e: ChangeEvent<HTMLInputElement>) => {
        setOwnerSearch(e.target.value);
    };

    // State for primary allocation dropdown
    const [showPrimaryAllocationDropdown, setShowPrimaryAllocationDropdown] = useState(false);
    const [primaryAllocationSearch, setPrimaryAllocationSearch] = useState('');
    function handlePrimaryAllocationSearch(event: ChangeEvent<HTMLInputElement>): void {
        setPrimaryAllocationSearch(event.target.value);
    }

    // State for additional allocation dropdown
    const [showAdditionalAllocationDropdown, setShowAdditionalAllocationDropdown] = useState(false);
    const [additionalAllocationSearch, setAdditionalAllocationSearch] = useState('');
    function handleAdditionalAllocationSearch(event: ChangeEvent<HTMLInputElement>): void {
        setAdditionalAllocationSearch(event.target.value);
    }

    // Sets the selected additional allocation (display value)
    const [selectedAdditionalAllocation, setSelectedAdditionalAllocation] = useState<string | null>(null);

    // If you need a custom handler, use a different name to avoid conflict
    function handleSetSelectedAdditionalAllocation(value: string) {
        setSelectedAdditionalAllocation(value);
    }
    // State to control the visibility of the variables section in the Egg tab
    const [showVariables, setShowVariables] = useState(false);
    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Servers', href: '/servers' },
                { title: 'Create', href: '/servers/create' },
            ]}
        >
            <Head title="Create Server">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-black p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between border-cyan-600">
                    <h1 className="text-2xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400 dark:drop-shadow-[0_0_5px_#0ff]">
                        CREATE SERVER
                    </h1>
                </div>

                <div className="">
                    <div className="rounded-lg border border-cyan-500 bg-black/90 p-6">
                        {/* Tabs */}
                        <div className="mb-6 flex flex-col space-y-2 border-b-2 border-cyan-500 sm:flex-row sm:space-y-0 sm:space-x-8">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if ((tab.id === 'egg' && isInfoValid) || (tab.id === 'env' && isEggValid) || tab.id === activeTab) {
                                            setActiveTab(tab.id);
                                        }
                                    }}
                                    className={`w-full pb-2 text-lg font-semibold tracking-wide transition sm:w-auto ${
                                        activeTab === tab.id
                                            ? 'border-b-4 border-cyan-400 text-cyan-400'
                                            : 'border-b-4 border-black hover:text-cyan-500'
                                    }`}
                                    disabled={(tab.id === 'egg' && !isInfoValid) || (tab.id === 'env' && !isEggValid)}
                                >
                                    {tab.title}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'info' && (
                            <div className="sm:grid-cols grid-cols grid gap-6 lg:grid-cols-1">
                                {/* Campo para ingresar el nombre del servidor */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="name">
                                            Name *
                                        </label>
                                        <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
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
                                    {/* Campo para ingresar el ID externo del servidor */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="name">
                                            External ID
                                        </label>
                                        <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
                                            <Server className="ml-2 h-5 w-5 text-cyan-500" />
                                            <input
                                                id="externalId"
                                                name="externalId"
                                                type="text"
                                                placeholder="External ID (optional)"
                                                value={server.externalId}
                                                onChange={handleChange}
                                                className="border-l bg-black px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                            />
                                        </div>
                                    </div>

                                    {/* Campo para seleccionar el nodo del servidor */}
                                    <div>
                                        <label className="mt-6 mb-1 block text-sm font-semibold" htmlFor="nodeId">
                                            Node *
                                        </label>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowNodeDropdown(!showNodeDropdown)}
                                                className="w-full rounded border border-cyan-600 bg-black px-3 py-2 pr-10 text-left text-sm text-cyan-200 transition-colors duration-200 hover:border-cyan-400"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Server className="h-5 w-5 text-cyan-400" />
                                                    <span>{selectedNode || 'Select Node'}</span>
                                                </div>
                                                <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                                            </button>

                                            {showNodeDropdown && (
                                                <div className="absolute z-50 mt-1 w-full bg-black">
                                                    <input
                                                        type="text"
                                                        placeholder="Start typing to search..."
                                                        value={nodeSearch}
                                                        onChange={handleNodeSearch}
                                                        className="w-full border-b bg-black px-3 py-2 text-sm text-cyan-200 placeholder:text-cyan-600 focus:outline-none"
                                                    />
                                                    <ul className="max-h-60 overflow-y-auto">
                                                        {nodes
                                                            .filter((node: any) => node.name.toLowerCase().includes(nodeSearch.toLowerCase()))
                                                            .map((node: any) => (
                                                                <li
                                                                    key={node.id}
                                                                    onClick={() => {
                                                                        setSelectedNode(node.name);
                                                                        setServer((prev: any) => ({ ...prev, nodeId: node.id }));
                                                                        setShowNodeDropdown(false); // Close dropdown on selection
                                                                    }}
                                                                    className="cursor-pointer px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-800"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <Server className="h-5 w-5 text-cyan-400" />
                                                                        <span>{node.name}</span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Campo para seleccionar el propietario */}
                                    <div>
                                        <label className="mt-6 mb-1 block text-sm font-semibold" htmlFor="ownerId">
                                            Owner *
                                        </label>
                                        <div className="relative w-full">
                                            <button
                                                onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                                                className="w-full rounded border border-cyan-600 bg-black px-3 py-2 pr-10 text-left text-sm text-cyan-200 transition-colors duration-200 hover:border-cyan-400"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <User className="h-5 w-5 text-cyan-400" />
                                                    <span>{selectedOwner || 'Select Owner'}</span>
                                                </div>
                                                <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                                            </button>

                                            {showOwnerDropdown && (
                                                <div className="absolute z-50 mt-1 w-full bg-black sm:w-96">
                                                    <input
                                                        type="text"
                                                        placeholder="Start typing to search..."
                                                        value={ownerSearch}
                                                        onChange={handleOwnerSearch}
                                                        className="w-full border-b bg-black px-3 py-2 text-sm text-cyan-200 placeholder:text-cyan-600 focus:outline-none"
                                                    />
                                                    <ul className="max-h-60 overflow-y-auto">
                                                        {owners
                                                            .filter((owner: any) => owner.name.toLowerCase().includes(ownerSearch.toLowerCase()))
                                                            .map((owner: any) => (
                                                                <li
                                                                    key={owner.id}
                                                                    onClick={() => {
                                                                        setSelectedOwner(owner.name);
                                                                        setServer((prev: any) => ({ ...prev, ownerId: owner.id }));
                                                                        setShowOwnerDropdown(false); // Close dropdown on selection
                                                                    }}
                                                                    className="cursor-pointer px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-800"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <User className="h-5 w-5 text-cyan-400" />
                                                                        <span>{owner.name}</span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Campo para seleccionar la asignación primaria */}
                                    <div>
                                        <label className="mt-6 mb-1 block text-sm font-semibold" htmlFor="primaryAllocationId">
                                            Primary Allocation *
                                        </label>
                                        <div className="relative">
                                            <button
                                                onClick={() => {
                                                    setShowPrimaryAllocationDropdown(!showPrimaryAllocationDropdown);
                                                    setShowAdditionalAllocationDropdown(false); // Cerrar el dropdown de asignaciones adicionales si está abierto
                                                }}
                                                className="w-full rounded border border-cyan-600 bg-black px-3 py-2 pr-10 text-left text-sm text-cyan-200 transition-colors duration-200 hover:border-cyan-400"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <MapPinned className="h-5 w-5 text-cyan-400" />
                                                    <span>{selectedPrimaryAllocation || 'Select Primary Allocation'}</span>
                                                </div>
                                                <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                                            </button>

                                            {showPrimaryAllocationDropdown && (
                                                <div className="absolute z-50 mt-1 w-full bg-black">
                                                    <input
                                                        type="text"
                                                        placeholder="Start typing to search..."
                                                        value={primaryAllocationSearch}
                                                        onChange={handlePrimaryAllocationSearch}
                                                        className="w-full border-b bg-black px-3 py-2 text-sm text-cyan-200 placeholder:text-cyan-600 focus:outline-none"
                                                    />
                                                    <ul className="max-h-60 overflow-y-auto">
                                                        {allocations
                                                            .filter((alloc: any) =>
                                                                alloc.ip.toLowerCase().includes(primaryAllocationSearch.toLowerCase()),
                                                            )
                                                            .map((alloc: any) => (
                                                                <li
                                                                    key={alloc.id}
                                                                    onClick={() => {
                                                                        setSelectedPrimaryAllocation(alloc.ip + ':' + alloc.port);
                                                                        setShowPrimaryAllocationDropdown(false); // Cerrar el dropdown de asignaciones
                                                                        setServer((prev: any) => ({ ...prev, primaryAllocationId: alloc.id }));
                                                                    }}
                                                                    className="cursor-pointer px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-800"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <MapPinned className="h-5 w-5 text-cyan-400" />
                                                                        <span>
                                                                            {alloc.ip}:{alloc.port}
                                                                        </span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Campo para seleccionar las asignaciones adicionales */}
                                    <div>
                                        <label className="mt-6 mb-1 block text-sm font-semibold" htmlFor="additionalAllocationIds">
                                            Additional Allocations
                                        </label>
                                        <div className="relative">
                                            <button
                                                onClick={() => {
                                                    setShowAdditionalAllocationDropdown(!showAdditionalAllocationDropdown);
                                                    setShowPrimaryAllocationDropdown(false); // Cerrar el dropdown de asignación primaria si está abierto
                                                }}
                                                className="w-full rounded border border-cyan-600 bg-black px-3 py-2 pr-10 text-left text-sm text-cyan-200 transition-colors duration-200 hover:border-cyan-400"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <MapPinPlus className="h-5 w-5 text-cyan-400" />
                                                    <span>{selectedAdditionalAllocation || 'Select Additional Allocations'}</span>
                                                </div>
                                                <ChevronDown className="absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                                            </button>

                                            {showAdditionalAllocationDropdown && (
                                                <div className="absolute z-50 mt-1 w-full bg-black">
                                                    <input
                                                        type="text"
                                                        placeholder="Start typing to search..."
                                                        value={additionalAllocationSearch}
                                                        onChange={handleAdditionalAllocationSearch}
                                                        className="w-full border-b bg-black px-3 py-2 text-sm text-cyan-200 placeholder:text-cyan-600 focus:outline-none"
                                                    />
                                                    <ul className="max-h-60 overflow-y-auto">
                                                        {allocations
                                                            .filter((alloc: any) =>
                                                                alloc.ip.toLowerCase().includes(additionalAllocationSearch.toLowerCase()),
                                                            )
                                                            .map((alloc: any) => (
                                                                <li
                                                                    key={alloc.id}
                                                                    onClick={() => {
                                                                        setSelectedAdditionalAllocation(alloc.ip + ':' + alloc.port);
                                                                        setShowAdditionalAllocationDropdown(false); // Cerrar el dropdown de asignaciones
                                                                        setServer((prev: any) => ({
                                                                            ...prev,
                                                                            additionalAllocationIds: [...prev.additionalAllocationIds, alloc.id],
                                                                        }));
                                                                    }}
                                                                    className="cursor-pointer px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-800"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        <MapPinPlus className="h-5 w-5 text-cyan-400" />
                                                                        <span>
                                                                            {alloc.ip}:{alloc.port}
                                                                        </span>
                                                                    </div>
                                                                </li>
                                                            ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Campo para ingresar la descripción del servidor */}
                                    <div className="col-span-2">
                                        <label className="mt-6 mb-1 block text-sm font-semibold" htmlFor="description">
                                            Description
                                        </label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            rows={3}
                                            placeholder="Server Description (optional)"
                                            value={server.description}
                                            onChange={handleChange}
                                            className="w-full rounded border border-cyan-600 bg-black px-3 py-2 text-sm text-cyan-200 placeholder:text-cyan-600 focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    {/* Next Step Button */}
                                    <div className="col-span-1 flex justify-end sm:col-span-2">
                                        <button
                                            onClick={nextTab}
                                            className={`rounded border border-cyan-400 bg-cyan-400 px-6 py-2 font-semibold text-black hover:bg-cyan-500 ${
                                                !isInfoValid ? 'cursor-not-allowed opacity-50' : ''
                                            }`}
                                            disabled={!isInfoValid}
                                        >
                                            Next Step
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2 */}
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
                                                className={`px-4 py-2 rounded border ${
                                                    server.runInstallScript
                                                        ? 'bg-cyan-500 text-black border-cyan-400'
                                                        : 'bg-black text-cyan-200 border-cyan-600'
                                                }`}
                                            >
                                                Yes
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setServer({ ...server, runInstallScript: false })}
                                                className={`px-4 py-2 rounded border ${
                                                    !server.runInstallScript
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
                                                className={`px-4 py-2 rounded border ${
                                                    server.startAfterInstall
                                                        ? 'bg-cyan-500 text-black border-cyan-400'
                                                        : 'bg-black text-cyan-200 border-cyan-600'
                                                }`}
                                            >
                                                Yes
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setServer({ ...server, startAfterInstall: false })}
                                                className={`px-4 py-2 rounded border ${
                                                    !server.startAfterInstall
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
                                                rows={2 +  (eggs.find((e) => e.id === Number(server.egg))?.startup || '').split('\n').length}
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
                                            <ChevronDown className={`h-4 w-4 transform transition-transform ${
                                                showVariables ? 'rotate-180' : ''
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

                                {/* Botones de navegación */}
                                <div className="flex justify-between items-center pt-4">
                                    <button
                                        onClick={prevTab}
                                        className="rounded border border-cyan-400 bg-cyan-300 px-6 py-2 font-semibold text-black hover:bg-cyan-400"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={nextTab}
                                        className={`rounded border border-cyan-400 bg-cyan-400 px-6 py-2 font-semibold text-black hover:bg-cyan-500 ${
                                            !isEggValid ? 'cursor-not-allowed opacity-50' : ''
                                        }`}
                                        disabled={!isEggValid}
                                    >
                                        Next Step
                                    </button>
                                </div>
                            </div>
                        )} 

                        {/* Step 3 */}
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
                                                            className={`px-4 py-2 rounded border font-medium ${
                                                                server[key] === value
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
                                                        className={`px-4 py-2 rounded border font-medium ${
                                                            server.cpuPinning === val
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
                                                        className={`px-4 py-2 rounded border font-medium ${
                                                            server.swapMemory === value
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
                                                        className={`px-4 py-2 rounded border font-medium ${
                                                            server.oomKiller === val
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

                                {/* Botones */}
                                <div className="flex justify-between pt-4">
                                    <button
                                        onClick={prevTab}
                                        className="rounded border border-cyan-400 bg-cyan-300 px-6 py-2 font-semibold text-black hover:bg-cyan-400"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        className="rounded border border-cyan-400 bg-cyan-400 px-6 py-2 font-semibold text-black hover:bg-cyan-500"
                                    >
                                        Create Server
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}