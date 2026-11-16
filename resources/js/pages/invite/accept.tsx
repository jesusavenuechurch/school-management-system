import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { BadgeCheck, Phone } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import Field from '@/components/field';
import { EaselScene } from '@/components/illustrations';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { home, logout } from '@/routes';
import { accept, login } from '@/routes/invitations';

type Props = {
    status: 'new' | 'match' | 'mismatch' | 'expired';
    school: { name: string; logo_url?: string | null; slug?: string } | null;
    invitation: {
        token: string;
        name: string | null;
        phone: string;
        roles: string[];
        inviter: string | null;
        phone_has_account: boolean;
    } | null;
};

function SchoolMark({ school }: { school: NonNullable<Props['school']> }) {
    return (
        <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center overflow-hidden rounded-xl border border-border bg-white font-display text-lg font-semibold text-ink">
                {school.logo_url ? (
                    <img
                        src={school.logo_url}
                        alt=""
                        className="size-full object-contain"
                    />
                ) : (
                    school.name.slice(0, 1)
                )}
            </span>
            <span className="font-display text-xl font-semibold">
                {school.name}
            </span>
        </div>
    );
}

export default function AcceptInvitation({
    status,
    school,
    invitation,
}: Props) {
    const { name } = usePage().props;

    return (
        <>
            <Head title={school ? `Join ${school.name}` : 'Invitation'} />
            <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <aside className="relative hidden overflow-hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-center lg:p-10">
                    <div className="pointer-events-none absolute inset-0 bg-ruled opacity-60" />
                    <EaselScene
                        items={[
                            'You were invited',
                            'Your details',
                            'Your classes',
                        ]}
                        done={1}
                        className="relative mx-auto w-full max-w-md"
                    />
                </aside>

                <main className="flex flex-col justify-center px-4 py-10 sm:px-8 lg:px-14">
                    <div className="mx-auto w-full max-w-md">
                        {school && <SchoolMark school={school} />}

                        {status === 'expired' || !invitation ? (
                            <div className="mt-8">
                                <h1 className="font-display text-3xl font-semibold tracking-tight">
                                    This invitation has expired
                                </h1>
                                <p className="mt-3 text-muted-foreground">
                                    It may already have been used, or it's more
                                    than two weeks old. Ask{' '}
                                    {school ? school.name : 'your school'} to
                                    send you a new one.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-8"
                                    asChild
                                >
                                    <Link href={home()}>
                                        Go to the homepage
                                    </Link>
                                </Button>
                            </div>
                        ) : (
                            <>
                                <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">
                                    {invitation.name
                                        ? `Welcome, ${invitation.name.split(' ')[0]}`
                                        : 'Welcome to the team'}
                                </h1>
                                <p className="mt-2 text-muted-foreground">
                                    {invitation.inviter
                                        ? `${invitation.inviter} has invited you`
                                        : "You've been invited"}{' '}
                                    to join {school?.name} as{' '}
                                    <span className="font-medium text-foreground">
                                        {invitation.roles
                                            .join(' and ')
                                            .toLowerCase()}
                                    </span>
                                    .
                                </p>

                                <p className="mt-5 flex items-center gap-2 rounded-xl bg-muted/70 px-3 py-2 text-sm">
                                    <Phone className="size-4 text-muted-foreground" />
                                    Your WhatsApp number:{' '}
                                    <span className="font-medium tabular-nums">
                                        {invitation.phone}
                                    </span>
                                </p>

                                {status === 'match' && (
                                    <Form
                                        {...accept.form(invitation.token)}
                                        className="mt-8"
                                    >
                                        {({ processing }) => (
                                            <Button
                                                type="submit"
                                                size="lg"
                                                className="w-full"
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <BadgeCheck />
                                                )}{' '}
                                                Join {school?.name}
                                            </Button>
                                        )}
                                    </Form>
                                )}

                                {status === 'mismatch' && (
                                    <div className="mt-8 rounded-xl border border-border p-4 text-sm">
                                        <p>
                                            You're signed in with a different
                                            number. Sign out, then open the link
                                            again to join.
                                        </p>
                                        <Button
                                            variant="outline"
                                            className="mt-4"
                                            onClick={() =>
                                                router.post(
                                                    logout.url(),
                                                    {},
                                                    {
                                                        onSuccess: () =>
                                                            router.visit(
                                                                window.location
                                                                    .href,
                                                            ),
                                                    },
                                                )
                                            }
                                        >
                                            Sign out
                                        </Button>
                                    </div>
                                )}

                                {status === 'new' && (
                                    <>
                                        {invitation.phone_has_account && (
                                            <p className="mt-5 rounded-xl border border-sky/40 bg-sky-soft/60 px-3 py-2 text-sm">
                                                This number already has an
                                                account.{' '}
                                                <Link
                                                    href={login(
                                                        invitation.token,
                                                    )}
                                                    className="font-medium underline underline-offset-4"
                                                >
                                                    Sign in to join with it
                                                </Link>{' '}
                                                or create a separate one below.
                                            </p>
                                        )}
                                        <Form
                                            {...accept.form(invitation.token)}
                                            resetOnError={[
                                                'password',
                                                'password_confirmation',
                                            ]}
                                            className="mt-8 grid gap-4"
                                        >
                                            {({ processing, errors }) => (
                                                <>
                                                    <Field
                                                        label="Your full name"
                                                        htmlFor="name"
                                                        error={errors.name}
                                                    >
                                                        <Input
                                                            id="name"
                                                            name="name"
                                                            required
                                                            defaultValue={
                                                                invitation.name ??
                                                                ''
                                                            }
                                                            autoComplete="name"
                                                        />
                                                    </Field>
                                                    <Field
                                                        label="Choose a username"
                                                        htmlFor="username"
                                                        error={errors.username}
                                                        hint="You'll sign in with this or your WhatsApp number."
                                                    >
                                                        <Input
                                                            id="username"
                                                            name="username"
                                                            required
                                                            autoCapitalize="none"
                                                            autoComplete="username"
                                                        />
                                                    </Field>
                                                    <Field
                                                        label="Email"
                                                        htmlFor="email"
                                                        error={errors.email}
                                                        optional
                                                    >
                                                        <Input
                                                            id="email"
                                                            name="email"
                                                            type="email"
                                                            autoComplete="email"
                                                        />
                                                    </Field>
                                                    <Field
                                                        label="Password"
                                                        htmlFor="password"
                                                        error={errors.password}
                                                    >
                                                        <PasswordInput
                                                            id="password"
                                                            name="password"
                                                            required
                                                            autoComplete="new-password"
                                                        />
                                                    </Field>
                                                    <Field
                                                        label="Confirm password"
                                                        htmlFor="password_confirmation"
                                                        error={
                                                            errors.password_confirmation
                                                        }
                                                    >
                                                        <PasswordInput
                                                            id="password_confirmation"
                                                            name="password_confirmation"
                                                            required
                                                            autoComplete="new-password"
                                                        />
                                                    </Field>
                                                    <Button
                                                        type="submit"
                                                        size="lg"
                                                        className="mt-2"
                                                        disabled={processing}
                                                    >
                                                        {processing && (
                                                            <Spinner />
                                                        )}{' '}
                                                        Create my account
                                                    </Button>
                                                </>
                                            )}
                                        </Form>
                                    </>
                                )}
                            </>
                        )}

                        <Link
                            href={home()}
                            className="mt-10 flex items-center gap-2 text-xs text-muted-foreground"
                        >
                            <AppLogoIcon className="size-4 fill-current text-primary" />{' '}
                            Runs on {name}
                        </Link>
                    </div>
                </main>
            </div>
        </>
    );
}
