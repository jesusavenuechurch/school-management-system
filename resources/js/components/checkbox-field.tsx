import type { ReactNode } from 'react';

/**
 * A native checkbox that submits "1" when ticked. Paired with a hidden "0"
 * so unticking is sent too (Laravel's boolean rule accepts both).
 */
export default function CheckboxField({
    name,
    label,
    defaultChecked = false,
    description,
}: {
    name: string;
    label: string;
    defaultChecked?: boolean;
    description?: ReactNode;
}) {
    return (
        <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="hidden" name={name} value="0" />
            <input
                type="checkbox"
                name={name}
                value="1"
                defaultChecked={defaultChecked}
                className="mt-0.5 size-4 rounded border-input accent-[var(--primary)]"
            />
            <span>
                <span className="font-medium">{label}</span>
                {description && (
                    <span className="block text-muted-foreground">
                        {description}
                    </span>
                )}
            </span>
        </label>
    );
}
