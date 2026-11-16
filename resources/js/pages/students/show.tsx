import { Form, Head, Link, usePage } from '@inertiajs/react';
import {
    Camera,
    ArrowRightLeft,
    HandHeart,
    IdCard,
    Pencil,
    Phone,
    Star,
    UserPlus,
} from 'lucide-react';
import CheckboxField from '@/components/checkbox-field';
import Field from '@/components/field';
import FormDialog, { DeleteButton } from '@/components/form-dialog';
import NativeSelect from '@/components/native-select';
import { PageBody } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';
import { cards, index, show, update } from '@/routes/students';
import { update as updatePhoto } from '@/routes/students/photo';
import { store as storeEnrollment } from '@/routes/students/enrollments';
import {
    destroy as destroyGuardian,
    store as storeGuardian,
    update as updateGuardian,
} from '@/routes/students/guardians';
import type { Option } from '@/types';

type GuardianLink = {
    id: number;
    name: string;
    username: string;
    phone: string;
    relationship: string | null;
    is_primary_contact: boolean;
    can_pickup: boolean;
    receives_notifications: boolean;
};

type Enrollment = {
    id: number;
    classroom: string | null;
    academic_year: string | null;
    enrolled_on: string;
    left_on: string | null;
    status: string;
};

type Student = {
    id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    full_name: string;
    photo_url: string | null;
    admission_number: string;
    date_of_birth: string | null;
    gender: string | null;
    admission_date: string | null;
    status: string;
    address: string | null;
    guardians: GuardianLink[];
    enrollments: Enrollment[];
};

type Props = {
    student: Student;
    classrooms: Option[];
    genderOptions: Option[];
    statusOptions: Option[];
    relationshipOptions: Option[];
    labels: Record<
        | 'gender'
        | 'student_status'
        | 'enrollment_status'
        | 'guardian_relationship',
        Record<string, string>
    >;
};

const formatDate = (value: string | null) =>
    value
        ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
          })
        : '—';

function age(dob: string | null): string | null {
    if (!dob) {
        return null;
    }

    const birth = new Date(`${dob}T00:00:00`);
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();

    if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) {
        years--;
    }

    return `${years} years old`;
}

