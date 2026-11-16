import Field from '@/components/field';
import InputError from '@/components/input-error';
import NativeSelect from '@/components/native-select';
import PasswordInput from '@/components/password-input';
import { Input } from '@/components/ui/input';
import type { Option } from '@/types';

type Errors = Record<string, string | undefined>;

export function RoleChoices({
    options,
    selected,
    error,
}: {
    options: Option[];
    selected: string[];
    error?: string;
}) {
    return (
        <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">
                What do they do here?
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
                {options.map((role) => (
                    <label
                        key={role.value}
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm has-checked:border-primary has-checked:bg-accent"
                    >
                        <input
                            type="checkbox"
                            name="roles[]"
                            value={role.value}
                            defaultChecked={selected.includes(role.value)}
                            className="size-4 accent-[var(--primary)]"
                        />
                        {role.label}
                    </label>
                ))}
            </div>
            <InputError message={error} />
        </fieldset>
    );
}

/** Every field the admin fills in when adding a staff member directly. */
export function StaffDetailsFields({
    errors: e,
    roleOptions,
    genderOptions,
    nextStaffNumber,
}: {
    errors: Errors;
    roleOptions: Option[];
    genderOptions: Option[];
    nextStaffNumber: string;
}) {
    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <Field
                label="Full name"
                htmlFor="name"
                error={e.name}
                className="sm:col-span-2"
            >
                <Input id="name" name="name" required autoComplete="off" />
            </Field>
            <Field
                label="Username"
                htmlFor="username"
                error={e.username}
                hint="They log in with this or their WhatsApp number."
            >
                <Input
                    id="username"
                    name="username"
                    required
                    autoCapitalize="none"
                    autoComplete="off"
                />
            </Field>
            <Field label="WhatsApp number" htmlFor="phone" error={e.phone}>
                <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    autoComplete="off"
                />
            </Field>
            <Field
                label="Email"
                htmlFor="email"
                error={e.email}
                optional
                className="sm:col-span-2"
            >
                <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="off"
                />
            </Field>
            <Field
                label="Starting password"
                htmlFor="password"
                error={e.password}
                hint="Share it with them privately; they can change it in settings."
            >
                <PasswordInput
                    id="password"
                    name="password"
                    autoComplete="new-password"
                />
            </Field>
            <Field
                label="Confirm password"
                htmlFor="password_confirmation"
                error={e.password_confirmation}
            >
                <PasswordInput
                    id="password_confirmation"
                    name="password_confirmation"
                    autoComplete="new-password"
                />
            </Field>
            <Field
                label="Staff number"
                htmlFor="staff_number"
                error={e.staff_number}
            >
                <Input
                    id="staff_number"
                    name="staff_number"
                    required
                    defaultValue={nextStaffNumber}
                />
            </Field>
            <Field
                label="Started on"
                htmlFor="employment_date"
                error={e.employment_date}
                optional
            >
                <Input
                    id="employment_date"
                    name="employment_date"
                    type="date"
                />
            </Field>
            <Field label="Gender" htmlFor="gender" error={e.gender} optional>
                <NativeSelect
                    id="gender"
                    name="gender"
                    options={genderOptions}
                    placeholder="Prefer not to say"
                />
            </Field>
            <div className="sm:col-span-2">
                <RoleChoices
                    options={roleOptions}
                    selected={['teacher']}
                    error={e.roles}
                />
            </div>
        </div>
    );
}
