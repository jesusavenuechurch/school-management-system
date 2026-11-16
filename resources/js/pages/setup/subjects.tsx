import { Head, usePage } from '@inertiajs/react';
import { Pencil, Plus } from 'lucide-react';
import EmptyState from '@/components/empty-state';
import Field from '@/components/field';
import FormDialog, { DeleteButton } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import PageHeader, { PageBody } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { destroy, index, store, update } from '@/routes/setup/subjects';

type Subject = {
    id: number;
    name: string;
    code: string;
    class_assignments_count: number;
};

const swatches = ['bg-sun', 'bg-leaf', 'bg-sky', 'bg-coral'];

export default function Subjects({ subjects }: { subjects: Subject[] }) {
    const { errors } = usePage().props as { errors: Record<string, string> };

    const fields =
        (subject?: Subject) => (e: Record<string, string | undefined>) => (
            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
                <Field label="Subject" htmlFor="name" error={e.name}>
                    <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={subject?.name}
                        placeholder="Mathematics"
                    />
                </Field>
                <Field label="Short code" htmlFor="code" error={e.code}>
                    <Input
                        id="code"
                        name="code"
                        required
                        defaultValue={subject?.code}
                        placeholder="MATH"
                        className="uppercase"
                    />
                </Field>
            </div>
        );

    const addSubject = (
        <FormDialog
            trigger={
                <Button>
                    <Plus /> Add subject
                </Button>
            }
            title="Add a subject"
            form={store.form()}
        >
            {fields()}
        </FormDialog>
    );

    return (
        <>
            <Head title="Subjects" />
            <PageBody>
                <PageHeader
                    title="Subjects"
                    description="Everything taught at your school, from Sesotho and Mathematics in the early grades to Physical Science and Accounting for seniors."
                    actions={subjects.length > 0 ? addSubject : undefined}
                />

                <InputError message={errors.subject} />

                {subjects.length === 0 ? (
                    <EmptyState
                        title="No subjects yet"
                        description="Add the subjects your school teaches. You can assign teachers to them per class later."
                        action={addSubject}
                    />
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {subjects.map((subject, i) => (
                            <li
                                key={subject.id}
                                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                            >
                                <span
                                    className={`h-10 w-1.5 shrink-0 rounded-full ${swatches[i % swatches.length]}`}
                                    aria-hidden="true"
                                />
                                <div className="min-w-0 flex-1">
                                    <p className="truncate font-semibold">
                                        {subject.name}
                                    </p>
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {subject.code}
                                    </p>
                                </div>
                                <FormDialog
                                    trigger={
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8"
                                            aria-label={`Edit ${subject.name}`}
                                        >
                                            <Pencil />
                                        </Button>
                                    }
                                    title={`Edit ${subject.name}`}
                                    form={update.form(subject.id)}
                                >
                                    {fields(subject)}
                                </FormDialog>
                                {subject.class_assignments_count === 0 && (
                                    <DeleteButton
                                        form={destroy.form(subject.id)}
                                        label="Remove"
                                        confirm={`Remove ${subject.name}?`}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </PageBody>
        </>
    );
}

Subjects.layout = {
    breadcrumbs: [{ title: 'Subjects', href: index() }],
};
