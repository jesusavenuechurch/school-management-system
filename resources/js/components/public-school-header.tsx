import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { publicMethod as schoolPage } from '@/routes/schools';

export type PublicBrand = {
    name: string;
    slug: string;
    logo_url: string | null;
};

export function schoolInitials(name: string): string {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();
}

/** The school's logo and name across the top of its public pages. */
export default function PublicSchoolHeader({
    school,
    subtitle,
    action,
}: {
    school: PublicBrand;
    subtitle?: string;
    action?: ReactNode;
}) {
    return (
        <header className="border-b border-border bg-card">
            <div className="mx-auto flex h-20 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
                <Link
                    href={schoolPage(school.slug)}
                    className="flex min-w-0 items-center gap-3"
                >
                    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white font-display text-lg font-semibold text-ink">
                        {school.logo_url ? (
                            <img
                                src={school.logo_url}
                                alt={`${school.name} logo`}
                                className="size-full object-contain"
                            />
                        ) : (
                            schoolInitials(school.name)
                        )}
                    </span>
                    <div className="min-w-0">
                        <p className="truncate font-display text-xl font-semibold">
                            {school.name}
                        </p>
                        {subtitle && (
                            <p className="truncate text-sm text-muted-foreground">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </Link>
                {action}
            </div>
        </header>
    );
}
