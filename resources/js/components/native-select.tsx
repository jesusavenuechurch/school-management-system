import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import type { Option } from '@/types';

/**
 * A plain <select> styled like the other inputs, with our own arrow so it
 * sits the same in every browser. Works inside Inertia's <Form> without
 * extra wiring. `className` sizes the whole control (e.g. "w-48").
 */
export default function NativeSelect({
    options,
    placeholder,
    className,
    ...props
}: ComponentProps<'select'> & {
    options: Option[];
    placeholder?: string;
}) {
    return (
        <div className={cn('relative w-full min-w-0', className)}>
            <select
                className="peer flex h-9 w-full min-w-0 appearance-none truncate rounded-md border border-input bg-card py-1 pr-9 pl-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30"
                {...props}
            >
                {placeholder !== undefined && (
                    <option value="">{placeholder}</option>
                )}
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <ChevronDown
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground peer-disabled:opacity-50"
            />
        </div>
    );
}
