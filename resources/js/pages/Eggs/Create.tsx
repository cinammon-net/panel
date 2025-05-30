/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import Editor from '@monaco-editor/react';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
const tabs = [
    { id: 'config', title: 'Configuration' },
    { id: 'process', title: 'Process Management' },
    { id: 'variables', title: 'Egg Variables' },
    { id: 'install', title: 'Install Script' },
];

// Función para decodificar strings JSON con escapes y devolver formateado
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

export default function CreateEgg() {
    const { eggs } = usePage().props;
    const [activeTab, setActiveTab] = useState('config');

    // Estado que guarda el egg seleccionado (todo el objeto)
    const [selectedEgg, setSelectedEgg] = useState<any>(null);

    // Estado para variables dinámicas, separado para no mezclar con selectedEgg
    const [variables, setVariables] = useState<any[]>([]);

    // Cuando cambia el egg seleccionado, actualiza selectedEgg y variables
    const handleSelectEgg = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (!id) {
            setSelectedEgg(null);
            setVariables([]);
            return;
        }
        const egg = (eggs as any[]).find((egg: any) => String(egg.id) === id);
        if (egg) {
            setSelectedEgg({
                id: egg.id,
                uuid: uuidv4(),
                name: egg.name || '',
                author: egg.author || '',
                description: egg.description || '',
                stopCommand: egg.config_stop || '',
                startConfig: egg.config_startup || '{}',
                configFiles: egg.config_files || '{}',
                logConfig: egg.config_logs || '{}',
                scriptContainer: egg.script_container || 'ghcr.io/cinammon-eggs/installers:debian',
                scriptEntry: egg.script_entry || 'bash',
                installScript: egg.script_install || '',
            });

            // Carga las variables del egg o vacío si no hay
            setVariables(egg.variables || []);
        } else {
            setSelectedEgg(null);
            setVariables([]);
        }
    };

    // Añade una variable vacía
    const addNewVariable = () => {
        setVariables([
            ...variables,
            {
                name: '',
                description: '',
                envVariable: '',
                defaultValue: '',
                userPermissions: { viewable: false, editable: false },
                rules: '',
            },
        ]);
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

    const handleCreateEgg = () => {
        if (!selectedEgg) return alert('Selecciona o completa los datos del Egg');

        // Aquí podrías hacer validaciones simples, ejemplo:
        if (!selectedEgg.name) return alert('El nombre es obligatorio');

        // Construir el payload con los datos que quieres enviar
        const payload = {
            name: selectedEgg.name,
            author: selectedEgg.author,
            description: selectedEgg.description,
            stopCommand: selectedEgg.stopCommand,
            startConfig: selectedEgg.startConfig,
            configFiles: selectedEgg.configFiles,
            logConfig: selectedEgg.logConfig,
            scriptContainer: selectedEgg.scriptContainer,
            scriptEntry: selectedEgg.scriptEntry,
            installScript: selectedEgg.installScript,
            variables: variables, // variables de estado
        };

        // Enviar con Inertia (POST a /eggs)
        router.post('/eggs', payload, {
            onSuccess: () => {
                alert('Egg creado correctamente!');
                // Opcional: limpiar formulario
                setSelectedEgg(null);
                setVariables([]);
            },
            onError: (errors) => {
                alert('Error al crear el Egg: ' + JSON.stringify(errors));
            },
        });
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Eggs', href: '/eggs' },
                { title: 'Create', href: '/eggs/create' },
            ]}
        >
            <Head title="Create Egg">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="mb-6 flex flex-col gap-4 border-cyan-600 sm:flex-row sm:items-center sm:justify-between">
                    <h1 className="text-3xl font-semibold tracking-widest text-cyan-800 drop-shadow-none dark:text-cyan-400 dark:drop-shadow-[0_0_5px_#0ff]">
                        CREATE EGG
                    </h1>
                    <button
                        className="rounded border border-cyan-500 bg-cyan-200 px-4 py-2 text-cyan-900 hover:bg-pink-300 dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60"
                        onClick={handleCreateEgg}
                    >
                        + Create Egg
                    </button>
                </div>

                <div className="rounded-lg border-2 border-cyan-600 bg-black/80 p-6">
                    {/* Tabs */}
                    <div className="mb-6 flex flex-wrap gap-2 border-b border-cyan-700">
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

                    {/* Tab content */}
                    <div>
                        {activeTab === 'config' && (
                            <div className="space-y-6">
                                {/* Nombre */}
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="name">
                                        Name*
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300 placeholder-cyan-600"
                                        placeholder="Name of the Egg"
                                        value={selectedEgg?.name || ''}
                                        onChange={(e) => setSelectedEgg({ ...selectedEgg, name: e.target.value })}
                                    />
                                </div>

                                {/* Autor */}
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="author">
                                        Author
                                    </label>
                                    <input
                                        id="author"
                                        type="text"
                                        className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300 placeholder-cyan-600"
                                        placeholder="Author name"
                                        value={selectedEgg?.author || ''}
                                        onChange={(e) => setSelectedEgg({ ...selectedEgg, author: e.target.value })}
                                    />
                                </div>

                                {/* Descripción */}
                                <div>
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="description">
                                        Description
                                    </label>
                                    <textarea
                                        id="description"
                                        rows={3}
                                        className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300 placeholder-cyan-600"
                                        placeholder="Description of the Egg"
                                        value={selectedEgg?.description || ''}
                                        onChange={(e) => setSelectedEgg({ ...selectedEgg, description: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>
                        )}

                        {activeTab === 'process' && (
                            <div className="space-y-6 text-cyan-300">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {/* Copy From */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="copyFrom">
                                            Copy Settings From
                                        </label>
                                        <select
                                            id="copyFrom"
                                            className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300"
                                            onChange={handleSelectEgg}
                                            value={selectedEgg?.id || ''}
                                        >
                                            <option value="">None</option>
                                            {(Array.isArray(eggs) ? eggs : []).map((egg: any) => (
                                                <option key={egg.id} value={egg.id}>
                                                    {egg.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Stop Command */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="stopCommand">
                                            Stop Command*
                                        </label>
                                        <input
                                            id="stopCommand"
                                            type="text"
                                            className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300"
                                            placeholder="Command to stop processes"
                                            value={selectedEgg?.stopCommand || ''}
                                            onChange={(e) => setSelectedEgg({ ...selectedEgg, stopCommand: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Configs */}
                                <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {/* Start Config */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="startConfig">
                                            Start Configuration
                                        </label>
                                        <textarea
                                            id="startConfig"
                                            rows={9}
                                            className="w-full rounded border border-cyan-700 bg-black p-2 font-mono text-cyan-400"
                                            value={decodeJsonString(selectedEgg?.startConfig)}
                                            onChange={(e) => setSelectedEgg({ ...selectedEgg, startConfig: e.target.value })}
                                        />
                                    </div>

                                    {/* Config Files */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="configFiles">
                                            Configuration Files
                                        </label>
                                        <textarea
                                            id="configFiles"
                                            rows={9}
                                            className="w-full rounded border border-cyan-700 bg-black p-2 font-mono text-cyan-400"
                                            value={decodeJsonString(selectedEgg?.configFiles)}
                                            onChange={(e) => setSelectedEgg({ ...selectedEgg, configFiles: e.target.value })}
                                        />
                                    </div>

                                    {/* Log Config */}
                                    <div className="sm:col-span-2">
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="logConfig">
                                            Log Configuration
                                        </label>
                                        <textarea
                                            id="logConfig"
                                            rows={9}
                                            className="w-full rounded border border-cyan-700 bg-black p-2 font-mono text-cyan-400"
                                            value={decodeJsonString(selectedEgg?.logConfig)}
                                            onChange={(e) => setSelectedEgg({ ...selectedEgg, logConfig: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'install' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    {/* Copy Settings From */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="copySettings">
                                            Copy Settings From
                                        </label>
                                        <select
                                            id="copySettings"
                                            className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300"
                                            onChange={handleSelectEgg}
                                            value={selectedEgg?.id || ''}
                                        >
                                            <option value="">None</option>
                                            {(Array.isArray(eggs) ? eggs : []).map((egg: any) => (
                                                <option key={egg.id} value={egg.id}>
                                                    {egg.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Script Container */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="scriptContainer">
                                            Script Container*
                                        </label>
                                        <input
                                            id="scriptContainer"
                                            type="text"
                                            className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300"
                                            value={selectedEgg?.scriptContainer || ''}
                                            onChange={(e) => setSelectedEgg({ ...selectedEgg, scriptContainer: e.target.value })}
                                        />
                                    </div>

                                    {/* Script Entry */}
                                    <div>
                                        <label className="mb-1 block text-sm font-semibold" htmlFor="scriptEntry">
                                            Script Entry*
                                        </label>
                                        <select
                                            id="scriptEntry"
                                            className="w-full rounded border border-cyan-700 bg-black p-2 text-cyan-300"
                                            value={selectedEgg?.scriptEntry || 'bash'}
                                            onChange={(e) => setSelectedEgg({ ...selectedEgg, scriptEntry: e.target.value })}
                                        >
                                            <option value="bash">bash</option>
                                            <option value="sh">sh</option>
                                            <option value="python">python</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Monaco Editor */}
                                <div className="col-span-3 mt-4">
                                    <label className="mb-1 block text-sm font-semibold" htmlFor="installScript">
                                        Install Script
                                    </label>
                                    <Editor
                                        height="300px"
                                        language={selectedEgg?.scriptEntry === 'python' ? 'python' : 'shell'}
                                        value={selectedEgg?.installScript || ''}
                                        theme="vs-dark"
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            wordWrap: 'on',
                                            scrollBeyondLastLine: false,
                                        }}
                                        onChange={(value) => setSelectedEgg({ ...selectedEgg, installScript: value || '' })}
                                    />
                                </div>
                            </div>
                        )}

                        {activeTab === 'variables' && (
                            <div>
                                <button
                                    className="mb-4 rounded bg-cyan-600 px-4 py-2 hover:bg-cyan-700"
                                    onClick={() =>
                                        setVariables([
                                            ...variables,
                                            {
                                                name: '',
                                                description: '',
                                                envVariable: '',
                                                defaultValue: '',
                                                userPermissions: { viewable: false, editable: false },
                                                rules: '',
                                            },
                                        ])
                                    }
                                >
                                    Add New Variable
                                </button>

                                {variables.map((variable, index) => (
                                    <div key={index} className="mb-4 rounded border border-cyan-700 bg-black p-4 text-cyan-300">
                                        <input
                                            type="text"
                                            placeholder="Name"
                                            value={variable.name}
                                            onChange={(e) => {
                                                const newVars = [...variables];
                                                newVars[index].name = e.target.value;
                                                setVariables(newVars);
                                            }}
                                            className="mb-2 w-full rounded border border-cyan-600 bg-black p-2"
                                        />
                                        <textarea
                                            placeholder="Description"
                                            value={variable.description}
                                            onChange={(e) => {
                                                const newVars = [...variables];
                                                newVars[index].description = e.target.value;
                                                setVariables(newVars);
                                            }}
                                            rows={2}
                                            className="mb-2 w-full rounded border border-cyan-600 bg-black p-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Environment Variable"
                                            value={variable.envVariable}
                                            onChange={(e) => {
                                                const newVars = [...variables];
                                                newVars[index].envVariable = e.target.value;
                                                setVariables(newVars);
                                            }}
                                            className="mb-2 w-full rounded border border-cyan-600 bg-black p-2"
                                        />
                                        <input
                                            type="text"
                                            placeholder="Default Value"
                                            value={variable.defaultValue}
                                            onChange={(e) => {
                                                const newVars = [...variables];
                                                newVars[index].defaultValue = e.target.value;
                                                setVariables(newVars);
                                            }}
                                            className="mb-2 w-full rounded border border-cyan-600 bg-black p-2"
                                        />

                                        <div className="mb-2 flex gap-4">
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={variable.userPermissions?.viewable || false}
                                                    onChange={(e) => {
                                                        const newVars = [...variables];
                                                        newVars[index].userPermissions.viewable = e.target.checked;
                                                        setVariables(newVars);
                                                    }}
                                                />
                                                Viewable
                                            </label>

                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={variable.userPermissions?.editable || false}
                                                    onChange={(e) => {
                                                        const newVars = [...variables];
                                                        newVars[index].userPermissions.editable = e.target.checked;
                                                        setVariables(newVars);
                                                    }}
                                                />
                                                Editable
                                            </label>
                                        </div>

                                        <input
                                            type="text"
                                            placeholder="Rules"
                                            value={variable.rules}
                                            onChange={(e) => {
                                                const newVars = [...variables];
                                                newVars[index].rules = e.target.value;
                                                setVariables(newVars);
                                            }}
                                            className="w-full rounded border border-cyan-600 bg-black p-2"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
