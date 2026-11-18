import { Head, Link, router } from '@inertiajs/react';
import {
    FileText,
    MessageSquareText,
    Printer,
    Send,
    Undo2,
} from 'lucide-react';
import EmptyState from '@/components/empty-state';
import Field from '@/components/field';
import FormDialog from '@/components/form-dialog';
import NativeSelect from '@/components/native-select';
import PageHeader, { PageBody } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { index as marksIndex } from '@/routes/marks';
import { index, print, publish, remarks, settings } from '@/routes/reports';
import { index as scalesIndex } from '@/routes/scales';
import type { Option } from '@/types';

export type ReportSubject = {
    subject_id: number;
    name: string;
    code: string;
    teacher: string | null;
    tests: number | null;
    tests_count: number;
    exam: number | null;
    mark: number | null;
    symbol: string | null;
    remark: string | null;
    is_pass: boolean | null;
};
export type ReportLearner = {
    student: {
        id: number;
        full_name: string;
        admission_number: string | null;
        photo_url: string | null;
    };
    subjects: ReportSubject[];
    average: number | null;
    symbol: string | null;
    symbol_remark: string | null;
    subjects_passed: number;
    subjects_marked: number;
    position: number | null;
    days_present: number | null;
    days_absent: number | null;
    class_teacher_remark: string | null;
    head_teacher_remark: string | null;
    published_at: string | null;
};
export type ReportCounts = { tests: number; exams: number };

type Props = {
    terms: Option[];
    selectedTermId: number | null;
    classrooms: Option[];
    selectedClassroomId: number | null;
    counts: ReportCounts;
    testWeight: number;
    learners: ReportLearner[];
    rankedCount: number;
    hasScale: boolean;
    showsPosition: boolean;
    isAdmin: boolean;
    published: boolean;
};

const textareaClass =
    'min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

