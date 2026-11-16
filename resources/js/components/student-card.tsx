import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';

export type CardSchool = {
    name: string;
    logo_url: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
};

export type CardStudent = {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    photo_url: string | null;
    admission_number: string;
    date_of_birth: string | null;
    classroom: string | null;
    grade_description: string | null;
    year: string | null;
    qr_svg: string;
};

const CARD = 'relative h-[54mm] w-[85.6mm] shrink-0 overflow-hidden';

/** Four crayon colours, the platform's little signature. */
function CrayonStripe({ className }: { className?: string }) {
    return (
        <div className={cn('flex h-[1.2mm]', className)} aria-hidden>
            <span className="flex-1 bg-[var(--idc-sun)]" />
            <span className="flex-1 bg-[var(--idc-coral)]" />
            <span className="flex-1 bg-[var(--idc-leaf)]" />
            <span className="flex-1 bg-[var(--idc-sky)]" />
        </div>
    );
}

function SchoolMark({ school }: { school: CardSchool }) {
    const getInitials = useInitials();

    return school.logo_url ? (
        <img
            src={school.logo_url}
            alt=""
            className="size-[8.5mm] shrink-0 rounded-full bg-white object-contain p-[0.6mm]"
        />
    ) : (
        <span className="flex size-[8.5mm] shrink-0 items-center justify-center rounded-full bg-[var(--idc-sun)] font-display text-[9pt] font-bold text-[var(--idc-ink)]">
            {getInitials(school.name)}
        </span>
    );
}

export function CardFront({
    student,
    school,
}: {
    student: CardStudent;
    school: CardSchool;
}) {
    const getInitials = useInitials();

    const rows: [string, string | null][] = [
        ['Class', student.classroom],
        ['Adm. no.', student.admission_number],
        ['Born', student.date_of_birth],
    ];

    return (
        <div
            className={cn(
                CARD,
                'flex flex-col rounded-[3mm] bg-[var(--idc-paper)]',
            )}
        >
            <div className="bg-[var(--idc-ink)] text-white">
                <div className="flex h-[12mm] items-center gap-[2mm] px-[3mm]">
                    <SchoolMark school={school} />
                    <p className="line-clamp-2 flex-1 font-display text-[8.5pt] leading-[1.15] font-semibold">
                        {school.name}
                    </p>
                    <p className="text-right text-[5pt] leading-tight font-bold tracking-[0.18em] text-[var(--idc-chalk-yellow)] uppercase">
                        Student
                        <br />
                        ID card
                    </p>
                </div>
                <CrayonStripe />
            </div>

            <div
                className="flex flex-1 gap-[3mm] px-[3mm] pt-[2.5mm]"
                style={{
                    backgroundImage:
                        'linear-gradient(to bottom, var(--idc-rule) 0.25mm, transparent 0.25mm)',
                    backgroundSize: '100% 4mm',
                }}
            >
                <div className="h-[28mm] w-[22mm] shrink-0 -rotate-2 rounded-[1.5mm] border-[0.7mm] border-white bg-white shadow-[0_0.4mm_1.2mm_rgb(0_0_0/0.25)]">
                    {student.photo_url ? (
                        <img
                            src={student.photo_url}
                            alt=""
                            className="size-full rounded-[1mm] object-cover"
                        />
                    ) : (
                        <span className="flex size-full items-center justify-center rounded-[1mm] bg-[var(--idc-sky)]/25 font-display text-[16pt] font-semibold text-[var(--idc-ink)]">
                            {getInitials(student.full_name)}
                        </span>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[13pt] leading-tight font-bold">
                        {student.first_name}
                    </p>
                    <p className="truncate font-display text-[9.5pt] leading-tight">
                        {student.last_name}
                    </p>
                    <dl className="mt-[1.8mm] grid grid-cols-[auto_1fr] gap-x-[2mm] gap-y-[0.6mm] text-[6.5pt] leading-tight">
                        {rows
                            .filter(([, value]) => value)
                            .map(([label, value]) => (
                                <div key={label} className="contents">
                                    <dt className="text-[var(--idc-muted)]">
                                        {label}
                                    </dt>
                                    <dd className="truncate font-semibold">
                                        {value}
                                    </dd>
                                </div>
                            ))}
                    </dl>
                </div>
            </div>

            <div className="flex items-center justify-between px-[3mm] pb-[2mm] text-[5.5pt] text-[var(--idc-muted)]">
                <span>{student.year ? `Valid for ${student.year}` : ' '}</span>
                <svg
                    viewBox="0 0 20 20"
                    className="size-[3.5mm] fill-[var(--idc-sun)]"
                    aria-hidden
                >
                    <path d="M10 0c.9 5.4 4.6 9.1 10 10-5.4.9-9.1 4.6-10 10-.9-5.4-4.6-9.1-10-10C5.4 9.1 9.1 5.4 10 0Z" />
                </svg>
            </div>
        </div>
    );
}

export function CardBack({
    student,
    school,
}: {
    student: CardStudent;
    school: CardSchool;
}) {
    return (
        <div
            className={cn(
                CARD,
                'flex flex-col rounded-[3mm] border-[0.3mm] border-[var(--idc-line)] bg-[var(--idc-paper)]',
            )}
        >
            <div className="flex flex-1 gap-[3mm] p-[3.5mm]">
                <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[5.5pt] font-semibold tracking-[0.14em] text-[var(--idc-muted)] uppercase">
                        If found, please return to
                    </p>
                    <p className="mt-[1mm] line-clamp-2 font-display text-[9pt] leading-tight font-semibold">
                        {school.name}
                    </p>
                    <div className="mt-[1mm] space-y-[0.4mm] text-[6pt] leading-snug text-[var(--idc-muted)]">
                        {school.address && (
                            <p className="line-clamp-2">{school.address}</p>
                        )}
                        {school.phone && <p>Tel. {school.phone}</p>}
                        {school.email && (
                            <p className="truncate">{school.email}</p>
                        )}
                    </div>
                    <div className="mt-auto border-t-[0.25mm] border-[var(--idc-line)] pt-[1mm]">
                        <p className="text-[5pt] text-[var(--idc-muted)]">
                            Card holder
                        </p>
                        <p className="truncate text-[7pt] font-semibold">
                            {student.full_name}
                        </p>
                    </div>
                </div>

                <div className="flex w-[22mm] shrink-0 flex-col items-center">
                    <div
                        className="size-[22mm] rounded-[1.2mm] border-[0.25mm] border-[var(--idc-line)] bg-white p-[1mm] [&_svg]:size-full"
                        dangerouslySetInnerHTML={{ __html: student.qr_svg }}
                    />
                    <p className="mt-[1mm] text-center text-[5pt] leading-tight text-[var(--idc-muted)]">
                        Staff: scan to see who may collect this learner
                    </p>
                </div>
            </div>
        </div>
    );
}

/**
 * Front and back side by side, ready to cut out along the dashed line and
 * fold down the middle.
 */
export function CardPair({
    student,
    school,
}: {
    student: CardStudent;
    school: CardSchool;
}) {
    return (
        <div className="id-card relative flex w-fit break-inside-avoid outline-[0.3mm] outline-offset-[1mm] outline-slate-300 outline-dashed">
            <CardFront student={student} school={school} />
            <div
                className="w-0 border-l-[0.3mm] border-dotted border-slate-300"
                aria-hidden
            />
            <CardBack student={student} school={school} />
        </div>
    );
}
