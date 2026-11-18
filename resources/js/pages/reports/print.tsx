import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ReportCounts, ReportLearner } from '@/pages/reports/index';

type Props = {
    school: {
        name: string;
        logo_url: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        shows_position: boolean;
    };
    term: { name: string; year: string | null };
    classroom: { name: string; class_teacher: string | null };
    testWeight: number;
    counts: ReportCounts;
    learners: ReportLearner[];
    rankedCount: number;
    scaleKey: {
        label: string;
        min_percentage: number;
        remark: string | null;
        is_pass: boolean;
    }[];
    backUrl: string;
};

const pct = (value: number | null | undefined) =>
    value === null || value === undefined ? '–' : `${Math.round(value)}`;

function initials(name: string): string {
    return name
        .split(' ')
        .filter((w) => /^[A-Za-z]/.test(w))
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function PrintReports({
    school,
    term,
    classroom,
    testWeight,
    counts,
    learners,
    rankedCount,
    scaleKey,
    backUrl,
}: Props) {
    const single = learners.length === 1;
    const columns = [
        ...(counts.tests > 0
            ? [
                  {
                      key: 'tests' as const,
                      label: counts.tests === 1 ? 'Test' : 'Tests',
                  },
              ]
            : []),
        ...(counts.exams > 0
            ? [
                  {
                      key: 'exam' as const,
                      label: counts.exams === 1 ? 'Exam' : 'Exams',
                  },
              ]
            : []),
    ];
    const title = single
        ? `Report: ${learners[0].student.full_name}`
        : `Reports: ${classroom.name}`;

    return (
        <>
            <Head title={title} />
            <div className="min-h-screen bg-muted/50 print:bg-white">
                <header className="no-print sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
                    <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3 px-4 py-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={backUrl}>
                                <ArrowLeft /> Back
                            </Link>
                        </Button>
                        <h1 className="flex items-center gap-2 font-display text-lg font-semibold">
                            <FileText className="size-5 text-sky" /> {title}
                        </h1>
                        <Button
                            className="ml-auto"
                            onClick={() => window.print()}
                        >
                            <Printer /> Print
                            {single ? '' : ` ${learners.length} reports`}
                        </Button>
                    </div>
                    <p className="mx-auto max-w-4xl px-4 pb-3 text-xs text-muted-foreground">
                        One report per A4 page. In the print window, choose
                        “Save as PDF” to send them on WhatsApp instead.
                    </p>
                </header>

                <main className="mx-auto grid max-w-4xl gap-6 p-4 print:block print:max-w-none print:p-0">
                    {learners.map((learner) => (
                        <article
                            key={learner.student.id}
                            className="paper-doc print-sheet mx-auto flex w-full max-w-[210mm] flex-col bg-[var(--idc-paper)] p-[10mm] shadow-sm ring-1 ring-black/5 print:min-h-[279mm] print:max-w-none print:shadow-none print:ring-0"
                        >
                            {/* Letterhead */}
                            <div className="flex items-start gap-4">
                                {school.logo_url ? (
                                    <img
                                        src={school.logo_url}
                                        alt=""
                                        className="size-16 object-contain"
                                    />
                                ) : (
                                    <span className="flex size-16 items-center justify-center rounded-full border-2 border-[var(--idc-ink)] font-display text-xl font-semibold">
                                        {initials(school.name)}
                                    </span>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="font-display text-2xl leading-tight font-semibold">
                                        {school.name}
                                    </p>
                                    <p className="text-xs text-[var(--idc-muted)]">
                                        {[
                                            school.address,
                                            school.phone,
                                            school.email,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-semibold tracking-[0.2em] text-[var(--idc-muted)] uppercase">
                                        Progress report
                                    </p>
                                    <p className="font-display text-lg font-semibold">
                                        {term.name}
                                    </p>
                                    <p className="text-sm">{term.year}</p>
                                </div>
                            </div>

                            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full">
                                <span className="flex-1 bg-[var(--idc-sun)]" />
                                <span className="flex-1 bg-[var(--idc-coral)]" />
                                <span className="flex-1 bg-[var(--idc-leaf)]" />
                                <span className="flex-1 bg-[var(--idc-sky)]" />
                            </div>

                            {/* Learner */}
                            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4 print:grid-cols-4">
                                <Info
                                    label="Learner"
                                    value={learner.student.full_name}
                                    wide
                                />
                                <Info label="Class" value={classroom.name} />
                                <Info
                                    label="Admission no."
                                    value={learner.student.admission_number}
                                />
                                <Info
                                    label="Class teacher"
                                    value={classroom.class_teacher}
                                    wide
                                />
                                {school.shows_position && (
                                    <Info
                                        label="Position"
                                        value={
                                            learner.position
                                                ? `${learner.position} of ${rankedCount}`
                                                : null
                                        }
                                    />
                                )}
                                <Info
                                    label="Attendance"
                                    value={
                                        learner.days_present === null
                                            ? null
                                            : `${learner.days_present} present, ${learner.days_absent ?? 0} absent`
                                    }
                                />
                            </dl>

                            {/* Marks */}
                            <table className="mt-5 w-full border-collapse text-sm">
                                <thead>
                                    <tr className="border-y-2 border-[var(--idc-ink)] text-left text-[10px] tracking-wider uppercase">
                                        <th className="py-1.5 pr-2 font-semibold">
                                            Subject
                                        </th>
                                        {columns.map((column) => (
                                            <th
                                                key={column.key}
                                                className="px-1.5 py-1.5 text-center font-semibold"
                                            >
                                                {column.label}
                                                <span className="block font-normal normal-case">
                                                    %
                                                </span>
                                            </th>
                                        ))}
                                        <th className="px-1.5 py-1.5 text-center font-semibold">
                                            Term
                                            <span className="block font-normal normal-case">
                                                %
                                            </span>
                                        </th>
                                        <th className="px-1.5 py-1.5 text-center font-semibold">
                                            Symbol
                                        </th>
                                        <th className="py-1.5 pl-2 font-semibold">
                                            Comment
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {learner.subjects.map((s) => (
                                        <tr
                                            key={s.subject_id}
                                            className="border-b border-[var(--idc-line)]"
                                        >
                                            <td className="py-1.5 pr-2">
                                                <span className="font-medium">
                                                    {s.name}
                                                </span>
                                                {s.teacher && (
                                                    <span className="block text-[10px] text-[var(--idc-muted)]">
                                                        {s.teacher}
                                                    </span>
                                                )}
                                            </td>
                                            {columns.map((column) => (
                                                <td
                                                    key={column.key}
                                                    className="px-1.5 py-1.5 text-center tabular-nums"
                                                >
                                                    {pct(s[column.key])}
                                                </td>
                                            ))}
                                            <td className="px-1.5 py-1.5 text-center font-semibold tabular-nums">
                                                {pct(s.mark)}
                                            </td>
                                            <td className="px-1.5 py-1.5 text-center font-display text-base font-semibold">
                                                {s.symbol ?? '–'}
                                            </td>
                                            <td className="py-1.5 pl-2 text-xs">
                                                {s.remark}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-b-2 border-[var(--idc-ink)]">
                                        <td
                                            className="py-2 pr-2 font-semibold"
                                            colSpan={columns.length + 1}
                                        >
                                            Average
                                            <span className="ml-2 text-xs font-normal text-[var(--idc-muted)]">
                                                Passed {
                                                    learner.subjects_passed
                                                }{' '}
                                                of {learner.subjects_marked}{' '}
                                                subjects
                                            </span>
                                        </td>
                                        <td className="px-1.5 py-2 text-center font-semibold tabular-nums">
                                            {learner.average === null
                                                ? '–'
                                                : learner.average}
                                        </td>
                                        <td className="px-1.5 py-2 text-center font-display text-lg font-semibold">
                                            {learner.symbol ?? '–'}
                                        </td>
                                        <td className="py-2 pl-2 text-xs">
                                            {learner.symbol_remark}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Remarks */}
                            <div className="mt-5 grid gap-4 text-sm">
                                <Remark
                                    title="Class teacher’s remark"
                                    text={learner.class_teacher_remark}
                                    signer={classroom.class_teacher}
                                />
                                <Remark
                                    title="Principal’s remark"
                                    text={learner.head_teacher_remark}
                                />
                            </div>

                            {/* Key */}
                            <div className="mt-auto pt-5">
                                {scaleKey.length > 0 && (
                                    <p className="text-[10px] leading-relaxed text-[var(--idc-muted)]">
                                        <span className="font-semibold text-[var(--idc-ink)]">
                                            Symbols:{' '}
                                        </span>
                                        {scaleKey
                                            .map(
                                                (b) =>
                                                    `${b.label} ${b.min_percentage}%+${b.remark ? ` ${b.remark}` : ''}`,
                                            )
                                            .join(' · ')}
                                        {columns.length > 1 &&
                                            ` — Term mark: tests ${testWeight}%, exams ${100 - testWeight}%.`}
                                    </p>
                                )}
                                <p className="mt-2 flex justify-between text-[10px] text-[var(--idc-muted)]">
                                    <span>
                                        {learner.published_at
                                            ? `Issued ${new Date(learner.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
                                            : 'Draft: not yet issued'}
                                    </span>
                                    <span>School stamp</span>
                                </p>
                            </div>
                        </article>
                    ))}
                </main>
            </div>
        </>
    );
}

function Info({
    label,
    value,
    wide = false,
}: {
    label: string;
    value: string | null | undefined;
    wide?: boolean;
}) {
    return (
        <div className={wide ? 'col-span-2' : undefined}>
            <dt className="text-[10px] tracking-wider text-[var(--idc-muted)] uppercase">
                {label}
            </dt>
            <dd className="font-medium">{value || '–'}</dd>
        </div>
    );
}

function Remark({
    title,
    text,
    signer,
}: {
    title: string;
    text: string | null;
    signer?: string | null;
}) {
    return (
        <div className="rounded-lg border border-[var(--idc-line)] p-3">
            <p className="text-[10px] font-semibold tracking-wider text-[var(--idc-muted)] uppercase">
                {title}
            </p>
            <p className="mt-1 min-h-10 leading-relaxed">{text}</p>
            <p className="mt-3 flex justify-between gap-6 text-[10px] text-[var(--idc-muted)]">
                <span className="flex-1 border-t border-dotted border-[var(--idc-muted)] pt-1">
                    Signed{signer ? `: ${signer}` : ''}
                </span>
                <span className="w-32 border-t border-dotted border-[var(--idc-muted)] pt-1">
                    Date
                </span>
            </p>
        </div>
    );
}
