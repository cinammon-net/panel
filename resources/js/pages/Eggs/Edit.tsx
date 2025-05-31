/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import Editor from '@monaco-editor/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';


import EggFormModal from '@/components/EggFormModal';
const tabs = [
    { id: 'config', title: 'Configuration' },
    { id: 'process', title: 'Process Management' },
    { id: 'variables', title: 'Egg Variables' },
    { id: 'install', title: 'Install Script' },
];


// Decodifica JSON para mostrar formateado sin errores
function decodeJsonString(str: string | undefined) {
    if (!str) return '{}';
    try {
        const parsedOnce = JSON.parse(str);
        if (typeof parsedOnce === 'string') {
            return JSON.stringify(JSON.parse(parsedOnce), null, 2);
        }
        return JSON.stringify(parsedOnce, null, 2);
    } catch {
        return '{}';
    }
}

function parseDockerImages(raw: any) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw; // si ya es array, no hacer nada
    try {
        // Si viene como string JSON, parsear primero
        const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Object.entries(obj).map(([name, uri]) => ({ name, uri }));
    } catch {
        return [];
    }
}



export default function EditEgg() {
    type FlashType = { success?: string; error?: string };
    const { egg, eggs } = usePage().props as unknown as { egg: any; eggs: any[]; flash: FlashType };
    const [activeTab, setActiveTab] = useState('config');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const handleImportEgg = async (data: { file?: File; url?: string }) => {
        try {
            let jsonContent = '';

            if (data.file) {
                jsonContent = await data.file.text();
            } else if (data.url) {
                const response = await fetch(data.url);
                if (!response.ok) throw new Error('No se pudo obtener el JSON desde la URL');
                jsonContent = await response.text();
            }

            const parsed = JSON.parse(jsonContent);

            // Aquí actualizas todos los estados con los valores del JSON o mantienes lo que ya hay
            setGeneralData((prev: any) => ({
                ...prev,
                id: parsed.id ?? prev.id,
                uuid: parsed.uuid ?? prev.uuid,
                name: parsed.name ?? prev.name,
                author: parsed.author ?? prev.author,
                description: parsed.description ?? prev.description,
                features: Array.isArray(parsed.features) ? parsed.features : prev.features,
                force_outgoing_ip: parsed.force_outgoing_ip ?? prev.force_outgoing_ip,
                file_denylist: parsed.file_denylist ?? prev.file_denylist,
                tags: Array.isArray(parsed.tags) ? parsed.tags : prev.tags,
                startup: parsed.startup ?? prev.startup,
                update_url: parsed.update_url ?? prev.update_url,
                docker_images: Array.isArray(parsed.docker_images) ? parsed.docker_images : prev.docker_images,
            }));

            setProcessConfig((prev: any) => ({
                config_stop: parsed.config_stop ?? prev.config_stop,
                config_startup: parsed.config_startup ?? prev.config_startup,
                config_files: parsed.config_files ?? prev.config_files,
                config_logs: parsed.config_logs ?? prev.config_logs,
            }));

            setInstallScript((prev: any) => ({
                script_container: parsed.script_container ?? prev.script_container,
                script_entry: parsed.script_entry ?? prev.script_entry,
                script_install: parsed.script_install ?? prev.script_install,
            }));

            setVariables(Array.isArray(parsed.variables) ? parsed.variables : variables);

            setIsImportModalOpen(false);
        } catch (error) {
            toast.error('Error al importar el Egg: ' + (error instanceof Error ? error.message : 'Error desconocido'));
        }
    };
    
      
    // Estado para colapsar variables individualmente (true = colapsado)
    const [collapsedVariables, setCollapsedVariables] = useState<boolean[]>(egg.variables ? egg.variables.map(() => true) : []);

    // Estados separados
    const [generalData, setGeneralData] = useState<any>({
        id: egg.id,
        uuid: egg.uuid || '',
        name: egg.name || '',
        author: egg.author || '',
        description: egg.description || '',
        features: Array.isArray(egg.features) ? egg.features : [],
        force_outgoing_ip: egg.force_outgoing_ip || false,
        file_denylist: egg.file_denylist || '',
        tags: Array.isArray(egg.tags) ? egg.tags : [],
        startup: egg.startup || '',
        update_url: egg.update_url || '',
        docker_images: parseDockerImages(egg?.docker_images),
    });

    const [processConfig, setProcessConfig] = useState<any>({
        config_stop: egg.config_stop || '',
        config_startup: egg.config_startup || '{}',
        config_files: egg.config_files || '{}',
        config_logs: egg.config_logs || '{}',
    });

    const [installScript, setInstallScript] = useState<any>({
        script_container: egg.script_container || '',
        script_entry: egg.script_entry || 'bash',
        script_install: egg.script_install || '',
    });

    const [variables, setVariables] = useState<any[]>(egg.variables || []);

    // Cambios en generalData
    const handleGeneralChange = (field: string, value: any) => {
        setGeneralData((prev: any) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Copiar configuración de otro egg según pestaña
    const handleSelectEgg = (e: React.ChangeEvent<HTMLSelectElement>, currentTab: string) => {
        const id = e.target.value;
        if (!id) return;

        const eggFound = eggs.find((egg) => String(egg.id) === id);
        if (!eggFound) return;

        if (currentTab === 'process') {
            setProcessConfig({
                config_stop: eggFound.config_stop || '',
                config_startup: eggFound.config_startup || '{}',
                config_files: eggFound.config_files || '{}',
                config_logs: eggFound.config_logs || '{}',
            });
        } else if (currentTab === 'install') {
            setInstallScript({
                script_container: eggFound.script_container || '',
                script_entry: eggFound.script_entry || 'bash',
                script_install: eggFound.script_install || '',
            });
        }
    };

    // Docker Images handlers
    const addDockerImage = () => {
        setGeneralData((prev: { docker_images: any }) => ({
            ...prev,
            docker_images: [...prev.docker_images, { name: '', uri: '' }],
        }));
    };

    const updateDockerImage = (index: number, field: 'name' | 'uri', value: string) => {
        setGeneralData((prev: { docker_images: any }) => {
            const newDockerImages = [...prev.docker_images];
            newDockerImages[index] = { ...newDockerImages[index], [field]: value };
            return { ...prev, docker_images: newDockerImages };
        });
    };

    const removeDockerImage = (index: number) => {
        setGeneralData((prev: { docker_images: any }) => {
            const newDockerImages = [...prev.docker_images];
            newDockerImages.splice(index, 1);
            return { ...prev, docker_images: newDockerImages };
        });
    };

    // Variables dinámicas
    const addNewVariable = () => {
        setVariables((prev) => [
            ...prev,
            {
                name: '',
                description: '',
                envVariable: '',
                defaultValue: '',
                userPermissions: { viewable: false, editable: false },
                rules: [],
            },
        ]);
        setCollapsedVariables((prev) => [...prev, false]); // expandir nueva variable por defecto
    };

    const updateVariable = (index: number, field: string, value: any) => {
        const newVars = [...variables];
        if (field === 'viewable' || field === 'editable') {
            newVars[index].userPermissions[field] = value;
        } else {
            newVars[index][field] = value;
        }
        setVariables(newVars);
    };

    const removeVariable = (index: number) => {
        setVariables((prev) => prev.filter((_, i) => i !== index));
        setCollapsedVariables((prev) => prev.filter((_, i) => i !== index));
    };

    // Toggle colapsado individual
    const toggleCollapseVariable = (index: number) => {
        setCollapsedVariables((prev) => {
            const newState = [...prev];
            newState[index] = !newState[index];
            return newState;
        });
    };

    // Collapse all
    const collapseAll = () => {
        setCollapsedVariables(variables.map(() => true));
    };

    // Expand all
    const expandAll = () => {
        setCollapsedVariables(variables.map(() => false));
    };

    // Guardar cambios al backend
    const handleUpdateEgg = () => {
        const payload = {
            ...generalData,
            ...processConfig,
            ...installScript,
            variables,
        };

        router.put(`/eggs/${generalData.id}`, payload, {
            onSuccess: () => toast.success(`Egg "${generalData.name}" actualizado correctamente.`),
            onError: (errors) => toast.error('Error al actualizar Egg: ' + JSON.stringify(errors)),
        });
    };

    // Componente TagInput
    const TagInput = ({ tags, onChange }: { tags: string[]; onChange: (newTags: string[]) => void }) => {
        const [inputValue, setInputValue] = useState('');
        const addTag = () => {
            const val = inputValue.trim();
            if (val && !tags.includes(val)) {
                onChange([...tags, val]);
                setInputValue('');
            }
        };
        const removeTag = (tagToRemove: string) => {
            onChange(tags.filter((t) => t !== tagToRemove));
        };
        return (
            <div className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600">
                <input
                    type="text"
                    className="w-full rounded-md bg-[#1a1a1a] px-2 py-2 text-cyan-400 placeholder:text-cyan-600 hover:bg-[#1a1a1a] focus:outline-none"
                    placeholder="New tag"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />

                {/* Línea de separación sin margen */}
                <div className="border-b border-cyan-600" />
                <div className="flex flex-wrap items-center gap-1 rounded-b-md bg-[#1a1a1a] px-2 py-1">
                    {tags.map((tag) => (
                        <div key={tag} className="flex items-center gap-1 rounded bg-cyan-600 px-3 py-1 text-xs font-semibold text-white">
                            {tag}
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="rounded px-1 transition hover:bg-cyan-800 hover:text-white"
                                aria-label={`Remove tag ${tag}`}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Eggs', href: '/eggs' },
                { title: 'Edit', href: `/eggs/${generalData.id}/edit` },
            ]}
        >
            <Head title={`Edit Egg: ${generalData.name}`}>
                <meta name="description" content={`Edit the configuration for the Egg: ${generalData.name}`} />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link rel="stylesheet" href="/css/app.css" />
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row sm:gap-2">
                    <h1 className="w-full text-center text-3xl font-semibold tracking-widest text-cyan-400 drop-shadow-[0_0_8px_#0ff] sm:w-auto sm:text-left">
                        Edit {generalData.name}
                    </h1>
                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <button
                            type="button"
                            className="w-full rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 sm:w-auto"
                            onClick={() => {
                                if (confirm(`¿Seguro que quieres eliminar el Egg "${generalData.name}"? Esta acción no se puede deshacer.`)) {
                                    router.delete(`/eggs/${generalData.id}`, {
                                        onSuccess: () => {
                                            toast.success(`Egg "${generalData.name}" eliminado correctamente.`);
                                            router.visit('/eggs'); // Redirige a la lista de Eggs después de eliminar
                                        },
                                        onError: (errors) => {
                                            toast.error('Error al eliminar Egg: ' + JSON.stringify(errors));
                                        },
                                    });
                                }
                            }}
                        >
                            Delete
                        </button>

                        <button
                            type="button"
                            className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 sm:w-auto"
                            onClick={() => toast.warning('Export functionality is not implemented yet.')}
                        >
                            Export
                        </button>
                        <button
                            type="button"
                            className="w-full rounded bg-blue-400 px-4 py-2 text-white hover:bg-blue-500 sm:w-auto"
                            onClick={() => setIsImportModalOpen(true)}
                        >
                            Import
                        </button>

                        <EggFormModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onSubmit={handleImportEgg} />

                        <button
                            type="button"
                            className="w-full rounded bg-cyan-600 px-4 py-2 text-black hover:bg-cyan-700 sm:w-auto"
                            onClick={handleUpdateEgg}
                        >
                            Save changes
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6 flex flex-wrap gap-4 border-b border-cyan-700">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full border-b-2 px-4 pb-2 sm:w-auto ${
                                activeTab === tab.id ? 'border-cyan-500 text-cyan-500' : 'border-transparent hover:text-cyan-400'
                            } text-center transition`}
                        >
                            {tab.title}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <form onSubmit={(e) => e.preventDefault()}>
                    {activeTab === 'config' && (
                        <section className="space-y-6">
                            {/* Configuración básica */}
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="name">
                                        Name*
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600"
                                        placeholder="Name of the Egg"
                                        value={generalData.name}
                                        onChange={(e) => handleGeneralChange('name', e.target.value)}
                                        required
                                    />
                                    <p className="mt-1 text-xs text-cyan-500">A simple, human-readable name to use as an identifier for this Egg.</p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="uuid">
                                        Egg UUID
                                    </label>
                                    <input
                                        id="uuid"
                                        type="text"
                                        disabled
                                        className="w-full cursor-not-allowed rounded border border-cyan-700 bg-[#222] p-2 text-cyan-600"
                                        value={generalData.uuid}
                                    />
                                    <p className="mt-1 text-xs text-cyan-500">
                                        This is the globally unique identifier for this Egg which Wings uses as an identifier.
                                    </p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="id">
                                        Egg ID
                                    </label>
                                    <input
                                        id="id"
                                        type="text"
                                        disabled
                                        className="w-full cursor-not-allowed rounded border border-cyan-700 bg-[#222] p-2 text-cyan-600"
                                        value={generalData.id}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="description">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        rows={4}
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600"
                                        placeholder="Description of the Egg"
                                        value={generalData.description}
                                        onChange={(e) => handleGeneralChange('description', e.target.value)}
                                    />
                                    <p className="mt-1 text-xs text-cyan-500">
                                        A description of this Egg that will be displayed throughout the Panel as needed.
                                    </p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="author">
                                        Author
                                    </label>
                                    <input
                                        id="author"
                                        type="text"
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600"
                                        placeholder="Author name"
                                        value={generalData.author}
                                        onChange={(e) => handleGeneralChange('author', e.target.value)}
                                    />
                                    <p className="mt-1 text-xs text-cyan-500">
                                        The author of this version of the Egg. Uploading a new configuration from a different author will change this.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-semibold" htmlFor="startup">
                                    Startup Command*
                                </label>
                                <textarea
                                    id="startupCommand"
                                    rows={3}
                                    className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 font-mono text-cyan-400 placeholder-cyan-600"
                                    placeholder="java -Xms128M -Xmx{{SERVER_MEMORY}} -jar server.jar"
                                    value={generalData.startup}
                                    onChange={(e) => handleGeneralChange('startup', e.target.value)}
                                    readOnly={true}
                                    onCopy={(e) => e.preventDefault()}
                                />
                                <p className="mt-1 text-xs text-cyan-500">
                                    The default startup command that should be used for new servers using this Egg.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="file_denylist">
                                        File Denylist
                                    </label>
                                    <input
                                        id="file_denylist"
                                        type="text"
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600"
                                        placeholder="denied-file.txt"
                                        value={generalData.file_denylist}
                                        onChange={(e) => handleGeneralChange('file_denylist', e.target.value)}
                                    />
                                    <p className="mt-1 text-xs text-cyan-500">A list of files that the end user is not allowed to edit.</p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold">Features</label>
                                    <TagInput tags={generalData.tags} onChange={(newTags) => handleGeneralChange('tags', newTags)} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-semibold">Force Outgoing IP</label>
                                    <label className="relative inline-flex cursor-pointer items-center">
                                        <input
                                            type="checkbox"
                                            className="peer sr-only"
                                            checked={!!generalData.force_outgoing_ip}
                                            onChange={(e) => handleGeneralChange('force_outgoing_ip', e.target.checked)}
                                        />
                                        <div className="peer h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-cyan-600"></div>
                                        <div className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
                                    </label>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="tags">
                                        Tags
                                    </label>
                                    <TagInput tags={generalData.tags} onChange={(newTags) => handleGeneralChange('tags', newTags)} />
                                </div>
                                <div className="mt-6">
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="update_url">
                                        Update URL
                                    </label>
                                    <input
                                        id="update_url"
                                        type="text"
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600"
                                        placeholder="https://example.com/egg-update.json"
                                        value={generalData.update_url}
                                        onChange={(e) => handleGeneralChange('update_url', e.target.value)}
                                    />
                                    <p className="mt-1 text-xs text-cyan-500">
                                        The URL to check for updates to this Egg. If left blank, no update checking will be performed.
                                    </p>
                                </div>
                            </div>

                            <section className="mt-6">
                                <h2 className="mb-4 font-semibold text-cyan-400">Docker Images</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse overflow-hidden rounded-lg border border-cyan-700 text-cyan-400">
                                        <thead>
                                            <tr className="rounded-t-lg border-b border-cyan-600 bg-[#1a1a1a] text-center text-sm">
                                                <th className="rounded-tl-lg px-3 py-1.5 text-white">Image Name</th>
                                                <th className="px-3 py-1.5">Image URI</th>
                                                <th className="w-10 rounded-tr-lg px-3 py-1.5" />
                                            </tr>
                                        </thead>
                                        <tbody className="text-center">
                                            {(Array.isArray(generalData.docker_images) ? generalData.docker_images : []).map(
                                                (
                                                    img: { name: string | number | readonly string[] | undefined; uri: string | number | readonly string[] | undefined; },
                                                    index: number
                                                ) => (
                                                    <tr key={index} className={index % 2 === 0 ? 'bg-[#121212]' : 'bg-[#1a1a1a]'}>
                                                        <td className="border-b border-cyan-700 px-3 py-1.5 text-white">
                                                            <input
                                                                type="text"
                                                                value={img.name}
                                                                onChange={(e) => updateDockerImage(index, 'name', e.target.value)}
                                                                className="w-full bg-transparent text-center text-white focus:outline-none"
                                                            />
                                                        </td>
                                                        <td className="border-b border-cyan-700 px-3 py-1.5 break-all text-cyan-400">
                                                            <input
                                                                type="text"
                                                                value={img.uri}
                                                                onChange={(e) => updateDockerImage(index, 'uri', e.target.value)}
                                                                className="w-full bg-transparent text-center text-cyan-400 focus:outline-none"
                                                            />
                                                        </td>
                                                        <td className="border-b border-cyan-700 px-3 py-1.5">
                                                            <button
                                                                type="button"
                                                                className="rounded bg-red-600 px-2 py-1 text-white transition hover:bg-red-700"
                                                                onClick={() => removeDockerImage(index)}
                                                                aria-label={`Remove Docker Image ${img.name}`}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t border-cyan-600 bg-[#1a1a1a]">
                                                <td colSpan={3} className="rounded-b-lg px-3 py-1.5 text-center">
                                                    <button
                                                        type="button"
                                                        className="w-full rounded bg-transparent px-4 py-2 font-semibold text-cyan-400 underline transition hover:underline"
                                                        onClick={addDockerImage}
                                                    >
                                                        Add Docker Image
                                                    </button>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                <p className="mt-2 text-xs text-cyan-500">The docker images available to servers using this Egg.</p>
                            </section>
                        </section>
                    )}
                    {activeTab === 'process' && (
                        <section className="space-y-6 text-cyan-400">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="copyFrom">
                                        Copy Settings From
                                    </label>
                                    <select
                                        id="copyFrom"
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600"
                                        onChange={(e) => handleSelectEgg(e, 'process')}
                                        value={
                                            processConfig?.config_stop ? eggs.find((e) => e.config_stop === processConfig.config_stop)?.id || '' : ''
                                        }
                                    >
                                        <option value="">None</option>
                                        {(Array.isArray(eggs) ? eggs : []).map((egg: any) => (
                                            <option key={egg.id} value={egg.id}>
                                                {egg.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="mt-1 text-xs text-cyan-400">
                                        If you would like to default to settings from another Egg select it from the menu above.
                                    </p>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="stopCommand">
                                        Stop Command*
                                    </label>
                                    <input
                                        id="stopCommand"
                                        type="text"
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 text-cyan-300 placeholder-cyan-600"
                                        placeholder="Command to stop processes"
                                        value={processConfig.config_stop || ''}
                                        onChange={(e) => setProcessConfig((prev: any) => ({ ...prev, config_stop: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="startConfig">
                                        Start Configuration
                                    </label>
                                    <textarea
                                        id="startConfig"
                                        rows={9}
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 font-mono text-cyan-400 placeholder-cyan-600"
                                        value={decodeJsonString(processConfig.config_startup)}
                                        onChange={(e) => setProcessConfig((prev: any) => ({ ...prev, config_startup: e.target.value }))}
                                        spellCheck={false}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="configFiles">
                                        Configuration Files
                                    </label>
                                    <textarea
                                        id="configFiles"
                                        rows={9}
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 font-mono text-cyan-400 placeholder-cyan-600"
                                        value={decodeJsonString(processConfig.config_files)}
                                        onChange={(e) => setProcessConfig((prev: any) => ({ ...prev, config_files: e.target.value }))}
                                        spellCheck={false}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="logConfig">
                                        Log Configuration
                                    </label>
                                    <textarea
                                        id="logConfig"
                                        rows={9}
                                        className="w-full rounded border border-cyan-700 bg-[#1a1a1a] p-2 font-mono text-cyan-400 placeholder-cyan-600"
                                        value={decodeJsonString(processConfig.config_logs)}
                                        onChange={(e) => setProcessConfig((prev: any) => ({ ...prev, config_logs: e.target.value }))}
                                        spellCheck={false}
                                    />
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'variables' && (
                        <section>
                            {/* Botones para colapsar y expandir */}
                            <div className="mb-4 flex flex-wrap gap-2">
                                <button type="button" onClick={collapseAll} className="rounded bg-cyan-600 px-4 py-2 hover:bg-cyan-700">
                                    Collapse All
                                </button>
                                <button type="button" onClick={expandAll} className="rounded bg-cyan-600 px-4 py-2 hover:bg-cyan-700">
                                    Expand All
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {variables.map((variable, index) => (
                                    <div key={index} className="relative rounded border border-cyan-700 bg-[#121212] p-4 text-cyan-300">
                                        {/* Botón eliminar */}
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 z-10 rounded bg-red-600 p-1 hover:bg-red-700"
                                            onClick={() => removeVariable(index)}
                                            aria-label={`Remove Variable ${variable.name || index}`}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>

                                        {/* Título siempre visible con toggle */}
                                        <h3
                                            className="mb-2 cursor-pointer font-semibold select-none"
                                            onClick={() => toggleCollapseVariable(index)}
                                            aria-expanded={!collapsedVariables[index]}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') toggleCollapseVariable(index);
                                            }}
                                        >
                                            {variable.name || 'Unnamed Variable'}
                                        </h3>

                                        {/* Mostrar detalles solo si no está colapsado */}
                                        {!collapsedVariables[index] && (
                                            <div className="space-y-2">
                                                <label className="block text-sm font-semibold text-cyan-300">Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Name"
                                                    value={variable.name}
                                                    onChange={(e) => updateVariable(index, 'name', e.target.value)}
                                                    className="w-full rounded border border-cyan-600 bg-[#1a1a1a] p-2"
                                                />
                                                <label className="block text-sm font-semibold text-cyan-300">Description</label>
                                                <textarea
                                                    placeholder="Description"
                                                    value={variable.description}
                                                    onChange={(e) => updateVariable(index, 'description', e.target.value)}
                                                    rows={2}
                                                    className="w-full rounded border border-cyan-600 bg-[#1a1a1a] p-2"
                                                />
                                                <label className="block text-sm font-semibold text-cyan-300">Environment Variable</label>
                                                <input
                                                    type="text"
                                                    placeholder="Environment Variable"
                                                    value={variable.envVariable}
                                                    onChange={(e) => updateVariable(index, 'envVariable', e.target.value)}
                                                    className="w-full rounded border border-cyan-600 bg-[#1a1a1a] p-2"
                                                />
                                                <label className="block text-sm font-semibold text-cyan-300">Default Value</label>
                                                <input
                                                    type="text"
                                                    placeholder="Default Value"
                                                    value={variable.defaultValue}
                                                    onChange={(e) => updateVariable(index, 'defaultValue', e.target.value)}
                                                    className="w-full rounded border border-cyan-600 bg-[#1a1a1a] p-2"
                                                />

                                                <fieldset className="mb-6 rounded-lg border border-cyan-700 p-4">
                                                    <legend className="px-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400">
                                                        Users Permissions
                                                    </legend>
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={variable.userPermissions?.editable || false}
                                                                onChange={(e) =>
                                                                    updateVariable(index, 'userPermissions', {
                                                                        ...variable.userPermissions,
                                                                        editable: e.target.checked,
                                                                    })
                                                                }
                                                            />
                                                            Editable
                                                        </label>
                                                        <label className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={variable.userPermissions?.viewable || false}
                                                                onChange={(e) =>
                                                                    updateVariable(index, 'userPermissions', {
                                                                        ...variable.userPermissions,
                                                                        viewable: e.target.checked,
                                                                    })
                                                                }
                                                            />
                                                            Viewable
                                                        </label>
                                                    </div>
                                                </fieldset>

                                                <label className="block text-sm font-semibold text-cyan-300">Rules</label>
                                                <TagInput
                                                    tags={Array.isArray(variable.rules) ? variable.rules : JSON.parse(variable.rules || '[]')}
                                                    onChange={(newTags) => updateVariable(index, 'rules', newTags)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Botón para añadir variable */}
                            <button type="button" className="mt-4 rounded bg-cyan-600 px-4 py-2 hover:bg-cyan-700" onClick={addNewVariable}>
                                Add New Variable
                            </button>
                        </section>
                    )}

                    {activeTab === 'install' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="copySettings">
                                        Copy Settings From
                                    </label>
                                    <select
                                        id="copySettings"
                                        className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300 placeholder-cyan-600"
                                        onChange={(e) => handleSelectEgg(e, 'install')}
                                        value={
                                            installScript?.script_container
                                                ? eggs.find((e) => e.script_container === installScript.script_container)?.id || ''
                                                : ''
                                        }
                                    >
                                        <option value="">None</option>
                                        {(Array.isArray(eggs) ? eggs : []).map((egg: any) => (
                                            <option key={egg.id} value={egg.id}>
                                                {egg.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="scriptContainer">
                                        Script Container*
                                    </label>
                                    <input
                                        id="scriptContainer"
                                        type="text"
                                        className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300 placeholder-cyan-600"
                                        value={installScript.script_container || 'ghcr.io/cinammon-net/installers:debian'}
                                        onChange={(e) => setInstallScript((prev: any) => ({ ...prev, script_container: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="scriptEntry">
                                        Script Entry*
                                    </label>
                                    <select
                                        id="scriptEntry"
                                        className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300 placeholder-cyan-600"
                                        value={installScript.script_entry || 'bash'}
                                        onChange={(e) => setInstallScript((prev: any) => ({ ...prev, script_entry: e.target.value }))}
                                    >
                                        <option value="bash">bash</option>
                                        <option value="sh">sh</option>
                                        <option value="python">python</option>
                                    </select>
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="mb-1 block text-sm font-semibold" htmlFor="installScript">
                                    Install Script
                                </label>

                                <Editor
                                    height="300px"
                                    language={installScript.script_entry === 'python' ? 'python' : 'shell'}
                                    value={installScript.script_install || ''}
                                    theme="vs-dark"
                                    onChange={(value) => setInstallScript((prev: any) => ({ ...prev, script_install: value || '' }))}
                                    options={{
                                        minimap: { enabled: true },
                                        tabSize: 4,
                                        insertSpaces: true,
                                        fontSize: 15,
                                        wordWrap: 'on',
                                        scrollBeyondLastLine: false,
                                        lineNumbers: 'on',
                                        automaticLayout: true,
                                        renderLineHighlight: 'all',
                                        contextmenu: true,
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </form>

                {/* Servers */}
                <section className="mt-12 rounded border border-cyan-700 bg-[#121212] p-6 text-cyan-400">
                    <h2 className="mb-4 text-lg font-semibold">Servers</h2>
                    {egg.servers && egg.servers.length > 0 ? (
                        <ul className="list-inside list-disc">
                            {egg.servers.map((srv: any) => (
                                <li key={srv.id}>{srv.name}</li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 p-12 text-center text-cyan-500">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-10 w-10 opacity-50"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={1.5}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <p>No Servers are assigned to this Egg</p>
                            <p className="text-sm text-cyan-600">No Servers</p>
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
