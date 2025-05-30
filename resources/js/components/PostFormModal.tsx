import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Post {
    id?: number;
    title: string;
    content: string;
    picture?: string;
}

interface Props {
    isOpen: boolean;
    closeModal: () => void;
    post?: Post | null;
}

export default function PostFormModal({ isOpen, closeModal, post }: Props) {
    const [formData, setFormData] = useState<Post>({ title: '', content: '', picture: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>('');

    useEffect(() => {
        if (post) {
            setFormData({ title: post.title, content: post.content, picture: post.picture || '' });
            setPreview(post.picture || '');
            setSelectedFile(null);
        } else {
            setFormData({ title: '', content: '', picture: '' });
            setPreview('');
            setSelectedFile(null);
        }
    }, [post]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = new FormData();
        data.append('title', formData.title);
        data.append('content', formData.content);
        if (selectedFile) {
            data.append('picture', selectedFile);
        }
        const successMessage = post ? 'Post updated successfully!' : 'Post created successfully!';
        const errorMessage = post ? 'Error updating post!' : 'Error creating post!';

        if (post?.id) {
            data.append('_method', 'PUT');
            router.post(`/posts/${post.id}`, data, {
                onSuccess: () => {
                    toast.success(successMessage);
                    closeModal();
                    router.reload();
                },
                onError: () => {
                    toast.error(errorMessage);
                },
            });
        } else {
            router.post('/posts', data, {
                onSuccess: () => {
                    toast.success(successMessage);
                    closeModal();
                    router.reload();
                },
                onError: () => {
                    toast.error(errorMessage);
                },
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="bg-opacity-60 fixed inset-0 z-50 flex items-center justify-center bg-black font-[Orbitron]">
            <div className="w-full max-w-xl rounded-lg border border-yellow-600 bg-neutral-900 p-6 text-white shadow-[0_0_20px_#c084fc66]">
                <h2 className="mb-4 text-lg font-bold text-yellow-300">{post ? 'Edit Post' : 'Create New Post'}</h2>
                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    <div className="mb-4">
                        <label className="block text-sm text-yellow-400">Title</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="w-full rounded border border-yellow-700 bg-black px-3 py-2 text-sm text-white shadow-[0_0_6px_#c084fc66] placeholder:text-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm text-yellow-400">Content</label>
                        <textarea
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            required
                            className="w-full rounded border border-yellow-700 bg-black px-3 py-2 text-sm text-white shadow-[0_0_6px_#c084fc66] placeholder:text-yellow-500 focus:ring-1 focus:ring-yellow-500 focus:outline-none"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm text-yellow-400">Picture (optional)</label>
                        <input type="file" name="picture" accept="image/*" onChange={handleFileChange} className="w-full text-yellow-300" />
                    </div>

                    {preview && (
                        <div className="mb-4">
                            <p className="mb-1 text-sm text-yellow-400">Preview:</p>
                            <img src={preview} alt="Preview" className="w-full rounded border border-yellow-500 shadow" />
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="rounded border border-gray-500 bg-neutral-800 px-4 py-2 text-sm text-gray-300 transition hover:bg-neutral-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="rounded border border-yellow-600 bg-yellow-800 px-4 py-2 text-sm text-yellow-100 shadow-[0_0_8px_#c084fc] transition hover:bg-yellow-700"
                        >
                            {post ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
