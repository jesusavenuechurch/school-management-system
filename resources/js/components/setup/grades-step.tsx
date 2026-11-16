import { Form, Link } from '@inertiajs/react';
import { Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    LittleLearnersArt,
    SeniorStudentsArt,
} from '@/components/illustrations';
import InputError from '@/components/input-error';
import { ChipAdder, DoneNote, SubmitRow } from '@/components/setup/step-parts';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { classes as classesPage, journey } from '@/routes/setup';
import { grades as saveGrades } from '@/routes/setup/journey';
import type { Option } from '@/types';

export type GradeSuggestion = {
    level: string;
    label: string;
    grades: { name: string; description: string | null }[];
};

const levelArt: Record<string, typeof LittleLearnersArt> = {
    primary: LittleLearnersArt,
    high_school: SeniorStudentsArt,
};

const levelTone: Record<string, string> = {
    primary: 'bg-sun-soft',
    high_school: 'bg-sky-soft',
};

const MAX_CLASSES = 20;

/** "Grade 4" with 3 classes -> ["Grade 4A", "Grade 4B", "Grade 4C"]. */
function classNames(grade: string, count: number): string[] {
    return count <= 1
        ? [grade]
        : Array.from(
              { length: count },
              (_, i) => `${grade}${String.fromCharCode(65 + i)}`,
          );
}

function Stepper({
    value,
    onChange,
    label,
}: {
    value: number;
    onChange: (n: number) => void;
    label: string;
}) {
    const clamp = (n: number) =>
        Math.min(
            MAX_CLASSES,
            Math.max(1, Number.isFinite(n) ? Math.round(n) : 1),
        );

    return (
        <div
            className="flex items-center rounded-lg border border-input bg-card"
            role="group"
            aria-label={label}
        >
            <button
                type="button"
                onClick={() => onChange(clamp(value - 1))}
                className="flex size-9 items-center justify-center rounded-l-lg hover:bg-accent"
                aria-label={`Fewer classes in ${label}`}
            >
                <Minus className="size-4" />
            </button>
            <input
                type="number"
                min={1}
                max={MAX_CLASSES}
                value={value}
                onChange={(event) =>
                    onChange(clamp(Number(event.target.value)))
                }
                className="h-9 w-12 [appearance:textfield] border-x border-input bg-transparent text-center text-base font-semibold tabular-nums outline-none focus-visible:bg-accent/60 [&::-webkit-inner-spin-button]:appearance-none"
                aria-label={`Classes in ${label}`}
            />
            <button
                type="button"
                onClick={() => onChange(clamp(value + 1))}
                className="flex size-9 items-center justify-center rounded-r-lg hover:bg-accent"
                aria-label={`More classes in ${label}`}
            >
                <Plus className="size-4" />
            </button>
        </div>
    );
}

function SectionTitle({
    number,
    title,
    hint,
}: {
    number: number;
    title: string;
    hint?: string;
}) {
    return (
        <div className="mb-3 flex items-baseline gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary font-display text-sm font-semibold text-primary-foreground">
                {number}
            </span>
            <div>
                <h3 className="text-base font-semibold">{title}</h3>
                {hint && (
                    <p className="text-sm text-muted-foreground">{hint}</p>
                )}
            </div>
        </div>
    );
}

