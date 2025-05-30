/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import Editor from '@monaco-editor/react';
import { useState } from 'react';
import { Server, ChevronDown, User, Layers, MapPinned, MapPinPlus } from 'lucide-react';

const tabs = [
    { id: 'info', title: 'Information' },
    { id: 'egg', title: 'Egg Configuration' },
    { id: 'env', title: 'Environment Configuration' },
];

export default function CreateServer() {
    const { nodes = [], owners = [], allocations = [], eggs = [] } = usePage().props as {
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

        router.post('/servers', payload, {
            onSuccess: () => alert('Servidor creado correctamente'),
            onError: (errors) => alert('Error al crear servidor: ' + JSON.stringify(errors)),
        });
    };

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
                    <h1 className="text-3xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400 dark:drop-shadow-[0_0_5px_#0ff]">
                        CREATE SERVER
                    </h1>
                </div>

                <div className="">
                    <div className="rounded-lg border border-cyan-500 bg-black/90 p-6">
                        {/* Tabs */}
                        <div className="mb-6 flex space-x-8 border-b-2 border-cyan-500">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        if ((tab.id === 'egg' && isInfoValid) || (tab.id === 'env' && isEggValid) || tab.id === activeTab) {
                                            setActiveTab(tab.id);
                                        }
                                    }}
                                    className={`pb-2 text-lg font-semibold tracking-wide transition ${
                                        activeTab === tab.id
                                            ? 'border-b-4 border-cyan-400 text-cyan-400'
                                            : 'border-b-4 border-transparent hover:text-cyan-500'
                                    }`}
                                    disabled={(tab.id === 'egg' && !isInfoValid) || (tab.id === 'env' && !isEggValid)}
                                >
                                    {tab.title}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'info' && (
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    {/* Campo para ingresar el nombre del servidor */}
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
                                            className="border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                        />
                                    </div>

                                    {/* Campo para seleccionar el nodo del servidor */}
                                    <label className="mt-6 mb-1 block text-sm font-semibold" htmlFor="nodeId">
                                        Node *
                                    </label>
                                    <div className="inline-flex w-full items-center overflow-hidden rounded-md border border-cyan-700 text-sm text-cyan-600 dark:border-cyan-700 dark:bg-neutral-950">
                                        {/* Icono con borde derecho para la línea divisoria */}
                                        <span className="flex items-center border-r px-3 py-2 text-cyan-600 dark:text-cyan-400">
                                            <Server className="h-5 w-5" />
                                        </span>

                                        {/* Select con padding y flecha */}
                                        <div className="relative flex-grow">
                                            <select
                                                id="nodeId"
                                                name="nodeId"
                                                value={server.nodeId}
                                                onChange={handleChange}
                                                className="w-full appearance-none bg-transparent px-4 py-2 pr-8 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                            >
                                                <option value="">Select Node</option>
                                                {(nodes || []).map((node: any) => (
                                                    <option key={node.id} value={node.id}>
                                                        {node.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {/* Icono flecha a la derecha */}
                                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                                        </div>
                                    </div>

                                    {/* Campo para seleccionar la asignación primaria */}
                                    <label className="mt-6 mb-1 block text-sm font-semibold" htmlFor="primaryAllocationId">
                                        Primary Allocation *
                                    </label>
                                    <div className="inline-flex w-full items-center overflow-hidden rounded-md border border-cyan-700 text-sm text-cyan-600 dark:border-cyan-700 dark:bg-neutral-950">
                                        {/* Icono a la izquierda con borde derecho menos marcado */}
                                        <span className="flex items-center border-r px-3 py-2 text-cyan-600 dark:text-cyan-400">
                                            <MapPinned />
                                        </span>

                                        {/* Select con padding y ancho completo */}
                                        <div className="relative flex-grow">
                                            <select
                                                id="primaryAllocationId"
                                                name="primaryAllocationId"
                                                value={server.primaryAllocationId}
                                                onChange={handleChange}
                                                className="w-full appearance-none bg-transparent px-4 py-3 pr-8 text-sm text-cyan-400 placeholder-cyan-700 focus:outline-none"
                                            >
                                                <option value="">Select Allocation</option>
                                                {(allocations || []).map((alloc: any) => (
                                                    <option key={alloc.id} value={alloc.id}>
                                                        {alloc.ip}:{alloc.port}
                                                    </option>
                                                ))}
                                            </select>
                                            {/* Flecha a la derecha */}
                                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                                        </div>
                                    </div>
                                </div>

                                {/* Campo para ID externo y propietario */}
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="externalId">
                                        External ID
                                    </label>
                                    <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
                                        <Server className="ml-2 h-5 w-5 text-cyan-500" />
                                        <input
                                            id="externalId"
                                            name="externalId"
                                            type="text"
                                            placeholder="External ID (optional)"
                                            value={server.name}
                                            onChange={handleChange}
                                            className="border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                        />
                                    </div>

                                    {/* Campo para seleccionar el propietario del servidor */}
                                    <label className="mt-6 mb-1 block text-sm font-semibold" htmlFor="ownerId">
                                        Owner *
                                    </label>
                                    <div className="inline-flex w-full items-center overflow-hidden rounded-md border border-cyan-700 text-sm text-cyan-600 dark:border-cyan-700 dark:bg-neutral-950">
                                        {/* Icono a la izquierda con borde derecho suave */}
                                        <span className="border-opacity-30 flex items-center border-r border-cyan-700 px-3 py-2 text-cyan-600 dark:text-cyan-400">
                                            <User className="h-5 w-5" />
                                        </span>

                                        {/* Select con padding y ancho completo */}
                                        <div className="relative flex-grow">
                                            <select
                                                id="ownerId"
                                                name="ownerId"
                                                value={server.ownerId}
                                                onChange={handleChange}
                                                className="w-full appearance-none bg-transparent px-4 py-3 pr-8 text-sm text-cyan-400 placeholder-cyan-700 focus:outline-none"
                                            >
                                                <option value="">Select Owner</option>
                                                {(owners || []).map((owner: any) => (
                                                    <option key={owner.id} value={owner.id}>
                                                        {owner.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {/* Flecha a la derecha */}
                                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                                        </div>
                                    </div>

                                    {/* Campo para asignaciones adicionales */}
                                    <label className="mt-6 mb-1 block text-sm font-semibold" htmlFor="additionalAllocationIds">
                                        Additional Allocations
                                    </label>
                                    <div className="inline-flex w-full items-center overflow-hidden rounded-md border border-cyan-700 text-sm text-cyan-600 dark:border-cyan-700 dark:bg-neutral-950">
                                        {/* Icono con borde derecho suave */}
                                        <span className="border-opacity-30 flex items-center border-r border-cyan-700 px-3 py-2 text-cyan-600 dark:text-cyan-400">
                                            <MapPinPlus className="h-5 w-5" />
                                        </span>

                                        {/* Select con padding y ancho completo */}
                                        <div className="relative flex-grow">
                                            <select
                                                id="ownerId"
                                                name="ownerId"
                                                value={server.ownerId}
                                                onChange={handleChange}
                                                className="w-full appearance-none bg-transparent px-4 py-3 pr-8 text-sm text-cyan-400 placeholder-cyan-700 focus:outline-none"
                                            >
                                                <option value="">Select Allocations</option>
                                                {(allocations || []).map((alloc: any) => (
                                                    <option key={alloc.id} value={alloc.id}>
                                                        {alloc.ip}:{alloc.port}
                                                    </option>
                                                ))}
                                            </select>
                                            {/* Flecha a la derecha */}
                                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-cyan-400" />
                                        </div>
                                        <div className="flex items-center px-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setServer((prev: any) => ({
                                                        ...prev,
                                                        additionalAllocationIds: [...prev.additionalAllocationIds, ''],
                                                    }))
                                                }
                                                className="text-cyan-400 hover:text-cyan-500"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    {/* Campo para la descripción del servidor */}
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="description">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={3}
                                        value={server.description}
                                        onChange={handleChange}
                                        className="w-full rounded border border-cyan-400 bg-black p-3 text-cyan-400 placeholder-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                                    ></textarea>
                                </div>

                                <div className="col-span-2 flex justify-end">
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
                        )}

                        {activeTab === 'egg' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="eggId">
                                        Egg *
                                    </label>
                                    <select
                                        id="eggId"
                                        name="eggId"
                                        value={server.eggId}
                                        onChange={handleChange}
                                        className="w-full rounded border border-cyan-400 bg-black p-3 text-cyan-400 placeholder-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                                    >
                                        <option value="">Select Egg</option>
                                        {(eggs || []).map((egg: any) => (
                                            <option key={egg.id} value={egg.id}>
                                                {egg.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold">Run Install Script?</label>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setServer((prev: any) => ({ ...prev, runInstallScript: true }))}
                                            className={`rounded px-4 py-2 ${
                                                server.runInstallScript ? 'bg-cyan-400 text-black' : 'border border-cyan-400 bg-black text-cyan-400'
                                            }`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setServer((prev: any) => ({ ...prev, runInstallScript: false }))}
                                            className={`rounded px-4 py-2 ${
                                                !server.runInstallScript ? 'bg-cyan-400 text-black' : 'border border-cyan-400 bg-black text-cyan-400'
                                            }`}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold">Start After Install?</label>
                                    <div className="flex gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setServer((prev: any) => ({ ...prev, startAfterInstall: true }))}
                                            className={`rounded px-4 py-2 ${
                                                server.startAfterInstall ? 'bg-cyan-400 text-black' : 'border border-cyan-400 bg-black text-cyan-400'
                                            }`}
                                        >
                                            Yes
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setServer((prev: any) => ({ ...prev, startAfterInstall: false }))}
                                            className={`rounded px-4 py-2 ${
                                                !server.startAfterInstall ? 'bg-cyan-400 text-black' : 'border border-cyan-400 bg-black text-cyan-400'
                                            }`}
                                        >
                                            No
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="startupCommand">
                                        Startup Command *
                                    </label>
                                    <textarea
                                        id="startupCommand"
                                        name="startupCommand"
                                        rows={3}
                                        value={server.startupCommand}
                                        onChange={handleChange}
                                        className="w-full rounded border border-cyan-400 bg-black p-3 font-mono text-cyan-400 placeholder-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                                    ></textarea>
                                </div>

                                <button
                                    onClick={prevTab}
                                    className="mr-4 rounded border border-cyan-400 bg-transparent px-6 py-2 font-semibold text-cyan-400 hover:bg-cyan-700"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={nextTab}
                                    className="rounded border border-cyan-400 bg-cyan-400 px-6 py-2 font-semibold text-black hover:bg-cyan-500"
                                >
                                    Next Step
                                </button>
                            </div>
                        )}

                        {activeTab === 'env' && (
                            <div className="space-y-6">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="cpuLimit">
                                        CPU Limit
                                    </label>
                                    <select
                                        id="cpuLimit"
                                        name="cpuLimit"
                                        value={server.cpuLimit}
                                        onChange={handleChange}
                                        className="w-full rounded border border-cyan-400 bg-black p-3 text-cyan-400 placeholder-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                                    >
                                        <option value="unlimited">Unlimited</option>
                                        <option value="limited">Limited</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="memoryLimit">
                                        Memory Limit
                                    </label>
                                    <select
                                        id="memoryLimit"
                                        name="memoryLimit"
                                        value={server.memoryLimit}
                                        onChange={handleChange}
                                        className="w-full rounded border border-cyan-400 bg-black p-3 text-cyan-400 placeholder-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                                    >
                                        <option value="unlimited">Unlimited</option>
                                        <option value="limited">Limited</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="diskLimit">
                                        Disk Space Limit
                                    </label>
                                    <select
                                        id="diskLimit"
                                        name="diskLimit"
                                        value={server.diskLimit}
                                        onChange={handleChange}
                                        className="w-full rounded border border-cyan-400 bg-black p-3 text-cyan-400 placeholder-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                                    >
                                        <option value="unlimited">Unlimited</option>
                                        <option value="limited">Limited</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-6">
                                    <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="cpuPinning">
                                        <input
                                            id="cpuPinning"
                                            name="cpuPinning"
                                            type="checkbox"
                                            checked={server.cpuPinning}
                                            onChange={handleChange}
                                            className="accent-cyan-400"
                                        />
                                        CPU Pinning
                                    </label>

                                    <label className="flex items-center gap-2 text-sm font-semibold" htmlFor="oomKiller">
                                        <input
                                            id="oomKiller"
                                            name="oomKiller"
                                            type="checkbox"
                                            checked={server.oomKiller}
                                            onChange={handleChange}
                                            className="accent-cyan-400"
                                        />
                                        OOM Killer Disabled
                                    </label>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="backups">
                                        Backups
                                    </label>
                                    <input
                                        id="backups"
                                        name="backups"
                                        type="number"
                                        min={0}
                                        value={server.backups}
                                        onChange={handleChange}
                                        className="w-full rounded border border-cyan-400 bg-black p-3 text-cyan-400 placeholder-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="dockerImage">
                                        Docker Image
                                    </label>
                                    <input
                                        id="dockerImage"
                                        name="dockerImage"
                                        type="text"
                                        value={server.dockerImage}
                                        onChange={handleChange}
                                        className="w-full rounded border border-cyan-400 bg-black p-3 text-cyan-400 placeholder-cyan-700 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="installScript">
                                        Install Script
                                    </label>
                                    <Editor
                                        height="200px"
                                        language="shell"
                                        value={server.installScript}
                                        theme="vs-dark"
                                        options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
                                        onChange={(value) => setServer((prev: any) => ({ ...prev, installScript: value || '' }))}
                                    />
                                </div>

                                <div className="flex justify-end gap-4">
                                    <button
                                        onClick={prevTab}
                                        className="rounded border border-cyan-400 bg-transparent px-6 py-2 font-semibold text-cyan-400 hover:bg-cyan-700"
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
