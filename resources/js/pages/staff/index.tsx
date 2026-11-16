import { Head } from '@inertiajs/react';
import { Pencil, Send, UserPlus } from 'lucide-react';
import EmptyState from '@/components/empty-state';
import Field from '@/components/field';
import FormDialog from '@/components/form-dialog';
import NativeSelect from '@/components/native-select';
import PageHeader, { PageBody } from '@/components/page-header';
import {
    AddStaffDialog,
    PendingInvitations,
} from '@/components/staff/invite-staff';
import { RoleChoices } from '@/components/staff/staff-fields';
import type { PendingInvitation } from '@/components/staff/invite-staff';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { index, update } from '@/routes/staff';
import type { Option } from '@/types';

type StaffMember = {
    id: number;
    name: string;
    username: string;
    phone: string;
    email: string | null;
    staff_number: string;
    employment_status: string;
    employment_date: string | null;
    gender: string | null;
    roles: string[];
};

type Props = {
    staff: StaffMember[];
    roleOptions: Option[];
    statusOptions: Option[];
    genderOptions: Option[];
    nextStaffNumber: string;
    canSendWhatsApp: boolean;
    invitations: PendingInvitation[];
};

const roleTone: Record<string, string> = {
    admin: 'bg-primary text-primary-foreground',
    teacher: 'bg-leaf-soft text-foreground',
    accountant: 'bg-sun-soft text-foreground',
    registrar: 'bg-sky-soft text-foreground',
    parent: 'bg-coral-soft text-foreground',
};

export default function StaffIndex({
    staff,
    roleOptions,
    statusOptions,
    genderOptions,
    nextStaffNumber,
    canSendWhatsApp,
    invitations,
}: Props) {
    const invite = (
        <AddStaffDialog
            trigger={
                <Button>
                    <Send /> Invite staff
                </Button>
            }
            roleOptions={roleOptions}
            genderOptions={genderOptions}
            nextStaffNumber={nextStaffNumber}
            canSendWhatsApp={canSendWhatsApp}
        />
    );

    const addStaff = (
        <AddStaffDialog
            initialMode="details"
            trigger={
                <Button variant="outline">
                    <UserPlus /> Add someone yourself
                </Button>
            }
            roleOptions={roleOptions}
            genderOptions={genderOptions}
            nextStaffNumber={nextStaffNumber}
            canSendWhatsApp={canSendWhatsApp}
        />
    );

    const roleLabel = (name: string) =>
        roleOptions.find((r) => r.value === name)?.label ??
        (name === 'parent' ? 'Parent' : name);
    const statusLabel = (code: string) =>
        statusOptions.find((s) => s.value === code)?.label ?? code;

    return (
        <>
            <Head title="Staff" />
            <PageBody>
                <PageHeader
                    title="Staff"
                    description="Teachers, the bursar, the registrar: everyone who works at the school. Invite them by WhatsApp and they set up their own accounts."
                    actions={
                        <>
                            {addStaff}
                            {invite}
                        </>
                    }
                />

                <PendingInvitations
                    invitations={invitations}
                    canSendWhatsApp={canSendWhatsApp}
                />

                {staff.length === 0 ? (
                    <EmptyState
                        title="Invite your teachers"
                        description="Type their WhatsApp numbers or upload a spreadsheet. Each person gets a link and sets up their own account."
                        action={invite}
                    />
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                        <table className="w-full min-w-[640px] text-sm">
                            <thead className="border-b border-border bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                                <tr>
                                    <th className="px-4 py-3 font-medium">
                                        Name
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Staff no.
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        WhatsApp
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Roles
                                    </th>
                                    <th className="px-4 py-3 font-medium">
                                        Status
                                    </th>
                                    <th className="px-4 py-3">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {staff.map((member) => (
                                    <tr key={member.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium">
                                                {member.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                @{member.username}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs">
                                            {member.staff_number}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums">
                                            {member.phone}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {member.roles.map((role) => (
                                                    <Badge
                                                        key={role}
                                                        variant="secondary"
                                                        className={
                                                            roleTone[role]
                                                        }
                                                    >
                                                        {roleLabel(role)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span
                                                className={
                                                    member.employment_status ===
                                                    'active'
                                                        ? 'text-leaf'
                                                        : 'text-muted-foreground'
                                                }
                                            >
                                                {statusLabel(
                                                    member.employment_status,
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <FormDialog
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                    >
                                                        <Pencil /> Edit
                                                    </Button>
                                                }
                                                title={`Edit ${member.name}`}
                                                form={update.form(member.id)}
                                            >
                                                {(e) => (
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        <Field
                                                            label="Staff number"
                                                            htmlFor="staff_number"
                                                            error={
                                                                e.staff_number
                                                            }
                                                        >
                                                            <Input
                                                                id="staff_number"
                                                                name="staff_number"
                                                                required
                                                                defaultValue={
                                                                    member.staff_number
                                                                }
                                                            />
                                                        </Field>
                                                        <Field
                                                            label="Status"
                                                            htmlFor="employment_status"
                                                            error={
                                                                e.employment_status
                                                            }
                                                        >
                                                            <NativeSelect
                                                                id="employment_status"
                                                                name="employment_status"
                                                                options={
                                                                    statusOptions
                                                                }
                                                                defaultValue={
                                                                    member.employment_status
                                                                }
                                                            />
                                                        </Field>
                                                        <Field
                                                            label="Started on"
                                                            htmlFor="employment_date"
                                                            error={
                                                                e.employment_date
                                                            }
                                                            optional
                                                        >
                                                            <Input
                                                                id="employment_date"
                                                                name="employment_date"
                                                                type="date"
                                                                defaultValue={
                                                                    member.employment_date ??
                                                                    ''
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
                                                                options={
                                                                    genderOptions
                                                                }
                                                                placeholder="Prefer not to say"
                                                                defaultValue={
                                                                    member.gender ??
                                                                    ''
                                                                }
                                                            />
                                                        </Field>
                                                        <div className="sm:col-span-2">
                                                            <RoleChoices
                                                                options={
                                                                    roleOptions
                                                                }
                                                                selected={
                                                                    member.roles
                                                                }
                                                                error={e.roles}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </FormDialog>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </PageBody>
        </>
    );
}

StaffIndex.layout = {
    breadcrumbs: [{ title: 'Staff', href: index() }],
};
