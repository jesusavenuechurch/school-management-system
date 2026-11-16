import { Head, usePage } from '@inertiajs/react';
import { CalendarPlus, Pencil, Plus } from 'lucide-react';
import CheckboxField from '@/components/checkbox-field';
import EmptyState from '@/components/empty-state';
import Field from '@/components/field';
import FormDialog, { DeleteButton } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import PageHeader, { PageBody } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    destroy as destroyTerm,
    store as storeTerm,
    update as updateTerm,
} from '@/routes/setup/terms';
import {
    destroy as destroyYear,
    index,
    store as storeYear,
    update as updateYear,
} from '@/routes/setup/years';

type Term = {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
};
type Year = Term & { classrooms_count: number; terms: Term[] };

const formatDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

function PeriodFields({
    errors,
    values,
    nameLabel,
    namePlaceholder,
}: {
    errors: Record<string, string | undefined>;
    values?: Partial<Term>;
    nameLabel: string;
    namePlaceholder: string;
}) {
    return (
        <>
            <Field label={nameLabel} htmlFor="name" error={errors.name}>
                <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={values?.name}
                    placeholder={namePlaceholder}
                />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="Starts"
                    htmlFor="start_date"
                    error={errors.start_date}
                >
                    <Input
                        id="start_date"
                        name="start_date"
                        type="date"
                        required
                        defaultValue={values?.start_date}
                    />
                </Field>
                <Field label="Ends" htmlFor="end_date" error={errors.end_date}>
                    <Input
                        id="end_date"
                        name="end_date"
                        type="date"
                        required
                        defaultValue={values?.end_date}
                    />
                </Field>
            </div>
            <CheckboxField
                name="is_current"
                label="This is the current one"
                defaultChecked={values?.is_current ?? false}
            />
        </>
    );
}

export default function AcademicYears({ years }: { years: Year[] }) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const thisYear = new Date().getFullYear();

    const addYear = (
        <FormDialog
            trigger={
                <Button>
                    <Plus /> Add school year
                </Button>
            }
            title="Add a school year"
            description="For example 2027, from mid-January to the end of November."
            form={storeYear.form()}
        >
            {(e) => (
                <PeriodFields
                    errors={e}
                    nameLabel="Name"
                    namePlaceholder={`${thisYear}`}
                    values={{
                        name: `${thisYear}`,
                        is_current: years.length === 0,
                    }}
                />
            )}
        </FormDialog>
    );

    return (
        <>
            <Head title="School year & terms" />
            <PageBody>
                <PageHeader
                    title="School year & terms"
                    description="The calendar everything else hangs on: classes, attendance, exams and fees all belong to a year and term."
                    actions={years.length > 0 ? addYear : undefined}
                />

                <InputError message={errors.year} />

                {years.length === 0 ? (
                    <EmptyState
                        title="No school year yet"
                        description="Start by adding the current school year, then its terms."
                        action={addYear}
                    />
                ) : (
                    <div className="grid gap-5">
                        {years.map((year) => (
                            <section
                                key={year.id}
                                className="overflow-hidden rounded-2xl border border-border bg-card"
                            >
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="font-display text-xl font-semibold">
                                            {year.name}
                                        </h2>
                                        {year.is_current && (
                                            <Badge className="bg-leaf text-white">
                                                Current
                                            </Badge>
                                        )}
                                        <span className="text-sm text-muted-foreground">
                                            {formatDate(year.start_date)} –{' '}
                                            {formatDate(year.end_date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <FormDialog
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <Pencil /> Edit
                                                </Button>
                                            }
                                            title={`Edit ${year.name}`}
                                            form={updateYear.form(year.id)}
                                        >
                                            {(e) => (
                                                <PeriodFields
                                                    errors={e}
                                                    values={year}
                                                    nameLabel="Name"
                                                    namePlaceholder="2027"
                                                />
                                            )}
                                        </FormDialog>
                                        {year.classrooms_count === 0 && (
                                            <DeleteButton
                                                form={destroyYear.form(year.id)}
                                                confirm={`Delete ${year.name} and its terms?`}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="px-5 py-4">
                                    {year.terms.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No terms yet.
                                        </p>
                                    ) : (
                                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {year.terms.map((term) => (
                                                <li
                                                    key={term.id}
                                                    className="rounded-xl border border-border bg-background p-4"
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <p className="flex items-center gap-2 font-semibold">
                                                                {term.name}
                                                                {term.is_current && (
                                                                    <span
                                                                        className="size-2 rounded-full bg-leaf"
                                                                        title="Current term"
                                                                    />
                                                                )}
                                                            </p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {formatDate(
                                                                    term.start_date,
                                                                )}{' '}
                                                                –{' '}
                                                                {formatDate(
                                                                    term.end_date,
                                                                )}
                                                            </p>
                                                        </div>
                                                        <FormDialog
                                                            trigger={
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="size-8"
                                                                    aria-label={`Edit ${term.name}`}
                                                                >
                                                                    <Pencil />
                                                                </Button>
                                                            }
                                                            title={`Edit ${term.name}`}
                                                            form={updateTerm.form(
                                                                term.id,
                                                            )}
                                                        >
                                                            {(e) => (
                                                                <>
                                                                    <input
                                                                        type="hidden"
                                                                        name="academic_year_id"
                                                                        value={
                                                                            year.id
                                                                        }
                                                                    />
                                                                    <PeriodFields
                                                                        errors={
                                                                            e
                                                                        }
                                                                        values={
                                                                            term
                                                                        }
                                                                        nameLabel="Term name"
                                                                        namePlaceholder="Term 1"
                                                                    />
                                                                </>
                                                            )}
                                                        </FormDialog>
                                                    </div>
                                                    <div className="mt-2 -mb-2 -ml-3">
                                                        <DeleteButton
                                                            form={destroyTerm.form(
                                                                term.id,
                                                            )}
                                                            label="Remove"
                                                            confirm={`Remove ${term.name}?`}
                                                        />
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}

                                    <FormDialog
                                        trigger={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-4"
                                            >
                                                <CalendarPlus /> Add term
                                            </Button>
                                        }
                                        title={`Add a term to ${year.name}`}
                                        form={storeTerm.form()}
                                    >
                                        {(e) => (
                                            <>
                                                <input
                                                    type="hidden"
                                                    name="academic_year_id"
                                                    value={year.id}
                                                />
                                                <PeriodFields
                                                    errors={e}
                                                    nameLabel="Term name"
                                                    namePlaceholder="Term 1"
                                                    values={{
                                                        name: `Term ${year.terms.length + 1}`,
                                                        is_current:
                                                            year.is_current &&
                                                            year.terms
                                                                .length === 0,
                                                    }}
                                                />
                                            </>
                                        )}
                                    </FormDialog>
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </PageBody>
        </>
    );
}

AcademicYears.layout = {
    breadcrumbs: [{ title: 'School year & terms', href: index() }],
};
