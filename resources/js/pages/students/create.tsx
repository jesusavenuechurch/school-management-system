import { Form, Head, Link } from '@inertiajs/react';
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import CheckboxField from '@/components/checkbox-field';
import Field from '@/components/field';
import NativeSelect from '@/components/native-select';
import PhotoPicker from '@/components/photo-picker';
import PageHeader, { PageBody } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { classes } from '@/routes/setup';
import { create, index, store } from '@/routes/students';
import type { Option } from '@/types';

type Props = {
    classrooms: Option[];
    genderOptions: Option[];
    relationshipOptions: Option[];
    nextAdmissionNumber: string;
};

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="grid gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:grid-cols-[14rem_1fr]">
            <div>
                <h2 className="font-display text-lg font-semibold">{title}</h2>
                {description && (
                    <p className="mt-1 text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">{children}</div>
        </section>
    );
}

export default function CreateStudent({
    classrooms,
    genderOptions,
    relationshipOptions,
    nextAdmissionNumber,
}: Props) {
    // Stable keys so removing a guardian does not shuffle the others' inputs.
    const [guardianKeys, setGuardianKeys] = useState<number[]>([0]);
    const today = new Date().toISOString().slice(0, 10);

    return (
        <>
            <Head title="Admit a student" />
            <PageBody>
                <PageHeader
                    title="Admit a student"
                    description="Add the learner, place them in a class and link the people who look after them."
                />

                <Form {...store.form()} className="grid gap-5">
                    {({ processing, errors }) => {
                        const e = errors as Record<string, string | undefined>;

                        return (
                            <>
                                <Section title="The learner">
                                    <Field
                                        label="First name"
                                        htmlFor="first_name"
                                        error={e.first_name}
                                    >
                                        <Input
                                            id="first_name"
                                            name="first_name"
                                            required
                                            autoFocus
                                        />
                                    </Field>
                                    <Field
                                        label="Last name"
                                        htmlFor="last_name"
                                        error={e.last_name}
                                    >
                                        <Input
                                            id="last_name"
                                            name="last_name"
                                            required
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
                                            options={genderOptions}
                                            placeholder="Not specified"
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
                                            max={today}
                                        />
                                    </Field>
                                    <Field
                                        label="Home address"
                                        htmlFor="address"
                                        error={e.address}
                                        optional
                                    >
                                        <Input id="address" name="address" />
                                    </Field>
                                    <div className="sm:col-span-2">
                                        <PhotoPicker
                                            error={e.photo}
                                            label="Photo"
                                            hint="Optional. On a phone this opens the camera."
                                        />
                                    </div>
                                </Section>

                                <Section
                                    title="Admission"
                                    description="Classes listed are for the current school year."
                                >
                                    <Field
                                        label="Admission number"
                                        htmlFor="admission_number"
                                        error={e.admission_number}
                                    >
                                        <Input
                                            id="admission_number"
                                            name="admission_number"
                                            required
                                            defaultValue={nextAdmissionNumber}
                                        />
                                    </Field>
                                    <Field
                                        label="Admitted on"
                                        htmlFor="admission_date"
                                        error={e.admission_date}
                                    >
                                        <Input
                                            id="admission_date"
                                            name="admission_date"
                                            type="date"
                                            defaultValue={today}
                                        />
                                    </Field>
                                    <Field
                                        label="Class"
                                        htmlFor="classroom_id"
                                        error={e.classroom_id}
                                        optional
                                        className="sm:col-span-2"
                                        hint={
                                            classrooms.length === 0
                                                ? undefined
                                                : 'You can move them to another class later.'
                                        }
                                    >
                                        {classrooms.length === 0 ? (
                                            <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                                                No classes yet.{' '}
                                                <Link
                                                    href={classes()}
                                                    className="font-medium text-foreground underline"
                                                >
                                                    Add classes
                                                </Link>{' '}
                                                to place this student.
                                            </p>
                                        ) : (
                                            <NativeSelect
                                                id="classroom_id"
                                                name="classroom_id"
                                                options={classrooms}
                                                placeholder="Place later"
                                            />
                                        )}
                                    </Field>
                                </Section>

                                <section className="grid gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6 lg:grid-cols-[14rem_1fr]">
                                    <div>
                                        <h2 className="font-display text-lg font-semibold">
                                            Guardians
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Parents or caregivers. Each gets
                                            their own account, even if they
                                            share a phone.
                                        </p>
                                    </div>
                                    <div className="grid gap-4">
                                        {guardianKeys.map((key, i) => (
                                            <fieldset
                                                key={key}
                                                className="relative grid gap-4 rounded-xl border border-border bg-background p-4 sm:grid-cols-2"
                                            >
                                                <legend className="px-1 text-sm font-medium">
                                                    {i === 0
                                                        ? 'Main contact'
                                                        : `Guardian ${i + 1}`}
                                                </legend>
                                                {guardianKeys.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="absolute top-2 right-2 size-7"
                                                        aria-label="Remove this guardian"
                                                        onClick={() =>
                                                            setGuardianKeys(
                                                                (keys) =>
                                                                    keys.filter(
                                                                        (k) =>
                                                                            k !==
                                                                            key,
                                                                    ),
                                                            )
                                                        }
                                                    >
                                                        <X />
                                                    </Button>
                                                )}
                                                <Field
                                                    label="Full name"
                                                    htmlFor={`g${key}-name`}
                                                    error={
                                                        e[`guardians.${i}.name`]
                                                    }
                                                >
                                                    <Input
                                                        id={`g${key}-name`}
                                                        name={`guardians[${i}][name]`}
                                                        required
                                                    />
                                                </Field>
                                                <Field
                                                    label="WhatsApp number"
                                                    htmlFor={`g${key}-phone`}
                                                    error={
                                                        e[
                                                            `guardians.${i}.phone`
                                                        ]
                                                    }
                                                >
                                                    <Input
                                                        id={`g${key}-phone`}
                                                        name={`guardians[${i}][phone]`}
                                                        type="tel"
                                                        required
                                                    />
                                                </Field>
                                                <Field
                                                    label="Relationship"
                                                    htmlFor={`g${key}-rel`}
                                                    error={
                                                        e[
                                                            `guardians.${i}.relationship`
                                                        ]
                                                    }
                                                >
                                                    <NativeSelect
                                                        id={`g${key}-rel`}
                                                        name={`guardians[${i}][relationship]`}
                                                        options={
                                                            relationshipOptions
                                                        }
                                                        placeholder="Choose"
                                                    />
                                                </Field>
                                                <div className="flex items-end pb-1.5">
                                                    <CheckboxField
                                                        name={`guardians[${i}][can_pickup]`}
                                                        label="May collect the child"
                                                        defaultChecked
                                                    />
                                                </div>
                                            </fieldset>
                                        ))}
                                        {guardianKeys.length < 4 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="justify-self-start"
                                                onClick={() =>
                                                    setGuardianKeys((keys) => [
                                                        ...keys,
                                                        Math.max(...keys, 0) +
                                                            1,
                                                    ])
                                                }
                                            >
                                                <Plus /> Add another guardian
                                            </Button>
                                        )}
                                    </div>
                                </section>

                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" asChild>
                                        <Link href={index()}>Cancel</Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        size="lg"
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        Admit student
                                    </Button>
                                </div>
                            </>
                        );
                    }}
                </Form>
            </PageBody>
        </>
    );
}

CreateStudent.layout = {
    breadcrumbs: [
        { title: 'Students', href: index() },
        { title: 'Admit a student', href: create() },
    ],
};
