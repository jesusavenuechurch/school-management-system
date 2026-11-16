import { Link, router } from '@inertiajs/react';
import type { InertiaLinkProps } from '@inertiajs/react';
import { ArrowRight, Check, Plus, X } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { skip } from '@/routes/setup/journey';

export type StepKey =
    | 'school'
    | 'calendar'
    | 'grades'
    | 'subjects'
    | 'teachers'
    | 'students';

/** "Do this later". A plain request, not a form: it sits inside each step's form. */
export function SkipButton({
    step,
    label = 'Do this later',
}: {
    step: StepKey;
    label?: string;
}) {
    return (
        <Button
            type="button"
            variant="ghost"
            onClick={() =>
                router.post(skip.url(), { step }, { preserveScroll: true })
            }
        >
            {label}
        </Button>
    );
}

export function SubmitRow({
    processing,
    label,
    step,
}: {
    processing: boolean;
    label: string;
    step: StepKey;
}) {
    return (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <SkipButton step={step} />
            <Button type="submit" disabled={processing}>
                {processing && <Spinner />}
                {label}
                <ArrowRight />
            </Button>
        </div>
    );
}

export function DoneNote({
    children,
    href,
    linkLabel,
}: {
    children: ReactNode;
    href?: NonNullable<InertiaLinkProps['href']>;
    linkLabel?: string;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-leaf-soft/70 px-4 py-3 text-sm">
            <span className="flex items-center gap-2">
                <Check className="size-4 text-leaf" />
                {children}
            </span>
            {href && (
                <Link
                    href={href}
                    className="font-medium underline underline-offset-4"
                >
                    {linkLabel}
                </Link>
            )}
        </div>
    );
}

/**
 * Type a name, press Add (or Enter), and it becomes a removable chip that is
 * submitted as `name[]`. Used for extra grades and extra subjects.
 */
export function ChipAdder({
    name,
    placeholder,
    label,
    items,
    onChange,
    tone = 'bg-leaf-soft',
    renderHidden = true,
}: {
    name?: string;
    placeholder: string;
    label: string;
    items: string[];
    onChange: (items: string[]) => void;
    tone?: string;
    renderHidden?: boolean;
}) {
    const [draft, setDraft] = useState('');

    const add = () => {
        const value = draft.trim();

        if (
            value &&
            !items.some((item) => item.toLowerCase() === value.toLowerCase())
        ) {
            onChange([...items, value]);
        }

        setDraft('');
    };

    return (
        <div className="grid gap-2">
            {items.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                    {items.map((item) => (
                        <li
                            key={item}
                            className={`flex items-center gap-1.5 rounded-full py-1.5 pr-2 pl-3 text-sm ${tone}`}
                        >
                            {renderHidden && name && (
                                <input
                                    type="hidden"
                                    name={`${name}[]`}
                                    value={item}
                                />
                            )}
                            {item}
                            <button
                                type="button"
                                onClick={() =>
                                    onChange(items.filter((i) => i !== item))
                                }
                                className="rounded-full p-0.5 hover:bg-black/10"
                                aria-label={`Remove ${item}`}
                            >
                                <X className="size-3.5" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <div className="flex gap-2">
                <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            add();
                        }
                    }}
                    placeholder={placeholder}
                    aria-label={label}
                    className="max-w-64"
                />
                <Button type="button" variant="outline" onClick={add}>
                    <Plus /> Add
                </Button>
            </div>
        </div>
    );
}
