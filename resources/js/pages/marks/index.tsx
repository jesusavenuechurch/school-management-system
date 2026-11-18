import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { CheckCircle2, PenLine, History, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import EmptyState from '@/components/empty-state';
import Field from '@/components/field';
import FormDialog, { DeleteButton } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import PageHeader, { PageBody } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { index } from '@/routes/marks';
import { bringForward, destroy, store, update } from '@/routes/marks/tests';
import { classes as setupClasses } from '@/routes/setup';
import { index as studentsIndex } from '@/routes/students';
import type { Option } from '@/types';

type Sheet = {
    subject: { id: number; name: string; code: string };
    teacher: string | null;
    filled: number;
    url: string;
};
type TestClass = {
    id: number;
    name: string;
    learners: number;
    sheets: Sheet[];
};
type Test = {
    id: number;
    name: string;
    kind: 'test' | 'exam';
    grade: { id: number; name: string } | null;
    subject: { id: number; name: string } | null;
    max_score: number;
    start_date: string | null;
    end_date: string | null;
    classroom_ids: number[];
    results_count: number;
    can_edit: boolean;
    classes: TestClass[];
};
type Choices = {
    grades: {
        id: number;
        name: string;
        classes: { id: number; name: string; subject_ids: number[] | null }[];
    }[];
    subjects: { id: number; name: string }[];
};

type Props = {
    terms: Option[];
    term: { id: number; name: string } | null;
    tests: Test[];
    choices: Choices;
    kinds: Option[];
    previousTerm: string | null;
    testWeight: number;
    isAdmin: boolean;
};

const nameSuggestions = {
    test: ['Test 1', 'Test 2', 'Class test', 'Assignment', 'Project'],
    exam: ['Mid-term exam', 'End of term exam', 'Mock exam'],
};

function formatDate(date: string | null): string | null {
    return date
        ? new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
          })
        : null;
}

const formatTotal = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1);

