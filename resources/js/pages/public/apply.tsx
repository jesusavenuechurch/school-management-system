import { Form, Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import Field from '@/components/field';
import NativeSelect from '@/components/native-select';
import PublicSchoolHeader from '@/components/public-school-header';
import type { PublicBrand } from '@/components/public-school-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { publicMethod as schoolPage } from '@/routes/schools';
import { store } from '@/routes/schools/apply';
import type { Option } from '@/types';

type Props = {
    school: PublicBrand & { phone: string | null };
    open: boolean;
    grades: Option[];
    genderOptions: Option[];
    relationshipOptions: Option[];
};

const textareaClass =
    'min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

export default function Apply({
    school,
    open,
    grades,
    genderOptions,
    relationshipOptions,
}: Props) {
    return (
        <>
            <Head title={`Apply: ${school.name}`} />
            <div className="flex min-h-svh flex-col bg-background">
                <PublicSchoolHeader
                    school={school}
                    subtitle="Application for a place"
                />

                <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
                    <h1 className="font-display text-3xl font-semibold tracking-tight">
                        Apply for a place
                    </h1>

                    {!open ? (
                        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
                            <p className="font-medium">
                                {school.name} isn’t taking applications online
                                right now.
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {school.phone
                                    ? `Please call the school on ${school.phone} to ask about places.`
                                    : 'Please contact the school to ask about places.'}
                            </p>
                            <Button variant="outline" className="mt-5" asChild>
                                <Link href={schoolPage(school.slug)}>
                                    Back to the school page
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <>
                            <p className="mt-2 text-muted-foreground">
                                Tell us about your child and how to reach you.
                                The school will contact you on WhatsApp once
                                they have looked at it. One form per child.
                            </p>

                            <Form
                                {...store.form(school.slug)}
                                className="mt-8 grid gap-6"
                            >
                                {({ processing, errors }) => {
                                    const e = errors as Record<
                                        string,
                                        string | undefined
                                    >;

                                    return (
                                        <>
                                            {/* Left empty by people; bots fill it in. */}
                                            <input
                                                type="text"
                                                name="website"
                                                tabIndex={-1}
                                                autoComplete="off"
                                                aria-hidden="true"
                                                className="absolute -left-[9999px] size-px opacity-0"
                                            />

                                            <Section title="Your child">
                                                <Field
                                                    label="First name"
                                                    htmlFor="first_name"
                                                    error={e.first_name}
                                                >
                                                    <Input
                                                        id="first_name"
                                                        name="first_name"
                                                        required
                                                        autoComplete="off"
                                                    />
                                                </Field>
                                                <Field
                                                    label="Surname"
                                                    htmlFor="last_name"
                                                    error={e.last_name}
                                                >
                                                    <Input
                                                        id="last_name"
                                                        name="last_name"
                                                        required
                                                        autoComplete="off"
                                                    />
                                                </Field>
                                                <Field
                                                    label="Middle name"
                                                    htmlFor="middle_name"
                                                    error={e.middle_name}
                                                    optional
                                                >
                                                    <Input
                                                        id="middle_name"
                                                        name="middle_name"
                                                        autoComplete="off"
                                                    />
                                                </Field>
                                                <Field
                                                    label="Date of birth"
                                                    htmlFor="date_of_birth"
                                                    error={e.date_of_birth}
                                                    optional
                                                >
                                                    <Input
                                                        id="date_of_birth"
                                                        name="date_of_birth"
                                                        type="date"
                                                    />
                                                </Field>
                                                <Field
                                                    label="Gender"
                                                    htmlFor="gender"
                                                    error={e.gender}
                                                    optional
                                                >
                                                    <NativeSelect
                                                        id="gender"
                                                        name="gender"
                                                        placeholder="Choose…"
                                                        options={genderOptions}
                                                    />
                                                </Field>
                                                <Field
                                                    label="Grade applying for"
                                                    htmlFor="grade_level_id"
                                                    error={e.grade_level_id}
                                                >
                                                    <NativeSelect
                                                        id="grade_level_id"
                                                        name="grade_level_id"
                                                        required
                                                        placeholder="Choose…"
                                                        options={grades}
                                                    />
                                                </Field>
                                                <Field
                                                    label="Current or last school"
                                                    htmlFor="previous_school"
                                                    error={e.previous_school}
                                                    optional
                                                    className="sm:col-span-2"
                                                >
                                                    <Input
                                                        id="previous_school"
                                                        name="previous_school"
                                                    />
                                                </Field>
                                            </Section>

                                            <Section title="You, the parent or guardian">
                                                <Field
                                                    label="Your full name"
                                                    htmlFor="guardian_name"
                                                    error={e.guardian_name}
                                                >
                                                    <Input
                                                        id="guardian_name"
                                                        name="guardian_name"
                                                        required
                                                        autoComplete="name"
                                                    />
                                                </Field>
                                                <Field
                                                    label="Relationship to the child"
                                                    htmlFor="guardian_relationship"
                                                    error={
                                                        e.guardian_relationship
                                                    }
                                                    optional
                                                >
                                                    <NativeSelect
                                                        id="guardian_relationship"
                                                        name="guardian_relationship"
                                                        placeholder="Choose…"
                                                        options={
                                                            relationshipOptions
                                                        }
                                                    />
                                                </Field>
                                                <Field
                                                    label="WhatsApp number"
                                                    htmlFor="guardian_phone"
                                                    error={e.guardian_phone}
                                                    hint="The school replies here. This number also becomes your sign-in if your child is accepted."
                                                >
                                                    <Input
                                                        id="guardian_phone"
                                                        name="guardian_phone"
                                                        type="tel"
                                                        inputMode="tel"
                                                        required
                                                        autoComplete="tel"
                                                        placeholder="5812 3456"
                                                    />
                                                </Field>
                                                <Field
                                                    label="Email"
                                                    htmlFor="guardian_email"
                                                    error={e.guardian_email}
                                                    optional
                                                >
                                                    <Input
                                                        id="guardian_email"
                                                        name="guardian_email"
                                                        type="email"
                                                        autoComplete="email"
                                                    />
                                                </Field>
                                                <Field
                                                    label="Home address or village"
                                                    htmlFor="address"
                                                    error={e.address}
                                                    optional
                                                    className="sm:col-span-2"
                                                >
                                                    <Input
                                                        id="address"
                                                        name="address"
                                                        autoComplete="street-address"
                                                    />
                                                </Field>
                                                <Field
                                                    label="Anything the school should know"
                                                    htmlFor="message"
                                                    error={e.message}
                                                    optional
                                                    className="sm:col-span-2"
                                                >
                                                    <textarea
                                                        id="message"
                                                        name="message"
                                                        maxLength={1000}
                                                        className={
                                                            textareaClass
                                                        }
                                                    />
                                                </Field>
                                            </Section>

                                            <div className="flex flex-wrap items-center gap-3">
                                                <Button
                                                    type="submit"
                                                    size="lg"
                                                    disabled={processing}
                                                >
                                                    {processing && <Spinner />}
                                                    Send application
                                                </Button>
                                                <p className="text-xs text-muted-foreground">
                                                    Only {school.name} sees
                                                    these details.
                                                </p>
                                            </div>
                                        </>
                                    );
                                }}
                            </Form>
                        </>
                    )}
                </main>
            </div>
        </>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <fieldset className="rounded-2xl border border-border bg-card p-5">
            <legend className="px-1 font-display text-lg font-semibold">
                {title}
            </legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
        </fieldset>
    );
}
