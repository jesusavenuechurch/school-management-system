import { Head, Link, usePage } from '@inertiajs/react';
import {
    BellRing,
    BookOpenCheck,
    CalendarCheck2,
    GraduationCap,
    HeartHandshake,
    ShieldCheck,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import {
    HeroIllustration,
    LittleLearnersArt,
    SeniorStudentsArt,
} from '@/components/illustrations';
import { Button } from '@/components/ui/button';
import { dashboard, login, register } from '@/routes';

const features: {
    icon: LucideIcon;
    title: string;
    body: string;
    tone: string;
}[] = [
    {
        icon: CalendarCheck2,
        title: 'Attendance in minutes',
        body: 'Take the morning register or mark each lesson. Parents can be told the same day when a child is absent.',
        tone: 'bg-leaf-soft text-leaf',
    },
    {
        icon: GraduationCap,
        title: 'Results your way',
        body: 'A to F, Distinction to Fail, or your own bands. Each school sets its own grading scales and report cards.',
        tone: 'bg-sky-soft text-sky',
    },
    {
        icon: Wallet,
        title: 'Fees and mobile money',
        body: 'Invoices per term, payments by cash, bank or mobile money, and balances that are always up to date.',
        tone: 'bg-sun-soft text-[color-mix(in_oklch,var(--sun)_70%,var(--ink))]',
    },
    {
        icon: BellRing,
        title: 'Parents on WhatsApp',
        body: 'Fee reminders, results and notices go straight to the phone parents already use every day.',
        tone: 'bg-coral-soft text-coral',
    },
    {
        icon: HeartHandshake,
        title: 'Every guardian counts',
        body: 'Several guardians per child, each with their own account. Choose who may collect a child and who gets messages.',
        tone: 'bg-leaf-soft text-leaf',
    },
    {
        icon: ShieldCheck,
        title: 'The right access for everyone',
        body: 'Teachers, bursars, registrars and parents each see what they need, and nothing they should not.',
        tone: 'bg-sky-soft text-sky',
    },
];

const steps = [
    {
        title: 'Create your account',
        body: 'Sign up with your WhatsApp number and choose a username.',
    },
    {
        title: 'Set up your school',
        body: 'Add your school year, terms, grades, classes and subjects.',
    },
    {
        title: 'Bring everyone in',
        body: 'Add teachers and students, link guardians, and start the term.',
    },
];

export default function Welcome() {
    const { auth, name } = usePage().props;
    const signedIn = Boolean(auth.user);

    return (
        <>
            <Head title="Run your school with care" />

            <div className="min-h-screen bg-background text-foreground">
                {/* Header */}
                <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                        <Link
                            href="/"
                            className="flex items-center gap-2.5 font-semibold"
                        >
                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <AppLogoIcon className="size-6 fill-current" />
                            </span>
                            <span className="hidden font-display text-lg sm:inline">
                                {name}
                            </span>
                        </Link>

                        <nav className="flex items-center gap-2">
                            {signedIn ? (
                                <Button asChild>
                                    <Link href={dashboard()}>
                                        Go to dashboard
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button variant="ghost" asChild>
                                        <Link href={login()}>Log in</Link>
                                    </Button>
                                    <Button asChild>
                                        <Link href={register()}>
                                            Set up your school
                                        </Link>
                                    </Button>
                                </>
                            )}
                        </nav>
                    </div>
                </header>

                <main>
                    {/* Hero */}
                    <section className="relative overflow-hidden">
                        <div className="pointer-events-none absolute inset-0 bg-ruled [mask-image:linear-gradient(to_bottom,black,transparent)] opacity-70" />
                        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-24">
                            <div>
                                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                                    <span className="size-2 rounded-full bg-leaf" />
                                    From the first school day to final exams
                                </p>
                                <h1 className="font-display text-4xl leading-[1.08] font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                                    One calm place to run your whole school.
                                </h1>
                                <p className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground">
                                    Attendance, results, fees and messages to
                                    parents, for the little ones learning their
                                    letters and the seniors preparing for exams.
                                </p>
                                <div className="mt-8 flex flex-wrap gap-3">
                                    <Button size="lg" asChild>
                                        <Link
                                            href={
                                                signedIn
                                                    ? dashboard()
                                                    : register()
                                            }
                                        >
                                            {signedIn
                                                ? 'Open your dashboard'
                                                : 'Set up your school'}
                                        </Link>
                                    </Button>
                                    {!signedIn && (
                                        <Button
                                            size="lg"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link href={login()}>
                                                I already have an account
                                            </Link>
                                        </Button>
                                    )}
                                </div>
                                <p className="mt-4 text-sm text-muted-foreground">
                                    Sign in with your username or WhatsApp
                                    number.
                                </p>
                            </div>

                            <HeroIllustration className="mx-auto w-full max-w-xl" />
                        </div>
                    </section>

                    {/* Young and older */}
                    <section className="border-y border-border/60 bg-card">
                        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
                            <div className="max-w-2xl">
                                <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                                    Made for every age in your school
                                </h2>
                                <p className="mt-3 text-muted-foreground">
                                    Primary and secondary classes work
                                    differently. The platform follows the way
                                    your school already works.
                                </p>
                            </div>

                            <div className="mt-10 grid gap-6 md:grid-cols-2">
                                <article className="relative overflow-hidden rounded-2xl border border-border bg-sun-soft/60 p-6 sm:p-8">
                                    <LittleLearnersArt className="mb-4 h-28 w-auto" />
                                    <h3 className="font-display text-2xl font-semibold">
                                        Little learners
                                    </h3>
                                    <ul className="mt-4 space-y-2.5 text-sm">
                                        <li className="flex gap-2">
                                            <BookOpenCheck className="mt-0.5 size-4 shrink-0 text-coral" />
                                            One class teacher and a daily
                                            register.
                                        </li>
                                        <li className="flex gap-2">
                                            <BookOpenCheck className="mt-0.5 size-4 shrink-0 text-coral" />
                                            Clear records of who may collect
                                            each child.
                                        </li>
                                        <li className="flex gap-2">
                                            <BookOpenCheck className="mt-0.5 size-4 shrink-0 text-coral" />
                                            Simple progress reports that parents
                                            understand.
                                        </li>
                                    </ul>
                                </article>

                                <article className="relative overflow-hidden rounded-2xl border border-border bg-sky-soft/60 p-6 sm:p-8">
                                    <SeniorStudentsArt className="mb-4 h-28 w-auto" />
                                    <h3 className="font-display text-2xl font-semibold">
                                        Senior students
                                    </h3>
                                    <ul className="mt-4 space-y-2.5 text-sm">
                                        <li className="flex gap-2">
                                            <BookOpenCheck className="mt-0.5 size-4 shrink-0 text-sky" />
                                            Subject teachers and attendance per
                                            lesson.
                                        </li>
                                        <li className="flex gap-2">
                                            <BookOpenCheck className="mt-0.5 size-4 shrink-0 text-sky" />
                                            Tests, exams and your own grading
                                            scale.
                                        </li>
                                        <li className="flex gap-2">
                                            <BookOpenCheck className="mt-0.5 size-4 shrink-0 text-sky" />
                                            Report cards with class position and
                                            remarks.
                                        </li>
                                    </ul>
                                </article>
                            </div>
                        </div>
                    </section>

                    {/* Features */}
                    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
                        <h2 className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                            Everything the school office does, in one place
                        </h2>
                        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature) => (
                                <div
                                    key={feature.title}
                                    className="rounded-2xl border border-border bg-card p-6"
                                >
                                    <span
                                        className={`mb-4 inline-flex size-10 items-center justify-center rounded-xl ${feature.tone}`}
                                    >
                                        <feature.icon className="size-5" />
                                    </span>
                                    <h3 className="font-semibold">
                                        {feature.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {feature.body}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Steps */}
                    <section className="bg-primary text-primary-foreground">
                        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
                            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                                Ready before the bell rings
                            </h2>
                            <ol className="mt-10 grid gap-8 md:grid-cols-3">
                                {steps.map((step, index) => (
                                    <li key={step.title}>
                                        <span className="mb-4 flex size-10 items-center justify-center rounded-full bg-sun font-display text-lg font-semibold text-ink">
                                            {index + 1}
                                        </span>
                                        <h3 className="text-lg font-semibold">
                                            {step.title}
                                        </h3>
                                        <p className="mt-1.5 text-primary-foreground/75">
                                            {step.body}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                            {!signedIn && (
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    className="mt-10"
                                    asChild
                                >
                                    <Link href={register()}>
                                        Set up your school
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </section>
                </main>

                <footer className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:px-6">
                    <span className="flex items-center gap-2">
                        <AppLogoIcon className="size-5 fill-current text-primary" />
                        {name}
                    </span>
                    <span>© {new Date().getFullYear()}</span>
                </footer>
            </div>
        </>
    );
}
