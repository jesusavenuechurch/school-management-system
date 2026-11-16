import { Form, Head, Link, usePage } from '@inertiajs/react';
import { ChevronDown, ImageUp } from 'lucide-react';
import { useState } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import Field from '@/components/field';
import {
    EaselScene,
    LittleLearnersArt,
    SeniorStudentsArt,
} from '@/components/illustrations';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { dashboard, home } from '@/routes';
import { store } from '@/routes/onboarding';
import type { Option } from '@/types';

type Props = {
    hasSchool: boolean;
    defaults: { country: string; currency: string; timezone: string };
    timezones: string[];
    levelOptions: Option[];
};

const levelArt: Record<string, typeof LittleLearnersArt> = {
    primary: LittleLearnersArt,
    high_school: SeniorStudentsArt,
};

const levelHint: Record<string, string> = {
    primary: 'Class teachers, a daily register',
    high_school: 'Subject teachers, exams',
};

export function LevelChoices({
    options,
    selected,
    error,
}: {
    options: Option[];
    selected: string[];
    error?: string;
}) {
    return (
        <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
                What kind of school is it?{' '}
                <span className="font-normal text-muted-foreground">
                    Choose both if you have both.
                </span>
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
                {options.map((option) => {
                    const Art = levelArt[option.value];

                    return (
                        <label
                            key={option.value}
                            className="group relative flex cursor-pointer flex-col items-center rounded-2xl border-2 border-border bg-card p-4 text-center transition-colors hover:border-ring/60 has-checked:border-primary has-checked:bg-accent/60 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
                        >
                            <input
                                type="checkbox"
                                name="levels[]"
                                value={option.value}
                                aria-label={option.label}
                                defaultChecked={selected.includes(option.value)}
                                className="peer absolute top-3 right-3 size-4 accent-[var(--primary)]"
                            />
                            {Art && <Art className="h-20 w-auto" />}
                            <span className="mt-2 font-display text-lg font-semibold">
                                {option.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {levelHint[option.value]}
                            </span>
                        </label>
                    );
                })}
            </div>
            <InputError message={error} />
        </fieldset>
    );
}

export function LogoPicker({
    current,
    error,
}: {
    current?: string | null;
    error?: string;
}) {
    const [preview, setPreview] = useState<string | null>(current ?? null);

    return (
        <div className="grid gap-2">
            <span className="text-sm font-medium">
                School logo{' '}
                <span className="font-normal text-muted-foreground">
                    (optional, you can add it later)
                </span>
            </span>
            <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-input bg-card p-3 hover:border-ring/60 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50">
                <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                    {preview ? (
                        <img
                            src={preview}
                            alt="Logo preview"
                            className="size-full object-contain"
                        />
                    ) : (
                        <ImageUp className="size-6 text-muted-foreground" />
                    )}
                </span>
                <span className="text-sm">
                    <span className="font-medium">
                        {preview ? 'Change logo' : 'Upload your logo'}
                    </span>
                    <span className="block text-muted-foreground">
                        PNG, JPG or WebP, up to 2 MB. Square works best.
                    </span>
                </span>
                <input
                    type="file"
                    name="logo"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        setPreview(file ? URL.createObjectURL(file) : null);
                    }}
                />
            </label>
            <InputError message={error} />
        </div>
    );
}

