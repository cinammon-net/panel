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

                <div className="mt-6 overflow-hidden rounded-lg border border-yellow-300 bg-white shadow-none transition dark:border-yellow-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#facc1533]">
                    <table className="min-w-full table-auto text-sm">
                        <thead className="bg-yellow-100 tracking-wide text-yellow-700 uppercase dark:bg-yellow-900 dark:text-yellow-300">
                            <tr>
                                <th className="px-4 py-3 text-left">Picture</th>
                                <th className="px-4 py-3 text-left">Title</th>
                                <th className="px-4 py-3 text-left">Content</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {posts.length ? (
                                posts.map((post) => (
                                    <tr
                                        key={post.id}
                                        className="border-t border-yellow-300 transition hover:bg-yellow-50 dark:border-yellow-700 dark:hover:bg-yellow-800/10"
                                    >
                                        <td className="px-4 py-3">
                                            {post.picture ? (
                                                <img
                                                    src={post.picture}
                                                    alt={post.title}
                                                    className="h-16 w-16 rounded border border-yellow-300 shadow-sm dark:border-yellow-500"
                                                />
                                            ) : (
                                                <span className="text-yellow-600 dark:text-yellow-400">No picture</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-yellow-800 dark:text-yellow-100">{post.title}</td>
                                        <td className="px-4 py-3 text-yellow-700 dark:text-yellow-200">{post.content}</td>
                                        <td className="flex justify-end gap-2 px-4 py-3">
                                            <button
                                                onClick={() => openModal(post)}
                                                className="rounded border border-yellow-500 bg-yellow-500 p-1.5 text-black transition hover:bg-yellow-400 dark:border-yellow-600 dark:hover:bg-yellow-500"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(post.id)}
                                                className="rounded border border-red-500 bg-transparent p-1.5 text-red-500 transition hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-4 py-6 text-center text-yellow-500 dark:text-yellow-400">
                                        No posts available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <PostFormModal isOpen={isModalOpen} closeModal={() => setIsModalOpen(false)} post={selectedPost} />
        </AppLayout>
    );
}
