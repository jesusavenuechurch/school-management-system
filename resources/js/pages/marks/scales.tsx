import { Form, Head, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import EmptyState from '@/components/empty-state';
import Field from '@/components/field';
import FormDialog, { DeleteButton } from '@/components/form-dialog';
import InputError from '@/components/input-error';
import PageHeader, { PageBody } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
    destroy,
    index,
    install,
    makeDefault,
    store,
    update,
} from '@/routes/scales';

type Band = {
    label: string;
    min_percentage: number;
    remark: string | null;
    is_pass: boolean;
};
type Scale = { id: number; name: string; is_default: boolean; bands: Band[] };
type Grade = { id: number; name: string; grading_scale_id: number | null };
type Preset = { level: string; name: string; bands: Band[] };

type Props = {
    scales: Scale[];
    grades: Grade[];
    presets: Preset[];
    schoolLevels: string[];
};

/** "80% and up", "70–79%", ... from minimum-only bands (sorted high to low). */
function rangeText(bands: Band[], i: number): string {
    const min = bands[i].min_percentage;

    if (i === 0) {
        return `${min}% and up`;
    }

    const next = bands[i - 1].min_percentage;
    const top = Number.isInteger(next) ? next - 1 : next;

    return `${min}–${top}%`;
}

export default function MarkingScales({
    scales,
    grades,
    presets,
    schoolLevels,
}: Props) {
    const { errors } = usePage().props as { errors: Record<string, string> };
    const defaultScale = scales.find((s) => s.is_default);

    const addScale = (
        <FormDialog
            wide
            trigger={
                <Button variant="outline">
                    <Plus /> New scale
                </Button>
            }
            title="New marking scale"
            description="Start from the primary symbols and change what you need."
            form={store.form()}
        >
            {(e) => (
                <ScaleFields
                    errors={e}
                    grades={grades}
                    bands={presets[0]?.bands ?? []}
                />
            )}
        </FormDialog>
    );

    return (
        <>
            <Head title="Marking scales" />
            <PageBody>
                <PageHeader
                    title="Marking scales"
                    description="The symbol a learner gets for a mark: A for 80% and up, and so on. Each grade uses one scale. Marks already entered keep their symbol if you change a scale later."
                    actions={scales.length > 0 ? addScale : undefined}
                />

                <InputError message={errors.scale} />

                {scales.length === 0 ? (
                    <InstallPresets
                        presets={presets}
                        schoolLevels={schoolLevels}
                    />
                ) : (
                    <div className="grid gap-5 lg:grid-cols-2">
                        {scales.map((scale) => {
                            const usedBy = grades.filter(
                                (g) => g.grading_scale_id === scale.id,
                            );
                            const fallback = scale.is_default
                                ? grades.filter((g) => !g.grading_scale_id)
                                : [];

                            return (
                                <section
                                    key={scale.id}
                                    className="overflow-hidden rounded-2xl border border-border bg-card"
                                >
                                    <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
                                        <h2 className="font-display text-xl font-semibold">
                                            {scale.name}
                                        </h2>
                                        {scale.is_default && (
                                            <Badge variant="secondary">
                                                Default
                                            </Badge>
                                        )}
                                        <div className="ml-auto flex items-center gap-1">
                                            <FormDialog
                                                wide
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                    >
                                                        <Pencil /> Edit
                                                    </Button>
                                                }
                                                title={`Edit ${scale.name}`}
                                                form={update.form(scale.id)}
                                            >
                                                {(e) => (
                                                    <ScaleFields
                                                        errors={e}
                                                        grades={grades}
                                                        scale={scale}
                                                        bands={scale.bands}
                                                    />
                                                )}
                                            </FormDialog>
                                            {!scale.is_default && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        router.put(
                                                            makeDefault.url(
                                                                scale.id,
                                                            ),
                                                            {},
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <Star /> Make default
                                                </Button>
                                            )}
                                            {(!scale.is_default ||
                                                scales.length === 1) && (
                                                <DeleteButton
                                                    form={destroy.form(
                                                        scale.id,
                                                    )}
                                                    label="Remove"
                                                    confirm={`Remove ${scale.name}? Its grades will use the default scale. Marks already entered keep their symbols.`}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <table className="w-full text-sm">
                                        <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                                            <tr>
                                                <th className="px-5 pt-3 pb-1 font-medium">
                                                    Symbol
                                                </th>
                                                <th className="px-2 pt-3 pb-1 font-medium">
                                                    Marks
                                                </th>
                                                <th className="px-5 pt-3 pb-1 font-medium">
                                                    Meaning
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {scale.bands.map((band, i) => (
                                                <tr
                                                    key={band.label}
                                                    className="border-t border-border/60"
                                                >
                                                    <td className="px-5 py-2">
                                                        <span
                                                            className={`inline-flex min-w-9 justify-center rounded-md px-2 py-0.5 font-display text-base font-semibold ${band.is_pass ? 'bg-leaf-soft' : 'bg-coral-soft'}`}
                                                        >
                                                            {band.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-2 py-2 tabular-nums">
                                                        {rangeText(
                                                            scale.bands,
                                                            i,
                                                        )}
                                                    </td>
                                                    <td className="px-5 py-2 text-muted-foreground">
                                                        {band.remark}
                                                        {!band.is_pass && (
                                                            <span className="ml-1 text-coral">
                                                                · not a pass
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    <p className="border-t border-border bg-muted/40 px-5 py-3 text-sm text-muted-foreground">
                                        {usedBy.length + fallback.length ===
                                        0 ? (
                                            'No grades use this scale yet.'
                                        ) : (
                                            <>
                                                Used for{' '}
                                                <span className="font-medium text-foreground">
                                                    {[...usedBy, ...fallback]
                                                        .map((g) => g.name)
                                                        .join(', ')}
                                                </span>
                                            </>
                                        )}
                                    </p>
                                </section>
                            );
                        })}
                    </div>
                )}

                {scales.length > 0 &&
                    presets.some(
                        (p) => !scales.some((s) => s.name === p.name),
                    ) && (
                        <p className="text-sm text-muted-foreground">
                            Need the{' '}
                            {presets
                                .filter(
                                    (p) =>
                                        !scales.some((s) => s.name === p.name),
                                )
                                .map((p) => (
                                    <button
                                        key={p.level}
                                        type="button"
                                        className="font-medium text-foreground underline underline-offset-4"
                                        onClick={() =>
                                            router.post(
                                                install.url(),
                                                { levels: [p.level] },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {p.name}
                                    </button>
                                ))}{' '}
                            scale too? Click to add it.
                        </p>
                    )}

                {defaultScale && (
                    <p className="text-xs text-muted-foreground">
                        Grades without a scale of their own use the default
                        scale, {defaultScale.name}.
                    </p>
                )}
            </PageBody>
        </>
    );
}

function InstallPresets({
    presets,
    schoolLevels,
}: {
    presets: Preset[];
    schoolLevels: string[];
}) {
    const suggested = presets
        .filter((p) => schoolLevels.includes(p.level))
        .map((p) => p.level);

    return (
        <div className="grid gap-5">
            <EmptyState
                title="Choose your marking scales"
                description="We have the usual Lesotho symbols ready. Add them now and change the percentages later if your school uses different ones."
                action={
                    <Form
                        {...install.form()}
                        options={{ preserveScroll: true }}
                    >
                        {({ processing }) => (
                            <>
                                {(suggested.length > 0
                                    ? suggested
                                    : presets.map((p) => p.level)
                                ).map((level) => (
                                    <input
                                        key={level}
                                        type="hidden"
                                        name="levels[]"
                                        value={level}
                                    />
                                ))}
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Use these scales
                                </Button>
                            </>
                        )}
                    </Form>
                }
            />
            <div className="grid gap-5 md:grid-cols-2">
                {presets.map((preset) => (
                    <div
                        key={preset.level}
                        className="rounded-2xl border border-border bg-card p-5"
                    >
                        <h3 className="font-display text-lg font-semibold">
                            {preset.name}
                        </h3>
                        <ul className="mt-3 grid gap-1.5 text-sm">
                            {preset.bands.map((band, i) => (
                                <li
                                    key={band.label}
                                    className="flex items-center gap-3"
                                >
                                    <span
                                        className={`inline-flex min-w-9 justify-center rounded-md px-2 py-0.5 font-display font-semibold ${band.is_pass ? 'bg-leaf-soft' : 'bg-coral-soft'}`}
                                    >
                                        {band.label}
                                    </span>
                                    <span className="w-24 tabular-nums">
                                        {rangeText(preset.bands, i)}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {band.remark}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
    );
}

type Row = Band & { key: number };

function ScaleFields({
    errors,
    grades,
    scale,
    bands,
}: {
    errors: Record<string, string | undefined>;
    grades: Grade[];
    scale?: Scale;
    bands: Band[];
}) {
    const [rows, setRows] = useState<Row[]>(() =>
        bands.map((b, i) => ({ ...b, key: i })),
    );
    const bandErrors = Object.entries(errors)
        .filter(([key]) => key.startsWith('bands'))
        .map(([, message]) => message);

    return (
        <>
            <Field label="Name" htmlFor="name" error={errors.name}>
                <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={scale?.name}
                    placeholder="Primary"
                />
            </Field>

            <div className="grid gap-2">
                <p className="text-sm font-medium">Symbols</p>
                <div className="grid grid-cols-[4.5rem_5.5rem_1fr_auto_auto] items-center gap-2 text-xs text-muted-foreground">
                    <span>Symbol</span>
                    <span>From %</span>
                    <span>Meaning</span>
                    <span>Pass</span>
                    <span aria-hidden="true" />
                    {rows.map((row, i) => (
                        <div key={row.key} className="contents">
                            <Input
                                aria-label="Symbol"
                                name={`bands[${i}][label]`}
                                defaultValue={row.label}
                                required
                                className="font-semibold"
                            />
                            <Input
                                aria-label="From percentage"
                                name={`bands[${i}][min_percentage]`}
                                type="number"
                                min={0}
                                max={100}
                                step="any"
                                defaultValue={row.min_percentage}
                                required
                            />
                            <Input
                                aria-label="Meaning"
                                name={`bands[${i}][remark]`}
                                defaultValue={row.remark ?? ''}
                                placeholder="Excellent"
                            />
                            <span className="flex justify-center">
                                <input
                                    type="hidden"
                                    name={`bands[${i}][is_pass]`}
                                    value="0"
                                />
                                <input
                                    type="checkbox"
                                    aria-label="Counts as a pass"
                                    name={`bands[${i}][is_pass]`}
                                    value="1"
                                    defaultChecked={row.is_pass}
                                    className="size-4 accent-[var(--primary)]"
                                />
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                aria-label={`Remove ${row.label}`}
                                disabled={rows.length <= 2}
                                onClick={() =>
                                    setRows(rows.filter((r) => r !== row))
                                }
                            >
                                <Trash2 />
                            </Button>
                        </div>
                    ))}
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="justify-self-start"
                    onClick={() =>
                        setRows([
                            ...rows,
                            {
                                key: Math.max(0, ...rows.map((r) => r.key)) + 1,
                                label: '',
                                min_percentage: 0,
                                remark: null,
                                is_pass: false,
                            },
                        ])
                    }
                >
                    <Plus /> Add symbol
                </Button>
                <p className="text-xs text-muted-foreground">
                    Each symbol runs from its percentage up to the next one. The
                    lowest must start at 0.
                </p>
                {bandErrors.slice(0, 2).map((message) => (
                    <InputError key={message} message={message} />
                ))}
            </div>

            {grades.length > 0 && (
                <fieldset className="grid gap-2">
                    <legend className="mb-2 text-sm font-medium">
                        Grades that use this scale
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {grades.map((grade) => (
                            <label
                                key={grade.id}
                                className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-primary/5"
                            >
                                <input
                                    type="checkbox"
                                    name="grades[]"
                                    value={grade.id}
                                    defaultChecked={
                                        scale !== undefined &&
                                        grade.grading_scale_id === scale.id
                                    }
                                    className="size-3.5 accent-[var(--primary)]"
                                />
                                {grade.name}
                            </label>
                        ))}
                    </div>
                    <InputError message={errors.grades} />
                </fieldset>
            )}
        </>
    );
}

MarkingScales.layout = {
    breadcrumbs: [{ title: 'Marking scales', href: index() }],
};
