import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Save } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { index, save } from '@/routes/marks';

type Learner = {
    id: number;
    full_name: string;
    admission_number: string | null;
    photo_url: string | null;
    score: number | null;
};
type Band = { label: string; min_percentage: number; is_pass: boolean };

type Props = {
    exam: { id: number; name: string; term: string | null };
    classroom: { id: number; name: string };
    subject: { id: number; name: string; code: string };
    outOf: number;
    learners: Learner[];
    bands: Band[];
    backUrl: string;
};

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function MarkSheet({
    exam,
    classroom,
    subject,
    outOf: savedOutOf,
    learners,
    bands,
    backUrl,
}: Props) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const [outOf, setOutOf] = useState(String(savedOutOf));
    const [marks, setMarks] = useState<Record<number, string>>(() =>
        Object.fromEntries(
            learners.map((l) => [
                l.id,
                l.score === null ? '' : String(l.score),
            ]),
        ),
    );
    const [dirty, setDirty] = useState(false);
    const [processing, setProcessing] = useState(false);
    const inputs = useRef<(HTMLInputElement | null)[]>([]);

    const total = Number(outOf);
    const symbolFor = (value: string) => {
        if (value === '' || !(total > 0)) {
            return null;
        }

        const score = Number(value);

        if (Number.isNaN(score) || score < 0 || score > total) {
            return { invalid: true as const };
        }

        const pct = (score / total) * 100;
        const band = bands.find((b) => pct >= b.min_percentage);

        return { pct, band };
    };

    const entered = useMemo(
        () => Object.values(marks).filter((v) => v !== '').length,
        [marks],
    );

    const submit = () => {
        router.put(
            save.url([exam.id, classroom.id, subject.id]),
            {
                out_of: outOf,
                marks: Object.fromEntries(
                    Object.entries(marks).map(([id, v]) => [
                        id,
                        v === '' ? null : v,
                    ]),
                ),
            },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => setDirty(false),
            },
        );
    };

    const firstError = Object.entries(errors).find(([k]) =>
        k.startsWith('marks.'),
    );
    const errorFor = (id: number) => errors[`marks.${id}`];

    return (
        <>
            <Head title={`${subject.name} · ${classroom.name}`} />
            <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 p-4 pb-0 sm:p-6 sm:pb-0">
                <div>
                    <Button variant="ghost" size="sm" asChild className="-ml-2">
                        <Link href={backUrl}>
                            <ArrowLeft /> All classes
                        </Link>
                    </Button>
                    <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
                        {subject.name}
                    </h1>
                    <p className="text-muted-foreground">
                        {classroom.name} · {exam.name}
                        {exam.term ? `, ${exam.term}` : ''}
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-4">
                    <label className="grid gap-1.5 text-sm font-medium">
                        Marked out of
                        <Input
                            value={outOf}
                            onChange={(e) => {
                                setOutOf(e.target.value);
                                setDirty(true);
                            }}
                            inputMode="decimal"
                            className="w-28 text-lg font-semibold tabular-nums"
                        />
                    </label>
                    <p className="flex-1 text-sm text-muted-foreground">
                        Leave a box empty if the learner didn’t write. Press
                        Enter to jump to the next learner.
                    </p>
                    <InputError message={errors.out_of} />
                </div>

                {bands.length === 0 && (
                    <p className="rounded-xl bg-sun-soft px-4 py-3 text-sm">
                        No marking scale yet, so symbols won’t show. The
                        administrator can add one under Marking scales.
                    </p>
                )}

                {learners.length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
                        No learners are placed in {classroom.name} yet.
                    </p>
                ) : (
                    <ol className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
                        {learners.map((learner, i) => {
                            const value = marks[learner.id] ?? '';
                            const result = symbolFor(value);
                            const error = errorFor(learner.id);

                            return (
                                <li
                                    key={learner.id}
                                    className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4"
                                >
                                    <span className="hidden w-6 text-right text-xs text-muted-foreground tabular-nums sm:block">
                                        {i + 1}
                                    </span>
                                    {learner.photo_url ? (
                                        <img
                                            src={learner.photo_url}
                                            alt=""
                                            className="hidden size-9 shrink-0 rounded-full object-cover sm:block"
                                        />
                                    ) : (
                                        <span className="hidden size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground sm:flex">
                                            {initials(learner.full_name)}
                                        </span>
                                    )}
                                    <label
                                        htmlFor={`mark-${learner.id}`}
                                        className="min-w-0 flex-1"
                                    >
                                        <span className="block leading-snug font-medium break-words">
                                            {learner.full_name}
                                        </span>
                                        {error ? (
                                            <span className="block text-xs text-destructive">
                                                {error}
                                            </span>
                                        ) : (
                                            learner.admission_number && (
                                                <span className="block text-xs text-muted-foreground">
                                                    {learner.admission_number}
                                                </span>
                                            )
                                        )}
                                    </label>
                                    <Input
                                        id={`mark-${learner.id}`}
                                        ref={(el) => {
                                            inputs.current[i] = el;
                                        }}
                                        value={value}
                                        inputMode="decimal"
                                        enterKeyHint={
                                            i === learners.length - 1
                                                ? 'done'
                                                : 'next'
                                        }
                                        autoComplete="off"
                                        aria-invalid={
                                            !!error ||
                                            (result !== null &&
                                                'invalid' in result)
                                        }
                                        onChange={(e) => {
                                            setMarks({
                                                ...marks,
                                                [learner.id]:
                                                    e.target.value.replace(
                                                        ',',
                                                        '.',
                                                    ),
                                            });
                                            setDirty(true);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const next =
                                                    inputs.current[i + 1];

                                                if (next) {
                                                    next.focus();
                                                    next.select();
                                                } else {
                                                    submit();
                                                }
                                            }
                                        }}
                                        className="w-[4.5rem] shrink-0 text-right text-lg font-semibold tabular-nums"
                                    />
                                    <span
                                        className={cn(
                                            'flex w-12 shrink-0 flex-col items-center rounded-lg py-1 text-center sm:w-16',
                                            result &&
                                                !('invalid' in result) &&
                                                result.band &&
                                                (result.band.is_pass
                                                    ? 'bg-leaf-soft'
                                                    : 'bg-coral-soft'),
                                        )}
                                        aria-live="polite"
                                    >
                                        {result === null ? (
                                            <span className="text-muted-foreground">
                                                –
                                            </span>
                                        ) : 'invalid' in result ? (
                                            <span className="text-xs text-destructive">
                                                Check
                                            </span>
                                        ) : (
                                            <>
                                                <span className="font-display text-base leading-tight font-semibold">
                                                    {result.band?.label ?? ''}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                                    {Math.round(result.pct)}%
                                                </span>
                                            </>
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                )}

                <div className="sticky bottom-0 z-20 -mx-4 mt-auto border-t border-border bg-background/95 backdrop-blur sm:mx-0 sm:rounded-t-2xl sm:border-x">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <p className="flex-1 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground tabular-nums">
                                {entered} of {learners.length}
                            </span>{' '}
                            marked
                            {dirty && (
                                <span className="ml-2 text-coral">
                                    · not saved yet
                                </span>
                            )}
                            {firstError && !dirty && (
                                <span className="ml-2 text-destructive">
                                    · some marks need checking
                                </span>
                            )}
                        </p>
                        <Button
                            onClick={submit}
                            disabled={processing || learners.length === 0}
                            size="lg"
                        >
                            {processing ? <Spinner /> : <Save />}
                            Save marks
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

MarkSheet.layout = {
    breadcrumbs: [{ title: 'Marks', href: index() }],
};
