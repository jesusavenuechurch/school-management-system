import type { ReactNode } from 'react';
import { EmptyNotebookArt } from '@/components/illustrations';

export default function EmptyState({
    title,
    description,
    action,
}: {
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
            <EmptyNotebookArt className="mb-4 h-28 w-auto" />
            <h3 className="font-display text-xl font-semibold">{title}</h3>
            {description && (
                <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
