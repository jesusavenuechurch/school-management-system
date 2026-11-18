import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { EaselScene } from '@/components/illustrations';
import { Button } from '@/components/ui/button';
import { dashboard, home } from '@/routes';
import { apply, login as schoolLogin } from '@/routes/schools';

type Props = {
    page: {
        name: string;
        slug: string;
        logo_url: string | null;
        is_public: boolean;
        levels: string[];
        about: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        country: string | null;
        applications_open: boolean;
    };
};

export default function PublicSchool({ page }: Props) {
    const { auth, name } = usePage().props;
    const initials = page.name
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

    return (
        <>
            <Head title={page.name} />
            <div className="flex min-h-svh flex-col bg-background">
                <header className="border-b border-border bg-card">
                    <div className="mx-auto flex h-20 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white font-display text-lg font-semibold text-ink">
                                {page.logo_url ? (
                                    <img
                                        src={page.logo_url}
                                        alt={`${page.name} logo`}
                                        className="size-full object-contain"
                                    />
                                ) : (
                                    initials
                                )}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate font-display text-xl font-semibold">
                                    {page.name}
                                </p>
                                {page.levels.length > 0 && (
                                    <p className="truncate text-sm text-muted-foreground">
                                        {page.levels.join(' · ')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {page.applications_open && (
                                <Button
                                    asChild
                                    className="hidden bg-sun text-ink hover:bg-sun/85 sm:inline-flex"
                                >
                                    <Link href={apply(page.slug)}>
                                        Apply for a place
                                    </Link>
                                </Button>
                            )}
                            <Button
                                asChild
                                variant={
                                    page.applications_open
                                        ? 'outline'
                                        : 'default'
                                }
                            >
                                {auth.user ? (
                                    <Link href={dashboard()}>
                                        Open your account
                                    </Link>
                                ) : (
                                    <Link href={schoolLogin(page.slug)}>
                                        Sign in
                                    </Link>
                                )}
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
                    <div>
                        {page.is_public ? (
                            <>
                                <p className="inline-flex items-center gap-1.5 rounded-full bg-leaf-soft px-3 py-1 text-xs font-medium">
                                    <ShieldCheck className="size-3.5 text-leaf" />{' '}
                                    Verified school
                                </p>
                                <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">
                                    Welcome to {page.name}
                                </h1>
                                {page.about && (
                                    <p className="mt-4 whitespace-pre-line text-muted-foreground">
                                        {page.about}
                                    </p>
                                )}
                                <ul className="mt-6 space-y-2 text-sm">
                                    {page.address && (
                                        <li className="flex gap-2">
                                            <MapPin className="mt-0.5 size-4 text-muted-foreground" />
                                            {page.address}
                                            {page.country
                                                ? `, ${page.country}`
                                                : ''}
                                        </li>
                                    )}
                                    {page.phone && (
                                        <li className="flex gap-2">
                                            <Phone className="mt-0.5 size-4 text-muted-foreground" />
                                            <a
                                                href={`tel:${page.phone}`}
                                                className="hover:underline"
                                            >
                                                {page.phone}
                                            </a>
                                        </li>
                                    )}
                                    {page.email && (
                                        <li className="flex gap-2">
                                            <Mail className="mt-0.5 size-4 text-muted-foreground" />
                                            <a
                                                href={`mailto:${page.email}`}
                                                className="hover:underline"
                                            >
                                                {page.email}
                                            </a>
                                        </li>
                                    )}
                                </ul>
                            </>
                        ) : (
                            <>
                                <h1 className="font-display text-4xl font-semibold tracking-tight">
                                    {page.name}
                                </h1>
                                <p className="mt-4 text-muted-foreground">
                                    This school's page isn't public yet. Parents
                                    and staff can still sign in to see their own
                                    information.
                                </p>
                            </>
                        )}
                        <div className="mt-8 flex flex-wrap gap-3">
                            {page.applications_open && (
                                <Button
                                    size="lg"
                                    asChild
                                    className="bg-sun text-ink shadow-sm hover:bg-sun/85"
                                >
                                    <Link href={apply(page.slug)}>
                                        Apply for a place
                                        <ArrowRight />
                                    </Link>
                                </Button>
                            )}
                            <Button
                                size="lg"
                                variant={
                                    page.applications_open
                                        ? 'outline'
                                        : 'default'
                                }
                                asChild
                            >
                                {auth.user ? (
                                    <Link href={dashboard()}>
                                        Open your account
                                    </Link>
                                ) : (
                                    <Link href={schoolLogin(page.slug)}>
                                        Sign in
                                    </Link>
                                )}
                            </Button>
                        </div>
                        {page.applications_open && (
                            <p className="mt-3 text-sm text-muted-foreground">
                                New to the school? Apply online and the school
                                will reply on WhatsApp.
                            </p>
                        )}
                    </div>
                    <EaselScene
                        items={['Register', 'Homework', 'Reports']}
                        done={2}
                        className="mx-auto w-full max-w-sm"
                    />
                </main>

                <footer className="border-t border-border">
                    <Link
                        href={home()}
                        className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-5 text-sm text-muted-foreground sm:px-6"
                    >
                        <AppLogoIcon className="size-4 fill-current text-primary" />{' '}
                        Runs on {name}
                    </Link>
                </footer>
            </div>
        </>
    );
}