export default function ShowStudent({
    student,
    classrooms,
    genderOptions,
    statusOptions,
    relationshipOptions,
    labels,
}: Props) {
    const getInitials = useInitials();
    const { errors } = usePage().props as { errors: Record<string, string> };
    const current = student.enrollments.find(
        (en) => en.left_on === null && en.status === 'active',
    );

    return (
        <>
            <Head title={student.full_name} />
            <PageBody>
                {/* Header card */}
                <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
                    <div className="pointer-events-none absolute inset-0 bg-dotted opacity-60" />
                    <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:p-8">
                        {/* Photo: tap to change. Uploads straight away. */}
                        <Form
                            {...updatePhoto.form(student.id)}
                            options={{ preserveScroll: true }}
                            className="shrink-0"
                        >
                            {({ processing, submit }) => (
                                <label
                                    className="group relative flex size-24 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-sun-soft font-display text-3xl font-semibold ring-offset-2 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50"
                                    title="Change photo"
                                >
                                    {student.photo_url ? (
                                        <img
                                            src={student.photo_url}
                                            alt={student.full_name}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        getInitials(
                                            `${student.first_name} ${student.last_name}`,
                                        )
                                    )}
                                    <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-ink/70 py-1 font-sans text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-has-focus-visible:opacity-100">
                                        {processing ? (
                                            <Spinner className="size-3" />
                                        ) : (
                                            <Camera className="size-3" />
                                        )}
                                        {student.photo_url
                                            ? 'Change'
                                            : 'Add photo'}
                                    </span>
                                    <input
                                        type="file"
                                        name="photo"
                                        accept="image/jpeg,image/png,image/webp"
                                        capture="environment"
                                        className="sr-only"
                                        aria-label="Change photo"
                                        onChange={() => submit()}
                                    />
                                </label>
                            )}
                        </Form>
                        <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="font-display text-3xl font-semibold tracking-tight">
                                    {student.full_name}
                                </h1>
                                <Badge
                                    variant="secondary"
                                    className={
                                        student.status === 'active'
                                            ? 'bg-leaf-soft'
                                            : ''
                                    }
                                >
                                    {labels.student_status[student.status] ??
                                        student.status}
                                </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                                <span className="font-mono">
                                    {student.admission_number}
                                </span>
                                {current?.classroom && (
                                    <> · {current.classroom}</>
                                )}
                                {age(student.date_of_birth) && (
                                    <> · {age(student.date_of_birth)}</>
                                )}
                            </p>
                        </div>
                        <Button variant="outline" asChild>
                            <Link
                                href={cards.url({
                                    query: { student: student.id },
                                })}
                            >
                                <IdCard /> ID card
                            </Link>
                        </Button>
                        <FormDialog
                            wide
                            trigger={
                                <Button variant="outline">
                                    <Pencil /> Edit details
                                </Button>
                            }
                            title="Edit student details"
                            form={update.form(student.id)}
                        >
                            {(e) => (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field
                                        label="First name"
                                        htmlFor="first_name"
                                        error={e.first_name}
                                    >
                                        <Input
                                            id="first_name"
                                            name="first_name"
                                            required
                                            defaultValue={student.first_name}
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
                                            defaultValue={student.last_name}
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
                                            defaultValue={
                                                student.middle_name ?? ''
                                            }
                                        />
                                    </Field>
                                    <Field
                                        label="Admission number"
                                        htmlFor="admission_number"
                                        error={e.admission_number}
                                    >
                                        <Input
                                            id="admission_number"
                                            name="admission_number"
                                            required
                                            defaultValue={
                                                student.admission_number
                                            }
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
                                            defaultValue={
                                                student.date_of_birth ?? ''
                                            }
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
                                            defaultValue={student.gender ?? ''}
                                        />
                                    </Field>
                                    <Field
                                        label="Status"
                                        htmlFor="status"
                                        error={e.status}
                                    >
                                        <NativeSelect
                                            id="status"
                                            name="status"
                                            options={statusOptions}
                                            defaultValue={student.status}
                                        />
                                    </Field>
                                    <Field
                                        label="Home address"
                                        htmlFor="address"
                                        error={e.address}
                                        optional
                                    >
                                        <Input
                                            id="address"
                                            name="address"
                                            defaultValue={student.address ?? ''}
                                        />
                                    </Field>
                                </div>
                            )}
                        </FormDialog>
                    </div>
                </section>

                <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
                    {/* Guardians */}
                    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <h2 className="font-display text-xl font-semibold">
                                Guardians
                            </h2>
                            <FormDialog
                                trigger={
                                    <Button size="sm" variant="outline">
                                        <UserPlus /> Add guardian
                                    </Button>
                                }
                                title="Add a guardian"
                                description="If this person is already a guardian at your school (same name and number), their existing account is reused."
                                form={storeGuardian.form(student.id)}
                            >
                                {(e) => (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Full name"
                                            htmlFor="g-name"
                                            error={e.name}
                                        >
                                            <Input
                                                id="g-name"
                                                name="name"
                                                required
                                            />
                                        </Field>
                                        <Field
                                            label="WhatsApp number"
                                            htmlFor="g-phone"
                                            error={e.phone}
                                        >
                                            <Input
                                                id="g-phone"
                                                name="phone"
                                                type="tel"
                                                required
                                            />
                                        </Field>
                                        <Field
                                            label="Relationship"
                                            htmlFor="g-rel"
                                            error={e.relationship}
                                        >
                                            <NativeSelect
                                                id="g-rel"
                                                name="relationship"
                                                options={relationshipOptions}
                                                placeholder="Choose"
                                            />
                                        </Field>
                                        <div className="grid content-end gap-2 pb-1">
                                            <CheckboxField
                                                name="can_pickup"
                                                label="May collect the child"
                                                defaultChecked
                                            />
                                            <CheckboxField
                                                name="is_primary_contact"
                                                label="Main contact"
                                                defaultChecked={
                                                    student.guardians.length ===
                                                    0
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </FormDialog>
                        </div>

                        {student.guardians.length === 0 ? (
                            <p className="mt-4 rounded-xl border border-dashed border-coral/50 bg-coral-soft/40 p-4 text-sm">
                                No guardians linked yet. Add at least one so the
                                school can reach the family.
                            </p>
                        ) : (
                            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                                {student.guardians.map((g) => (
                                    <li
                                        key={g.id}
                                        className="rounded-xl border border-border bg-background p-4"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="flex items-center gap-1.5 font-semibold">
                                                    {g.name}
                                                    {g.is_primary_contact && (
                                                        <Star
                                                            className="size-4 fill-sun text-sun"
                                                            aria-label="Main contact"
                                                        />
                                                    )}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {g.relationship
                                                        ? labels
                                                              .guardian_relationship[
                                                              g.relationship
                                                          ]
                                                        : 'Guardian'}{' '}
                                                    · @{g.username}
                                                </p>
                                            </div>
                                            <FormDialog
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        aria-label={`Edit ${g.name}`}
                                                    >
                                                        <Pencil />
                                                    </Button>
                                                }
                                                title={`${g.name}`}
                                                description="How this guardian is linked to the student."
                                                form={updateGuardian.form({
                                                    student: student.id,
                                                    guardian: g.id,
                                                })}
                                            >
                                                {(e) => (
                                                    <>
                                                        <Field
                                                            label="Relationship"
                                                            htmlFor="rel"
                                                            error={
                                                                e.relationship
                                                            }
                                                        >
                                                            <NativeSelect
                                                                id="rel"
                                                                name="relationship"
                                                                options={
                                                                    relationshipOptions
                                                                }
                                                                placeholder="Choose"
                                                                defaultValue={
                                                                    g.relationship ??
                                                                    ''
                                                                }
                                                            />
                                                        </Field>
                                                        <CheckboxField
                                                            name="is_primary_contact"
                                                            label="Main contact"
                                                            description="Billed and contacted first."
                                                            defaultChecked={
                                                                g.is_primary_contact
                                                            }
                                                        />
                                                        <CheckboxField
                                                            name="can_pickup"
                                                            label="May collect the child"
                                                            defaultChecked={
                                                                g.can_pickup
                                                            }
                                                        />
                                                        <CheckboxField
                                                            name="receives_notifications"
                                                            label="Receives WhatsApp messages"
                                                            defaultChecked={
                                                                g.receives_notifications
                                                            }
                                                        />
                                                    </>
                                                )}
                                            </FormDialog>
                                        </div>
                                        <p className="mt-3 flex items-center gap-1.5 text-sm tabular-nums">
                                            <Phone className="size-3.5 text-muted-foreground" />{' '}
                                            {g.phone}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                            {g.can_pickup ? (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-leaf-soft"
                                                >
                                                    <HandHeart /> May collect
                                                </Badge>
                                            ) : (
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-coral-soft"
                                                >
                                                    May not collect
                                                </Badge>
                                            )}
                                            {!g.receives_notifications && (
                                                <Badge variant="secondary">
                                                    Messages off
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="mt-2 -mb-2 -ml-3">
                                            <DeleteButton
                                                form={destroyGuardian.form({
                                                    student: student.id,
                                                    guardian: g.id,
                                                })}
                                                label="Unlink"
                                                confirm={`Unlink ${g.name} from ${student.first_name}? Their account stays.`}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* Class & history */}
                    <aside className="grid content-start gap-6">
                        <section className="rounded-2xl border border-border bg-card p-5">
                            <h2 className="font-display text-xl font-semibold">
                                Class
                            </h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {current?.classroom
                                    ? `In ${current.classroom} since ${formatDate(current.enrolled_on)}.`
                                    : 'Not placed in a class.'}
                            </p>
                            {classrooms.length > 0 && (
                                <Form
                                    {...storeEnrollment.form(student.id)}
                                    options={{ preserveScroll: true }}
                                    className="mt-4 flex gap-2"
                                >
                                    {({ processing }) => (
                                        <>
                                            <NativeSelect
                                                name="classroom_id"
                                                options={classrooms}
                                                placeholder="Choose a class"
                                                required
                                                aria-label="Class"
                                            />
                                            <Button
                                                type="submit"
                                                variant="outline"
                                                disabled={processing}
                                            >
                                                <ArrowRightLeft />{' '}
                                                {current ? 'Move' : 'Place'}
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            )}
                            {errors.classroom_id && (
                                <p className="mt-2 text-sm text-destructive">
                                    {errors.classroom_id}
                                </p>
                            )}

                            {student.enrollments.length > 0 && (
                                <ol className="mt-5 space-y-3 border-l-2 border-border pl-4">
                                    {student.enrollments.map((en) => (
                                        <li
                                            key={en.id}
                                            className="relative text-sm"
                                        >
                                            <span
                                                className={`absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full ${en.left_on ? 'bg-muted-foreground/40' : 'bg-leaf'}`}
                                            />
                                            <p className="font-medium">
                                                {en.classroom}{' '}
                                                <span className="font-normal text-muted-foreground">
                                                    · {en.academic_year}
                                                </span>
                                            </p>
                                            <p className="text-muted-foreground">
                                                {formatDate(en.enrolled_on)} –{' '}
                                                {en.left_on
                                                    ? formatDate(en.left_on)
                                                    : 'now'}
                                                {en.left_on &&
                                                    ` · ${labels.enrollment_status[en.status] ?? en.status}`}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>

                        <section className="rounded-2xl border border-border bg-card p-5 text-sm">
                            <h2 className="mb-3 font-display text-xl font-semibold">
                                Details
                            </h2>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                                <dt className="text-muted-foreground">Born</dt>
                                <dd>{formatDate(student.date_of_birth)}</dd>
                                <dt className="text-muted-foreground">
                                    Gender
                                </dt>
                                <dd>
                                    {student.gender
                                        ? labels.gender[student.gender]
                                        : '—'}
                                </dd>
                                <dt className="text-muted-foreground">
                                    Admitted
                                </dt>
                                <dd>{formatDate(student.admission_date)}</dd>
                                <dt className="text-muted-foreground">
                                    Address
                                </dt>
                                <dd>{student.address ?? '—'}</dd>
                            </dl>
                        </section>
                    </aside>
                </div>
            </PageBody>
        </>
    );
}

ShowStudent.layout = (props: { student: Student }) => ({
    breadcrumbs: [
        { title: 'Students', href: index() },
        { title: props.student.full_name, href: show(props.student.id) },
    ],
});
