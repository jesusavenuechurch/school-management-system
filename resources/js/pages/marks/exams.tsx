import { Head, Link, router, usePage } from '@inertiajs/react';
import { ClipboardList, Pencil, Plus } from 'lucide-react';
import EmptyState from '@/components/empty-state';
import Field from '@/components/field';
import FormDialog, { DeleteButton } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import PageHeader, { PageBody } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { destroy, index, store, update } from '@/routes/exams';
import { index as marksIndex } from '@/routes/marks';
import { index as yearsIndex } from '@/routes/setup/years';

type Exam = {
    id: number;
    name: string;
    weight: number;
    start_date: string | null;
    end_date: string | null;
    results_count: number;
};
type Term = { id: number; name: string; is_current: boolean; exams: Exam[] };

type Props = {
    years: { id: number; name: string; is_current: boolean }[];
    selectedYearId: number | null;
    terms: Term[];
};

const suggestions = ['Class test', 'Mid-term test', 'End of term exam'];

function formatDate(date: string | null): string | null {
    return date
        ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
          })
        : null;
}

export default function Exams({ years, selectedYearId, terms }: Props) {
    const { errors } = usePage().props as { errors: Record<string, string> };

    const fields =
        (term: Term, exam?: Exam) =>
        (e: Record<string, string | undefined>) => (
            <>
                <input type="hidden" name="term_id" value={term.id} />
                <Field
                    label="Name"
                    htmlFor="name"
                    error={e.name}
                    hint={
                        exam
                            ? undefined
                            : `For example ${suggestions.join(', ')}`
                    }
                >
                    <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={exam?.name}
                        list="exam-suggestions"
                    />
                </Field>
                <datalist id="exam-suggestions">
                    {suggestions.map((s) => (
                        <option key={s} value={s} />
                    ))}
                </datalist>
                <Field
                    label="Weight"
                    htmlFor="weight"
                    error={e.weight}
                    hint="How much it counts towards the term mark compared with the others. Give everything the same weight for a plain average, or e.g. 30 for the test and 70 for the exam."
                >
                    <Input
                        id="weight"
                        name="weight"
                        type="number"
                        min={1}
                        max={100}
                        required
                        defaultValue={exam?.weight ?? 100}
                        className="w-28"
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Starts"
                        htmlFor="start_date"
                        error={e.start_date}
                        optional
                    >
                        <Input
                            id="start_date"
                            name="start_date"
                            type="date"
                            defaultValue={exam?.start_date ?? ''}
                        />
                    </Field>
                    <Field
                        label="Ends"
                        htmlFor="end_date"
                        error={e.end_date}
                        optional
                    >
                        <Input
                            id="end_date"
                            name="end_date"
                            type="date"
                            defaultValue={exam?.end_date ?? ''}
                        />
                    </Field>
                </div>
            </>
        );

    return (
        <>
            <Head title="Tests & exams" />
            <PageBody>
                <PageHeader
                    title="Tests & exams"
                    description="Add each term's tests and exams here. Teachers then enter marks for the subjects they teach, and the report card combines them."
                    actions={
                        years.length > 1 ? (
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">
                                    Year
                                </span>
                                <NativeSelect
                                    className="w-32"
                                    value={selectedYearId ?? ''}
                                    onChange={(event) =>
                                        router.get(
                                            index.url({
                                                query: {
                                                    year: event.target.value,
                                                },
                                            }),
                                        )
                                    }
                                    options={years.map((y) => ({
                                        value: String(y.id),
                                        label: y.name,
                                    }))}
                                />
                            </label>
                        ) : undefined
                    }
                />

                <InputError message={errors.exam} />

                {terms.length === 0 ? (
                    <EmptyState
                        title="Add your terms first"
                        description="Tests and exams belong to a term, so set up the school year and its terms."
                        action={
                            <Button asChild>
                                <Link href={yearsIndex()}>
                                    Set up the school year
                                </Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="grid gap-5">
                        {terms.map((term) => {
                            const totalWeight = term.exams.reduce(
                                (sum, e) => sum + e.weight,
                                0,
                            );

                            return (
                                <section
                                    key={term.id}
                                    className="rounded-2xl border border-border bg-card"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                                        <h2 className="font-display text-xl font-semibold">
                                            {term.name}
                                            {term.is_current && (
                                                <span className="ml-2 align-middle text-xs font-normal text-leaf">
                                                    current
                                                </span>
                                            )}
                                        </h2>
                                        <FormDialog
                                            trigger={
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Plus /> Add test or exam
                                                </Button>
                                            }
                                            title={`Add to ${term.name}`}
                                            form={store.form()}
                                        >
                                            {fields(term)}
                                        </FormDialog>
                                    </div>

                                    {term.exams.length === 0 ? (
                                        <p className="px-5 py-4 text-sm text-muted-foreground">
                                            Nothing yet for {term.name}.
                                        </p>
                                    ) : (
                                        <ul className="divide-y divide-border">
                                            {term.exams.map((exam) => {
                                                const dates = [
                                                    formatDate(exam.start_date),
                                                    formatDate(exam.end_date),
                                                ]
                                                    .filter(Boolean)
                                                    .join(' – ');

                                                return (
                                                    <li
                                                        key={exam.id}
                                                        className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
                                                    >
                                                        <ClipboardList className="size-5 text-sky" />
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium">
                                                                {exam.name}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {term.exams
                                                                    .length > 1
                                                                    ? `Counts ${Math.round((exam.weight / totalWeight) * 100)}% of the term mark`
                                                                    : 'The whole term mark'}
                                                                {dates &&
                                                                    ` · ${dates}`}
                                                                {` · ${exam.results_count} marks entered`}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                asChild
                                                            >
                                                                <Link
                                                                    href={marksIndex(
                                                                        {
                                                                            query: {
                                                                                term: term.id,
                                                                                exam: exam.id,
                                                                            },
                                                                        },
                                                                    )}
                                                                >
                                                                    Marks
                                                                </Link>
                                                            </Button>
                                                            <FormDialog
                                                                trigger={
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8"
                                                                        aria-label={`Edit ${exam.name}`}
                                                                    >
                                                                        <Pencil />
                                                                    </Button>
                                                                }
                                                                title={`Edit ${exam.name}`}
                                                                form={update.form(
                                                                    exam.id,
                                                                )}
                                                            >
                                                                {fields(
                                                                    term,
                                                                    exam,
                                                                )}
                                                            </FormDialog>
                                                            {exam.results_count ===
                                                                0 && (
                                                                <DeleteButton
                                                                    form={destroy.form(
                                                                        exam.id,
                                                                    )}
                                                                    label="Remove"
                                                                    confirm={`Remove ${exam.name}?`}
                                                                />
                                                            )}
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </section>
                            );
                        })}
                    </div>
                )}
            </PageBody>
        </>
    );
}

Exams.layout = {
    breadcrumbs: [{ title: 'Tests & exams', href: index() }],
};
