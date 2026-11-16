import type { ReactNode } from 'react';

export default function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
                <h1 className="font-display text-3xl font-semibold tracking-tight">
                    {title}
                </h1>
                {description && (
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-nowrap sm:pt-1">
                    {actions}
                </div>
            )}
        </header>
    );
}

/** Standard padded page body for app pages. */
export function PageBody({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6">
            {children}
        </div>
    );
}
