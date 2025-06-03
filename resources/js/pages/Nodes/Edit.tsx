/* eslint-disable @typescript-eslint/no-explicit-any */
import AppLayout from '@/layouts/app-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { ArcElement, CategoryScale, Chart as ChartJS, LinearScale, LineElement, PointElement, Title, Tooltip } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { ArrowRight, Lock, LockOpen, Server, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, ArcElement);
ChartJS.register(ChartDataLabels);
function validateDomain(domain: string): boolean {
    const fqdnRegex = /^(?!-)(?!.*--)([a-zA-Z0-9-]{1,63}(?<!-)\.)+[a-zA-Z]{2,}$/;
    return fqdnRegex.test(domain.trim());
}

import CPU from '@/components/graphs/CPU';
import Memory from '@/components/graphs/Memory';
import Storage from '@/components/graphs/Strorage';
import AllocationModal from '@/components/AllocationModal';

export default function EditNode() {
    const { node } = usePage<{ node: any }>().props;
    const [formData, setFormData] = useState(node);
    const [nameManuallyEdited, setNameManuallyEdited] = useState(false);
    const [dnsValid, setDnsValid] = useState<boolean | null>(null);
    const [dnsIp, setDnsIp] = useState<string>('...');
    const [showServers, setShowServers] = useState(true);
    const [activeSection, setActiveSection] = useState('overview'); // Estado que controla qué sección se muestra
    const [memory, setMemory] = useState<'unlimited' | 'limited'>('unlimited');
    const [memoryLimit, setMemoryLimit] = useState('');
    const [memoryOverallocate, setMemoryOverallocate] = useState('');

    const [disk, setDisk] = useState<'unlimited' | 'limited'>('unlimited');
    const [diskLimit, setDiskLimit] = useState('');
    const [diskOverallocate, setDiskOverallocate] = useState('');

    const [cpu, setCpu] = useState<'unlimited' | 'limited'>('unlimited');
    const [cpuLimit, setCpuLimit] = useState('');
    const [cpuOverallocate, setCpuOverallocate] = useState('');

    const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
    const [maintenanceMode, setMaintenanceMode] = useState<'enabled' | 'disabled'>('disabled');
    const [useDeployments, setUseDeployments] = useState<'yes' | 'no'>('no');

    const [isCreateAllocationModalOpen, setIsCreateAllocationModalOpen] = useState(false);
    const [yamlConfig, setYamlConfig] = useState<string>('');
    interface SectionChangeHandler {
        (section: 'overview' | 'basicSettings' | 'advancedSettings' | 'configurationFile'): void;
    }

    const handleSectionChange: SectionChangeHandler = (section) => {
        setActiveSection(section);
    };
    // Validar el dominio y obtener la IP
    const validateAndFetchIp = async (domain: string) => {
        const isValidFormat = validateDomain(domain);
        if (!isValidFormat) {
            setDnsValid(false);
            setDnsIp('Invalid domain');
            return;
        }

        try {
            const response = await fetch(`https://dns.google/resolve?name=${domain}&type=A`);
            const data = await response.json();

            type DnsAnswer = { name: string; type: number; TTL: number; data: string };

            if (data?.Answer && data.Answer.length > 0) {
                const ipAnswer = data.Answer.find((ans: DnsAnswer) => ans.type === 1);
                if (ipAnswer && ipAnswer.data) {
                    setDnsIp(ipAnswer.data); // Asignamos la IP obtenida
                    setDnsValid(true); // Indicamos que es válido
                } else {
                    setDnsIp('No IP found'); // En caso de no encontrar la IP
                    setDnsValid(false); // Indicamos que no es válido
                }
            } else {
                setDnsIp('No IP found'); // En caso de que la respuesta no tenga IP
                setDnsValid(false); // Indicamos que no es válido
            }
        } catch {
            setDnsIp('Error fetching IP'); // Error en la solicitud
            setDnsValid(false); // Indicamos que no es válido
        }
    };

    // Enviar los datos modificados
    const handleSubmit = async () => {
        try {
            await router.put(`/nodes/${formData.id}`, formData, {
                onSuccess: () => {
                    toast.success('Nodo actualizado correctamente');
                },
                onError: () => {
                    toast.error('Error al actualizar el nodo');
                },
            });
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error al enviar los datos.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;

        if (name === 'fqdn') {
            validateAndFetchIp(value);
        }

        setFormData((prev: any) => {
            if (name === 'fqdn' && !nameManuallyEdited) {
                const autoName = value.split('.')[0] || '';
                return { ...prev, fqdn: value, name: autoName };
            }
            if (name === 'name') {
                setNameManuallyEdited(true);
            }
            return { ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value };
        });
    };

    // Cargar datos al montar el componente
    useEffect(() => {
        if (!node) {
            toast.error('Nodo no encontrado');
        } else {
            setFormData(node);
            validateAndFetchIp(node.fqdn);
        }
    }, [node]);

    function handleRemoveAllocation(index: number): void {
        // Eliminar la asignación en el índice proporcionado
        setFormData((prev: any) => {
            const updatedAllocations = prev.allocations ? prev.allocations.filter((_: any, i: number) => i !== index) : [];
            return { ...prev, allocations: updatedAllocations };
        });
        toast.success('Allocation removed');
    }

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

    // Updates the node state for advanced settings fields
    function setNode(updatedNode: any): void {
        setFormData((prev: any) => ({
            ...prev,
            ...updatedNode,
        }));
    }

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await axios.get(`/api/nodes/${formData.id}/config-yaml`, {
                    headers: { Accept: 'text/plain' },
                    responseType: 'text',
                });
                setYamlConfig(response.data);
            } catch (error) {
                console.error('Error fetching daemon config:', error);
                toast.error('Error loading configuration file');
            }
        };
    
        if (activeSection === 'configurationFile') {
            fetchConfig();
        }
    }, [activeSection, formData.id]);
    function handleCreateAllocation(): void {
        toast.success('Allocation created');
        setIsCreateAllocationModalOpen(false);
    }

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Nodes', href: '/nodes' },
                { title: 'Edit', href: `/nodes/edit` },
                { title: formData.name || 'New Node', href: '' },
            ]}
        >
            <Head>
                <title>Edit Node</title>
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-black/90 p-6 font-[Orbitron] text-white transition-colors dark:bg-black dark:text-white">
                <div className="mb-6 flex items-center justify-between border-cyan-600">
                    <h1 className="text-3xl font-semibold tracking-widest text-cyan-400">EDIT NODE {formData.name || 'New Node'}</h1>
                </div>

                <div className="rounded-lg border-2 border-cyan-600 md:px-0">
                    <ol className="scrollbar-hide grid w-full grid-cols-1 gap-x-2 overflow-x-auto overflow-y-hidden rounded-t-lg border-b border-cyan-600 bg-black/90 p-2 text-cyan-500 md:grid-cols-4 dark:bg-black">
                        <li className="relative flex h-full items-center">
                            <button
                                type="button"
                                onClick={() => handleSectionChange('overview')}
                                className={`appearance-button flex items-center gap-3 rounded-full border-1 px-4 py-2 transition-colors duration-300 ${
                                    activeSection === 'overview'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-cyan-500 hover:border-cyan-600 hover:text-cyan-600'
                                }`}
                            >
                                <span className="select-none">Overview</span>
                            </button>
                        </li>
                        <li className="relative flex h-full items-center">
                            <button
                                type="button"
                                onClick={() => handleSectionChange('basicSettings')}
                                className={`appearance-button flex items-center gap-3 rounded-full border-1 px-4 py-2 transition-colors duration-300 ${
                                    activeSection === 'basicSettings'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-cyan-500 hover:border-cyan-600 hover:text-cyan-600'
                                }`}
                            >
                                <span className="select-none">Basic Settings</span>
                            </button>
                        </li>
                        <li className="relative flex h-full items-center">
                            <button
                                type="button"
                                onClick={() => handleSectionChange('advancedSettings')}
                                className={`appearance-button flex items-center gap-3 rounded-full border-1 px-4 py-2 transition-colors duration-300 ${
                                    activeSection === 'advancedSettings'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-cyan-500 hover:border-cyan-600 hover:text-cyan-600'
                                }`}
                            >
                                <span className="select-none">Advanced Settings</span>
                            </button>
                        </li>
                        <li className="relative flex h-full items-center">
                            <button
                                type="button"
                                onClick={() => handleSectionChange('configurationFile')}
                                className={`appearance-button flex items-center gap-3 rounded-full border-1 px-4 py-2 transition-colors duration-300 ${
                                    activeSection === 'configurationFile'
                                        ? 'border-cyan-500 text-cyan-400'
                                        : 'border-transparent text-cyan-500 hover:border-cyan-600 hover:text-cyan-600'
                                }`}
                            >
                                <span className="select-none">Configuration File</span>
                            </button>
                        </li>
                    </ol>

                    {/* Overview Section */}
                    {activeSection === 'overview' && (
                        <div className="p-4 md:px-0">
                            {/* Aquí va todo el contenido de la sección Overview */}
                            <div className="flex flex-col gap-2 p-3 px-3">
                                <fieldset className="rounded-lg border border-cyan-700 p-4">
                                    <legend className="px-2 text-sm font-semibold text-cyan-600 dark:text-cyan-400">Node Information</legend>
                                    <div className="grid grid-cols-4 gap-4 md:grid-cols-4">
                                        <div className="w-4/4">
                                            <label className="mb-1 block text-sm font-semibold text-cyan-400" htmlFor="name">
                                                Wings Version
                                            </label>
                                            <input
                                                id="name"
                                                name="name"
                                                type="text"
                                                value={formData.wings_version || 'N/A'}
                                                readOnly
                                                className="w-full rounded border border-cyan-600 bg-black/90 px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                            />
                                        </div>
                                        <div className="w-4/4">
                                            <label className="mb-1 block text-sm font-semibold text-cyan-400" htmlFor="fqdn">
                                                CPU Threads
                                            </label>
                                            <input
                                                id="cpu_threads"
                                                name="cpu threads"
                                                type="text"
                                                value={formData.cpu_threads || 'N/A'}
                                                readOnly
                                                className="w-full rounded border border-cyan-600 bg-black/90 px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                            />
                                        </div>
                                        <div className="w-4/4">
                                            <label className="mb-1 block text-sm font-semibold text-cyan-400" htmlFor="port">
                                                Architecture
                                            </label>
                                            <input
                                                id="architecture"
                                                name="architecture"
                                                type="text"
                                                value={formData.architecture || 'N/A'}
                                                readOnly
                                                className="w-full rounded border border-cyan-600 bg-black/90 px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                            />
                                        </div>
                                        <div className="w-4/4">
                                            <label className="mb-1 block text-sm font-semibold text-cyan-400" htmlFor="scheme">
                                                Kernel
                                            </label>
                                            <input
                                                id="kernel"
                                                name="kernel"
                                                type="text"
                                                value={formData.kernel || 'N/A'}
                                                readOnly
                                                className="w-full rounded border border-cyan-600 bg-black/90 px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                            />
                                        </div>
                                    </div>
                                </fieldset>

                                <div className="mt-4 rounded-lg border border-cyan-700 p-4">
                                    <div className="grid grid-cols-2 gap-2 md:grid-cols-2">
                                        <div className="mb-2 w-3/3 rounded">
                                            <CPU {...formData} />
                                        </div>
                                        <div className="mb-2 w-3/3 rounded">
                                            <Memory {...formData} />
                                        </div>
                                        <div className="h-96 w-6/3 rounded">
                                            <Storage {...formData} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Basic Settings Section */}
                    {activeSection === 'basicSettings' && (
                        <div className="md:px-0">
                            <div className="md:px-0">
                                <div className="mb-5 flex flex-col gap-4 px-6">
                                    <div className="flex flex-col gap-6 p-6 md:flex-row">
                                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                            {/* FQDN */}
                                            <div>
                                                <label className="mb-1 block text-sm font-semibold" htmlFor="fqdn">
                                                    Domain Name *
                                                </label>
                                                <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
                                                    <Server className="ml-2 h-5 w-5 text-cyan-500" />
                                                    <input
                                                        id="fqdn"
                                                        name="fqdn"
                                                        type="text"
                                                        value={formData.fqdn}
                                                        onChange={handleChange}
                                                        className="w-full border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                                    />
                                                </div>
                                            </div>

                                            {/* Selector DNS */}
                                            <div className="flex flex-col gap-2">
                                                <label htmlFor="dns-BadgeCheck" className="flex items-center text-sm font-semibold">
                                                    DNS Record BadgeCheck
                                                    <span
                                                        className={`ml-auto ${
                                                            dnsValid === null
                                                                ? 'text-gray-500 dark:text-gray-400'
                                                                : dnsValid
                                                                  ? 'text-green-500'
                                                                  : 'text-red-600 dark:text-red-400'
                                                        }`}
                                                    >
                                                        {dnsIp}
                                                    </span>
                                                </label>
                                                <div className="flex flex-wrap justify-center gap-4 md:flex-nowrap md:justify-start">
                                                    <button
                                                        className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                            dnsValid
                                                                ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                                : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                        }`}
                                                        disabled={!dnsValid}
                                                        onClick={() => {}}
                                                    >
                                                        Valid
                                                    </button>

                                                    <button
                                                        className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                            dnsValid === false
                                                                ? 'border-red-600 bg-red-600 text-white dark:bg-red-700/80 dark:text-white dark:hover:bg-red-800'
                                                                : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                        }`}
                                                        disabled={dnsValid !== false}
                                                        onClick={() => {}}
                                                    >
                                                        Invalid
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Port */}
                                            <div>
                                                <label htmlFor="port" className="mb-1 block text-sm font-semibold text-cyan-400">
                                                    Port*
                                                </label>
                                                <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
                                                    <Server className="ml-2 h-5 w-5 text-cyan-500" />
                                                    <input
                                                        id="port"
                                                        name="daemon_listen"
                                                        type="number"
                                                        value={formData.daemon_listen}
                                                        onChange={handleChange}
                                                        className="border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                                    />
                                                </div>
                                            </div>

                                            {/* Node Name */}
                                            <div>
                                                <label htmlFor="name" className="mb-1 block text-sm font-semibold text-cyan-400">
                                                    Node Name *
                                                </label>
                                                <div className="flex items-center gap-2 rounded border border-cyan-600 bg-black/90 transition-colors duration-200 hover:border-cyan-400">
                                                    <Server className="ml-2 h-5 w-5 text-cyan-500" />
                                                    <input
                                                        id="name"
                                                        name="name"
                                                        type="text"
                                                        value={formData.name}
                                                        onChange={handleChange}
                                                        className="border-l bg-transparent px-4 py-2 text-sm text-cyan-600 focus:outline-none dark:text-cyan-400"
                                                    />
                                                </div>
                                            </div>

                                            {/* SSL */}
                                            <div className="grid">
                                                <label className="mb block font-semibold text-white">Communicate over SSL</label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div
                                                        role="radio"
                                                        aria-checked={formData.scheme === 'http'}
                                                        tabIndex={-1}
                                                        className="text-white-600 flex items-center gap-3 rounded border border-cyan-700 bg-cyan-800 px-4 py-2 dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60"
                                                        onClick={() => setFormData({ ...formData, scheme: 'http' })}
                                                    >
                                                        <LockOpen size={18} />
                                                        <span>HTTP</span>
                                                    </div>

                                                    <div
                                                        role="radio"
                                                        aria-checked={formData.scheme === 'https'}
                                                        tabIndex={0}
                                                        className={`flex items-center gap-3 rounded border px-4 py-2 select-none ${
                                                            formData.scheme === 'https'
                                                                ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                                : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                        }`}
                                                        onClick={() => setFormData({ ...formData, scheme: 'https' })}
                                                    >
                                                        <Lock size={18} />
                                                        <span>HTTPS (SSL)</span>
                                                    </div>

                                                    <div
                                                        role="radio"
                                                        aria-checked={formData.scheme === 'https-reverse'}
                                                        tabIndex={0}
                                                        onClick={() => setFormData({ ...formData, scheme: 'https-reverse' })}
                                                        className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                            formData.scheme === 'https-reverse'
                                                                ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                                : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                        }`}
                                                    >
                                                        <Shield size={38} />
                                                        <span>HTTPS with (reverse) proxy</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Submit Button */}
                                    <div className="mt-6 flex justify-center md:justify-end">
                                        {' '}
                                        <button
                                            type="button"
                                            onClick={handleSubmit}
                                            className="flex items-center justify-center rounded bg-cyan-600 px-4 py-2 text-white transition-colors duration-300 hover:bg-cyan-700"
                                        >
                                            Save Changes
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Advanced Settings Section */}
                    {activeSection === 'advancedSettings' && (
                        <div className="md:px-0">
                            <div className="mt-6 mb-6 flex flex-col gap-5 px-6">
                                {/* Node Settings Section */}
                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        {/* Node Name */}
                                        <div>
                                            <label htmlFor="name" className="mb-1 block text-sm font-semibold text-white">
                                                Node Name <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={node.id}
                                                onChange={(e) => setNode({ ...node, name: e.target.value })}
                                                className="w-full rounded border border-cyan-700 bg-[#1a1a1a] px-4 py-2 text-sm text-cyan-300 placeholder-cyan-600 focus:outline-none"
                                            />
                                        </div>
                                        {/* Node UUID */}
                                        <div>
                                            <label htmlFor="uuid" className="mb-1 block text-sm font-semibold text-white">
                                                Node UUID <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="uuid"
                                                name="uuid"
                                                value={node.uuid}
                                                onChange={(e) => setNode({ ...node, uuid: e.target.value })}
                                                className="w-full rounded border border-cyan-700 bg-[#1a1a1a] px-4 py-2 text-sm text-cyan-300 placeholder-cyan-600 focus:outline-none"
                                            />
                                        </div>
                                        {/* Node Tags */}
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold text-white">Tags</label>
                                            <TagInput
                                                tags={node.tags
                                                    .split(',')
                                                    .map((tag: string) => tag.trim())
                                                    .filter((tag: string) => tag !== '')}
                                                onChange={(newTags: string[]) => setNode({ ...node, tags: newTags.join(',') })}
                                            />
                                        </div>
                                        {/* Upload Limit */}
                                        <div>
                                            <label
                                                onMouseEnter={() => setActiveTooltip('uploadLimit')}
                                                onMouseLeave={() => setActiveTooltip(null)}
                                                htmlFor="uploadLimit"
                                                className="end mb-1 block flex items-center gap-36 text-sm font-semibold text-white"
                                            >
                                                <div className="w-full">
                                                    Upload Limit <span className="text-red-500">*</span>
                                                </div>
                                                <div
                                                    className="relative flex h-4 cursor-pointer items-center justify-center rounded text-xs font-bold text-white"
                                                    aria-label="Help"
                                                >
                                                    ?
                                                    {activeTooltip === 'uploadLimit' && (
                                                        <div className="absolute bottom-full mb-2 w-64 rounded bg-cyan-900 p-2 text-xs text-white shadow-lg">
                                                            Make sure your webserver supports file uploads of this size!
                                                            <div className="absolute top-full left-1/2 -ml-2 h-2 w-2 rotate-45 bg-cyan-900"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </label>

                                            <div className="relative flex w-full items-center rounded border border-cyan-700 bg-[#1a1a1a]">
                                                {/* Input */}
                                                <input
                                                    id="uploadLimit"
                                                    name="upload_limit"
                                                    type="number"
                                                    placeholder="256"
                                                    value={node.upload_limit}
                                                    onChange={(e) => setNode({ ...node, upload_limit: Number(e.target.value) })}
                                                    className="w-full bg-transparent p-2 pl-3 text-cyan-300 placeholder-cyan-600 focus:outline-none"
                                                    style={{ border: 'none' }}
                                                />

                                                {/* Unidad con línea vertical */}
                                                <span className="pointer-events-none absolute top-0 right-3 bottom-0 flex items-center border-l border-cyan-500 px-3 text-cyan-400 select-none">
                                                    MB
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-gray-400">
                                                Enter the maximum size of files that can be uploaded through the web-based file manager.
                                            </p>
                                        </div>
                                    </div>
                                    {/* SFTP Settings Section */}
                                    <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                                        {/* SFTP Port */}
                                        <div>
                                            <label htmlFor="sftpPort" className="mb-1 block text-sm font-semibold text-white">
                                                SFTP Port <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative flex w-full items-center rounded border border-cyan-700 bg-[#1a1a1a]">
                                                <input
                                                    id="sftpPort"
                                                    name="sftp_port"
                                                    type="number"
                                                    placeholder="22"
                                                    value={node.sftp_port}
                                                    onChange={(e) => setNode({ ...node, sftp_port: Number(e.target.value) })}
                                                    className="w-full bg-transparent p-2 pl-3 text-cyan-300 placeholder-cyan-600 focus:outline-none"
                                                    style={{ border: 'none' }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-400">
                                                The port used for SFTP connections. Make sure this port is open in your firewall.
                                            </p>
                                        </div>
                                        {/* SFTP Alias */}
                                        <div>
                                            <label htmlFor="sftpAlias" className="mb-1 block text-sm font-semibold text-white">
                                                SFTP Alias <span className="text-red-500">*</span>
                                            </label>
                                            <div className="relative flex w-full items-center rounded border border-cyan-700 bg-[#1a1a1a]">
                                                <input
                                                    id="sftpAlias"
                                                    name="sftp_alias"
                                                    type="text"
                                                    placeholder="my-node-sftp"
                                                    value={node.sftp_alias}
                                                    onChange={(e) => setNode({ ...node, sftp_alias: e.target.value })}
                                                    className="w-full bg-transparent p-2 pl-3 text-cyan-300 placeholder-cyan-600 focus:outline-none"
                                                    style={{ border: 'none' }}
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-400">
                                                Display alias for the SFTP address. Leave empty to use the Node FQDN.
                                            </p>
                                        </div>

                                        {/* Use for Deployments */}
                                        <div>
                                            <label className="mb-1 block text-sm font-semibold text-white">Use for Deployments?</label>
                                            <div className="flex flex-wrap gap-4 md:flex-nowrap">
                                                <button
                                                    type="button"
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                        useDeployments === 'yes'
                                                            ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                            : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                    onClick={() => setUseDeployments('yes')}
                                                >
                                                    Yes
                                                </button>

                                                <button
                                                    type="button"
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                        useDeployments === 'no'
                                                            ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                            : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                    onClick={() => setUseDeployments('no')}
                                                >
                                                    No
                                                </button>
                                            </div>
                                        </div>
                                        {/* Maintenance Mode */}
                                        <div>
                                            <label
                                                onMouseEnter={() => setActiveTooltip('maintenance')}
                                                onMouseLeave={() => setActiveTooltip(null)}
                                                className="end mb-1 block flex items-center gap-26 text-sm font-semibold text-white"
                                            >
                                                Maintenance Mode
                                                <div
                                                    className="relative flex h-5 w-5 cursor-pointer items-center justify-center font-bold text-white"
                                                    aria-label="Help"
                                                >
                                                    ?
                                                    {activeTooltip === 'maintenance' && (
                                                        <div className="absolute bottom-full mb-2 w-48 rounded bg-cyan-900 p-2 text-xs text-white shadow-lg">
                                                            If the node is marked 'Under Maintenance' users won't be able to access servers that are
                                                            on that node
                                                            <div className="absolute top-full left-1/2 -ml-2 h-2 w-2 rotate-45 bg-gray-900"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </label>

                                            <div className="flex flex-wrap justify-center gap-2 md:flex-nowrap md:justify-start">
                                                <button
                                                    type="button"
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                        maintenanceMode === 'enabled'
                                                            ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                            : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                    onClick={() => setMaintenanceMode('enabled')}
                                                >
                                                    Enabled
                                                </button>

                                                <button
                                                    type="button"
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold select-none ${
                                                        maintenanceMode === 'disabled'
                                                            ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                            : 'text-white-400 border-cyan-700 bg-cyan-800 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                    onClick={() => setMaintenanceMode('disabled')}
                                                >
                                                    Disabled
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Memory, Disk, CPU */}
                                    <div className="mt-6 grid grid-cols-1 gap-6 text-sm text-white sm:grid-cols-2 md:grid-cols-3">
                                        {/* Memory */}
                                        <div>
                                            <span>
                                                Memory <span className="text-red-500">*</span>
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setMemory('unlimited')}
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                        memory === 'unlimited'
                                                            ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                            : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                >
                                                    Unlimited
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setMemory('limited')}
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                        memory === 'limited'
                                                            ? 'border-[#ff9f00] bg-[#ff9f00] text-white dark:bg-[#cc8700] dark:text-white dark:hover:bg-[#e0a629]'
                                                            : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                >
                                                    Limited
                                                </button>
                                            </div>
                                            {memory === 'limited' ? (
                                                <>
                                                    <span className="justify-self-end pr-2 whitespace-nowrap">
                                                        Memory Limit <span className="text-red-500">*</span>
                                                    </span>
                                                    <div className="relative flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={memoryLimit}
                                                            onChange={(e) => setMemoryLimit(e.target.value)}
                                                            placeholder="0"
                                                            className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-12 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                        >
                                                            MiB
                                                        </button>
                                                    </div>

                                                    <span className="justify-self-end pr-2 whitespace-nowrap">
                                                        Overallocate <span className="text-red-500">*</span>
                                                    </span>
                                                    <div className="relative flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={memoryOverallocate}
                                                            onChange={(e) => setMemoryOverallocate(e.target.value)}
                                                            placeholder="0"
                                                            className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-10 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                        >
                                                            %
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span></span>
                                                    <span></span>
                                                    <span></span>
                                                    <span></span>
                                                </>
                                            )}
                                        </div>
                                        {/* Disk */}
                                        <div>
                                            <span>
                                                Disk <span className="text-red-500">*</span>
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setDisk('unlimited')}
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                        disk === 'unlimited'
                                                            ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                            : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                >
                                                    Unlimited
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setDisk('limited')}
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                        disk === 'limited'
                                                            ? 'border-[#ff9f00] bg-[#ff9f00] text-white dark:bg-[#cc8400]/80 dark:text-white dark:hover:bg-[#e6a600]'
                                                            : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                >
                                                    Limited
                                                </button>
                                            </div>
                                            {disk === 'limited' ? (
                                                <>
                                                    <span className="justify-self-end pr-2 whitespace-nowrap">
                                                        Disk Limit <span className="text-red-500">*</span>
                                                    </span>
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="number"
                                                            value={diskLimit}
                                                            onChange={(e) => setDiskLimit(e.target.value)}
                                                            placeholder="0"
                                                            className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-12 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                        >
                                                            MiB
                                                        </button>
                                                    </div>

                                                    <span className="justify-self-end pr-2 whitespace-nowrap">
                                                        Overallocate <span className="text-red-500">*</span>
                                                    </span>
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="number"
                                                            value={diskOverallocate}
                                                            onChange={(e) => setDiskOverallocate(e.target.value)}
                                                            placeholder="0"
                                                            className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-10 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                        >
                                                            %
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span></span>
                                                    <span></span>
                                                    <span></span>
                                                    <span></span>
                                                </>
                                            )}
                                        </div>

                                        {/* CPU */}
                                        <div>
                                            <span>
                                                CPU <span className="text-red-500">*</span>
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setCpu('unlimited')}
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                        cpu === 'unlimited'
                                                            ? 'border-green-500 bg-green-600 text-white dark:bg-green-700/80 dark:text-white dark:hover:bg-green-800'
                                                            : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                >
                                                    Unlimited
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setCpu('limited')}
                                                    className={`flex w-full cursor-pointer items-center gap-3 rounded border px-4 py-2 text-sm font-semibold transition-colors select-none ${
                                                        cpu === 'limited'
                                                            ? 'border-[#ff9f00] bg-[#ff9f00] text-white dark:bg-[#cc8400]/80 dark:text-white dark:hover:bg-[#e6a600]'
                                                            : 'border-cyan-700 bg-cyan-800 text-cyan-400 hover:bg-cyan-700 hover:text-white dark:bg-cyan-900/40 dark:text-cyan-300 dark:hover:bg-cyan-700/60'
                                                    }`}
                                                >
                                                    Limited
                                                </button>
                                            </div>
                                            {cpu === 'limited' ? (
                                                <>
                                                    <span className="justify-self-end pr-2 whitespace-nowrap">
                                                        CPU Limit <span className="text-red-500">*</span>
                                                    </span>
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="number"
                                                            value={cpuLimit}
                                                            onChange={(e) => setCpuLimit(e.target.value)}
                                                            placeholder="0"
                                                            className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-12 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                        >
                                                            %
                                                        </button>
                                                    </div>

                                                    <span className="justify-self-end pr-2 whitespace-nowrap">
                                                        Overallocate <span className="text-red-500">*</span>
                                                    </span>
                                                    <div className="relative flex items-center">
                                                        <input
                                                            type="number"
                                                            value={cpuOverallocate}
                                                            onChange={(e) => setCpuOverallocate(e.target.value)}
                                                            placeholder="0"
                                                            className="w-full rounded-sm border border-gray-600 bg-[#222222] px-2 py-1 pr-10 text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled
                                                            className="absolute top-0 right-0 bottom-0 flex items-center rounded-sm border border-gray-600 bg-[#222222] px-3 text-xs text-gray-300"
                                                        >
                                                            %
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <span></span>
                                                    <span></span>
                                                    <span></span>
                                                    <span></span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Configuration File Section */}
                    {activeSection === 'configurationFile' && (
                        <div className="p-6 space-y-6">
                            <div className="">
                                <h2 className="mb-1 text-sm font-semibold text-cyan-400">Instructions</h2>
                                <p className="text-sm text-cyan-500">
                                    Save this file to your daemon's root directory, named <code className="text-cyan-300">config.yml</code>
                                </p>

                                <div className="relative mt-4">
                                    <div className="absolute right-3 top-3 z-10 cursor-pointer text-xs text-cyan-400 hover:underline" onClick={() => {
                                        navigator.clipboard.writeText(yamlConfig);
                                        toast.success('Copied to clipboard');
                                    }}>
                                        ⧉ Copy
                                    </div>

                                    <pre className="w-full whitespace-pre-wrap break-words rounded border border-cyan-800 bg-black p-4 text-sm font-[Orbitron] text-cyan-300">
                                        <code>{yamlConfig || 'Loading configuration...'}</code>
                                    </pre>
                                </div>

                                <div className="mt-4 flex flex-col gap-3 md:flex-row">
                                    <button
                                        className="w-full rounded bg-cyan-600 px-2 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                                    >
                                        Auto Deploy Command
                                    </button>
                                    <button
                                        className="w-full rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                                    >
                                        Reset Authorization Token
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div>
                    {/* Botones para alternar entre Servers y Allocations */}
                    <div className="mt-8 flex justify-center">
                        <div className="mt-8 flex justify-center gap-4">
                            {/* Botones para alternar entre Servers y Allocations */}
                            <button
                                onClick={() => setShowServers(true)}
                                className={`rounded px-4 py-2 text-sm font-semibold ${showServers ? 'bg-cyan-600 text-white' : 'bg-black text-cyan-400'}`}
                            >
                                Servers
                            </button>
                            <button
                                onClick={() => setShowServers(false)}
                                className={`rounded px-4 py-2 text-sm font-semibold ${!showServers ? 'bg-cyan-600 text-white' : 'bg-black text-cyan-400'}`}
                            >
                                Allocations
                            </button>
                        </div>
                    </div>

                    <section className="mt-12 rounded border border-cyan-700 bg-[#121212] p-6 text-cyan-400">
                        {/* Mostrar Servers */}
                        {showServers ? (
                            <div>
                                <h2 className="mb-4 text-lg font-semibold">Servers</h2>
                                {node.servers && node.servers.length > 0 ? (
                                    <ul className="list-inside list-disc">
                                        {node.servers.map((srv: any) => (
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
                                        <p>No Servers are assigned to this node</p>
                                        <p className="text-sm text-cyan-600">No Servers</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Mostrar Allocations
                            <div>
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="mb-4 text-lg font-semibold">Allocations</h2>
                                    {/* Create Allocation Button */}
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setIsCreateAllocationModalOpen(true)}
                                            className="rounded-lg border border-cyan-500 bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-800 transition-all hover:scale-[1.03] hover:bg-cyan-200 dark:border-cyan-500 dark:bg-cyan-900/50 dark:text-cyan-300 dark:hover:bg-cyan-700/70"
                                        >
                                            Create Allocation
                                        </button>

                                        <AllocationModal
                                                isOpen={isCreateAllocationModalOpen}
                                                onClose={() => setIsCreateAllocationModalOpen(false)}
                                                onSubmit={handleCreateAllocation}
                                                fqdn={node.fqdn} ipOptions={[]}                                        />
                                    </div>
                                </div>
                                {node.allocations && node.allocations.length > 0 ? (
                                    <ul className="list-inside list-disc">
                                        {node.allocations.map((allocation: any, index: number) => (
                                            <li key={index} className="flex items-center justify-between">
                                                <span>{allocation.port}</span>
                                                <span>{allocation.server}</span>
                                                <span>{allocation.ip}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAllocation(index)} // Handle the remove functionality
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    Remove
                                                </button>
                                            </li>
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
                                        <p>No allocations are assigned to this node</p>
                                        <p className="text-sm text-cyan-600">No Allocations</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
