import { Head, Link, router } from '@inertiajs/react';
import { ArrowLeft, IdCard, Printer, Scissors } from 'lucide-react';
import NativeSelect from '@/components/native-select';
import { CardPair } from '@/components/student-card';
import type { CardSchool, CardStudent } from '@/components/student-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { cards } from '@/routes/students';
import type { Option } from '@/types';

type Props = {
    school: CardSchool;
    cards: CardStudent[];
    classrooms: Option[];
    filters: { student: number | null; classroom: number | null };
    backUrl: string;
};

/** Five cards (front and back side by side) fit on one A4 page. */
const PER_PAGE = 5;

export default function PrintCards({
    school,
    cards: students,
    classrooms,
    filters,
    backUrl,
}: Props) {
    const single = filters.student !== null;
    const sheets: CardStudent[][] = [];

    for (let i = 0; i < students.length; i += PER_PAGE) {
        sheets.push(students.slice(i, i + PER_PAGE));
    }

    const title = single
        ? `ID card: ${students[0]?.full_name ?? ''}`
        : 'Student ID cards';

    return (
        <>
            <Head title={title} />
            <div className="min-h-screen bg-muted/50 print:bg-white">
                <header className="no-print sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
                    <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={backUrl}>
                                <ArrowLeft /> Back
                            </Link>
                        </Button>
                        <h1 className="flex items-center gap-2 font-display text-lg font-semibold">
                            <IdCard className="size-5 text-coral" /> {title}
                        </h1>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            {!single && classrooms.length > 0 && (
                                <NativeSelect
                                    aria-label="Class"
                                    className="w-44"
                                    options={classrooms}
                                    value={String(filters.classroom ?? '')}
                                    onChange={(event) =>
                                        router.get(
                                            cards.url({
                                                query: {
                                                    classroom:
                                                        event.target.value,
                                                },
                                            }),
                                            {},
                                            { preserveScroll: false },
                                        )
                                    }
                                />
                            )}
                            <Button
                                onClick={() => window.print()}
                                disabled={students.length === 0}
                            >
                                <Printer />
                                {single
                                    ? 'Print card'
                                    : `Print ${students.length} ${students.length === 1 ? 'card' : 'cards'}`}
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto max-w-5xl px-4 py-6 print:p-0">
                    {students.length > 0 && (
                        <p className="no-print mb-6 flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
                            <Scissors className="mt-0.5 size-4 shrink-0" />
                            <span>
                                Print on A4 at 100% (not "fit to page"). Cut
                                along the dashed line, fold down the middle,
                                then laminate.
                                {students.some((s) => !s.photo_url) && (
                                    <>
                                        {' '}
                                        <strong className="text-foreground">
                                            {
                                                students.filter(
                                                    (s) => !s.photo_url,
                                                ).length
                                            }{' '}
                                            without a photo
                                        </strong>{' '}
                                        show their initials instead.
                                    </>
                                )}
                            </span>
                        </p>
                    )}

                    {students.length === 0 ? (
                        <div className="no-print rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
                            <IdCard className="mx-auto size-10 text-muted-foreground" />
                            <p className="mt-3 font-display text-lg font-semibold">
                                No students in this class yet
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Pick another class, or place students in this
                                one first.
                            </p>
                        </div>
                    ) : (
                        <div
                            className={cn(
                                'grid gap-8 print:gap-0',
                                single && 'justify-center',
                            )}
                        >
                            {sheets.map((sheet, i) => (
                                <section
                                    key={i}
                                    className={cn(
                                        'print-sheet grid justify-center gap-[4mm] print:gap-[2mm]',
                                        single
                                            ? 'id-card-zoom'
                                            : 'rounded-lg bg-white p-[8mm] shadow-sm print:rounded-none print:p-0 print:shadow-none',
                                    )}
                                >
                                    {sheet.map((student) => (
                                        <CardPair
                                            key={student.id}
                                            student={student}
                                            school={school}
                                        />
                                    ))}
                                </section>
                            ))}
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
