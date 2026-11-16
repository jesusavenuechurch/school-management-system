import { Form, Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, PartyPopper } from 'lucide-react';
import { useMemo, useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import Chalkboard from '@/components/chalkboard';
import type { ChalkItem } from '@/components/chalkboard';
import Field from '@/components/field';
import InputError from '@/components/input-error';
import GradesStep from '@/components/setup/grades-step';
import type { GradeSuggestion } from '@/components/setup/grades-step';
import { DoneNote, SkipButton, SubmitRow } from '@/components/setup/step-parts';
import type { StepKey } from '@/components/setup/step-parts';
import SubjectsStep from '@/components/setup/subjects-step';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { LevelChoices, LogoPicker } from '@/pages/onboarding/create-school';
import { dashboard } from '@/routes';
import { journey } from '@/routes/setup';
import {
    calendar as saveCalendar,
    school as saveSchool,
} from '@/routes/setup/journey';
import { index as yearsIndex } from '@/routes/setup/years';
import { index as staffIndex } from '@/routes/staff';
import { create as admitStudent } from '@/routes/students';
import type { Option } from '@/types';

type Step = ChalkItem & { key: StepKey };

type Props = {
    steps: Step[];
    currentStep: StepKey | null;
    school: { name: string; levels: string[]; logo_url: string | null };
    levelOptions: Option[];
    calendar: { name: string; start_date: string; end_date: string };
    currentYear: { id: number; name: string } | null;
    gradeSuggestions: GradeSuggestion[];
    subjectSuggestions: { code: string; name: string }[];
    counts: { staff: number; students: number };
};

const stepTitles: Record<StepKey, { title: string; intro: string }> = {
    school: {
        title: 'Your school',
        intro: 'The name, logo and kind of school. This shapes the suggestions in the next steps.',
    },
    calendar: {
        title: 'The school calendar',
        intro: 'Your school year and its terms. Classes, attendance, exams and fees all hang on these dates.',
    },
    grades: {
        title: 'Grades and classes',
        intro: 'Choose your kind of school, check the grades, then say how many classes each grade has.',
    },
    subjects: {
        title: 'Subjects',
        intro: 'Everything taught at your school. Tick what applies and add anything missing.',
    },
    teachers: {
        title: 'Your teachers',
        intro: 'Add your teachers and office staff, so you can give each class a class teacher.',
    },
    students: {
        title: 'Your students',
        intro: 'Admit students, place them in classes and link the guardians who look after them.',
    },
};

const toIso = (date: Date) => date.toISOString().slice(0, 10);

/** Split the year into equal terms with a two-week break between them. */
function splitTerms(start: string, end: string, count: number) {
    const from = new Date(`${start}T00:00:00Z`).getTime();
    const to = new Date(`${end}T00:00:00Z`).getTime();
    const day = 86_400_000;

    if (!(to > from)) {
        return [];
    }

    const span = (to - from) / count;

    return Array.from({ length: count }, (_, i) => ({
        name: `Term ${i + 1}`,
        start_date: toIso(new Date(from + Math.round((span * i) / day) * day)),
        end_date: toIso(
            new Date(
                i === count - 1
                    ? to
                    : from + Math.round((span * (i + 1)) / day - 14) * day,
            ),
        ),
    }));
}

function CalendarStep({
    suggestion,
    done,
    doneLabel,
}: {
    suggestion: Props['calendar'];
    done: boolean;
    doneLabel?: string | null;
}) {
    const [start, setStart] = useState(suggestion.start_date);
    const [end, setEnd] = useState(suggestion.end_date);
    const [count, setCount] = useState(3);
    const terms = useMemo(
        () => splitTerms(start, end, count),
        [start, end, count],
    );

    if (done) {
        return (
            <DoneNote href={yearsIndex()} linkLabel="Change dates">
                {doneLabel}
            </DoneNote>
        );
    }

    return (
        <Form
            {...saveCalendar.form()}
            options={{ preserveScroll: true }}
            className="grid gap-5"
        >
            {({ processing, errors }) => {
                const e = errors as Record<string, string | undefined>;

                return (
                    <>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field
                                label="School year"
                                htmlFor="name"
                                error={e.name}
                            >
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    defaultValue={suggestion.name}
                                />
                            </Field>
                            <Field
                                label="First day"
                                htmlFor="start_date"
                                error={e.start_date}
                            >
                                <Input
                                    id="start_date"
                                    name="start_date"
                                    type="date"
                                    required
                                    value={start}
                                    onChange={(ev) => setStart(ev.target.value)}
                                />
                            </Field>
                            <Field
                                label="Last day"
                                htmlFor="end_date"
                                error={e.end_date}
                            >
                                <Input
                                    id="end_date"
                                    name="end_date"
                                    type="date"
                                    required
                                    value={end}
                                    onChange={(ev) => setEnd(ev.target.value)}
                                />
                            </Field>
                        </div>

                        <div className="grid gap-2">
                            <span className="text-sm font-medium">
                                How many terms?
                            </span>
                            <div
                                className="flex gap-2"
                                role="radiogroup"
                                aria-label="Number of terms"
                            >
                                {[2, 3, 4].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        role="radio"
                                        aria-checked={count === n}
                                        onClick={() => setCount(n)}
                                        className={cn(
                                            'h-10 w-14 rounded-lg border text-sm font-semibold transition-colors',
                                            count === n
                                                ? 'border-primary bg-primary text-primary-foreground'
                                                : 'border-input bg-card hover:bg-accent',
                                        )}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <span className="text-sm font-medium">
                                Term dates{' '}
                                <span className="font-normal text-muted-foreground">
                                    Suggested evenly. Adjust them to your
                                    calendar.
                                </span>
                            </span>
                            {/* key resets the inputs when the split changes */}
                            <div
                                key={`${start}-${end}-${count}`}
                                className="grid gap-2"
                            >
                                {terms.map((term, i) => (
                                    <div
                                        key={i}
                                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2"
                                    >
                                        <Input
                                            name={`terms[${i}][name]`}
                                            defaultValue={term.name}
                                            aria-label={`Term ${i + 1} name`}
                                            required
                                        />
                                        <Input
                                            name={`terms[${i}][start_date]`}
                                            type="date"
                                            defaultValue={term.start_date}
                                            aria-label={`Term ${i + 1} start`}
                                            required
                                        />
                                        <Input
                                            name={`terms[${i}][end_date]`}
                                            type="date"
                                            defaultValue={term.end_date}
                                            aria-label={`Term ${i + 1} end`}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                            <InputError
                                message={
                                    Object.entries(e).find(([k]) =>
                                        k.startsWith('terms'),
                                    )?.[1]
                                }
                            />
                        </div>

                        <SubmitRow
                            processing={processing}
                            label="Save calendar"
                            step="calendar"
                        />
                    </>
                );
            }}
        </Form>
    );
}

function PeopleStep({
    step,
    done,
    doneLabel,
    count,
}: {
    step: 'teachers' | 'students';
    done: boolean;
    doneLabel?: string | null;
    count: number;
}) {
    const isTeachers = step === 'teachers';

    return (
        <div className="grid gap-4">
            {done && <DoneNote>{doneLabel}</DoneNote>}
            <div className="grid gap-3 rounded-2xl border border-border bg-background p-5 sm:grid-cols-[1fr_auto] sm:items-center">
                <p className="text-sm text-muted-foreground">
                    {isTeachers
                        ? count > 0
                            ? 'Invite more staff whenever you like. Each person sets up their own account from a WhatsApp link.'
                            : "Type your teachers' WhatsApp numbers or upload a spreadsheet. Each person gets a link and sets up their own account."
                        : count > 0
                          ? 'Keep admitting students. Spreadsheet import is coming soon for whole classes.'
                          : 'Admit your first student. Importing a whole class from a spreadsheet is coming soon.'}
                </p>
                <Button asChild>
                    <Link href={isTeachers ? staffIndex() : admitStudent()}>
                        {isTeachers ? 'Invite staff' : 'Admit a student'}{' '}
                        <ArrowRight />
                    </Link>
                </Button>
            </div>
            {!done && (
                <div className="flex justify-end">
                    <SkipButton step={step} />
                </div>
            )}
        </div>
    );
}

export default function Journey(props: Props) {
    const { steps, currentStep, school, levelOptions } = props;
    const { name, flash } = usePage().props as unknown as {
        name: string;
        flash?: { chalk?: string };
    };
    const finished = steps.every((s) => s.done || s.skipped);
    const doneCount = steps.filter((s) => s.done).length;
    const active = steps.find((s) => s.key === currentStep);

    return (
        <>
            <Head title="Set up your school" />

            <div className="min-h-svh bg-background">
                <header className="border-b border-border bg-card/70">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground">
                                {school.logo_url ? (
                                    <img
                                        src={school.logo_url}
                                        alt=""
                                        className="size-full bg-white object-contain"
                                    />
                                ) : (
                                    <AppLogoIcon className="size-6 fill-current" />
                                )}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate font-semibold">
                                    {school.name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    Setting up on {name}
                                </p>
                            </div>
                        </div>
                        <Button variant="ghost" asChild>
                            <Link href={dashboard()}>
                                {finished ? 'Go to dashboard' : 'Finish later'}
                            </Link>
                        </Button>
                    </div>
                </header>

                <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:py-12">
                    {/* The chalkboard: first on phones, alongside on desktop */}
                    <div className="lg:order-last">
                        <div className="lg:sticky lg:top-8">
                            <Chalkboard
                                title="Before the first bell"
                                items={steps}
                                animateKey={flash?.chalk}
                                footer={
                                    finished
                                        ? 'All set. Ring the bell!'
                                        : doneCount <= 1
                                          ? 'Well begun is half done.'
                                          : `${doneCount} of ${steps.length} done. Keep going!`
                                }
                            />
                        </div>
                    </div>

                    <div className="min-w-0">
                        {finished && !active ? (
                            <section className="rounded-3xl border border-border bg-card p-8 text-center sm:p-12">
                                <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-sun-soft">
                                    <PartyPopper className="size-7 text-coral" />
                                </span>
                                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Ready for the first bell
                                </h1>
                                <p className="mx-auto mt-3 max-w-md text-muted-foreground">
                                    {school.name} is set up. Anything you put
                                    off is still on the board, and you can come
                                    back to it any time.
                                </p>
                                <Button size="lg" className="mt-8" asChild>
                                    <Link href={dashboard()}>
                                        Open the dashboard <ArrowRight />
                                    </Link>
                                </Button>
                            </section>
                        ) : (
                            <>
                                <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Let's get {school.name} ready
                                </h1>
                                <p className="mt-2 text-muted-foreground">
                                    One step at a time. Put anything off for
                                    later; it stays on the board.
                                </p>

                                <ol className="mt-8 grid gap-3">
                                    {steps.map((step, index) => {
                                        const isActive =
                                            step.key === currentStep;
                                        const meta = stepTitles[step.key];

                                        return (
                                            <li
                                                key={step.key}
                                                className={cn(
                                                    'rounded-2xl border transition-colors',
                                                    isActive
                                                        ? 'border-primary/40 bg-card shadow-sm'
                                                        : 'border-border bg-card/60',
                                                )}
                                            >
                                                <Link
                                                    href={journey.url({
                                                        query: {
                                                            step: step.key,
                                                        },
                                                    })}
                                                    preserveScroll
                                                    className="flex items-center gap-4 px-5 py-4"
                                                    aria-current={
                                                        isActive
                                                            ? 'step'
                                                            : undefined
                                                    }
                                                >
                                                    <span
                                                        className={cn(
                                                            'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                                                            step.done
                                                                ? 'bg-leaf text-white'
                                                                : isActive
                                                                  ? 'bg-primary text-primary-foreground'
                                                                  : 'border border-input text-muted-foreground',
                                                        )}
                                                    >
                                                        {step.done ? (
                                                            <Check className="size-4" />
                                                        ) : (
                                                            index + 1
                                                        )}
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block font-semibold">
                                                            {meta.title}
                                                        </span>
                                                        {!isActive && (
                                                            <span className="block truncate text-sm text-muted-foreground">
                                                                {step.done
                                                                    ? step.doneLabel
                                                                    : step.skipped
                                                                      ? 'Put off for later'
                                                                      : meta.intro}
                                                            </span>
                                                        )}
                                                    </span>
                                                </Link>

                                                {isActive && (
                                                    <div className="border-t border-border px-5 pt-4 pb-5">
                                                        <p className="mb-5 text-sm text-muted-foreground">
                                                            {meta.intro}
                                                        </p>

                                                        {step.key ===
                                                            'school' && (
                                                            <Form
                                                                {...saveSchool.form()}
                                                                options={{
                                                                    preserveScroll: true,
                                                                }}
                                                                className="grid gap-5"
                                                            >
                                                                {({
                                                                    processing,
                                                                    errors,
                                                                }) => (
                                                                    <>
                                                                        <Field
                                                                            label="School name"
                                                                            htmlFor="school-name"
                                                                            error={
                                                                                errors.name
                                                                            }
                                                                        >
                                                                            <Input
                                                                                id="school-name"
                                                                                name="name"
                                                                                required
                                                                                defaultValue={
                                                                                    school.name
                                                                                }
                                                                            />
                                                                        </Field>
                                                                        <LevelChoices
                                                                            options={
                                                                                levelOptions
                                                                            }
                                                                            selected={
                                                                                school.levels
                                                                            }
                                                                            error={
                                                                                errors.levels
                                                                            }
                                                                        />
                                                                        <LogoPicker
                                                                            current={
                                                                                school.logo_url
                                                                            }
                                                                            error={
                                                                                errors.logo
                                                                            }
                                                                        />
                                                                        <div className="flex justify-end">
                                                                            <Button
                                                                                type="submit"
                                                                                disabled={
                                                                                    processing
                                                                                }
                                                                            >
                                                                                {processing && (
                                                                                    <Spinner />
                                                                                )}{' '}
                                                                                Save
                                                                                and
                                                                                continue{' '}
                                                                                <ArrowRight />
                                                                            </Button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </Form>
                                                        )}
                                                        {step.key ===
                                                            'calendar' && (
                                                            <CalendarStep
                                                                suggestion={
                                                                    props.calendar
                                                                }
                                                                done={step.done}
                                                                doneLabel={
                                                                    step.doneLabel
                                                                }
                                                            />
                                                        )}
                                                        {step.key ===
                                                            'grades' && (
                                                            <GradesStep
                                                                suggestions={
                                                                    props.gradeSuggestions
                                                                }
                                                                levelOptions={
                                                                    levelOptions
                                                                }
                                                                schoolLevels={
                                                                    school.levels
                                                                }
                                                                done={step.done}
                                                                doneLabel={
                                                                    step.doneLabel
                                                                }
                                                                currentYear={
                                                                    props.currentYear
                                                                }
                                                            />
                                                        )}
                                                        {step.key ===
                                                            'subjects' && (
                                                            <SubjectsStep
                                                                suggestions={
                                                                    props.subjectSuggestions
                                                                }
                                                                done={step.done}
                                                                doneLabel={
                                                                    step.doneLabel
                                                                }
                                                            />
                                                        )}
                                                        {step.key ===
                                                            'teachers' && (
                                                            <PeopleStep
                                                                step="teachers"
                                                                done={step.done}
                                                                doneLabel={
                                                                    step.doneLabel
                                                                }
                                                                count={
                                                                    props.counts
                                                                        .staff
                                                                }
                                                            />
                                                        )}
                                                        {step.key ===
                                                            'students' && (
                                                            <PeopleStep
                                                                step="students"
                                                                done={step.done}
                                                                doneLabel={
                                                                    step.doneLabel
                                                                }
                                                                count={
                                                                    props.counts
                                                                        .students
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </li>
                                        );
                                    })}
                                </ol>
                            </>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}
