import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    CircleAlert,
    CircleCheck,
    CircleX,
    Phone,
} from 'lucide-react';
import type { CardSchool } from '@/components/student-card';
import { Button } from '@/components/ui/button';
import { useInitials } from '@/hooks/use-initials';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { show } from '@/routes/students';

type Collector = {
    id: number;
    name: string;
    phone: string;
    relationship: string;
    can_pickup: boolean;
    is_primary_contact: boolean;
};

type Props = {
    school: CardSchool;
    student: {
        id: number;
        full_name: string;
        photo_url: string | null;
        admission_number: string;
        classroom: string | null;
        status: string;
        is_active: boolean;
    };
    collectors: Collector[];
    relationshipLabels: Record<string, string>;
    canManage: boolean;
};

function Person({
    person,
    relationship,
    allowed,
}: {
    person: Collector;
    relationship: string;
    allowed: boolean;
}) {
    return (
        <li className="flex items-center gap-3 px-4 py-3">
            {allowed ? (
                <CircleCheck className="size-5 shrink-0 text-leaf" />
            ) : (
                <CircleX className="size-5 shrink-0 text-coral" />
            )}
            <div className="min-w-0 flex-1">
                <p className="font-medium">{person.name}</p>
                <p className="text-sm text-muted-foreground">
                    {relationship}
                    {person.is_primary_contact && ' · main contact'}
                </p>
            </div>
            <Button variant="outline" size="sm" asChild>
                <a href={`tel:${person.phone}`}>
                    <Phone /> Call
                </a>
            </Button>
        </li>
    );
}

export default function CheckCard({
    school,
    student,
    collectors,
    relationshipLabels,
    canManage,
}: Props) {
    const getInitials = useInitials();
    const allowed = collectors.filter((c) => c.can_pickup);
    const notAllowed = collectors.filter((c) => !c.can_pickup);
    const relationship = (code: string) => relationshipLabels[code] ?? code;

    return (
        <>
            <Head title={student.full_name} />
            <div className="min-h-screen bg-muted/40">
                <div className="mx-auto max-w-md px-4 pt-4 pb-10">
                    <p className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="truncate">{school.name}</span>
                        <Link
                            href={dashboard()}
                            className="shrink-0 underline underline-offset-4"
                        >
                            Dashboard
                        </Link>
                    </p>

                    <section className="mt-3 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
                        <div className="relative bg-board px-5 pt-5 pb-14 text-chalk">
                            <p className="font-chalk text-lg text-chalk-yellow">
                                Student card check
                            </p>
                        </div>
                        <div className="relative -mt-12 px-5 pb-5 text-center">
                            <div className="mx-auto size-28 overflow-hidden rounded-2xl border-4 border-card bg-sky-soft shadow-md">
                                {student.photo_url ? (
                                    <img
                                        src={student.photo_url}
                                        alt={student.full_name}
                                        className="size-full object-cover"
                                    />
                                ) : (
                                    <span className="flex size-full items-center justify-center font-display text-3xl font-semibold">
                                        {getInitials(student.full_name)}
                                    </span>
                                )}
                            </div>
                            <h1 className="mt-3 font-display text-2xl font-semibold">
                                {student.full_name}
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {student.classroom ?? 'No class yet'} ·{' '}
                                <span className="font-mono">
                                    {student.admission_number}
                                </span>
                            </p>
                            {!student.is_active && (
                                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1 text-sm font-medium">
                                    <CircleAlert className="size-4" /> No longer
                                    an active student here
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
                        <h2 className="border-b border-border px-4 py-3 font-display text-lg font-semibold">
                            May collect {student.full_name.split(' ')[0]}
                        </h2>
                        {allowed.length === 0 ? (
                            <p className="flex items-start gap-2 bg-sun-soft/60 px-4 py-3 text-sm">
                                <CircleAlert className="mt-0.5 size-4 shrink-0" />
                                Nobody is listed to collect this child. Check
                                with the office before letting them go.
                            </p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {allowed.map((person) => (
                                    <Person
                                        key={person.id}
                                        person={person}
                                        relationship={relationship(
                                            person.relationship,
                                        )}
                                        allowed
                                    />
                                ))}
                            </ul>
                        )}
                    </section>

                    {notAllowed.length > 0 && (
                        <section
                            className={cn(
                                'mt-4 overflow-hidden rounded-2xl border border-coral/40 bg-card',
                            )}
                        >
                            <h2 className="border-b border-border px-4 py-3 font-display text-lg font-semibold">
                                Not allowed to collect
                            </h2>
                            <ul className="divide-y divide-border">
                                {notAllowed.map((person) => (
                                    <Person
                                        key={person.id}
                                        person={person}
                                        relationship={relationship(
                                            person.relationship,
                                        )}
                                        allowed={false}
                                    />
                                ))}
                            </ul>
                        </section>
                    )}

                    {canManage && (
                        <Button
                            variant="outline"
                            className="mt-6 w-full"
                            asChild
                        >
                            <Link href={show(student.id)}>
                                Open student record <ArrowRight />
                            </Link>
                        </Button>
                    )}
                </div>
            </div>
        </>
    );
}
