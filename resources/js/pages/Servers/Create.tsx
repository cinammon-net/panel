/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { ChevronDown, MapPin, MapPinned, MapPinPlus, Server, User } from 'lucide-react';
import { ChangeEvent, useState } from 'react';
import { usePage as inertiaUsePage } from '@inertiajs/react';

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
        eggId: '',
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

    // Validaciones básicas para permitir pasar de pestaña
    const isInfoValid = server.name.trim() !== '' && server.nodeId !== '' && server.ownerId !== '' && server.primaryAllocationId !== '';
    const isEggValid = server.startupCommand.trim() !== '' && server.eggId !== '';

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
            primary_allocation_id: server.primaryAllocationId,
            additional_allocation_ids: server.additionalAllocationIds,
            description: server.description || null,

            egg_id: server.eggId,
            run_install_script: server.runInstallScript ? 1 : 0,
            start_after_install: server.startAfterInstall ? 1 : 0,
            startup_command: server.startupCommand,

            cpu_limit: server.cpuLimit === 'unlimited' ? 0 : 1,
            memory_limit: server.memoryLimit === 'unlimited' ? 0 : 1,
            disk_limit: server.diskLimit === 'unlimited' ? 0 : 1,
            cpu_pinning: server.cpuPinning ? 1 : 0,
            swap_memory: server.swapMemory === 'unlimited' ? 0 : server.swapMemory === 'disabled' ? -1 : 1,
            oom_killer: server.oomKiller ? 1 : 0,
            backups: server.backups,
            docker_image: server.dockerImage,
            install_script: server.installScript,
        };

        // Solo actualiza el estado sin redirigir ni hacer cambios en la URL
        alert('Servidor creado correctamente');
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

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
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
                            <div className="sm:grid-cols- grid grid-cols-1 gap-6">
                                <div className="col-span-2">
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="egg">
                                        Egg
                                    </label>
                                    <select
                                        id="egg"
                                        name="egg"
                                        value={server.egg}
                                        onChange={(e) => setServer({ ...server, egg: e.target.value })}
                                        className="w-full rounded border border-cyan-600 bg-black px-3 py-2 text-sm text-cyan-200 placeholder:text-cyan-600 focus:outline-none"
                                    >
                                        <option value="">Select Egg</option>
                                        {eggs.map((egg) => (
                                            <option key={egg.id} value={egg.id}>
                                                {egg.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Next Step Button */}
                                <div className="col-span-2 flex justify-end">
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
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
function usePage() {
    return inertiaUsePage();
}

