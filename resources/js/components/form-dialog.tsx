import { Form } from '@inertiajs/react';
import type { RouteFormDefinition } from '@/wayfinder';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type Errors = Record<string, string | undefined>;

/**
 * A dialog wrapping an Inertia <Form>. Closes itself after a successful
 * submit. `form` is a Wayfinder form definition, e.g. store.form().
 */
export default function FormDialog({
    trigger,
    title,
    description,
    form,
    submitLabel = 'Save',
    children,
    wide = false,
}: {
    trigger: ReactNode;
    title: string;
    description?: string;
    form: RouteFormDefinition<'get' | 'post'>;
    submitLabel?: string;
    children: (errors: Errors) => ReactNode;
    wide?: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent
                className={cn(
                    'max-h-[calc(100dvh-2rem)] overflow-y-auto',
                    wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
                )}
            >
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">
                        {title}
                    </DialogTitle>
                    {description && (
                        <DialogDescription>{description}</DialogDescription>
                    )}
                </DialogHeader>
                <Form
                    {...form}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            {children(errors as Errors)}
                            <DialogFooter className="mt-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    {submitLabel}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/** A small "are you sure" delete button using an Inertia form. */
export function DeleteButton({
    form,
    label = 'Delete',
    confirm,
}: {
    form: RouteFormDefinition<'get' | 'post'>;
    label?: string;
    confirm: string;
}) {
    return (
        <Form
            {...form}
            options={{ preserveScroll: true }}
            onBefore={() => window.confirm(confirm)}
        >
            {({ processing }) => (
                <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={processing}
                    className="text-destructive hover:text-destructive"
                >
                    {label}
                </Button>
            )}
        </Form>
    );
}
