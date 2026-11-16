import { Form, router, usePage } from '@inertiajs/react';
import {
    Check,
    Copy,
    Download,
    FileSpreadsheet,
    MessageCircle,
    RefreshCw,
    Send,
    UserPlus,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { StaffDetailsFields } from '@/components/staff/staff-fields';
import { Spinner } from '@/components/ui/spinner';
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';
import { store as storeStaff } from '@/routes/staff';
import { destroy, resend, store, template } from '@/routes/staff/invitations';
import type { Option } from '@/types';

export type PendingInvitation = {
    id: number;
    name: string | null;
    phone: string;
    roles: string[];
    expired: boolean;
    sent_via_whatsapp: boolean;
    last_sent_at: string | null;
    created_at: string | null;
    url: string;
    share_url: string;
};

export type AddStaffMode = 'type' | 'upload' | 'details';

const modes: { value: AddStaffMode; label: string; icon: typeof Send }[] = [
    { value: 'type', label: 'WhatsApp numbers', icon: MessageCircle },
    { value: 'upload', label: 'Spreadsheet', icon: FileSpreadsheet },
    { value: 'details', label: 'Fill in their details', icon: UserPlus },
];

const descriptions: Record<AddStaffMode, (canSend: boolean) => string> = {
    type: (canSend) =>
        canSend
            ? 'Each person gets a WhatsApp message with a link to set up their own account.'
            : 'Each person gets a link to set up their own account. Until your school is verified, you send it from your own WhatsApp.',
    upload: () =>
        'Got a staff list already? Upload it and everyone on it gets their own link.',
    details: () =>
        'For someone without WhatsApp, or when you are sitting together. If they already have an account (as a parent, say), use the same username and number and leave the password empty.',
};

const sampleRows = [
    ['Thabo Nthunya', '+266 5812 3456', 'Teacher'],
    ['Lineo Mokoena', '6212 3456', 'Bursar'],
    ['', '5899 0011', ''],
];

/** What the uploaded sheet should look like. */
function SheetFormat({ roleOptions }: { roleOptions: Option[] }) {
    return (
        <div className="overflow-hidden rounded-xl border border-border text-sm">
            <table className="w-full">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                    <tr>
                        <th className="w-8 px-2 py-1.5 font-normal" />
                        {[
                            ['A', 'Name', 'optional'],
                            ['B', 'WhatsApp number', 'required'],
                            ['C', 'Role', 'optional'],
                        ].map(([col, name, need]) => (
                            <th key={col} className="px-3 py-1.5 font-normal">
                                <span className="font-mono">{col}</span>{' '}
                                <span className="font-semibold text-foreground">
                                    {name}
                                </span>{' '}
                                <span
                                    className={
                                        need === 'required' ? 'text-coral' : ''
                                    }
                                >
                                    ({need})
                                </span>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs">
                    {sampleRows.map((row, i) => (
                        <tr key={i}>
                            <td className="bg-muted/40 px-2 py-1.5 text-center text-muted-foreground">
                                {i + 2}
                            </td>
                            {row.map((cell, j) => (
                                <td key={j} className="px-3 py-1.5">
                                    {cell || (
                                        <span className="text-muted-foreground/60">
                                            empty
                                        </span>
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                Headings go in row 1. Local numbers are fine, we add +266. Roles
                we recognise: {roleOptions.map((r) => r.label).join(', ')}. Up
                to 300 people per file, .xlsx or .csv.
            </p>
        </div>
    );
}

/**
 * The one place to add staff: invite by WhatsApp number, upload a
 * spreadsheet, or fill in their details yourself.
 */
export function AddStaffDialog({
    trigger,
    initialMode = 'type',
    roleOptions,
    genderOptions,
    nextStaffNumber,
    canSendWhatsApp,
}: {
    trigger: ReactNode;
    initialMode?: AddStaffMode;
    roleOptions: Option[];
    genderOptions: Option[];
    nextStaffNumber: string;
    canSendWhatsApp: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState<AddStaffMode>(initialMode);
    const [fileName, setFileName] = useState<string | null>(null);

    const close = () => {
        setOpen(false);
        setFileName(null);
    };

    const footer = (processing: boolean, label: string) => (
        <DialogFooter>
            <Button type="button" variant="ghost" onClick={close}>
                Cancel
            </Button>
            <Button type="submit" disabled={processing}>
                {processing && <Spinner />} {label}
            </Button>
        </DialogFooter>
    );

    const inviteRoles = (error?: string) => (
        <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
                Their role{' '}
                <span className="font-normal text-muted-foreground">
                    {mode === 'upload'
                        ? '(used when a row has no role)'
                        : '(you can change it later)'}
                </span>
            </legend>
            <div className="flex flex-wrap gap-2">
                {roleOptions.map((role) => (
                    <label
                        key={role.value}
                        className="flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm has-checked:border-primary has-checked:bg-accent"
                    >
                        <input
                            type="checkbox"
                            name="roles[]"
                            value={role.value}
                            defaultChecked={role.value === 'teacher'}
                            className="size-3.5 accent-[var(--primary)]"
                        />
                        {role.label}
                    </label>
                ))}
            </div>
            <InputError message={error} />
        </fieldset>
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);

                if (next) {
                    setMode(initialMode);
                }
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-display text-xl">
                        Add your staff
                    </DialogTitle>
                    <DialogDescription>
                        {descriptions[mode](canSendWhatsApp)}
                    </DialogDescription>
                </DialogHeader>

                <div
                    className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1 text-sm"
                    role="tablist"
                >
                    {modes.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={mode === value}
                            onClick={() => setMode(value)}
                            className={cn(
                                'flex flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-xs leading-tight font-medium transition-colors sm:flex-row sm:gap-1.5 sm:px-2 sm:text-sm',
                                mode === value
                                    ? 'bg-card shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="size-4 shrink-0" />
                            <span className="text-center">{label}</span>
                        </button>
                    ))}
                </div>

                {mode === 'details' ? (
                    <Form
                        key="details"
                        {...storeStaff.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={close}
                        className="grid gap-5"
                    >
                        {({ processing, errors }) => (
                            <>
                                <StaffDetailsFields
                                    errors={
                                        errors as Record<
                                            string,
                                            string | undefined
                                        >
                                    }
                                    roleOptions={roleOptions}
                                    genderOptions={genderOptions}
                                    nextStaffNumber={nextStaffNumber}
                                />
                                {footer(processing, 'Add to staff')}
                            </>
                        )}
                    </Form>
                ) : (
                    <Form
                        key={mode}
                        {...store.form()}
                        options={{ preserveScroll: true }}
                        onSuccess={close}
                        className="grid gap-5"
                    >
                        {({ processing, errors }) => {
                            const e = errors as Record<
                                string,
                                string | undefined
                            >;

                            return (
                                <>
                                    {mode === 'type' ? (
                                        <div className="grid gap-2">
                                            <label
                                                htmlFor="people"
                                                className="text-sm font-medium"
                                            >
                                                One person per line: name and
                                                WhatsApp number
                                            </label>
                                            <textarea
                                                id="people"
                                                name="people"
                                                rows={6}
                                                placeholder={
                                                    'Thabo Nthunya, 5812 3456\nLineo Mokoena, 6212 3456\n5899 0011'
                                                }
                                                className="w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                The name is optional; they can
                                                fill it in themselves.
                                            </p>
                                            <InputError message={e.people} />
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                            <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-input p-4 hover:border-ring/60 has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50">
                                                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-leaf-soft">
                                                    <FileSpreadsheet className="size-6 text-leaf" />
                                                </span>
                                                <span className="text-sm">
                                                    <span className="font-medium">
                                                        {fileName ??
                                                            'Choose an Excel or CSV file'}
                                                    </span>
                                                    <span className="block text-muted-foreground">
                                                        {fileName
                                                            ? 'Tap to choose a different file.'
                                                            : 'Laid out like the sheet below.'}
                                                    </span>
                                                </span>
                                                <input
                                                    type="file"
                                                    name="file"
                                                    accept=".xlsx,.csv,text/csv"
                                                    className="sr-only"
                                                    onChange={(event) =>
                                                        setFileName(
                                                            event.target
                                                                .files?.[0]
                                                                ?.name ?? null,
                                                        )
                                                    }
                                                />
                                            </label>
                                            <InputError message={e.file} />
                                            <SheetFormat
                                                roleOptions={roleOptions}
                                            />
                                            <a
                                                href={template.url()}
                                                className="inline-flex items-center gap-1.5 text-sm font-medium underline underline-offset-4"
                                            >
                                                <Download className="size-4" />{' '}
                                                Download this sheet for Excel
                                            </a>
                                        </div>
                                    )}

                                    {inviteRoles(e.roles)}
                                    {footer(processing, 'Create invitations')}
                                </>
                            );
                        }}
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}

function CopyLinkButton({ url }: { url: string }) {
    const [copiedText, copy] = useClipboard();

    return (
        <Button variant="ghost" size="sm" onClick={() => void copy(url)}>
            {copiedText === url ? <Check /> : <Copy />}{' '}
            {copiedText === url ? 'Copied' : 'Copy link'}
        </Button>
    );
}

export function PendingInvitations({
    invitations,
    canSendWhatsApp,
}: {
    invitations: PendingInvitation[];
    canSendWhatsApp: boolean;
}) {
    const { flash } = usePage().props as unknown as {
        flash?: { inviteSkipped?: { phone: string; reason: string }[] };
    };
    const skipped = flash?.inviteSkipped ?? [];

    if (invitations.length === 0 && skipped.length === 0) {
        return null;
    }

    return (
        <section className="rounded-2xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-3">
                <h2 className="font-display text-lg font-semibold">
                    Waiting to join ({invitations.length})
                </h2>
                {!canSendWhatsApp &&
                    invitations.some((i) => !i.sent_via_whatsapp) && (
                        <p className="text-xs text-muted-foreground">
                            Tap "Send on WhatsApp" to send each link from your
                            own phone.
                        </p>
                    )}
            </div>

            {skipped.length > 0 && (
                <div className="border-b border-border bg-sun-soft/50 px-5 py-3 text-sm">
                    <p className="font-medium">Not invited:</p>
                    <ul className="mt-1 text-muted-foreground">
                        {skipped.map((s) => (
                            <li key={s.phone}>
                                {s.phone}: {s.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <ul className="divide-y divide-border">
                {invitations.map((invitation) => (
                    <li
                        key={invitation.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3"
                    >
                        <div className="min-w-40 flex-1">
                            <p className="font-medium">
                                {invitation.name ?? invitation.phone}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {invitation.name && (
                                    <span className="tabular-nums">
                                        {invitation.phone} ·{' '}
                                    </span>
                                )}
                                {invitation.roles.join(', ')}
                            </p>
                        </div>
                        <div className="text-sm">
                            {invitation.expired ? (
                                <Badge
                                    variant="secondary"
                                    className="bg-coral-soft"
                                >
                                    Expired
                                </Badge>
                            ) : invitation.sent_via_whatsapp ? (
                                <span className="text-leaf">
                                    Sent on WhatsApp {invitation.last_sent_at}
                                </span>
                            ) : (
                                <span className="text-muted-foreground">
                                    Created {invitation.created_at}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1">
                            {!invitation.expired &&
                                !invitation.sent_via_whatsapp && (
                                    <Button size="sm" asChild>
                                        <a
                                            href={invitation.share_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <MessageCircle /> Send on WhatsApp
                                        </a>
                                    </Button>
                                )}
                            <CopyLinkButton url={invitation.url} />
                            {(invitation.expired || canSendWhatsApp) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        router.post(
                                            resend.url(invitation.id),
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <RefreshCw />{' '}
                                    {invitation.expired
                                        ? 'Renew'
                                        : 'Send again'}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground"
                                aria-label={`Cancel invitation for ${invitation.name ?? invitation.phone}`}
                                onClick={() => {
                                    if (
                                        window.confirm(
                                            'Cancel this invitation? The link will stop working.',
                                        )
                                    ) {
                                        router.delete(
                                            destroy.url(invitation.id),
                                            { preserveScroll: true },
                                        );
                                    }
                                }}
                            >
                                <X />
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
