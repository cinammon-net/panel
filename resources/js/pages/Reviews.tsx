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
                <div className="overflow-hidden rounded-lg border border-yellow-300 bg-white shadow-none transition dark:border-yellow-700 dark:bg-neutral-950 dark:shadow-[0_0_10px_#facc1533]">
                    <table className="min-w-full table-auto text-sm">
                        <thead className="bg-yellow-100 tracking-wide text-yellow-700 uppercase dark:bg-yellow-900 dark:text-yellow-300">
                            <tr>
                                <th className="px-4 py-2 text-left">
                                    <button
                                        onClick={() => handleSort('user.name')}
                                        className="flex items-center gap-2 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-100"
                                    >
                                        <span>User</span>
                                        {filters.sort === 'user.name' ? (
                                            filters.direction === 'asc' ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )
                                        ) : (
                                            <ChevronDown className="opacity-30" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-2 text-left">
                                    <button
                                        onClick={() => handleSort('rating')}
                                        className="flex items-center gap-2 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-100"
                                    >
                                        <span>Rating</span>
                                        {filters.sort === 'rating' ? (
                                            filters.direction === 'asc' ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )
                                        ) : (
                                            <ChevronDown className="opacity-30" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-2 text-left">
                                    <button
                                        onClick={() => handleSort('comment')}
                                        className="flex items-center gap-2 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-100"
                                    >
                                        <span>Comment</span>
                                        {filters.sort === 'comment' ? (
                                            filters.direction === 'asc' ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )
                                        ) : (
                                            <ChevronDown className="opacity-30" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-2 text-left">
                                    <button
                                        onClick={() => handleSort('created_at')}
                                        className="flex items-center gap-2 text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-100"
                                    >
                                        <span>Date</span>
                                        {filters.sort === 'created_at' ? (
                                            filters.direction === 'asc' ? (
                                                <ChevronUp />
                                            ) : (
                                                <ChevronDown />
                                            )
                                        ) : (
                                            <ChevronDown className="opacity-30" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-4 py-2 text-left">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.data.length === 0 ? (
                                <tr className="border-b border-yellow-300 dark:border-yellow-700">
                                    <td colSpan={5} className="px-6 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No reviews found.
                                    </td>
                                </tr>
                            ) : (
                                reviews.data.map((review) => (
                                    <tr key={review.id} className="border-b border-yellow-800 hover:bg-yellow-900/10">
                                        <td className="px-4 py-2">{review.user.name}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex items-center gap-1 text-yellow-400 drop-shadow-[0_0_2px_#facc15]">
                                                {Array.from({ length: 5 }).map((_, i) => (
                                                    <span key={i}>{i < review.rating ? '★' : '☆'}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">{review.comment}</td>
                                        <td className="px-4 py-2">{new Date(review.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-2">
                                            <Link
                                                href={`/reviews/${review.id}/edit`}
                                                className="inline-flex items-center rounded border border-yellow-500 bg-transparent p-1.5 text-yellow-500 transition hover:bg-yellow-500 hover:text-black dark:hover:bg-yellow-600"
                                                aria-label="Edit Review"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Link>
                                            <Link
                                                href={route('reviews.destroy', review.id)}
                                                method="delete"
                                                as="button"
                                                className="ml-2 inline-flex items-center rounded border border-red-500 bg-transparent p-1.5 text-red-500 transition hover:bg-red-500 hover:text-white dark:hover:bg-red-600"
                                                aria-label="Delete Review"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {reviews.links.length > 5 && (
                        <div className="mt-6 flex justify-center p-4">
                            <ul className="flex flex-wrap gap-2 text-sm font-medium">
                                {reviews.links.map((link, i) => (
                                    <li key={i}>
                                        <button
                                            disabled={!link.url}
                                            onClick={() => {
                                                if (!link.url) return;
                                                const url = new URL(link.url);
                                                const page = url.searchParams.get('page');
                                                router.get(
                                                    '/reviews',
                                                    {
                                                        page,
                                                        sort: filters.sort,
                                                        direction: filters.direction,
                                                        per_page: filters.per_page,
                                                    },
                                                    { preserveScroll: true, preserveState: true },
                                                );
                                            }}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`rounded border px-3 py-1.5 text-xs transition ${
                                                link.active
                                                    ? 'border-yellow-500 bg-yellow-500 text-black shadow-md'
                                                    : 'border-yellow-700 bg-black text-yellow-400 hover:bg-yellow-800/30 hover:text-white'
                                            } ${!link.url ? 'cursor-not-allowed opacity-40' : ''}`}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Per page selector */}
                    <div className="flex items-center justify-center border-t border-yellow-300 bg-white px-4 py-2 shadow-none transition dark:border-yellow-700 dark:bg-neutral-950">
                        <div className="inline-flex items-center overflow-hidden rounded-md border border-yellow-700 text-sm text-yellow-600 dark:border-yellow-700 dark:bg-neutral-950">
                            <span className="border-r px-4 py-2 text-sm text-yellow-600 dark:text-yellow-400">Per page</span>
                            <div className="relative">
                                <select
                                    className="appearance-none px-4 py-2 pr-8 text-sm text-yellow-600 focus:outline-none dark:bg-neutral-950 dark:text-yellow-400"
                                    value={filters.per_page ?? 10}
                                    onChange={(e) => {
                                        const perPage = parseInt(e.target.value, 10);
                                        router.get(
                                            '/reviews',
                                            {
                                                sort: filters.sort,
                                                direction: filters.direction,
                                                per_page: perPage,
                                            },
                                            {
                                                preserveScroll: true,
                                                preserveState: true,
                                            },
                                        );
                                    }}
                                >
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100">All</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute top-1/2 right-2 h-4 w-4 -translate-y-1/2 text-yellow-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
