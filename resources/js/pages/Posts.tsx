import PostFormModal from '@/components/PostFormModal';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Posts', href: '/posts' }];

export default function Posts() {
    const { posts, flash } = usePage<{
        posts: { id: number; title: string; content: string; picture?: string }[];
        flash?: { success?: string; error?: string };
    }>().props;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPost, setSelectedPost] = useState<{ id: number; title: string; content: string; picture?: string } | null>(null);

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const openModal = (post: typeof selectedPost = null) => {
        setSelectedPost(post);
        setIsModalOpen(true);
    };

    const handleDelete = (id: number) => {
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
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 rounded border border-yellow-500 bg-yellow-500 px-4 py-2 text-sm text-black shadow-md transition hover:bg-yellow-600 dark:border-yellow-600 dark:text-black dark:hover:bg-yellow-600"
                    >
                        <Plus className="h-4 w-4" /> Add New Post
                    </button>
                </div>

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
            </div>

            <PostFormModal isOpen={isModalOpen} closeModal={() => setIsModalOpen(false)} post={selectedPost} />
        </AppLayout>
    );
}
