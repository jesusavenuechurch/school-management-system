import { Form } from '@inertiajs/react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { ChipAdder, DoneNote, SubmitRow } from '@/components/setup/step-parts';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { subjects as saveSubjects } from '@/routes/setup/journey';
import { index as subjectsIndex } from '@/routes/setup/subjects';

export default function SubjectsStep({
    suggestions,
    done,
    doneLabel,
}: {
    suggestions: { code: string; name: string }[];
    done: boolean;
    doneLabel?: string | null;
}) {
    const [extra, setExtra] = useState<string[]>([]);

    return (
        <div className="grid gap-4">
            {done && (
                <DoneNote href={subjectsIndex()} linkLabel="Manage subjects">
                    {doneLabel}
                </DoneNote>
            )}
            <Form
                {...saveSubjects.form()}
                options={{ preserveScroll: true }}
                className="grid gap-6"
                onSuccess={() => setExtra([])}
            >
                {({ processing, errors }) => (
                    <>
                        {suggestions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {suggestions.map((subject) => (
                                    <label
                                        key={subject.code}
                                        className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors has-checked:border-transparent has-checked:bg-leaf-soft"
                                    >
                                        <input
                                            type="checkbox"
                                            name="subjects[]"
                                            value={subject.code}
                                            defaultChecked={!done}
                                            className="size-3.5 accent-[var(--primary)]"
                                        />
                                        {subject.name}
                                    </label>
                                ))}
                            </div>
                        )}

                        <div className="grid gap-2">
                            <p className="text-sm font-medium">
                                Anything missing?{' '}
                                <span className="font-normal text-muted-foreground">
                                    Add your own, one at a time.
                                </span>
                            </p>
                            <ChipAdder
                                name="extra"
                                placeholder="French"
                                label="Another subject"
                                items={extra}
                                onChange={setExtra}
                                tone="bg-sky-soft"
                            />
                        </div>

                        <InputError message={errors.subjects} />
                        {done ? (
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />} Add these
                                    subjects
                                </Button>
                            </div>
                        ) : (
                            <SubmitRow
                                processing={processing}
                                label="Save subjects"
                                step="subjects"
                            />
                        )}
                    </>
                )}
            </Form>
        </div>
    );
}
