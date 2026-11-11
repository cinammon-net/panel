import PostFormModal from '@/components/PostFormModal';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Posts', href: '/posts' }];

interface PostItem {
    id: number;
    title: string;
    content: string;
    picture?: string;
    created_at?: string;
}

export default function Posts() {
    const { posts, canManage: canManageProp, auth, flash } = usePage<{
        posts: PostItem[];
        canManage?: boolean;
        auth?: { user?: { roles?: string[] } | null };
        flash?: { success?: string; error?: string };
    }>().props;

    const userRoles = auth?.user?.roles ?? [];
    const canManage = canManageProp ?? (userRoles.includes('Owner') || userRoles.includes('Admin'));

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<PostItem | null>(null);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const openModal = (post: PostItem | null = null) => {
        if (!canManage) return;
        setSelectedPost(post);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
        if (!canManage) return;
        router.delete(`/posts/${id}`, {
            onSuccess: () => {
                toast.success('Post eliminado con éxito');
                router.reload();
            },
            onError: () => {
                toast.error('Error al eliminar el post');
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Posts">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>

            <Toaster position="top-center" richColors />

            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                <div className="flex items-center justify-between border-yellow-600">
                    <h1 className="text-3xl font-semibold tracking-widest text-yellow-700 drop-shadow-none dark:text-yellow-400 dark:drop-shadow-[0_0_5px_#facc15]">
                        POSTS
                    </h1>
                    {canManage && (
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 rounded border border-yellow-500 bg-yellow-500 px-4 py-2 text-sm text-black shadow-md transition hover:bg-yellow-600 dark:border-yellow-600 dark:text-black dark:hover:bg-yellow-600"
                        >
                            <Plus className="h-4 w-4" /> Add New Post
                        </button>
                    )}
                </div>

                {canManage ? (
                    <div className="mt-6 overflow-x-auto rounded-lg border border-yellow-600 bg-white dark:border-yellow-700 dark:bg-black">
                        <table className="w-full table-auto text-sm text-yellow-800 dark:text-yellow-300">
                            <thead className="border-b border-yellow-600 bg-yellow-900 text-yellow-200">
                                <tr>
                                    <th className="px-4 py-3 text-left">Title</th>
                                    <th className="px-4 py-3 text-left">Content</th>
                                    <th className="px-4 py-3 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {posts.map((post) => (
                                    <tr key={post.id} className="border-b border-yellow-200 dark:border-yellow-800">
                                        <td className="px-4 py-3">{post.title}</td>
                                        <td className="px-4 py-3">{post.content.slice(0, 100)}...</td>
                                        <td className="px-4 py-3 flex items-center gap-2">
                                            <button
                                                onClick={() => openModal(post)}
                                                className="text-blue-500 hover:underline"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                className="text-red-500 hover:underline"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {posts.length === 0 && (
                            <div className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                No posts found.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-6 space-y-4">
                        {posts.map((post) => (
                            <article
                                key={post.id}
                                className="overflow-hidden rounded-lg border border-yellow-600/60 bg-white p-5 shadow-sm dark:border-yellow-700/70 dark:bg-neutral-950"
                            >
                                {post.picture && (
                                    <img
                                        src={post.picture}
                                        alt={post.title}
                                        className="mb-4 max-h-64 w-full rounded-md object-cover"
                                    />
                                )}
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                    <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-300">
                                        {post.title}
                                    </h2>
                                    {post.created_at && (
                                        <time className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {new Date(post.created_at).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </time>
                                    )}
                                </div>
                                <p className="mt-3 whitespace-pre-line font-sans text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                                    {post.content}
                                </p>
                            </article>
                        ))}
                        {posts.length === 0 && (
                            <div className="rounded-lg border border-yellow-600/40 px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                No hay publicaciones disponibles.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {canManage && (
                <PostFormModal isOpen={isModalOpen} closeModal={() => setIsModalOpen(false)} post={selectedPost} />
            )}
        </AppLayout>
    );
}
