/* eslint-disable @typescript-eslint/no-unused-vars */
import UserAvatar from '@/components/user-avatar';
import EggIcon from '@/components/EggIcon';
/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Archive, ChevronDown, Cpu, Database as DatabaseIcon, Egg, HardDrive, Layers, MapPinned, MapPinPlus, Network, Server, Shield, SlidersHorizontal, Terminal, Trash, User, Zap } from 'lucide-react';
import { ChangeEvent, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, useState } from 'react';
import { usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';

const tabs = [
    { id: 'info', title: 'Information', icon: Server },
    { id: 'egg', title: 'Egg Configuration', icon: Egg },
    { id: 'env', title: 'Environment Configuration', icon: Cpu },
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
        cpu: 0,
        memory: 0,
        disk: 0,
        swap: 0,
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
    
            cpu: server.cpuLimit === 'unlimited' ? 0 : (parseInt(server.cpu, 10) || 0),
            memory: server.memoryLimit === 'unlimited' ? 0 : (parseInt(server.memory, 10) || 0),
            disk: server.diskLimit === 'unlimited' ? 0 : (parseInt(server.disk, 10) || 0),
            swap: parseInt(server.swap, 10) || 0,
            cpu_pinning: server.cpuPinning ? 1 : 0,
            swap_memory: server.swapMemory,
            oom_killer: server.oomKiller ? 1 : 0,
            backups: server.backups,
            image: server.dockerImage,
            install_script: server.installScript,
        };
    
        router.post('/servers', payload, {
            onSuccess: () => {
                toast.success('Server created successfully!');
                router.visit('/servers');
            },
            onError: (errors) => {
                console.error(errors);
                toast.error('Error creating server: ' + JSON.stringify(errors));
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
                    <div className="flex items-center gap-3">
                        <Server className="h-7 w-7 text-cyan-400" />
                        <h1 className="text-2xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400">
                            CREATE SERVER
                        </h1>
                    </div>
                </div>

                <div className="">
                    <div className="rounded-lg border border-cyan-500/40 bg-black/90 p-6">
                        {/* Tabs */}
                        <div className="mb-6 flex flex-col space-y-2 border-b border-cyan-500/40 sm:flex-row sm:space-y-0 sm:space-x-8">
                            {tabs.map((tab) => {
                                const TabIcon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            if ((tab.id === 'egg' && isInfoValid) || (tab.id === 'env' && isEggValid) || tab.id === activeTab) {
                                                setActiveTab(tab.id);
                                            }
                                        }}
                                        className={`flex w-full items-center justify-center gap-2 pb-2.5 text-base font-semibold tracking-wide transition sm:w-auto ${
                                            activeTab === tab.id
                                                ? 'border-b-2 border-cyan-400 text-cyan-400'
                                                : 'border-b-2 border-transparent text-slate-400 hover:text-cyan-300'
                                        }`}
                                        disabled={(tab.id === 'egg' && !isInfoValid) || (tab.id === 'env' && !isEggValid)}
                                    >
                                        <TabIcon className="h-4 w-4 shrink-0" />
                                        <span>{tab.title}</span>
                                    </button>
                                );
                            })}
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
                                                                        setServer((prev: any) =>
                                                                            prev.nodeId === node.id
                                                                                ? prev
                                                                                : { ...prev, nodeId: node.id, primaryAllocationId: '', additionalAllocationIds: [] },
                                                                        );
                                                                        setSelectedPrimaryAllocation(null);
                                                                        setSelectedAdditionalAllocation(null);
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
                                                    {(() => {
                                                        const chosen = owners.find((o: any) => String(o.id) === String(server.ownerId));
                                                        return chosen ? (
                                                            <UserAvatar name={chosen.name} src={chosen.avatar_url} size={20} fallbackClassName="bg-cyan-800 text-cyan-100" />
                                                        ) : (
                                                            <User className="h-5 w-5 text-cyan-400" />
                                                        );
                                                    })()}
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
                                                                        <UserAvatar name={owner.name} src={owner.avatar_url} size={20} fallbackClassName="bg-cyan-800 text-cyan-100" />
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
                                                            .filter(
                                                                (alloc: any) =>
                                                                    (!server.nodeId || String(alloc.node_id) === String(server.nodeId)) &&
                                                                    `${alloc.ip}:${alloc.port}`.includes(primaryAllocationSearch.trim()),
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
                                                            .filter(
                                                                (alloc: any) =>
                                                                    (!server.nodeId || String(alloc.node_id) === String(server.nodeId)) &&
                                                                    alloc.id !== server.primaryAllocationId &&
                                                                    !server.additionalAllocationIds.includes(alloc.id) &&
                                                                    `${alloc.ip}:${alloc.port}`.includes(additionalAllocationSearch.trim()),
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
                                    <div className="sm:col-span-2">
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
                                            {(() => {
                                                const selected = eggs.find((e) => e.id === Number(server.egg));
                                                return selected ? (
                                                    <span className="pointer-events-none absolute left-2">
                                                        <EggIcon src={selected.image_url} category={selected.category} name={selected.name} size={22} />
                                                    </span>
                                                ) : (
                                                    <Egg className="absolute left-2 h-5 w-5 text-cyan-500 pointer-events-none" />
                                                );
                                            })()}
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
                                {/* Resource Limits Header */}
                                <div>
                                    <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
                                        <Cpu className="h-4 w-4 text-amber-400" />
                                        <h3 className="font-orbitron text-xs font-bold uppercase tracking-wider text-amber-300">
                                            Cuotas Principales de Hardware & Recursos
                                        </h3>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-5">
                                        {/* CPU Card */}
                                        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/95 to-neutral-950/95 p-5 shadow-xl backdrop-blur-md transition hover:border-amber-500/40">
                                            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                                                        <Cpu className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-orbitron text-xs font-bold text-white">CPU / Procesador</h4>
                                                        <span className="text-[10px] text-neutral-400">Cuota de ciclos</span>
                                                    </div>
                                                </div>
                                                <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${server.cpuLimit === 'unlimited' ? 'border border-neutral-700 bg-neutral-800 text-neutral-300' : 'border border-amber-500/40 bg-amber-500/10 text-amber-400'}`}>
                                                    {server.cpuLimit === 'unlimited' ? 'Ilimitado' : `${server.cpu || 100}% (${Math.max(1, Math.round((server.cpu || 100) / 100))} Hilo${(server.cpu || 100) > 100 ? 's' : ''})`}
                                                </span>
                                            </div>

                                            <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-1 flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, cpuLimit: 'unlimited', cpu: 0 })}
                                                    className={`flex-1 rounded-lg py-1.5 text-center font-orbitron text-[11px] font-bold uppercase tracking-wider transition ${server.cpuLimit === 'unlimited' ? 'bg-gradient-to-r from-neutral-200 to-white text-black shadow-md' : 'text-neutral-400 hover:text-white'}`}
                                                >
                                                    Ilimitado
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, cpuLimit: 'limited', cpu: server.cpu || 100 })}
                                                    className={`flex-1 rounded-lg py-1.5 text-center font-orbitron text-[11px] font-bold uppercase tracking-wider transition ${server.cpuLimit === 'limited' ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'text-neutral-400 hover:text-white'}`}
                                                >
                                                    Limitado
                                                </button>
                                            </div>

                                            {server.cpuLimit === 'limited' && (
                                                <div className="mt-4 space-y-3">
                                                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400">
                                                        <input
                                                            type="number"
                                                            min={10}
                                                            max={1600}
                                                            step={10}
                                                            value={server.cpu || 100}
                                                            onChange={(e) => setServer({ ...server, cpu: parseInt(e.target.value, 10) || 0 })}
                                                            className="w-full bg-transparent font-mono text-base font-bold text-white outline-none"
                                                            placeholder="100"
                                                        />
                                                        <span className="font-mono text-xs font-semibold text-amber-400/80 shrink-0">%</span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[50, 100, 200, 300, 400].map((pct) => (
                                                            <button
                                                                key={pct}
                                                                type="button"
                                                                onClick={() => setServer({ ...server, cpu: pct })}
                                                                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold transition ${server.cpu === pct ? 'border-amber-400 bg-amber-400 text-black' : 'border-white/10 bg-white/5 text-neutral-300 hover:border-white/20'}`}
                                                            >
                                                                {pct}%
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[11px] text-neutral-400">100% asigna 1 núcleo/hilo dedicado sin contención.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* RAM Card */}
                                        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/95 to-neutral-950/95 p-5 shadow-xl backdrop-blur-md transition hover:border-pink-500/40">
                                            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-400">
                                                        <Zap className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-orbitron text-xs font-bold text-white">Memoria RAM</h4>
                                                        <span className="text-[10px] text-neutral-400">Asignación DDR4/DDR5</span>
                                                    </div>
                                                </div>
                                                <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${server.memoryLimit === 'unlimited' ? 'border border-neutral-700 bg-neutral-800 text-neutral-300' : 'border border-pink-500/40 bg-pink-500/10 text-pink-400'}`}>
                                                    {server.memoryLimit === 'unlimited' ? 'Ilimitada' : `${server.memory >= 1024 ? `${(server.memory / 1024).toFixed(1)} GB` : `${server.memory} MB`}`}
                                                </span>
                                            </div>

                                            <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-1 flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, memoryLimit: 'unlimited', memory: 0 })}
                                                    className={`flex-1 rounded-lg py-1.5 text-center font-orbitron text-[11px] font-bold uppercase tracking-wider transition ${server.memoryLimit === 'unlimited' ? 'bg-gradient-to-r from-neutral-200 to-white text-black shadow-md' : 'text-neutral-400 hover:text-white'}`}
                                                >
                                                    Ilimitada
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, memoryLimit: 'limited', memory: server.memory || 3072 })}
                                                    className={`flex-1 rounded-lg py-1.5 text-center font-orbitron text-[11px] font-bold uppercase tracking-wider transition ${server.memoryLimit === 'limited' ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-[0_0_15px_rgba(236,72,153,0.4)]' : 'text-neutral-400 hover:text-white'}`}
                                                >
                                                    Limitada
                                                </button>
                                            </div>

                                            {server.memoryLimit === 'limited' && (
                                                <div className="mt-4 space-y-3">
                                                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500">
                                                        <input
                                                            type="number"
                                                            min={256}
                                                            step={256}
                                                            value={server.memory || 3072}
                                                            onChange={(e) => setServer({ ...server, memory: parseInt(e.target.value, 10) || 0 })}
                                                            className="w-full bg-transparent font-mono text-base font-bold text-white outline-none"
                                                            placeholder="3072"
                                                        />
                                                        <span className="font-mono text-xs font-semibold text-pink-400/80 shrink-0">MiB</span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[
                                                            { label: '1 GB', val: 1024 },
                                                            { label: '2 GB', val: 2048 },
                                                            { label: '3 GB', val: 3072 },
                                                            { label: '4 GB', val: 4096 },
                                                            { label: '8 GB', val: 8192 },
                                                            { label: '16 GB', val: 16384 },
                                                        ].map(({ label, val }) => (
                                                            <button
                                                                key={val}
                                                                type="button"
                                                                onClick={() => setServer({ ...server, memory: val })}
                                                                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold transition ${server.memory === val ? 'border-pink-500 bg-pink-500 text-white' : 'border-white/10 bg-white/5 text-neutral-300 hover:border-white/20'}`}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[11px] text-neutral-400">1024 MiB = 1 GB. Aislamiento estricto de memoria en cgroups.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Disco Card */}
                                        <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-neutral-900/95 to-neutral-950/95 p-5 shadow-xl backdrop-blur-md transition hover:border-cyan-500/40">
                                            <div className="flex items-center justify-between pb-3 border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                                                        <HardDrive className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-orbitron text-xs font-bold text-white">Espacio en Disco</h4>
                                                        <span className="text-[10px] text-neutral-400">Almacenamiento NVMe</span>
                                                    </div>
                                                </div>
                                                <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${server.diskLimit === 'unlimited' ? 'border border-neutral-700 bg-neutral-800 text-neutral-300' : 'border border-cyan-500/40 bg-cyan-500/10 text-cyan-400'}`}>
                                                    {server.diskLimit === 'unlimited' ? 'Ilimitado' : `${server.disk >= 1024 ? `${(server.disk / 1024).toFixed(1)} GB` : `${server.disk} MB`}`}
                                                </span>
                                            </div>

                                            <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-1 flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, diskLimit: 'unlimited', disk: 0 })}
                                                    className={`flex-1 rounded-lg py-1.5 text-center font-orbitron text-[11px] font-bold uppercase tracking-wider transition ${server.diskLimit === 'unlimited' ? 'bg-gradient-to-r from-neutral-200 to-white text-black shadow-md' : 'text-neutral-400 hover:text-white'}`}
                                                >
                                                    Ilimitado
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setServer({ ...server, diskLimit: 'limited', disk: server.disk || 10240 })}
                                                    className={`flex-1 rounded-lg py-1.5 text-center font-orbitron text-[11px] font-bold uppercase tracking-wider transition ${server.diskLimit === 'limited' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]' : 'text-neutral-400 hover:text-white'}`}
                                                >
                                                    Limitado
                                                </button>
                                            </div>

                                            {server.diskLimit === 'limited' && (
                                                <div className="mt-4 space-y-3">
                                                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 focus-within:border-cyan-400 focus-within:ring-1 focus-within:ring-cyan-400">
                                                        <input
                                                            type="number"
                                                            min={1024}
                                                            step={1024}
                                                            value={server.disk || 10240}
                                                            onChange={(e) => setServer({ ...server, disk: parseInt(e.target.value, 10) || 0 })}
                                                            className="w-full bg-transparent font-mono text-base font-bold text-white outline-none"
                                                            placeholder="10240"
                                                        />
                                                        <span className="font-mono text-xs font-semibold text-cyan-400/80 shrink-0">MiB</span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1.5">
                                                        {[
                                                            { label: '5 GB', val: 5120 },
                                                            { label: '10 GB', val: 10240 },
                                                            { label: '20 GB', val: 20480 },
                                                            { label: '50 GB', val: 51200 },
                                                            { label: '100 GB', val: 102400 },
                                                        ].map(({ label, val }) => (
                                                            <button
                                                                key={val}
                                                                type="button"
                                                                onClick={() => setServer({ ...server, disk: val })}
                                                                className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold transition ${server.disk === val ? 'border-cyan-400 bg-cyan-400 text-black' : 'border-white/10 bg-white/5 text-neutral-300 hover:border-white/20'}`}
                                                            >
                                                                {label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[11px] text-neutral-400">Cuota fija en el directorio /var/lib/cinammon/volumes.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Advanced Limits */}
                                <div>
                                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                                        <SlidersHorizontal className="h-4 w-4 text-cyan-400" />
                                        <h3 className="font-orbitron text-xs font-bold uppercase tracking-wider text-neutral-300">
                                            Límites Avanzados & Políticas de Kernel
                                        </h3>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-5">
                                        {/* CPU Pinning */}
                                        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-5 backdrop-blur-md">
                                            <div className="flex items-center gap-2">
                                                <Cpu className="h-4 w-4 text-emerald-400" />
                                                <h4 className="font-orbitron text-xs font-bold text-white">CPU Pinning</h4>
                                            </div>
                                            <p className="mt-1 text-xs text-neutral-400">
                                                Fija la afinidad del contenedor a hilos de procesador específicos.
                                            </p>
                                            <div className="mt-4 flex rounded-xl border border-white/10 bg-black/60 p-1 gap-1">
                                                {[false, true].map((val) => (
                                                    <button
                                                        key={val.toString()}
                                                        type="button"
                                                        onClick={() => setServer({ ...server, cpuPinning: val })}
                                                        className={`flex-1 rounded-lg py-1.5 text-center font-orbitron text-[11px] font-bold uppercase tracking-wider transition ${server.cpuPinning === val ? (val ? 'bg-emerald-500 text-black shadow-md' : 'bg-neutral-800 text-white border border-white/10') : 'text-neutral-400 hover:text-white'}`}
                                                    >
                                                        {val ? 'Activado' : 'Desactivado'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Swap Memory */}
                                        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-5 backdrop-blur-md">
                                            <div className="flex items-center gap-2">
                                                <SlidersHorizontal className="h-4 w-4 text-amber-400" />
                                                <h4 className="font-orbitron text-xs font-bold text-white">Memoria Swap</h4>
                                            </div>
                                            <p className="mt-1 text-xs text-neutral-400">
                                                Paginación en almacenamiento secundario ante picos de carga.
                                            </p>
                                            <div className="mt-4 flex rounded-xl border border-white/10 bg-black/60 p-1 gap-1">
                                                {['unlimited', 'limited', 'disabled'].map((value) => (
                                                    <button
                                                        key={value}
                                                        type="button"
                                                        onClick={() => setServer({ ...server, swapMemory: value })}
                                                        className={`flex-1 rounded-lg py-1.5 text-center font-orbitron text-[10px] font-bold uppercase tracking-wider transition ${server.swapMemory === value ? (value === 'disabled' ? 'bg-rose-600 text-white' : 'bg-amber-400 text-black font-extrabold') : 'text-neutral-400 hover:text-white'}`}
                                                    >
                                                        {value === 'unlimited' ? 'Ilimit.' : value === 'limited' ? 'Limit.' : 'Off'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* OOM Killer */}
                                        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-5 backdrop-blur-md">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-pink-400" />
                                                <h4 className="font-orbitron text-xs font-bold text-white">Protección OOM Killer</h4>
                                            </div>
                                            <p className="mt-1 text-xs text-neutral-400">
                                                Detiene procesos que desbordan la memoria para blindar el nodo.
                                            </p>
                                            <div className="mt-4 flex rounded-xl border border-white/10 bg-black/60 p-1 gap-1">
                                                {[true, false].map((val) => (
                                                    <button
                                                        key={val.toString()}
                                                        type="button"
                                                        onClick={() => setServer({ ...server, oomKiller: val })}
                                                        className={`flex-1 rounded-lg py-1.5 text-center font-orbitron text-[11px] font-bold uppercase tracking-wider transition ${server.oomKiller === val ? (val ? 'bg-emerald-500 text-black shadow-md' : 'bg-neutral-800 text-white border border-white/10') : 'text-neutral-400 hover:text-white'}`}
                                                    >
                                                        {val ? 'Activo' : 'Inactivo'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Feature Limits */}
                                <div>
                                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                                        <Network className="h-4 w-4 text-purple-400" />
                                        <h3 className="font-orbitron text-xs font-bold uppercase tracking-wider text-neutral-300">
                                            Límites de Características & Asignaciones
                                        </h3>
                                    </div>

                                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
                                        {/* Allocations */}
                                        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-5 backdrop-blur-md">
                                            <div className="flex items-center justify-between">
                                                <span className="font-orbitron text-xs font-bold text-white">Puertos (Allocations)</span>
                                                <Network className="h-4 w-4 text-purple-400" />
                                            </div>
                                            <p className="mt-1 text-[11px] text-neutral-400">Cantidad máxima de puertos adicionales asignables.</p>
                                            <input
                                                type="number"
                                                min={0}
                                                value={server.allocations ?? 0}
                                                onChange={(e) => setServer({ ...server, allocations: parseInt(e.target.value, 10) || 0 })}
                                                className="mt-3 w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-purple-400 focus:outline-none"
                                            />
                                        </div>

                                        {/* Databases */}
                                        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-5 backdrop-blur-md">
                                            <div className="flex items-center justify-between">
                                                <span className="font-orbitron text-xs font-bold text-white">Bases de Datos</span>
                                                <DatabaseIcon className="h-4 w-4 text-amber-400" />
                                            </div>
                                            <p className="mt-1 text-[11px] text-neutral-400">Número máximo de instancias MariaDB permitidas.</p>
                                            <input
                                                type="number"
                                                min={0}
                                                value={server.database_limit ?? 0}
                                                onChange={(e) => setServer({ ...server, database_limit: parseInt(e.target.value, 10) || 0 })}
                                                className="mt-3 w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-amber-400 focus:outline-none"
                                            />
                                        </div>

                                        {/* Backups */}
                                        <div className="rounded-2xl border border-white/10 bg-neutral-900/80 p-5 backdrop-blur-md">
                                            <div className="flex items-center justify-between">
                                                <span className="font-orbitron text-xs font-bold text-white">Copias de Seguridad</span>
                                                <Archive className="h-4 w-4 text-cyan-400" />
                                            </div>
                                            <p className="mt-1 text-[11px] text-neutral-400">Número máximo de respaldos y snapshots guardados.</p>
                                            <input
                                                type="number"
                                                min={0}
                                                value={server.backups ?? 0}
                                                onChange={(e) => setServer({ ...server, backups: parseInt(e.target.value, 10) || 0 })}
                                                className="mt-3 w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2 font-mono text-sm font-bold text-white focus:border-cyan-400 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Docker Settings */}
                                <div>
                                    <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                                        <Layers className="h-4 w-4 text-amber-400" />
                                        <h3 className="font-orbitron text-xs font-bold uppercase tracking-wider text-neutral-300">
                                            Configuración de Contenedor Docker
                                        </h3>
                                    </div>

                                    <div className="mt-4 rounded-2xl border border-white/10 bg-neutral-900/80 p-5 backdrop-blur-md shadow-xl space-y-5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            {/* Image Name como SELECT */}
                                            <div>
                                                <label className="mb-1.5 block font-orbitron text-xs font-bold text-neutral-300">
                                                    Imagen Predefinida
                                                </label>
                                                <select
                                                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 font-mono text-sm text-neutral-200 focus:border-amber-400 focus:outline-none"
                                                    value={server.dockerImage}
                                                    onChange={(e) => setServer({ ...server, dockerImage: e.target.value })}
                                                >
                                                    <option value="">Seleccionar imagen...</option>
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
                                                <label className="mb-1.5 block font-orbitron text-xs font-bold text-neutral-300">
                                                    URI del Contenedor Docker <span className="text-amber-400">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full rounded-xl border border-white/10 bg-black/60 px-3.5 py-2.5 font-mono text-sm text-amber-300 focus:border-amber-400 focus:outline-none"
                                                    value={server.dockerImage || ''}
                                                    onChange={(e) => setServer({ ...server, dockerImage: e.target.value })}
                                                />
                                            </div>
                                        </div>

                                        {/* Tabla de container labels */}
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="font-orbitron text-xs font-bold text-neutral-300">
                                                    Etiquetas de Contenedor (Labels)
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = [...(server.labels || [])];
                                                        updated.push({ title: '', description: '' });
                                                        setServer({ ...server, labels: updated });
                                                    }}
                                                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-orbitron text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition"
                                                >
                                                    + Añadir Etiqueta
                                                </button>
                                            </div>

                                            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                                                <table className="w-full border-collapse text-left text-xs">
                                                    <thead>
                                                        <tr className="border-b border-white/10 bg-white/5 font-orbitron text-[11px] text-neutral-400 uppercase tracking-wider">
                                                            <th className="px-3.5 py-2.5">Clave / Título</th>
                                                            <th className="px-3.5 py-2.5">Valor / Descripción</th>
                                                            <th className="px-3.5 py-2.5 text-right w-12">Acción</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/5 font-mono">
                                                        {server.labels?.map((label: any, index: number) => (
                                                            <tr key={index} className="hover:bg-white/[0.02]">
                                                                <td className="p-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="clave"
                                                                        className="w-full rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                                                                        value={label.title}
                                                                        onChange={(e) => {
                                                                            const updated = [...server.labels];
                                                                            updated[index].title = e.target.value;
                                                                            setServer({ ...server, labels: updated });
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="p-2">
                                                                    <input
                                                                        type="text"
                                                                        placeholder="valor"
                                                                        className="w-full rounded-lg border border-white/10 bg-black/60 px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                                                                        value={label.description}
                                                                        onChange={(e) => {
                                                                            const updated = [...server.labels];
                                                                            updated[index].description = e.target.value;
                                                                            setServer({ ...server, labels: updated });
                                                                        }}
                                                                    />
                                                                </td>
                                                                <td className="p-2 text-right">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const updated = [...server.labels];
                                                                            updated.splice(index, 1);
                                                                            setServer({ ...server, labels: updated });
                                                                        }}
                                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                                                                    >
                                                                        <Trash size={14} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {(!server.labels || server.labels.length === 0) && (
                                                            <tr>
                                                                <td colSpan={3} className="py-4 text-center text-xs text-neutral-500 italic">
                                                                    No hay etiquetas personalizadas asignadas a este contenedor.
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>

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