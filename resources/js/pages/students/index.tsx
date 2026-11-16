import { Form, Head, Link, router } from '@inertiajs/react';
import { IdCard, Search, UserPlus } from 'lucide-react';
import EmptyState from '@/components/empty-state';
import NativeSelect from '@/components/native-select';
import PageHeader, { PageBody } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { cards, create, index, show } from '@/routes/students';
import type { Option } from '@/types';

type StudentRow = {
    id: number;
    full_name: string;
    photo_url: string | null;
    admission_number: string;
    gender: string | null;
    status: string;
    classroom: string | null;
    guardians_count: number;
};

type Paginated<T> = {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
    from: number | null;
    to: number | null;
};

type Props = {
    students: Paginated<StudentRow>;
    filters: { search: string; classroom: number | null };
    classrooms: Option[];
    statusLabels: Record<string, string>;
};

export default function StudentsIndex({
    students,
    filters,
    classrooms,
    statusLabels,
}: Props) {
    const filtering = filters.search !== '' || filters.classroom !== null;

    return (
        <>
            <Head title="Students" />
            <PageBody>
                <PageHeader
                    title="Students"
                    description="Everyone enrolled at your school, with their class and guardians."
                    actions={
                        <>
                            <Button variant="outline" asChild>
                                <Link
                                    href={cards.url({
                                        query: filters.classroom
                                            ? { classroom: filters.classroom }
                                            : {},
                                    })}
                                >
                                    <IdCard /> Print ID cards
                                </Link>
                            </Button>
                            <Button asChild>
                                <Link href={create()}>
                                    <UserPlus /> Admit a student
                                </Link>
                            </Button>
                        </>
                    }
                />

                <Form
                    {...index.form()}
                    options={{ preserveState: true }}
                    className="flex flex-col gap-3 sm:flex-row"
                >
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Search by name or admission number"
                            className="pl-9"
                        />
                    </div>
                    <NativeSelect
                        name="classroom"
                        className="sm:w-48"
                        defaultValue={filters.classroom ?? ''}
                        options={classrooms}
                        placeholder="All classes"
                        onChange={(event) =>
                            router.get(
                                index.url({
                                    query: {
                                        search: filters.search || undefined,
                                        classroom:
                                            event.target.value || undefined,
                                    },
                                }),
                                {},
                                { preserveState: true },
                            )
                        }
                    />
                    <Button type="submit" variant="outline">
                        Search
                    </Button>
                </Form>

                {students.data.length === 0 ? (
                    filtering ? (
                        <p className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                            No students match your search.
                        </p>
                    ) : (
                        <EmptyState
                            title="No students yet"
                            description="Admit your first student. You can place them in a class and link their guardians at the same time."
                            action={
                                <Button asChild>
                                    <Link href={create()}>
                                        <UserPlus /> Admit a student
                                    </Link>
                                </Button>
                            }
                        />
                    )
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                            <table className="w-full min-w-[600px] text-sm">
                                <thead className="border-b border-border bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">
                                            Name
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Admission no.
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Class
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Guardians
                                        </th>
                                        <th className="px-4 py-3 font-medium">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {students.data.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="hover:bg-accent/40"
                                        >
                                            <td className="px-4 py-3">
                                                <Link
                                                    href={show(student.id)}
                                                    className="flex items-center gap-3 font-medium hover:underline"
                                                >
                                                    <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sun-soft text-xs font-semibold no-underline">
                                                        {student.photo_url ? (
                                                            <img
                                                                src={
                                                                    student.photo_url
                                                                }
                                                                alt=""
                                                                loading="lazy"
                                                                className="size-full object-cover"
                                                            />
                                                        ) : (
                                                            student.full_name
                                                                .split(' ')
                                                                .map(
                                                                    (w) => w[0],
                                                                )
                                                                .slice(0, 2)
                                                                .join('')
                                                        )}
                                                    </span>
                                                    {student.full_name}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-xs">
                                                {student.admission_number}
                                            </td>
                                            <td className="px-4 py-3">
                                                {student.classroom ?? (
                                                    <span className="text-muted-foreground">
                                                        Not placed
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {student.guardians_count > 0 ? (
                                                    student.guardians_count
                                                ) : (
                                                    <span className="text-coral">
                                                        None linked
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={
                                                        student.status ===
                                                        'active'
                                                            ? 'text-leaf'
                                                            : 'text-muted-foreground'
                                                    }
                                                >
                                                    {statusLabels[
                                                        student.status
                                                    ] ?? student.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row">
                            <span>
                                Showing {students.from}–{students.to} of{' '}
                                {students.total}
                            </span>
                            {students.links.length > 3 && (
                                <nav
                                    className="flex flex-wrap gap-1"
                                    aria-label="Pages"
                                >
                                    {students.links.map((link, i) =>
                                        link.url ? (
                                            <Link
                                                key={i}
                                                href={link.url}
                                                preserveScroll
                                                className={cn(
                                                    'rounded-md px-3 py-1.5',
                                                    link.active
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-accent',
                                                )}
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        ) : (
                                            <span
                                                key={i}
                                                className="px-3 py-1.5 opacity-50"
                                                dangerouslySetInnerHTML={{
                                                    __html: link.label,
                                                }}
                                            />
                                        ),
                                    )}
                                </nav>
                            )}
                        </div>
                    </>
                )}
            </PageBody>
        </>
    );
}

StudentsIndex.layout = {
    breadcrumbs: [{ title: 'Students', href: index() }],
};