export default function CreateSchool({
    hasSchool,
    defaults,
    timezones,
    levelOptions,
}: Props) {
    const { name, auth } = usePage().props;
    const [moreOpen, setMoreOpen] = useState(false);

    return (
        <>
            <Head title="Set up your school" />

            <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                {/* Art: the board starts filling in */}
                <aside className="relative hidden overflow-hidden border-r border-border bg-card lg:flex lg:flex-col lg:justify-between lg:p-10">
                    <div className="pointer-events-none absolute inset-0 bg-ruled opacity-60" />
                    <Link
                        href={home()}
                        className="relative flex items-center gap-2.5 font-semibold"
                    >
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <AppLogoIcon className="size-6 fill-current" />
                        </span>
                        <span className="font-display text-lg">{name}</span>
                    </Link>
                    <EaselScene
                        items={[
                            'Your account',
                            'Your school',
                            'Ready for class',
                        ]}
                        done={1}
                        className="relative mx-auto w-full max-w-md"
                    />
                    <div className="relative">
                        <p className="text-sm font-medium text-muted-foreground">
                            Step 2 of 2
                        </p>
                        <p className="mt-1 max-w-sm font-display text-xl">
                            Your account is ready. Now tell us about your
                            school.
                        </p>
                    </div>
                </aside>

                {/* Form */}
                <main className="flex flex-col px-4 py-8 sm:px-8 lg:px-14 lg:py-12">
                    <div className="mb-8 flex items-center justify-between lg:justify-end">
                        <Link
                            href={home()}
                            className="flex items-center gap-2.5 font-semibold lg:hidden"
                        >
                            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <AppLogoIcon className="size-6 fill-current" />
                            </span>
                        </Link>
                        {hasSchool && (
                            <Button variant="ghost" asChild>
                                <Link href={dashboard()}>
                                    Back to dashboard
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="mx-auto w-full max-w-xl">
                        <p className="text-sm font-medium text-muted-foreground">
                            Welcome, {auth.user.name.split(' ')[0]}
                        </p>
                        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                            Let's put your school on the board
                        </h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Just the essentials. Classes, staff and students
                            come next, step by step.
                        </p>

                        <Form {...store.form()} className="mt-8 grid gap-6">
                            {({ processing, errors }) => (
                                <>
                                    <Field
                                        label="School name"
                                        htmlFor="name"
                                        error={errors.name}
                                    >
                                        <Input
                                            id="name"
                                            name="name"
                                            required
                                            autoFocus
                                            placeholder="Sunrise Combined School"
                                            className="h-11 text-base"
                                        />
                                    </Field>

                                    <LevelChoices
                                        options={levelOptions}
                                        selected={[]}
                                        error={errors.levels}
                                    />

                                    <LogoPicker error={errors.logo} />

                                    <div className="rounded-2xl border border-border bg-card">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMoreOpen((open) => !open)
                                            }
                                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
                                            aria-expanded={moreOpen}
                                        >
                                            <span>
                                                <span className="font-medium">
                                                    Location and contact
                                                </span>
                                                <span className="block text-muted-foreground">
                                                    {defaults.country} ·{' '}
                                                    {defaults.currency} ·{' '}
                                                    {defaults.timezone.replace(
                                                        '_',
                                                        ' ',
                                                    )}
                                                </span>
                                            </span>
                                            <ChevronDown
                                                className={cn(
                                                    'size-4 transition-transform',
                                                    moreOpen && 'rotate-180',
                                                )}
                                            />
                                        </button>
                                        {/* Kept in the DOM so defaults always submit. */}
                                        <div
                                            className={cn(
                                                'grid gap-4 border-t border-border p-4 sm:grid-cols-2',
                                                !moreOpen &&
                                                    ![
                                                        'country',
                                                        'currency',
                                                        'timezone',
                                                        'phone',
                                                        'email',
                                                        'address',
                                                    ].some(
                                                        (key) => key in errors,
                                                    ) &&
                                                    'hidden',
                                            )}
                                        >
                                            <Field
                                                label="Country"
                                                htmlFor="country"
                                                error={errors.country}
                                                optional
                                            >
                                                <Input
                                                    id="country"
                                                    name="country"
                                                    defaultValue={
                                                        defaults.country
                                                    }
                                                />
                                            </Field>
                                            <Field
                                                label="Currency"
                                                htmlFor="currency"
                                                error={errors.currency}
                                                hint="Three letters, like LSL or ZAR"
                                            >
                                                <Input
                                                    id="currency"
                                                    name="currency"
                                                    required
                                                    maxLength={3}
                                                    defaultValue={
                                                        defaults.currency
                                                    }
                                                    className="uppercase"
                                                />
                                            </Field>
                                            <Field
                                                label="Time zone"
                                                htmlFor="timezone"
                                                error={errors.timezone}
                                                className="sm:col-span-2"
                                            >
                                                <NativeSelect
                                                    id="timezone"
                                                    name="timezone"
                                                    defaultValue={
                                                        defaults.timezone
                                                    }
                                                    options={timezones.map(
                                                        (tz) => ({
                                                            value: tz,
                                                            label: tz.replaceAll(
                                                                '_',
                                                                ' ',
                                                            ),
                                                        }),
                                                    )}
                                                />
                                            </Field>
                                            <Field
                                                label="School phone"
                                                htmlFor="phone"
                                                error={errors.phone}
                                                optional
                                            >
                                                <Input
                                                    id="phone"
                                                    name="phone"
                                                    type="tel"
                                                />
                                            </Field>
                                            <Field
                                                label="School email"
                                                htmlFor="email"
                                                error={errors.email}
                                                optional
                                            >
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                />
                                            </Field>
                                            <Field
                                                label="Address"
                                                htmlFor="address"
                                                error={errors.address}
                                                optional
                                                className="sm:col-span-2"
                                            >
                                                <Input
                                                    id="address"
                                                    name="address"
                                                />
                                            </Field>
                                        </div>
                                    </div>

                                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-xs text-muted-foreground">
                                            You'll be the school's
                                            administrator.
                                        </p>
                                        <Button
                                            type="submit"
                                            size="lg"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Create school
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </div>
                </main>
            </div>
        </>
    );
}
