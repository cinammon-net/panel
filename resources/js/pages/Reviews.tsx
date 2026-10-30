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
                <div className="overflow-x-auto rounded-lg border border-yellow-500 bg-white dark:border-yellow-600 dark:bg-black">
                    <table className="w-full table-auto text-sm text-yellow-800 dark:text-yellow-300">
                        <thead className="border-b border-yellow-500 bg-yellow-900 text-yellow-200">
                            <tr>
                                <th className="px-4 py-3 text-left">User</th>
                                <th
                                    className="cursor-pointer px-4 py-3 text-left flex items-center gap-1"
                                    onClick={() => handleSort('rating')}
                                >
                                    Rating
                                    {filters.sort === 'rating' && (
                                        filters.direction === 'asc' ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )
                                    )}
                                </th>
                                <th className="px-4 py-3 text-left">Comment</th>
                                <th className="px-4 py-3 text-left">Created</th>
                                <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.data.map((review) => (
                                <tr key={review.id} className="border-b border-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-700">
                                    <td className="px-4 py-2">{review.user.name}</td>
                                    <td className="px-4 py-2">{review.rating}</td>
                                    <td className="px-4 py-2">{review.comment}</td>
                                    <td className="px-4 py-2">{new Date(review.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-2 text-right">
                                        <Link href={`/reviews/${review.id}/edit`} className="text-blue-600 hover:underline">
                                            <Pencil className="inline h-5 w-5" />
                                        </Link>
                                        <button
                                            onClick={() => router.delete(`/reviews/${review.id}`, {
                                                onSuccess: () => toast.success('Review deleted successfully'),
                                                onError: () => toast.error('Failed to delete review'),
                                            })}
                                            className="ml-2 text-red-600
                                            hover:underline"
                                        >
                                            <Trash2 className="inline h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {reviews.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                        No reviews found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