export default function Marks({
    terms,
    term,
    tests,
    choices,
    kinds,
    previousTerm,
    testWeight,
    isAdmin,
}: Props) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const canSetTests = choices.grades.length > 0;

    const newTest = term && canSetTests && (
        <FormDialog
            trigger={
                <Button>
                    <Plus /> New test
                </Button>
            }
            title={isAdmin ? 'New test or exam' : 'New test'}
            description="Choose the grade and the classes writing it. Their learners appear on the mark sheet."
            form={store.form()}
        >
            {(e) => (
                <TestFields
                    termId={term.id}
                    choices={choices}
                    kinds={kinds}
                    isAdmin={isAdmin}
                    errors={e}
                />
            )}
        </FormDialog>
    );

    return (
        <>
            <Head title="Marks" />
            <PageBody>
                <PageHeader
                    title="Marks"
                    description="Set a test for your classes, then open it to type each learner’s mark. The symbol appears as you go."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {terms.length > 0 && (
                                <NativeSelect
                                    aria-label="Term"
                                    className="w-56"
                                    options={terms}
                                    value={String(term?.id ?? '')}
                                    onChange={(e) =>
                                        router.get(
                                            index.url({
                                                query: { term: e.target.value },
                                            }),
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                />
                            )}
                            {newTest}
                        </div>
                    }
                />

                <InputError message={errors.exam} />

                {term && previousTerm && (
                    <BringForward
                        termId={term.id}
                        previousTerm={previousTerm}
                        prominent={tests.length === 0}
                    />
                )}

                {!term ? (
                    <EmptyState
                        title="No terms yet"
                        description="Tests belong to a term. The administrator sets up the school year and its terms first."
                    />
                ) : !canSetTests && tests.length === 0 ? (
                    <EmptyState
                        title={
                            isAdmin
                                ? 'Add this year’s classes first'
                                : 'No subjects given to you yet'
                        }
                        description={
                            isAdmin
                                ? 'Tests are set for classes. Add classes on Grades & classes and choose who teaches each subject.'
                                : 'The administrator chooses who teaches each subject in each class. Once you have yours, you can set tests here.'
                        }
                        action={
                            isAdmin ? (
                                <Button asChild>
                                    <Link href={setupClasses()}>
                                        Go to Grades & classes
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : tests.length === 0 ? (
                    <EmptyState
                        title={`No tests in ${term.name} yet`}
                        description="Set the first one: pick the grade, subject and classes. The learners in those classes appear ready for marks."
                        action={newTest || undefined}
                    />
                ) : (
                    <div className="grid gap-5">
                        {tests.map((test) => (
                            <TestCard
                                key={test.id}
                                test={test}
                                termId={term.id}
                                choices={choices}
                                kinds={kinds}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                )}

                {tests.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                        On the report, a subject’s term mark is the average of
                        its tests ({testWeight}%) and exams ({100 - testWeight}
                        %).
                        {isAdmin && ' Change this on Report cards.'}
                    </p>
                )}
            </PageBody>
        </>
    );
}

function BringForward({
    termId,
    previousTerm,
    prominent,
}: {
    termId: number;
    previousTerm: string;
    prominent: boolean;
}) {
    return (
        <Form
            {...bringForward.form()}
            options={{ preserveScroll: true }}
            className={cn(
                'flex flex-wrap items-center gap-3 rounded-2xl text-sm',
                prominent
                    ? 'border border-dashed border-border bg-card px-5 py-4'
                    : 'justify-end',
            )}
        >
            {({ processing }) => (
                <>
                    <input type="hidden" name="term_id" value={termId} />
                    {prominent && (
                        <div className="min-w-0 flex-1">
                            <p className="font-medium">
                                Same tests as last year?
                            </p>
                            <p className="text-muted-foreground">
                                Bring forward the tests from {previousTerm} for
                                this year’s classes. You can edit or remove any
                                of them after.
                            </p>
                        </div>
                    )}
                    <Button
                        type="submit"
                        variant={prominent ? 'default' : 'ghost'}
                        size="sm"
                        disabled={processing}
                    >
                        {processing ? <Spinner /> : <History />}
                        Bring forward from {previousTerm}
                    </Button>
                </>
            )}
        </Form>
    );
}

function TestCard({
    test,
    termId,
    choices,
    kinds,
    isAdmin,
}: {
    test: Test;
    termId: number;
    choices: Choices;
    kinds: Option[];
    isAdmin: boolean;
}) {
    const dates = [formatDate(test.start_date), formatDate(test.end_date)]
        .filter(Boolean)
        .join(' – ');
    const meta = [
        test.grade?.name ?? 'Every grade',
        test.subject?.name ?? 'Every subject',
        `out of ${formatTotal(test.max_score)}`,
        dates,
    ].filter(Boolean);

    return (
        <section
            className={cn(
                'overflow-hidden rounded-2xl border border-t-4 border-border bg-card shadow-xs',
                test.kind === 'exam' ? 'border-t-sun' : 'border-t-sky',
            )}
        >
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-border px-5 py-3">
                <div className="min-w-0 flex-1">
                    <h2 className="flex flex-wrap items-center gap-2 font-display text-xl font-semibold">
                        {test.name}
                        {test.kind === 'exam' && (
                            <span className="rounded-full bg-sun-soft px-2 py-0.5 font-sans text-xs font-medium text-foreground">
                                Exam
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {meta.join(' · ')}
                    </p>
                </div>
                {test.can_edit && (
                    <div className="flex items-center gap-1">
                        <FormDialog
                            trigger={
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    aria-label={`Edit ${test.name}`}
                                >
                                    <Pencil />
                                </Button>
                            }
                            title={`Edit ${test.name}`}
                            form={update.form(test.id)}
                        >
                            {(e) => (
                                <TestFields
                                    termId={termId}
                                    choices={choices}
                                    kinds={kinds}
                                    isAdmin={isAdmin}
                                    errors={e}
                                    test={test}
                                />
                            )}
                        </FormDialog>
                        {test.results_count === 0 && (
                            <DeleteButton
                                form={destroy.form(test.id)}
                                label="Remove"
                                confirm={`Remove ${test.name}?`}
                            />
                        )}
                    </div>
                )}
            </div>

            <ul className="divide-y divide-border">
                {test.classes.map((classroom) => (
                    <li
                        key={classroom.id}
                        className="grid gap-3 px-5 py-3 sm:grid-cols-[9rem_1fr] sm:items-center"
                    >
                        <div>
                            <p className="font-medium">{classroom.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {classroom.learners === 1
                                    ? '1 learner'
                                    : `${classroom.learners} learners`}
                            </p>
                        </div>
                        {classroom.learners === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No learners in this class yet, so there is
                                nothing to mark.{' '}
                                {isAdmin && (
                                    <Link
                                        href={studentsIndex()}
                                        className="font-medium text-primary underline-offset-4 hover:underline"
                                    >
                                        Add learners
                                    </Link>
                                )}
                            </p>
                        ) : classroom.sheets.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No subjects given to this class yet.{' '}
                                {isAdmin && (
                                    <Link
                                        href={setupClasses()}
                                        className="font-medium text-primary underline-offset-4 hover:underline"
                                    >
                                        Choose its teachers
                                    </Link>
                                )}
                            </p>
                        ) : (
                            <div className="grid gap-2">
                                {classroom.sheets.map((sheet) => (
                                    <SheetRow
                                        key={sheet.subject.id}
                                        sheet={sheet}
                                        learners={classroom.learners}
                                        showSubject={test.subject === null}
                                        showTeacher={isAdmin}
                                    />
                                ))}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}

/**
 * One mark sheet (a class and subject): how far along it is, and a clear
 * button to open it and type the marks.
 */
function SheetRow({
    sheet,
    learners,
    showSubject,
    showTeacher,
}: {
    sheet: Sheet;
    learners: number;
    showSubject: boolean;
    showTeacher: boolean;
}) {
    const done = learners > 0 && sheet.filled >= learners;
    const started = sheet.filled > 0;
    const percent =
        learners > 0 ? Math.min(100, (sheet.filled / learners) * 100) : 0;

    return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="min-w-0 flex-1">
                {(showSubject || showTeacher) && (
                    <p className="truncate text-sm">
                        {showSubject && (
                            <span className="font-medium">
                                {sheet.subject.name}
                            </span>
                        )}
                        {showSubject && showTeacher && ' · '}
                        {showTeacher && (
                            <span className="text-muted-foreground">
                                {sheet.teacher ?? 'No teacher yet'}
                            </span>
                        )}
                    </p>
                )}
                <div className="mt-1 flex items-center gap-2">
                    <div
                        className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuenow={sheet.filled}
                        aria-valuemax={learners}
                        aria-label={`${sheet.filled} of ${learners} marked`}
                    >
                        <div
                            className={cn(
                                'h-full rounded-full transition-all',
                                done ? 'bg-leaf' : 'bg-sky',
                            )}
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                    <span
                        className={cn(
                            'flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums',
                            done ? 'text-leaf' : 'text-muted-foreground',
                        )}
                    >
                        {done && <CheckCircle2 className="size-3.5" />}
                        {sheet.filled}/{learners} marked
                    </span>
                </div>
            </div>
            <Button size="sm" variant={done ? 'outline' : 'default'} asChild>
                <Link href={sheet.url}>
                    <PenLine />
                    {done
                        ? 'Check marks'
                        : started
                          ? 'Continue marking'
                          : 'Enter marks'}
                </Link>
            </Button>
        </div>
    );
}

/**
 * The fields for setting or editing a test. The grade decides which classes
 * can write it; teachers only see the classes where they teach the subject.
 */
function TestFields({
    termId,
    choices,
    kinds,
    isAdmin,
    errors,
    test,
}: {
    termId: number;
    choices: Choices;
    kinds: Option[];
    isAdmin: boolean;
    errors: Record<string, string | undefined>;
    test?: Test;
}) {
    const [kind, setKind] = useState<'test' | 'exam'>(test?.kind ?? 'test');
    const [gradeId, setGradeId] = useState<string>(
        test
            ? String(test.grade?.id ?? '')
            : String(choices.grades[0]?.id ?? ''),
    );
    const [subjectId, setSubjectId] = useState<string>(
        test ? String(test.subject?.id ?? '') : '',
    );

    const isExam = kind === 'exam';
    const gradeClasses = choices.grades
        .filter((g) => gradeId === '' || String(g.id) === gradeId)
        .flatMap((g) => g.classes);
    const teaches = (c: { subject_ids: number[] | null }, id: string) =>
        c.subject_ids === null || c.subject_ids.includes(Number(id));

    const subjects = choices.subjects.filter((s) =>
        gradeClasses.some((c) => teaches(c, String(s.id))),
    );
    const eligible = gradeClasses.filter(
        (c) => subjectId === '' || teaches(c, subjectId),
    );

    const [picked, setPicked] = useState<number[]>(
        test?.classroom_ids ?? eligible.map((c) => c.id),
    );
    const resetClasses = (grade: string, subject: string) =>
        setPicked(
            choices.grades
                .filter((g) => grade === '' || String(g.id) === grade)
                .flatMap((g) => g.classes)
                .filter((c) => subject === '' || teaches(c, subject))
                .map((c) => c.id),
        );

    return (
        <>
            <input type="hidden" name="term_id" value={termId} />
            <input type="hidden" name="kind" value={kind} />

            {isAdmin && (
                <div
                    role="radiogroup"
                    aria-label="Kind"
                    className="grid grid-cols-2 gap-2"
                >
                    {kinds.map((k) => (
                        <button
                            key={k.value}
                            type="button"
                            role="radio"
                            aria-checked={kind === k.value}
                            onClick={() => {
                                setKind(k.value as 'test' | 'exam');

                                // A test always belongs to one grade.
                                if (k.value === 'test' && gradeId === '') {
                                    const first = String(
                                        choices.grades[0]?.id ?? '',
                                    );
                                    setGradeId(first);
                                    resetClasses(first, subjectId);
                                }
                            }}
                            className={cn(
                                'rounded-xl border px-3 py-2 text-left text-sm transition',
                                kind === k.value
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : 'border-border hover:bg-muted',
                            )}
                        >
                            <span className="font-medium">{k.label}</span>
                            <span className="block text-xs text-muted-foreground">
                                {k.value === 'exam'
                                    ? 'Set by the school, often for every subject'
                                    : 'One subject, set by its teacher'}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
                <Field
                    label="Grade"
                    htmlFor="grade_level_id"
                    error={errors.grade_level_id}
                >
                    <NativeSelect
                        id="grade_level_id"
                        name="grade_level_id"
                        value={gradeId}
                        onChange={(e) => {
                            setGradeId(e.target.value);
                            resetClasses(e.target.value, subjectId);
                        }}
                        placeholder={isExam ? 'Every grade' : undefined}
                        options={choices.grades.map((g) => ({
                            value: String(g.id),
                            label: g.name,
                        }))}
                    />
                </Field>
                <Field
                    label="Subject"
                    htmlFor="subject_id"
                    error={errors.subject_id}
                >
                    <NativeSelect
                        id="subject_id"
                        name="subject_id"
                        value={subjectId}
                        required={!isExam}
                        onChange={(e) => {
                            setSubjectId(e.target.value);
                            resetClasses(gradeId, e.target.value);
                        }}
                        placeholder={isExam ? 'Every subject' : 'Choose…'}
                        options={subjects.map((s) => ({
                            value: String(s.id),
                            label: s.name,
                        }))}
                    />
                </Field>
            </div>

            <fieldset className="grid gap-2">
                <legend className="mb-2 text-sm font-medium">
                    Classes writing it
                </legend>
                {eligible.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        {subjectId === '' && !isExam
                            ? 'Choose the subject first.'
                            : 'No classes in this grade take this subject with you.'}
                    </p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {eligible.map((c) => {
                            const checked = picked.includes(c.id);

                            return (
                                <label
                                    key={c.id}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition',
                                        checked
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:bg-muted',
                                    )}
                                >
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={(on) =>
                                            setPicked((list) =>
                                                on
                                                    ? [...list, c.id]
                                                    : list.filter(
                                                          (id) => id !== c.id,
                                                      ),
                                            )
                                        }
                                    />
                                    {c.name}
                                    {checked && (
                                        <input
                                            type="hidden"
                                            name="classrooms[]"
                                            value={c.id}
                                        />
                                    )}
                                </label>
                            );
                        })}
                    </div>
                )}
                <InputError message={errors.classrooms} />
            </fieldset>

            <datalist id="test-name-suggestions">
                {nameSuggestions[kind].map((s) => (
                    <option key={s} value={s} />
                ))}
            </datalist>
            <div className="grid items-start gap-4 sm:grid-cols-[1fr_7rem]">
                <Field
                    label="Name"
                    htmlFor="name"
                    error={errors.name}
                    hint={`For example ${nameSuggestions[kind].slice(0, 3).join(', ')}`}
                >
                    <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={test?.name}
                        list="test-name-suggestions"
                    />
                </Field>
                <Field
                    label="Out of"
                    htmlFor="max_score"
                    error={errors.max_score}
                >
                    <Input
                        id="max_score"
                        name="max_score"
                        type="number"
                        min={1}
                        max={1000}
                        step="any"
                        required
                        defaultValue={test?.max_score ?? 100}
                    />
                </Field>
            </div>

            <div className={cn('grid gap-4', isExam && 'sm:grid-cols-2')}>
                <Field
                    label={isExam ? 'Starts' : 'Date written'}
                    htmlFor="start_date"
                    error={errors.start_date}
                    optional
                >
                    <Input
                        id="start_date"
                        name="start_date"
                        type="date"
                        defaultValue={test?.start_date ?? ''}
                    />
                </Field>
                {isExam && (
                    <Field
                        label="Ends"
                        htmlFor="end_date"
                        error={errors.end_date}
                        optional
                    >
                        <Input
                            id="end_date"
                            name="end_date"
                            type="date"
                            defaultValue={test?.end_date ?? ''}
                        />
                    </Field>
                )}
            </div>
        </>
    );
}

Marks.layout = {
    breadcrumbs: [{ title: 'Marks', href: index() }],
};
