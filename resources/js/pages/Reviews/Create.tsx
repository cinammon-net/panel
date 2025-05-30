import AppLayout from '@/layouts/app-layout';
import { Head, useForm, Link } from '@inertiajs/react';
import React from 'react';


export default function CreateReview() {
    const { data, setData, post, processing, errors } = useForm({
        rating: 5,
        comment: '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/reviews');
    };

    return (
        <AppLayout
            breadcrumbs={[
                { title: 'Reviews', href: '/reviews' },
                { title: 'New', href: '/reviews/create' },
            ]}
        >
            <Head title="New Review">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap" rel="stylesheet" />
            </Head>

            <div className="p-6 font-[Orbitron] text-black dark:text-white">
                <h1 className="mb-6 text-3xl font-semibold tracking-widest text-yellow-700 drop-shadow-none dark:text-yellow-400 dark:drop-shadow-[0_0_5px_#facc15]">
                    Create Review
                </h1>

                <form onSubmit={submit} className="space-y-6">
                    {/* ⭐ Estrellas */}
                    <div>
                        <label className="mb-1 block text-sm font-semibold text-yellow-600 dark:text-yellow-300">Rating</label>
                        <div className="flex items-center gap-1 text-3xl">
                            {Array.from({ length: 5 }).map((_, i) => {
                                const star = i + 1;
                                return (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setData('rating', star)}
                                        className={`transition ${
                                            star <= data.rating ? 'text-yellow-400 drop-shadow-[0_0_4px_#facc15]' : 'text-gray-400 dark:text-gray-600'
                                        } hover:scale-110`}
                                    >
                                        ★
                                    </button>
                                );
                            })}
                            <span className="ml-2 text-sm text-yellow-600 dark:text-yellow-300">{data.rating} / 5</span>
                        </div>
                        {errors.rating && <p className="mt-1 text-sm text-red-500">{errors.rating}</p>}
                    </div>

                    {/* 💬 Comentario */}
                    <div>
                        <label className="block text-sm font-semibold text-yellow-600 dark:text-yellow-300">Comment</label>
                        <textarea
                            value={data.comment}
                            onChange={(e) => setData('comment', e.target.value)}
                            className="mt-1 block w-full rounded-lg border border-yellow-400 bg-white px-3 py-2 text-black shadow-sm focus:ring focus:outline-none dark:border-yellow-600 dark:bg-neutral-900 dark:text-white"
                            rows={4}
                            placeholder="Write your opinion here..."
                        />
                        {errors.comment && <p className="mt-1 text-sm text-red-500">{errors.comment}</p>}
                    </div>

                    {/* 🚀 Enviar */}
                    <div>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-md border border-yellow-500 bg-yellow-600 px-6 py-2 font-semibold text-black shadow-md transition hover:bg-yellow-500 hover:text-white hover:shadow-lg disabled:opacity-50"
                        >
                            Submit Review
                        </button>

                        <Link
                            href="/reviews"
                            className="ml-4 rounded-md border border-gray-300 bg-gray-200 px-6 py-2 font-semibold text-gray-800 shadow-sm transition hover:bg-gray-300 dark:border-gray-700 dark:bg-neutral-800 dark:text-white dark:hover:bg-neutral-700"
                        >
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