export default function GradesStep({
    suggestions,
    levelOptions,
    schoolLevels,
    done,
    doneLabel,
    currentYear,
}: {
    suggestions: GradeSuggestion[];
    levelOptions: Option[];
    schoolLevels: string[];
    done: boolean;
    doneLabel?: string | null;
    currentYear: { id: number; name: string } | null;
}) {
    const [levels, setLevels] = useState<string[]>(schoolLevels);
    const [unpicked, setUnpicked] = useState<string[]>([]);
    const [extras, setExtras] = useState<string[]>([]);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [bulk, setBulk] = useState(2);

    const selected = useMemo(() => {
        const fromPresets = suggestions
            .filter((group) => levels.includes(group.level))
            .flatMap((group) =>
                group.grades.filter((g) => !unpicked.includes(g.name)),
            );

        return [
            ...fromPresets,
            ...extras.map((name) => ({ name, description: null })),
        ];
    }, [suggestions, levels, unpicked, extras]);

    const countFor = (name: string) => counts[name] ?? 1;
    const totalClasses = selected.reduce((sum, g) => sum + countFor(g.name), 0);

    if (!currentYear) {
        return (
            <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Set up the school calendar first, so we know which year these
                classes are for.{' '}
                <Link
                    href={journey.url({ query: { step: 'calendar' } })}
                    className="font-medium text-foreground underline"
                >
                    Go to the calendar
                </Link>
            </p>
        );
    }

    return (
        <div className="grid gap-5">
            {done && (
                <DoneNote href={classesPage()} linkLabel="Manage classes">
                    {doneLabel}
                </DoneNote>
            )}

            <Form
                {...saveGrades.form()}
                options={{ preserveScroll: true }}
                className="grid gap-8"
                onSuccess={() => setExtras([])}
            >
                {({ processing, errors }) => {
                    const e = errors as Record<string, string | undefined>;

                    return (
                        <>
                            {levels.map((level) => (
                                <input
                                    key={level}
                                    type="hidden"
                                    name="levels[]"
                                    value={level}
                                />
                            ))}
                            {selected.map((grade, i) => (
                                <span key={grade.name} hidden>
                                    <input
                                        type="hidden"
                                        name={`grades[${i}][name]`}
                                        value={grade.name}
                                    />
                                    <input
                                        type="hidden"
                                        name={`grades[${i}][description]`}
                                        value={grade.description ?? ''}
                                    />
                                    <input
                                        type="hidden"
                                        name={`grades[${i}][classes]`}
                                        value={countFor(grade.name)}
                                    />
                                </span>
                            ))}

                            {/* 1. Kind of school */}
                            <section>
                                <SectionTitle
                                    number={1}
                                    title="What kind of school is it?"
                                    hint="Choose both if you teach primary and high school."
                                />
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {levelOptions.map((option) => {
                                        const on = levels.includes(
                                            option.value,
                                        );
                                        const Art = levelArt[option.value];

                                        return (
                                            <button
                                                key={option.value}
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() =>
                                                    setLevels((list) =>
                                                        on
                                                            ? list.filter(
                                                                  (l) =>
                                                                      l !==
                                                                      option.value,
                                                              )
                                                            : [
                                                                  ...list,
                                                                  option.value,
                                                              ],
                                                    )
                                                }
                                                className={cn(
                                                    'flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors',
                                                    on
                                                        ? 'border-primary bg-accent/60'
                                                        : 'border-border bg-card hover:border-ring/60',
                                                )}
                                            >
                                                {Art && (
                                                    <Art className="h-12 w-auto shrink-0" />
                                                )}
                                                <span className="flex-1">
                                                    <span className="block font-display text-lg font-semibold">
                                                        {option.label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {on
                                                            ? 'Selected'
                                                            : 'Tap to choose'}
                                                    </span>
                                                </span>
                                                <span
                                                    className={cn(
                                                        'flex size-5 items-center justify-center rounded border-2 text-xs',
                                                        on
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'border-input',
                                                    )}
                                                    aria-hidden="true"
                                                >
                                                    {on && '✓'}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                                <InputError message={e.levels} />
                            </section>

                            {/* 2. Grades */}
                            {levels.length > 0 && (
                                <section>
                                    <SectionTitle
                                        number={2}
                                        title="Which grades do you have?"
                                        hint="Tap a grade to leave it out."
                                    />
                                    <div className="grid gap-4">
                                        {suggestions
                                            .filter((group) =>
                                                levels.includes(group.level),
                                            )
                                            .map((group) => (
                                                <div key={group.level}>
                                                    <p className="mb-2 text-sm font-medium text-muted-foreground">
                                                        {group.label}
                                                    </p>
                                                    {group.grades.length ===
                                                    0 ? (
                                                        <p className="text-sm text-muted-foreground">
                                                            All of these are
                                                            already added.
                                                        </p>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-2">
                                                            {group.grades.map(
                                                                (grade) => {
                                                                    const on =
                                                                        !unpicked.includes(
                                                                            grade.name,
                                                                        );

                                                                    return (
                                                                        <button
                                                                            key={
                                                                                grade.name
                                                                            }
                                                                            type="button"
                                                                            aria-pressed={
                                                                                on
                                                                            }
                                                                            onClick={() =>
                                                                                setUnpicked(
                                                                                    (
                                                                                        list,
                                                                                    ) =>
                                                                                        on
                                                                                            ? [
                                                                                                  ...list,
                                                                                                  grade.name,
                                                                                              ]
                                                                                            : list.filter(
                                                                                                  (
                                                                                                      n,
                                                                                                  ) =>
                                                                                                      n !==
                                                                                                      grade.name,
                                                                                              ),
                                                                                )
                                                                            }
                                                                            className={cn(
                                                                                'rounded-xl border px-3 py-2 text-left text-sm transition-colors',
                                                                                on
                                                                                    ? `border-transparent ${levelTone[group.level]}`
                                                                                    : 'border-dashed border-input text-muted-foreground line-through',
                                                                            )}
                                                                        >
                                                                            <span className="block font-semibold">
                                                                                {
                                                                                    grade.name
                                                                                }
                                                                            </span>
                                                                            {grade.description && (
                                                                                <span className="block text-xs opacity-80">
                                                                                    {
                                                                                        grade.description
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        <div>
                                            <p className="mb-2 text-sm font-medium text-muted-foreground">
                                                Any other grades? Like Reception
                                                or Pre-school
                                            </p>
                                            <ChipAdder
                                                placeholder="Reception"
                                                label="Another grade"
                                                items={extras}
                                                onChange={setExtras}
                                                renderHidden={false}
                                            />
                                        </div>
                                    </div>
                                    <InputError message={e.grades} />
                                </section>
                            )}

                            {/* 3. Classes per grade */}
                            {selected.length > 0 && (
                                <section>
                                    <SectionTitle
                                        number={3}
                                        title={`How many classes does each grade have in ${currentYear.name}?`}
                                        hint="Each grade can be different. Two classes become A and B, like Grade 4A and Grade 4B."
                                    />
                                    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm">
                                        <span>
                                            Same number for every grade:
                                        </span>
                                        <Stepper
                                            value={bulk}
                                            onChange={setBulk}
                                            label="every grade"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setCounts(
                                                    Object.fromEntries(
                                                        selected.map((g) => [
                                                            g.name,
                                                            bulk,
                                                        ]),
                                                    ),
                                                )
                                            }
                                        >
                                            Apply to all
                                        </Button>
                                    </div>
                                    <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                                        {selected.map((grade) => {
                                            const count = countFor(grade.name);
                                            const names = classNames(
                                                grade.name,
                                                count,
                                            );

                                            return (
                                                <li
                                                    key={grade.name}
                                                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                                                >
                                                    <div className="min-w-32 flex-1">
                                                        <p className="font-semibold">
                                                            {grade.name}
                                                        </p>
                                                        {grade.description && (
                                                            <p className="text-xs text-muted-foreground">
                                                                {
                                                                    grade.description
                                                                }
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="order-last w-full truncate text-sm text-muted-foreground sm:order-none sm:w-auto sm:max-w-56">
                                                        {names.length > 6
                                                            ? `${names.slice(0, 5).join(', ')} … ${names[names.length - 1]}`
                                                            : names.join(', ')}
                                                    </p>
                                                    <Stepper
                                                        value={count}
                                                        onChange={(n) =>
                                                            setCounts((c) => ({
                                                                ...c,
                                                                [grade.name]: n,
                                                            }))
                                                        }
                                                        label={grade.name}
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                    <p className="mt-2 text-right text-sm text-muted-foreground">
                                        {selected.length} grades, {totalClasses}{' '}
                                        classes
                                    </p>
                                    {Object.entries(e)
                                        .filter(([key]) =>
                                            key.startsWith('grades.'),
                                        )
                                        .slice(0, 1)
                                        .map(([key, message]) => (
                                            <InputError
                                                key={key}
                                                message={message}
                                            />
                                        ))}
                                </section>
                            )}

                            {done ? (
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />} Add these
                                        classes
                                    </Button>
                                </div>
                            ) : (
                                <SubmitRow
                                    processing={processing}
                                    label={`Create ${totalClasses} classes`}
                                    step="grades"
                                />
                            )}
                        </>
                    );
                }}
            </Form>
        </div>
    );
}
