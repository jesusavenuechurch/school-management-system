import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import EmptyState from '@/components/empty-state';
import NativeSelect from '@/components/native-select';
import PageHeader, { PageBody } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { index as examsIndex } from '@/routes/exams';
import { index } from '@/routes/marks';
import { classes } from '@/routes/setup';
import type { Option } from '@/types';

type SubjectLink = {
    id: number;
    name: string;
    code: string;
    teacher: string | null;
    filled: number;
    url: string;
};
type Group = {
    classroom: { id: number; name: string };
    learners: number;
    subjects: SubjectLink[];
};

type Props = {
    terms: Option[];
    selectedTermId: number | null;
    exams: { id: number; name: string }[];
    selectedExamId: number | null;
    groups: Group[];
    isAdmin: boolean;
};

export default function Marks({
    terms,
    selectedTermId,
    exams,
    selectedExamId,
    groups,
    isAdmin,
}: Props) {
    const go = (query: Record<string, string | number | null>) =>
        router.get(index.url({ query }), {}, { preserveScroll: true });

    return (
        <>
            <Head title="Marks" />
            <PageBody>
                <PageHeader
                    title="Marks"
                    description="Choose the test, then the class and subject. Type each learner's mark and the symbol appears as you go."
                    actions={
                        terms.length > 0 && (
                            <NativeSelect
                                aria-label="Term"
                                className="w-56"
                                options={terms}
                                value={String(selectedTermId ?? '')}
                                onChange={(e) => go({ term: e.target.value })}
                            />
                        )
                    }
                />

                {exams.length === 0 ? (
                    <EmptyState
                        title="No tests or exams this term yet"
                        description={
                            isAdmin
                                ? 'Add this term’s tests and exams first. Teachers can then enter their marks.'
                                : 'Your school hasn’t added this term’s tests yet. Ask the administrator.'
                        }
                        action={
                            isAdmin ? (
                                <Button asChild>
                                    <Link href={examsIndex()}>
                                        Add tests & exams
                                    </Link>
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <>
                        <div
                            role="tablist"
                            aria-label="Test or exam"
                            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
                        >
                            {exams.map((exam) => (
                                <button
                                    key={exam.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={exam.id === selectedExamId}
                                    onClick={() =>
                                        go({
                                            term: selectedTermId,
                                            exam: exam.id,
                                        })
                                    }
                                    className={cn(
                                        'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
                                        exam.id === selectedExamId
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-card hover:bg-muted',
                                    )}
                                >
                                    {exam.name}
                                </button>
                            ))}
                        </div>

                        {groups.length === 0 ? (
                            <EmptyState
                                title={
                                    isAdmin
                                        ? 'No subjects given to classes yet'
                                        : 'No subjects given to you yet'
                                }
                                description={
                                    isAdmin
                                        ? 'On Grades & classes, open a class and choose who teaches each subject. Those teachers then enter the marks.'
                                        : 'The administrator chooses who teaches each subject in each class. Once you have yours, they appear here.'
                                }
                                action={
                                    isAdmin ? (
                                        <Button asChild>
                                            <Link href={classes()}>
                                                Go to Grades & classes
                                            </Link>
                                        </Button>
                                    ) : undefined
                                }
                            />
                        ) : (
                            <div className="grid gap-5 md:grid-cols-2">
                                {groups.map((group) => (
                                    <section
                                        key={group.classroom.id}
                                        className="overflow-hidden rounded-2xl border border-border bg-card"
                                    >
                                        <div className="flex items-baseline justify-between border-b border-border px-5 py-3">
                                            <h2 className="font-display text-xl font-semibold">
                                                {group.classroom.name}
                                            </h2>
                                            <span className="text-sm text-muted-foreground">
                                                {group.learners} learners
                                            </span>
                                        </div>
                                        <ul className="divide-y divide-border">
                                            {group.subjects.map((subject) => {
                                                const done =
                                                    group.learners > 0 &&
                                                    subject.filled >=
                                                        group.learners;

                                                return (
                                                    <li key={subject.id}>
                                                        <Link
                                                            href={subject.url}
                                                            className="flex items-center gap-3 px-5 py-3 transition hover:bg-muted/60"
                                                        >
                                                            <div className="min-w-0 flex-1">
                                                                <p className="font-medium">
                                                                    {
                                                                        subject.name
                                                                    }
                                                                </p>
                                                                {isAdmin &&
                                                                    subject.teacher && (
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {
                                                                                subject.teacher
                                                                            }
                                                                        </p>
                                                                    )}
                                                            </div>
                                                            <span
                                                                className={cn(
                                                                    'flex items-center gap-1 text-sm tabular-nums',
                                                                    done
                                                                        ? 'text-leaf'
                                                                        : 'text-muted-foreground',
                                                                )}
                                                            >
                                                                {done && (
                                                                    <CheckCircle2 className="size-4" />
                                                                )}
                                                                {subject.filled}
                                                                /
                                                                {group.learners}
                                                            </span>
                                                            <ChevronRight className="size-4 text-muted-foreground" />
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </section>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </PageBody>
        </>
    );
}

Marks.layout = {
    breadcrumbs: [{ title: 'Marks', href: index() }],
};
