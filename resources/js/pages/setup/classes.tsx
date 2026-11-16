import { Head, Link, router, usePage } from '@inertiajs/react';
import { BookOpen, Pencil, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import EmptyState from '@/components/empty-state';
import Field from '@/components/field';
import FormDialog, { DeleteButton } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import PageHeader, { PageBody } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { classes as classesRoute } from '@/routes/setup';
import {
    destroy as destroyClassroom,
    store as storeClassroom,
    subjects as classroomSubjects,
    update as updateClassroom,
} from '@/routes/setup/classrooms';
import {
    destroy as destroyGrade,
    store as storeGrade,
    update as updateGrade,
} from '@/routes/setup/grades';
import { index as yearsIndex } from '@/routes/setup/years';
import type { Option } from '@/types';

type Classroom = {
    id: number;
    name: string;
    capacity: number | null;
    room: string | null;
    class_teacher_id: number | null;
    class_teacher_name: string | null;
    students_count: number;
    subjects: { subject_id: number; staff_id: number }[];
};
type Subject = { id: number; name: string; code: string };
type Grade = {
    id: number;
    name: string;
    sort_order: number;
    classrooms: Classroom[];
};

type Props = {
    years: { id: number; name: string; is_current: boolean }[];
    selectedYearId: number | null;
    gradeLevels: Grade[];
    teachers: Option[];
    subjects: Subject[];
};

// Soft accents rotate per grade so younger and older years feel distinct.
const tones = ['bg-sun-soft', 'bg-leaf-soft', 'bg-sky-soft', 'bg-coral-soft'];

export default function Classes({
    years,
    selectedYearId,
    gradeLevels,
    teachers,
    subjects,
}: Props) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const selectedYear = years.find((y) => y.id === selectedYearId);

    const gradeForm =
        (grade?: Grade) => (e: Record<string, string | undefined>) => (
            <>
                <Field
                    label="Grade name"
                    htmlFor="name"
                    error={e.name}
                    hint="For example Grade 1 or Grade 8"
                >
                    <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={grade?.name}
                    />
                </Field>
                <Field
                    label="Order"
                    htmlFor="sort_order"
                    error={e.sort_order}
                    optional
                    hint="Lower numbers come first."
                >
                    <Input
                        id="sort_order"
                        name="sort_order"
                        type="number"
                        min={0}
                        defaultValue={grade?.sort_order}
                    />
                </Field>
            </>
        );

    const classroomForm =
        (grade: Grade, classroom?: Classroom) =>
        (e: Record<string, string | undefined>) => (
            <>
                <input type="hidden" name="grade_level_id" value={grade.id} />
                <input
                    type="hidden"
                    name="academic_year_id"
                    value={selectedYearId ?? ''}
                />
                <Field label="Class name" htmlFor="name" error={e.name}>
                    <Input
                        id="name"
                        name="name"
                        required
                        defaultValue={
                            classroom?.name ??
                            `${grade.name}${String.fromCharCode(65 + grade.classrooms.length)}`
                        }
                    />
                </Field>
                <Field
                    label="Class teacher"
                    htmlFor="class_teacher_id"
                    error={e.class_teacher_id}
                    optional
                    hint={
                        teachers.length === 0
                            ? 'Add staff first to choose a class teacher.'
                            : undefined
                    }
                >
                    <NativeSelect
                        id="class_teacher_id"
                        name="class_teacher_id"
                        options={teachers}
                        placeholder="Not assigned"
                        defaultValue={classroom?.class_teacher_id ?? ''}
                    />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                        label="Capacity"
                        htmlFor="capacity"
                        error={e.capacity}
                        optional
                    >
                        <Input
                            id="capacity"
                            name="capacity"
                            type="number"
                            min={1}
                            defaultValue={classroom?.capacity ?? ''}
                        />
                    </Field>
                    <Field label="Room" htmlFor="room" error={e.room} optional>
                        <Input
                            id="room"
                            name="room"
                            defaultValue={classroom?.room ?? ''}
                        />
                    </Field>
                </div>
            </>
        );

    const addGrade = (
        <FormDialog
            trigger={
                <Button>
                    <Plus /> Add grade
                </Button>
            }
            title="Add a grade"
            form={storeGrade.form()}
        >
            {gradeForm()}
        </FormDialog>
    );

    if (years.length === 0) {
        return (
            <PageBody>
                <Head title="Grades & classes" />
                <PageHeader title="Grades & classes" />
                <EmptyState
                    title="Add a school year first"
                    description="Classes belong to a school year, so set up the year and its terms before adding classes."
                    action={
                        <Button asChild>
                            <Link href={yearsIndex()}>
                                Set up the school year
                            </Link>
                        </Button>
                    }
                />
            </PageBody>
        );
    }

    return (
        <>
            <Head title="Grades & classes" />
            <PageBody>
                <PageHeader
                    title="Grades & classes"
                    description="Grades stay the same each year. Classes are the groups inside a grade for one school year, such as Grade 4A and 4B."
                    actions={
                        <>
                            <label className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">
                                    Year
                                </span>
                                <NativeSelect
                                    className="w-32"
                                    value={selectedYearId ?? ''}
                                    onChange={(event) =>
                                        router.get(
                                            classesRoute.url({
                                                query: {
                                                    year: event.target.value,
                                                },
                                            }),
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                    options={years.map((y) => ({
                                        value: String(y.id),
                                        label: y.is_current
                                            ? `${y.name} (current)`
                                            : y.name,
                                    }))}
                                />
                            </label>
                            {gradeLevels.length > 0 && addGrade}
                        </>
                    }
                />

                <InputError message={errors.grade ?? errors.classroom} />

                {gradeLevels.length === 0 ? (
                    <EmptyState
                        title="No grades yet"
                        description="Add your grades from the youngest to the oldest, for example Grade 1 to Grade 7, then Grade 8 to Grade 11."
                        action={addGrade}
                    />
                ) : (
                    <div className="grid gap-5">
                        {gradeLevels.map((grade, index) => (
                            <section
                                key={grade.id}
                                className="overflow-hidden rounded-2xl border border-border bg-card"
                            >
                                <div
                                    className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${tones[index % tones.length]}`}
                                >
                                    <h2 className="font-display text-xl font-semibold">
                                        {grade.name}
                                    </h2>
                                    <div className="flex items-center gap-1">
                                        <FormDialog
                                            trigger={
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    <Pencil /> Rename
                                                </Button>
                                            }
                                            title={`Edit ${grade.name}`}
                                            form={updateGrade.form(grade.id)}
                                        >
                                            {gradeForm(grade)}
                                        </FormDialog>
                                        {grade.classrooms.length === 0 && (
                                            <DeleteButton
                                                form={destroyGrade.form(
                                                    grade.id,
                                                )}
                                                confirm={`Delete ${grade.name}?`}
                                            />
                                        )}
                                    </div>
                                </div>

                                <div className="p-5">
                                    {grade.classrooms.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            No classes in {selectedYear?.name}{' '}
                                            yet.
                                        </p>
                                    ) : (
                                        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {grade.classrooms.map(
                                                (classroom) => (
                                                    <li
                                                        key={classroom.id}
                                                        className="rounded-xl border border-border bg-background p-4"
                                                    >
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <p className="font-semibold">
                                                                    {
                                                                        classroom.name
                                                                    }
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {classroom.class_teacher_name ??
                                                                        'No class teacher yet'}
                                                                </p>
                                                            </div>
                                                            <FormDialog
                                                                trigger={
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="size-8"
                                                                        aria-label={`Edit ${classroom.name}`}
                                                                    >
                                                                        <Pencil />
                                                                    </Button>
                                                                }
                                                                title={`Edit ${classroom.name}`}
                                                                form={updateClassroom.form(
                                                                    classroom.id,
                                                                )}
                                                            >
                                                                {classroomForm(
                                                                    grade,
                                                                    classroom,
                                                                )}
                                                            </FormDialog>
                                                        </div>
                                                        <div className="mt-3 flex items-center justify-between text-sm">
                                                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                                                <Users className="size-4" />
                                                                {
                                                                    classroom.students_count
                                                                }
                                                                {classroom.capacity
                                                                    ? ` / ${classroom.capacity}`
                                                                    : ''}{' '}
                                                                students
                                                                {classroom.room
                                                                    ? ` · ${classroom.room}`
                                                                    : ''}
                                                            </span>
                                                            {classroom.students_count ===
                                                                0 && (
                                                                <DeleteButton
                                                                    form={destroyClassroom.form(
                                                                        classroom.id,
                                                                    )}
                                                                    label="Remove"
                                                                    confirm={`Remove ${classroom.name}?`}
                                                                />
                                                            )}
                                                        </div>
                                                        <div className="mt-2 border-t border-border pt-2">
                                                            <ClassSubjectsDialog
                                                                classroom={
                                                                    classroom
                                                                }
                                                                subjects={
                                                                    subjects
                                                                }
                                                                teachers={
                                                                    teachers
                                                                }
                                                            />
                                                        </div>
                                                    </li>
                                                ),
                                            )}
                                        </ul>
                                    )}

                                    <FormDialog
                                        trigger={
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-4"
                                            >
                                                <Plus /> Add class to{' '}
                                                {grade.name}
                                            </Button>
                                        }
                                        title={`Add a class to ${grade.name}`}
                                        description={`For the ${selectedYear?.name} school year.`}
                                        form={storeClassroom.form()}
                                    >
                                        {classroomForm(grade)}
                                    </FormDialog>
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </PageBody>
        </>
    );
}

/**
 * Which subjects the class takes and who teaches each. The subject teacher
 * enters that subject's marks.
 */
function ClassSubjectsDialog({
    classroom,
    subjects,
    teachers,
}: {
    classroom: Classroom;
    subjects: Subject[];
    teachers: Option[];
}) {
    const initial = () =>
        Object.fromEntries(
            subjects.map((subject) => [
                subject.id,
                String(
                    classroom.subjects.find((a) => a.subject_id === subject.id)
                        ?.staff_id ?? '',
                ),
            ]),
        );
    const [chosen, setChosen] = useState<Record<number, string>>(initial);
    const taught = classroom.subjects.length;

    return (
        <FormDialog
            wide
            trigger={
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2"
                    onClick={() => setChosen(initial())}
                >
                    <BookOpen />
                    {taught === 0
                        ? 'Subjects'
                        : `${taught} subject${taught === 1 ? '' : 's'}`}
                </Button>
            }
            title={`Subjects in ${classroom.name}`}
            description="Choose who teaches each subject. They enter its marks. Leave a subject on “Not taught” if this class doesn’t take it."
            form={classroomSubjects.form(classroom.id)}
        >
            {() =>
                subjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Add your subjects first, on the Subjects page.
                    </p>
                ) : (
                    <>
                        {classroom.class_teacher_id && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="justify-self-start"
                                onClick={() =>
                                    setChosen(
                                        Object.fromEntries(
                                            subjects.map((s) => [
                                                s.id,
                                                String(
                                                    classroom.class_teacher_id,
                                                ),
                                            ]),
                                        ),
                                    )
                                }
                            >
                                {classroom.class_teacher_name} teaches
                                everything
                            </Button>
                        )}
                        <div className="grid max-h-[55vh] gap-2 overflow-y-auto pr-1">
                            {subjects.map((subject, i) => (
                                <label
                                    key={subject.id}
                                    className="grid grid-cols-[1fr_minmax(10rem,14rem)] items-center gap-3 text-sm"
                                >
                                    <span className="font-medium">
                                        {subject.name}
                                    </span>
                                    <input
                                        type="hidden"
                                        name={`subjects[${i}][subject_id]`}
                                        value={subject.id}
                                    />
                                    <NativeSelect
                                        name={`subjects[${i}][staff_id]`}
                                        options={teachers}
                                        placeholder="Not taught"
                                        value={chosen[subject.id] ?? ''}
                                        onChange={(e) =>
                                            setChosen({
                                                ...chosen,
                                                [subject.id]: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                            ))}
                        </div>
                    </>
                )
            }
        </FormDialog>
    );
}

Classes.layout = {
    breadcrumbs: [{ title: 'Grades & classes', href: classesRoute() }],
};
