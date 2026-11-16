import { Camera } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';

/**
 * A photo input with a live preview. On phones, `capture` lets the camera
 * open straight away, which is how most learner photos will be taken.
 */
export default function PhotoPicker({
    name = 'photo',
    current,
    error,
    label = 'Photo',
    hint = 'JPG, PNG or WebP, up to 4 MB.',
}: {
    name?: string;
    current?: string | null;
    error?: string;
    label?: string;
    hint?: string;
}) {
    const [preview, setPreview] = useState<string | null>(current ?? null);

    return (
        <div className="grid gap-2">
            <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-input bg-card p-3 hover:border-ring/60 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50">
                <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sun-soft">
                    {preview ? (
                        <img
                            src={preview}
                            alt="Photo preview"
                            className="size-full object-cover"
                        />
                    ) : (
                        <Camera className="size-7 text-muted-foreground" />
                    )}
                </span>
                <span className="text-sm">
                    <span className="font-medium">
                        {preview
                            ? `Change ${label.toLowerCase()}`
                            : `Add a ${label.toLowerCase()}`}
                    </span>
                    <span className="block text-muted-foreground">{hint}</span>
                </span>
                <input
                    type="file"
                    name={name}
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    className="sr-only"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        setPreview(
                            file
                                ? URL.createObjectURL(file)
                                : (current ?? null),
                        );
                    }}
                />
            </label>
            <InputError message={error} />
        </div>
    );
}
