import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    HeartHandshake,
    School,
    ShieldEllipsis,
    UserRoundCog,
    UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Chalkboard from '@/components/chalkboard';
import type { ChalkItem } from '@/components/chalkboard';
import {
    LittleLearnersArt,
    SeniorStudentsArt,
} from '@/components/illustrations';
import { PageBody } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import { journey } from '@/routes/setup';
import { show as showStudent } from '@/routes/students';

type Props = {
    currentYear: string | null;
    currentTerm: string | null;
    isAdmin: boolean;
    stats?: {
        students: number;
        staff: number;
        classes: number;
        guardians: number;
    };
    setup?: { complete: boolean; steps: ChalkItem[] };
    verified?: boolean;
    myClasses?: {
        id: number;
        name: string;
        students_count: number;
        is_class_teacher: boolean;
    }[];
    myChildren?: { id: number; full_name: string; classroom: string | null }[];
};

function greeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
        return 'Good morning';
    }

    return hour < 17 ? 'Good afternoon' : 'Good evening';
}

function StatCard({
    icon: Icon,
    label,
    value,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    tone: string;
}) {
    return (
        <div className="rounded-2xl border border-border bg-card p-5">
            <span
                className={`inline-flex size-9 items-center justify-center rounded-xl ${tone}`}
            >
                <Icon className="size-5" />
            </span>
            <p className="mt-4 font-display text-3xl font-semibold tabular-nums">
                {value}
            </p>
            <p className="text-sm text-muted-foreground">{label}</p>
        </div>
    );
}

export default function Dashboard({
    currentYear,
    currentTerm,
    isAdmin,
    stats,
    setup,
    verified,
    myClasses,
    myChildren,
}: Props) {
    const { auth, school } = usePage().props;

    return (
        <>
            <Head title="Dashboard" />
            <PageBody>
                {/* Welcome */}
                <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
                    <div className="pointer-events-none absolute inset-0 bg-ruled opacity-50" />
                    <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">
                                {school?.name}
                            </p>
                            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                                {greeting()}, {auth.user.name.split(' ')[0]}
                            </h1>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {currentYear
                                    ? `School year ${currentYear}${currentTerm ? ` · ${currentTerm}` : ''}`
                                    : 'No current school year set yet.'}
                            </p>
                        </div>
                        <div className="hidden gap-1 md:flex">
                            <LittleLearnersArt className="h-24 w-auto" />
                            <SeniorStudentsArt className="h-24 w-auto" />
                        </div>
                    </div>
                </section>

                {/* Admin: waiting for verification */}
                {isAdmin && verified === false && (
                    <section className="flex flex-col gap-3 rounded-2xl border border-sun/60 bg-sun-soft/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3">
                            <ShieldEllipsis className="mt-0.5 size-5 shrink-0 text-[color-mix(in_oklch,var(--sun)_60%,var(--ink))]" />
                            <div className="text-sm">
                                <p className="font-semibold">
                                    Your school is waiting for verification
                                </p>
                                <p className="text-muted-foreground">
                                    Set everything up in the meantime. Once our
                                    team has verified the school, you can
                                    message parents, publish your school page
                                    and accept payments.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Admin: the setup chalkboard until setup is finished */}
                {isAdmin && setup && !setup.complete && (
                    <section className="grid items-center gap-6 rounded-3xl border border-border bg-card p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
                        <div>
                            <h2 className="font-display text-2xl font-semibold">
                                Getting your school ready
                            </h2>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {setup.steps.filter((s) => s.done).length} of{' '}
                                {setup.steps.length} done. Pick up where you
                                left off; it only takes a few minutes per step.
                            </p>
                            <Button className="mt-5" asChild>
                                <Link href={journey()}>
                                    Continue setting up <ArrowRight />
                                </Link>
                            </Button>
                        </div>
                        <Chalkboard
                            title="Before the first bell"
                            items={setup.steps}
                        />
                    </section>
                )}

                {/* Admin: numbers */}
                {isAdmin && stats && (
                    <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard
                            icon={UsersRound}
                            label="Active students"
                            value={stats.students}
                            tone="bg-sky-soft text-sky"
                        />
                        <StatCard
                            icon={UserRoundCog}
                            label="Staff"
                            value={stats.staff}
                            tone="bg-leaf-soft text-leaf"
                        />
                        <StatCard
                            icon={School}
                            label="Classes this year"
                            value={stats.classes}
                            tone="bg-sun-soft text-[color-mix(in_oklch,var(--sun)_70%,var(--ink))]"
                        />
                        <StatCard
                            icon={HeartHandshake}
                            label="Guardians"
                            value={stats.guardians}
                            tone="bg-coral-soft text-coral"
                        />
                    </section>
                )}

                {/* Teachers: their classes */}
                {myClasses && myClasses.length > 0 && (
                    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
                        <h2 className="font-display text-2xl font-semibold">
                            Your classes
                        </h2>
                        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {myClasses.map((c) => (
                                <li
                                    key={c.id}
                                    className="rounded-2xl border border-border bg-background p-4"
                                >
                                    <p className="font-semibold">{c.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {c.students_count} students
                                        {c.is_class_teacher
                                            ? ' · Class teacher'
                                            : ''}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Parents: their children */}
                {myChildren && myChildren.length > 0 && (
                    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
                        <h2 className="font-display text-2xl font-semibold">
                            Your children
                        </h2>
                        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {myChildren.map((child) => (
                                <li
                                    key={child.id}
                                    className="rounded-2xl border border-border bg-sun-soft/40 p-4"
                                >
                                    {isAdmin ? (
                                        <Link
                                            href={showStudent(child.id)}
                                            className="font-semibold hover:underline"
                                        >
                                            {child.full_name}
                                        </Link>
                                    ) : (
                                        <p className="font-semibold">
                                            {child.full_name}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        {child.classroom ??
                                            'Not in a class yet'}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {!isAdmin && !myClasses?.length && !myChildren?.length && (
                    <section className="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
                        Nothing here yet. Your school will add you to classes or
                        link you to your children soon.
                    </section>
                )}
            </PageBody>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
