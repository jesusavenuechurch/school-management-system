import { Head, Link, router } from '@inertiajs/react';
import {
    CheckCircle2,
    Copy,
    ExternalLink,
    MessageCircle,
    Phone,
    XCircle,
} from 'lucide-react';
import ClassPicker from '@/components/class-picker';
import type { PlacementGrade } from '@/components/class-picker';
import EmptyState from '@/components/empty-state';
import Field from '@/components/field';
import FormDialog from '@/components/form-dialog';
import PageHeader, { PageBody } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';
import { accept, decline, index, settings } from '@/routes/applications';
import { classes as setupClasses } from '@/routes/setup';
import type { Option } from '@/types';

type Application = {
    id: number;
    reference: string;
    full_name: string;
    date_of_birth: string | null;
    gender: string | null;
    grade: { id: number; name: string } | null;
    previous_school: string | null;
    guardian_name: string;
    guardian_phone: string;
    guardian_email: string | null;
    guardian_relationship: string | null;
    address: string | null;
    message: string | null;
    received_at: string;
    decided_at: string | null;
    decided_by: string | null;
    decline_reason: string | null;
    student_url: string | null;
    whatsapp_url: string | null;
};

type Props = {
    status: 'pending' | 'accepted' | 'declined';
    statuses: Option[];
    counts: Record<string, number>;
    applications: Application[];
    placements: PlacementGrade[];
    nextAdmissionNumber: string;
    acceptsApplications: boolean;
    isOpen: boolean;
    applyUrl: string;
};

const textareaClass =
    'min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });

function age(dateOfBirth: string | null): string | null {
    if (!dateOfBirth) {
        return null;
    }

    const born = new Date(`${dateOfBirth}T00:00:00`);
    const now = new Date();
    let years = now.getFullYear() - born.getFullYear();

    if (
        now.getMonth() < born.getMonth() ||
        (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
    ) {
        years--;
    }

    return `${years} years old`;
}

export default function Applications({
    status,
    statuses,
    counts,
    applications,
    placements,
    nextAdmissionNumber,
    acceptsApplications,
    isOpen,
    applyUrl,
}: Props) {
    const [copied, copy] = useClipboard();

    return (
        <>
            <Head title="Applications" />
            <PageBody>
                <PageHeader
                    title="Applications"
                    description="Parents apply from your school page. Accept a child into a class to admit them and create the parent’s account, or decline with a short reason."
                />

                <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-5 py-4 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 text-sm">
                        <p className="font-medium">
                            {isOpen
                                ? 'Parents can apply online'
                                : acceptsApplications
                                  ? 'Applications open once your school page is public'
                                  : 'Online applications are switched off'}
                        </p>
                        <p className="truncate font-mono text-[13px] text-muted-foreground">
                            {applyUrl.replace(/^https?:\/\//, '')}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {isOpen && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void copy(applyUrl)}
                            >
                                <Copy />
                                {copied ? 'Copied' : 'Copy link'}
                            </Button>
                        )}
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={acceptsApplications}
                                onChange={(e) =>
                                    router.put(
                                        settings.url(),
                                        {
                                            accepts_applications:
                                                e.target.checked,
                                        },
                                        { preserveScroll: true },
                                    )
                                }
                                className="size-4 accent-[var(--primary)]"
                            />
                            Take applications
                        </label>
                    </div>
                </section>

                <div
                    role="tablist"
                    aria-label="Status"
                    className="flex gap-2 overflow-x-auto"
                >
                    {statuses.map((s) => (
                        <Link
                            key={s.value}
                            role="tab"
                            aria-selected={status === s.value}
                            href={index({ query: { status: s.value } })}
                            preserveScroll
                            className={cn(
                                'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
                                status === s.value
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-card hover:bg-muted',
                            )}
                        >
                            {s.label}
                            <span className="ml-1.5 tabular-nums opacity-70">
                                {counts[s.value] ?? 0}
                            </span>
                        </Link>
                    ))}
                </div>

                {applications.length === 0 ? (
                    <EmptyState
                        title={
                            status === 'pending'
                                ? 'No applications waiting'
                                : status === 'accepted'
                                  ? 'None accepted yet'
                                  : 'None declined'
                        }
                        description={
                            status === 'pending'
                                ? 'When a parent applies from your school page, it appears here.'
                                : undefined
                        }
                    />
                ) : (
                    <div className="grid gap-4">
                        {applications.map((application) => (
                            <ApplicationCard
                                key={application.id}
                                application={application}
                                placements={placements}
                                nextAdmissionNumber={nextAdmissionNumber}
                            />
                        ))}
                    </div>
                )}
            </PageBody>
        </>
    );
}

function ApplicationCard({
    application: a,
    placements,
    nextAdmissionNumber,
}: {
    application: Application;
    placements: PlacementGrade[];
    nextAdmissionNumber: string;
}) {
    const childFacts = [
        a.grade ? `For ${a.grade.name}` : null,
        age(a.date_of_birth),
        a.gender,
        a.previous_school ? `from ${a.previous_school}` : null,
    ].filter(Boolean);

    return (
        <article className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid gap-4 px-5 py-4 md:grid-cols-[1fr_1fr]">
                <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                        {a.reference} · received {formatDate(a.received_at)}
                    </p>
                    <h2 className="mt-1 font-display text-xl font-semibold">
                        {a.full_name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {childFacts.join(' · ')}
                    </p>
                    {a.message && (
                        <p className="mt-3 rounded-xl bg-muted/60 px-3 py-2 text-sm whitespace-pre-line">
                            {a.message}
                        </p>
                    )}
                </div>
                <div className="min-w-0 text-sm">
                    <p className="font-medium">
                        {a.guardian_name}
                        {a.guardian_relationship && (
                            <span className="font-normal text-muted-foreground">
                                {' '}
                                · {a.guardian_relationship}
                            </span>
                        )}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <a
                            href={`tel:${a.guardian_phone}`}
                            className="inline-flex items-center gap-1 hover:underline"
                        >
                            <Phone className="size-3.5 text-muted-foreground" />
                            {a.guardian_phone}
                        </a>
                        {a.guardian_email && (
                            <a
                                href={`mailto:${a.guardian_email}`}
                                className="hover:underline"
                            >
                                {a.guardian_email}
                            </a>
                        )}
                    </p>
                    {a.address && (
                        <p className="mt-1 text-muted-foreground">
                            {a.address}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-border bg-muted/30 px-5 py-3">
                {a.decided_at === null ? (
                    <>
                        <AcceptDialog
                            application={a}
                            placements={placements}
                            nextAdmissionNumber={nextAdmissionNumber}
                        />
                        <DeclineDialog application={a} />
                    </>
                ) : (
                    <>
                        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground">
                            {a.student_url ? (
                                <CheckCircle2 className="size-4 text-leaf" />
                            ) : (
                                <XCircle className="size-4" />
                            )}
                            {a.student_url ? 'Admitted' : 'Declined'}
                            {a.decided_by && ` by ${a.decided_by}`} on{' '}
                            {formatDate(a.decided_at)}
                            {a.decline_reason && `: ${a.decline_reason}`}
                        </p>
                        {a.student_url && (
                            <Button variant="ghost" size="sm" asChild>
                                <Link href={a.student_url}>
                                    Open learner <ExternalLink />
                                </Link>
                            </Button>
                        )}
                        {a.whatsapp_url && (
                            <Button variant="outline" size="sm" asChild>
                                <a
                                    href={a.whatsapp_url}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <MessageCircle /> Tell the parent
                                </a>
                            </Button>
                        )}
                    </>
                )}
            </div>
        </article>
    );
}

function AcceptDialog({
    application,
    placements,
    nextAdmissionNumber,
}: {
    application: Application;
    placements: PlacementGrade[];
    nextAdmissionNumber: string;
}) {
    return (
        <FormDialog
            trigger={
                <Button size="sm">
                    <CheckCircle2 /> Accept
                </Button>
            }
            title={`Admit ${application.full_name}`}
            description={`Choose the grade and class they join. This creates ${application.guardian_name}’s account on their WhatsApp number; then send them the good news.`}
            form={accept.form(application.id)}
            submitLabel="Admit"
            wide
        >
            {(e) =>
                placements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        There are no classes for this year yet.{' '}
                        <Link
                            href={setupClasses()}
                            className="text-primary underline-offset-4 hover:underline"
                        >
                            Add classes first
                        </Link>
                        .
                    </p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {application.grade && (
                            <p className="rounded-xl bg-sky-soft px-3 py-2 text-sm sm:col-span-2">
                                Applied for{' '}
                                <span className="font-medium">
                                    {application.grade.name}
                                </span>
                                .
                            </p>
                        )}
                        <ClassPicker
                            grades={placements}
                            idPrefix={`accept-${application.id}`}
                            defaultGradeId={application.grade?.id}
                            error={e.classroom_id}
                            required
                        />
                        <Field
                            label="Admission number"
                            htmlFor={`admission_number-${application.id}`}
                            error={e.admission_number}
                            hint="Suggested from your last learner. Change it if you number differently."
                            className="sm:col-span-2"
                        >
                            <Input
                                id={`admission_number-${application.id}`}
                                name="admission_number"
                                required
                                defaultValue={nextAdmissionNumber}
                                className="sm:max-w-56"
                            />
                        </Field>
                    </div>
                )
            }
        </FormDialog>
    );
}

function DeclineDialog({ application }: { application: Application }) {
    return (
        <FormDialog
            trigger={
                <Button variant="ghost" size="sm">
                    Decline
                </Button>
            }
            title={`Decline ${application.full_name}?`}
            description="You can send the parent a WhatsApp message afterwards from the Declined list."
            form={decline.form(application.id)}
            submitLabel="Decline"
        >
            {(e) => (
                <Field
                    label="Reason"
                    htmlFor={`decline_reason-${application.id}`}
                    error={e.decline_reason}
                    optional
                    hint="Included in the WhatsApp message, e.g. “Grade 4 is full this year.”"
                >
                    <textarea
                        id={`decline_reason-${application.id}`}
                        name="decline_reason"
                        maxLength={500}
                        className={textareaClass}
                    />
                </Field>
            )}
        </FormDialog>
    );
}

Applications.layout = {
    breadcrumbs: [{ title: 'Applications', href: index() }],
};