export default function Reports({
    terms,
    selectedTermId,
    classrooms,
    selectedClassroomId,
    counts,
    testWeight,
    learners,
    rankedCount,
    hasScale,
    showsPosition,
    isAdmin,
    published,
}: Props) {
    const go = (query: Record<string, string | number | null>) =>
        router.get(index.url({ query }), {}, { preserveScroll: true });

    const subjectNames = learners[0]?.subjects ?? [];
    const withMarks = learners.filter((l) => l.subjects_marked > 0).length;
    const withRemarks = learners.filter((l) => l.class_teacher_remark).length;

    return (
        <>
            <Head title="Report cards" />
            <PageBody>
                <PageHeader
                    title="Report cards"
                    description={`A subject’s term mark is its tests (${testWeight}%) and exams (${100 - testWeight}%). Add remarks, check the class, then print or issue the reports.`}
                    actions={
                        <>
                            {terms.length > 0 && (
                                <NativeSelect
                                    aria-label="Term"
                                    className="w-52"
                                    options={terms}
                                    value={String(selectedTermId ?? '')}
                                    onChange={(e) =>
                                        go({ term: e.target.value })
                                    }
                                />
                            )}
                            {classrooms.length > 0 && (
                                <NativeSelect
                                    aria-label="Class"
                                    className="w-36"
                                    options={classrooms}
                                    value={String(selectedClassroomId ?? '')}
                                    onChange={(e) =>
                                        go({
                                            term: selectedTermId,
                                            classroom: e.target.value,
                                        })
                                    }
                                />
                            )}
                        </>
                    }
                />

                {classrooms.length === 0 ? (
                    <EmptyState
                        title={
                            isAdmin
                                ? 'No classes this year yet'
                                : 'You are not a class teacher yet'
                        }
                        description={
                            isAdmin
                                ? 'Set up the school year, its terms and classes first.'
                                : 'Class teachers see their class’s report cards here and write the class teacher’s remarks.'
                        }
                    />
                ) : learners.length === 0 ? (
                    <EmptyState
                        title="No learners in this class"
                        description="Place learners in the class from the Students page."
                    />
                ) : (
                    <>
                        {!hasScale && (
                            <p className="rounded-xl bg-sun-soft px-4 py-3 text-sm">
                                There’s no marking scale yet, so reports show
                                percentages without symbols.{' '}
                                {isAdmin && (
                                    <Link
                                        href={scalesIndex()}
                                        className="font-medium underline underline-offset-4"
                                    >
                                        Add marking scales
                                    </Link>
                                )}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
                            <div className="grid flex-1 grid-cols-3 gap-3 text-center sm:max-w-md">
                                <Stat
                                    value={`${withMarks}/${learners.length}`}
                                    label="have marks"
                                />
                                <Stat
                                    value={`${withRemarks}/${learners.length}`}
                                    label="have remarks"
                                />
                                <Stat
                                    value={`${counts.tests} + ${counts.exams}`}
                                    label="tests + exams"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {published && (
                                    <Badge className="bg-leaf text-white">
                                        Issued
                                    </Badge>
                                )}
                                <Button variant="outline" asChild>
                                    <a
                                        href={print.url({
                                            query: {
                                                term: selectedTermId,
                                                classroom: selectedClassroomId,
                                            },
                                        })}
                                    >
                                        <Printer /> Print class
                                    </a>
                                </Button>
                                {isAdmin &&
                                    selectedTermId &&
                                    selectedClassroomId && (
                                        <Button
                                            variant={
                                                published ? 'ghost' : 'default'
                                            }
                                            onClick={() => {
                                                if (
                                                    published ||
                                                    window.confirm(
                                                        'Issue these reports? Averages and positions are saved as they are now.',
                                                    )
                                                ) {
                                                    router.put(
                                                        publish.url([
                                                            selectedTermId,
                                                            selectedClassroomId,
                                                        ]),
                                                        {
                                                            published:
                                                                !published,
                                                        },
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    );
                                                }
                                            }}
                                        >
                                            {published ? (
                                                <>
                                                    <Undo2 /> Back to draft
                                                </>
                                            ) : (
                                                <>
                                                    <Send /> Issue reports
                                                </>
                                            )}
                                        </Button>
                                    )}
                            </div>
                        </div>

                        {withMarks === 0 && (
                            <p className="text-sm text-muted-foreground">
                                No marks for this class yet.{' '}
                                <Link
                                    href={marksIndex({
                                        query: { term: selectedTermId },
                                    })}
                                    className="font-medium text-foreground underline underline-offset-4"
                                >
                                    Enter marks
                                </Link>
                            </p>
                        )}

                        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                            <table className="w-full min-w-[720px] text-sm">
                                <thead className="border-b border-border bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <tr>
                                        {showsPosition && (
                                            <th className="w-12 px-3 py-3 text-center font-medium">
                                                Pos.
                                            </th>
                                        )}
                                        <th className="px-3 py-3 font-medium">
                                            Learner
                                        </th>
                                        {subjectNames.map((s) => (
                                            <th
                                                key={s.subject_id}
                                                className="px-2 py-3 text-center font-medium"
                                                title={s.name}
                                            >
                                                {s.code}
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 text-center font-medium">
                                            Average
                                        </th>
                                        <th className="px-3 py-3">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {learners.map((learner) => (
                                        <tr key={learner.student.id}>
                                            {showsPosition && (
                                                <td className="px-3 py-2.5 text-center font-semibold tabular-nums">
                                                    {learner.position ?? '–'}
                                                </td>
                                            )}
                                            <td className="px-3 py-2.5">
                                                <p className="font-medium">
                                                    {learner.student.full_name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {learner.class_teacher_remark
                                                        ? 'Remarks written'
                                                        : 'No remarks yet'}
                                                </p>
                                            </td>
                                            {learner.subjects.map((s) => (
                                                <td
                                                    key={s.subject_id}
                                                    className="px-2 py-2.5 text-center tabular-nums"
                                                >
                                                    {s.mark === null ? (
                                                        <span className="text-muted-foreground">
                                                            –
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className={cn(
                                                                'inline-flex flex-col leading-tight',
                                                                s.is_pass ===
                                                                    false &&
                                                                    'text-coral',
                                                            )}
                                                        >
                                                            <span className="font-semibold">
                                                                {s.symbol ??
                                                                    `${Math.round(s.mark)}`}
                                                            </span>
                                                            {s.symbol && (
                                                                <span className="text-[11px] text-muted-foreground">
                                                                    {Math.round(
                                                                        s.mark,
                                                                    )}
                                                                    %
                                                                </span>
                                                            )}
                                                        </span>
                                                    )}
                                                </td>
                                            ))}
                                            <td className="px-3 py-2.5 text-center tabular-nums">
                                                {learner.average === null ? (
                                                    '–'
                                                ) : (
                                                    <span className="font-semibold">
                                                        {learner.average}%
                                                        {learner.symbol &&
                                                            ` · ${learner.symbol}`}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex justify-end gap-1">
                                                    <RemarksDialog
                                                        learner={learner}
                                                        termId={selectedTermId!}
                                                        classroomId={
                                                            selectedClassroomId!
                                                        }
                                                        isAdmin={isAdmin}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        asChild
                                                    >
                                                        <a
                                                            href={print.url({
                                                                query: {
                                                                    term: selectedTermId,
                                                                    classroom:
                                                                        selectedClassroomId,
                                                                    student:
                                                                        learner
                                                                            .student
                                                                            .id,
                                                                },
                                                            })}
                                                            aria-label={`Report for ${learner.student.full_name}`}
                                                        >
                                                            <FileText />
                                                        </a>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {isAdmin && (
                            <label className="flex items-center gap-2 text-sm text-muted-foreground">
                                <input
                                    type="checkbox"
                                    checked={showsPosition}
                                    onChange={(e) =>
                                        router.put(
                                            settings.url(),
                                            {
                                                report_shows_position:
                                                    e.target.checked,
                                            },
                                            { preserveScroll: true },
                                        )
                                    }
                                    className="size-4 accent-[var(--primary)]"
                                />
                                Show each learner’s position in class (
                                {rankedCount} ranked)
                            </label>
                        )}
                        {isAdmin && (
                            <label className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                Tests count
                                <NativeSelect
                                    aria-label="Share of the term mark from tests"
                                    className="w-20"
                                    value={String(testWeight)}
                                    options={Array.from(
                                        { length: 11 },
                                        (_, i) => ({
                                            value: String(i * 10),
                                            label: `${i * 10}%`,
                                        }),
                                    )}
                                    onChange={(e) =>
                                        router.put(
                                            settings.url(),
                                            {
                                                test_weight: Number(
                                                    e.target.value,
                                                ),
                                            },
                                            { preserveScroll: true },
                                        )
                                    }
                                />
                                of the term mark, exams {100 - testWeight}%.
                                With only tests or only exams, those make up the
                                whole mark.
                            </label>
                        )}
                    </>
                )}
            </PageBody>
        </>
    );
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div>
            <p className="font-display text-xl font-semibold tabular-nums">
                {value}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function RemarksDialog({
    learner,
    termId,
    classroomId,
    isAdmin,
}: {
    learner: ReportLearner;
    termId: number;
    classroomId: number;
    isAdmin: boolean;
}) {
    return (
        <FormDialog
            trigger={
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Remarks for ${learner.student.full_name}`}
                >
                    <MessageSquareText />
                </Button>
            }
            title={learner.student.full_name}
            description={
                learner.average !== null
                    ? `Average ${learner.average}%${learner.symbol ? `, ${learner.symbol}` : ''} · passed ${learner.subjects_passed} of ${learner.subjects_marked} subjects`
                    : 'No marks yet this term.'
            }
            form={remarks.form([termId, learner.student.id])}
        >
            {(e) => (
                <>
                    <input
                        type="hidden"
                        name="classroom_id"
                        value={classroomId}
                    />
                    <Field
                        label="Class teacher’s remark"
                        htmlFor="class_teacher_remark"
                        error={e.class_teacher_remark}
                    >
                        <textarea
                            id="class_teacher_remark"
                            name="class_teacher_remark"
                            defaultValue={learner.class_teacher_remark ?? ''}
                            placeholder="A hard-working learner who…"
                            className={textareaClass}
                            maxLength={600}
                        />
                    </Field>
                    {isAdmin ? (
                        <Field
                            label="Principal’s remark"
                            htmlFor="head_teacher_remark"
                            error={e.head_teacher_remark}
                            optional
                        >
                            <textarea
                                id="head_teacher_remark"
                                name="head_teacher_remark"
                                defaultValue={learner.head_teacher_remark ?? ''}
                                className={textareaClass}
                                maxLength={600}
                            />
                        </Field>
                    ) : (
                        learner.head_teacher_remark && (
                            <p className="text-sm text-muted-foreground">
                                Principal: {learner.head_teacher_remark}
                            </p>
                        )
                    )}
                </>
            )}
        </FormDialog>
    );
}

Reports.layout = {
    breadcrumbs: [{ title: 'Report cards', href: index() }],
};
