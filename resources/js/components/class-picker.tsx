import { useState } from 'react';
import Field from '@/components/field';
import NativeSelect from '@/components/native-select';
import { cn } from '@/lib/utils';

export type PlacementClass = {
    id: number;
    name: string;
    learners: number;
    capacity: number | null;
};
export type PlacementGrade = {
    id: number;
    name: string;
    classes: PlacementClass[];
};

/**
 * Pick the grade, then the class in it, seeing how full each class is.
 * Submits `name` (classroom_id) only; the grade just narrows the list.
 */
export default function ClassPicker({
    grades,
    name = 'classroom_id',
    idPrefix = 'place',
    defaultGradeId,
    error,
    required = false,
    laterLabel,
}: {
    grades: PlacementGrade[];
    name?: string;
    idPrefix?: string;
    defaultGradeId?: number | null;
    error?: string;
    required?: boolean;
    /** When set, the class may be left empty with this label. */
    laterLabel?: string;
}) {
    const initialGrade =
        grades.find((g) => g.id === defaultGradeId) ??
        (laterLabel ? undefined : grades[0]);
    const [gradeId, setGradeId] = useState(String(initialGrade?.id ?? ''));
    const grade = grades.find((g) => String(g.id) === gradeId);
    const firstOpen = (g?: PlacementGrade) =>
        g?.classes.find((c) => !c.capacity || c.learners < c.capacity) ??
        g?.classes[0];
    const [classId, setClassId] = useState(
        String(
            initialGrade && !laterLabel
                ? (firstOpen(initialGrade)?.id ?? '')
                : '',
        ),
    );
    const picked = grade?.classes.find((c) => String(c.id) === classId);
    const full = picked?.capacity ? picked.learners >= picked.capacity : false;

    return (
        <>
            <Field label="Grade" htmlFor={`${idPrefix}-grade`}>
                <NativeSelect
                    id={`${idPrefix}-grade`}
                    value={gradeId}
                    required={required}
                    placeholder={laterLabel ?? 'Choose…'}
                    onChange={(e) => {
                        const next = grades.find(
                            (g) => String(g.id) === e.target.value,
                        );
                        setGradeId(e.target.value);
                        setClassId(String(firstOpen(next)?.id ?? ''));
                    }}
                    options={grades.map((g) => ({
                        value: String(g.id),
                        label: g.name,
                    }))}
                />
            </Field>
            <Field label="Class" htmlFor={`${idPrefix}-class`} error={error}>
                <NativeSelect
                    id={`${idPrefix}-class`}
                    name={name}
                    value={classId}
                    required={required || gradeId !== ''}
                    disabled={!grade}
                    onChange={(e) => setClassId(e.target.value)}
                    placeholder={grade ? undefined : 'Choose the grade first'}
                    options={(grade?.classes ?? []).map((c) => ({
                        value: String(c.id),
                        label: c.name,
                    }))}
                />
            </Field>
            {grade && (
                <div className="grid gap-2 sm:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground">
                        Places in {grade.name}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {grade.classes.map((c) => (
                            <Seats
                                key={c.id}
                                classroom={c}
                                active={String(c.id) === classId}
                                onPick={() => setClassId(String(c.id))}
                            />
                        ))}
                    </div>
                    {full && (
                        <p className="text-sm text-coral">
                            {picked?.name} is full. You can still place them
                            there, or choose another class.
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

function Seats({
    classroom: c,
    active,
    onPick,
}: {
    classroom: PlacementClass;
    active: boolean;
    onPick: () => void;
}) {
    const ratio = c.capacity ? Math.min(1, c.learners / c.capacity) : null;
    const full = ratio !== null && ratio >= 1;

    return (
        <button
            type="button"
            onClick={onPick}
            aria-pressed={active}
            className={cn(
                'grid min-w-28 gap-1.5 rounded-xl border px-3 py-2 text-left text-sm transition',
                active
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border bg-card hover:bg-muted',
            )}
        >
            <span className="font-medium">{c.name}</span>
            {ratio !== null && (
                <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                        className={cn(
                            'block h-full rounded-full',
                            full
                                ? 'bg-coral'
                                : ratio > 0.85
                                  ? 'bg-sun'
                                  : 'bg-leaf',
                        )}
                        style={{ width: `${ratio * 100}%` }}
                    />
                </span>
            )}
            <span
                className={cn(
                    'text-xs tabular-nums',
                    full ? 'font-medium text-coral' : 'text-muted-foreground',
                )}
            >
                {c.capacity
                    ? full
                        ? `Full · ${c.learners} of ${c.capacity}`
                        : `${c.capacity - c.learners} places left`
                    : `${c.learners} learners`}
            </span>
        </button>
    );
}
