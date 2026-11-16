import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';
import type { Option } from '@/types';

/**
 * A plain <select> styled like the other inputs. Works inside Inertia's
 * <Form> without extra wiring.
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
        <select
            className={cn(
                'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive dark:bg-input/30',
                className,
            )}
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
    );
}
