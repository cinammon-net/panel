import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';

interface ReviewItem {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    user: {
        name: string;
    };
}

interface Pagination<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
}

export default function Reviews() {
    const { reviews, filters, flash } = usePage<{
        reviews: Pagination<ReviewItem>;
        filters: { search?: string; sort?: string; direction?: string; per_page?: number };
        flash?: { success?: string; error?: string };
    }>().props;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const handleSort = (column: string) => {
        const isSameField = filters.sort === column;
        const newDirection = isSameField && filters.direction === 'asc' ? 'desc' : 'asc';

        router.get(
            '/reviews',
            {
                ...filters,
                sort: column,
                direction: newDirection,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Reviews', href: '/reviews' }]}>
            <Head title="Reviews">
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600&display=swap" rel="stylesheet" />
            </Head>
            <div className="min-h-screen bg-white p-6 font-[Orbitron] text-black transition-colors dark:bg-black dark:text-white">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between border-yellow-500 dark:border-yellow-600">
                    <h1 className="text-3xl font-semibold tracking-widest text-yellow-700 drop-shadow-none dark:text-yellow-400 dark:drop-shadow-[0_0_5px_#facc15]">
                        REVIEWS
                    </h1>
                    <Link
                        href="/reviews/create"
                        className="inline-flex items-center rounded border border-yellow-400 bg-yellow-500 px-4 py-2 text-sm font-medium text-black shadow-md transition hover:bg-yellow-600 dark:border-yellow-600 dark:bg-yellow-500 dark:text-black dark:hover:bg-yellow-600"
                    >
                        Create Review
                    </Link>
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-lg border border-yellow-300 bg-white shadow-none transition dark:border-yellow-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#facc1533]">
                    <table className="min-w-full table-auto text-sm">
                        <thead className="border-b border-yellow-500 bg-yellow-900 text-yellow-200">
                            <tr>
                                <th className="px-4 py-3 text-left">User</th>
                                <th
                                    className="cursor-pointer px-4 py-3 text-left"
                                    onClick={() => handleSort('rating')}
                                >
                                    Rating{' '}
                                    {filters.sort === 'rating' ? (
                                        filters.direction === 'asc' ? (
                                            <ChevronUp className="inline h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="inline h-4 w-4" />
                                        )
                                    ) : (
                                        ''
                                    )}
                                </th>
                                <th className="px-4 py-3 text-left">Comment</th>
                                <th className="px-4 py-3 text-left">Created</th>
                                <th className="px-4 py-3 text-right"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.data.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No reviews found.
                                    </td>
                                </tr>
                            ) : (
                                reviews.data.map((review) => (
                                    <tr key={review.id} className="border-b border-yellow-300 hover:bg-yellow-50 dark:border-yellow-700 dark:hover:bg-yellow-800/10">
                                        <td className="px-4 py-3 text-yellow-800 dark:text-yellow-100">{review.user.name}</td>
                                        <td className="px-4 py-3 text-yellow-800 dark:text-yellow-100">{review.rating}</td>
                                        <td className="line-clamp-2 px-4 py-3 text-yellow-700 dark:text-yellow-200">
                                            {review.comment || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-yellow-600 dark:text-yellow-400">
                                            {new Date(review.created_at).toLocaleDateString()}
                                        </td>
                                        <td className=" display flex justify-end px-4 py-3">
                                            <Link
                                                href={`/reviews/${review.id}/edit`}
                                                className="inline-flex items-center rounded border border-yellow-500 bg-yellow-500 px-2 py-1 text-xs text-black transition hover:bg-yellow-600 dark:border-yellow-600 dark:bg-yellow-500 dark:text-black dark:hover:bg-yellow-600"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => router.delete(`/reviews/${review.id}`, {
                                                    preserveState: true,
                                                    preserveScroll: true,
                                                })}
                                                className="ml-2 inline-flex items-center rounded border border-red-500 bg-red-500 px-2 py-1 text-xs text-white transition hover:bg-red-600"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
