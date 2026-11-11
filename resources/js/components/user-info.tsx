import { type Badge, RankIcon } from '@/components/rank-badges';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { type User } from '@/types';
import { usePage } from '@inertiajs/react';

export function UserInfo({ user, showEmail = false }: { user: User; showEmail?: boolean }) {
    const getInitials = useInitials();
    const { badges = [] } = usePage<{ badges?: Badge[] }>().props;
    const primaryRank = badges.find((b) => b.kind === 'rank');

    return (
        <>
            <Avatar
                className="h-8 w-8 overflow-hidden rounded-full"
                style={
                    primaryRank
                        ? {
                              boxShadow: `0 0 0 2px ${primaryRank.color}, 0 0 10px ${primaryRank.color}66`,
                          }
                        : undefined
                }
            >
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                    {getInitials(user.name)}
                </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="flex items-center gap-1.5 truncate font-medium">
                    <span className="truncate">{user.name}</span>
                    {primaryRank && (
                        <span
                            title={`Rango VIP: ${primaryRank.name}`}
                            className="inline-flex shrink-0 items-center justify-center rounded-full p-0.5"
                            style={{ color: primaryRank.color }}
                        >
                            <RankIcon icon={primaryRank.icon} role={primaryRank.name} className="h-3.5 w-3.5" />
                        </span>
                    )}
                </span>
                {showEmail && <span className="text-muted-foreground truncate text-xs">{user.email}</span>}
            </div>
        </>
    );
}
