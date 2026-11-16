<?php

namespace App\Http\Controllers\People;

use App\Actions\People\AddSchoolMember;
use App\Actions\People\SendStaffInvitation;
use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\Staff;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Support\Constants;
use App\Support\PhoneNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class StaffController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules, ScopesToSchool;

    public function index(Request $request, SendStaffInvitation $send): Response
    {
        $school = School::findOrFail($this->schoolId());
        $labels = Constants::options('default_roles');

        $staff = Staff::query()
            ->with(['user' => fn ($q) => $q->with('roles')])
            ->orderBy('staff_number')
            ->get();

        return Inertia::render('staff/index', [
            'staff' => $staff->map(fn (Staff $member) => [
                'id' => $member->id,
                'name' => $member->user->name,
                'username' => $member->user->username,
                'phone' => $member->user->phone,
                'email' => $member->user->email,
                'staff_number' => $member->staff_number,
                'employment_status' => $member->employment_status,
                'employment_date' => $member->employment_date?->toDateString(),
                'gender' => $member->gender,
                'roles' => $member->user->roles->pluck('name')->values(),
            ]),
            'roleOptions' => $this->roleOptions(),
            'statusOptions' => Constants::selectOptions('employment_status'),
            'genderOptions' => Constants::selectOptions('gender'),
            'nextStaffNumber' => Staff::nextNumber(),
            'canSendWhatsApp' => $send->canSend($school),
            'invitations' => StaffInvitation::pending()
                ->with('inviter:id,name')
                ->latest()
                ->get()
                ->map(fn (StaffInvitation $invitation) => [
                    'id' => $invitation->id,
                    'name' => $invitation->name,
                    'phone' => $invitation->phone,
                    'roles' => array_map(fn ($r) => $labels[$r] ?? ucfirst($r), $invitation->roles),
                    'expired' => ! $invitation->isUsable(),
                    'sent_via_whatsapp' => $invitation->sent_via === 'whatsapp',
                    'last_sent_at' => $invitation->last_sent_at?->diffForHumans(),
                    'created_at' => $invitation->created_at?->diffForHumans(),
                    'url' => $invitation->url(),
                    // Opens the admin's own WhatsApp with the message ready.
                    'share_url' => 'https://wa.me/'.ltrim($invitation->phone, '+').'?text='.rawurlencode(
                        SendStaffInvitation::shareText($invitation, $school, $invitation->inviter ?? $request->user()),
                    ),
                ]),
        ]);
    }

    public function store(Request $request, AddSchoolMember $addSchoolMember): RedirectResponse
    {
        $data = $request->validate([
            'name' => $this->nameRules(),
            'username' => ['required', 'string', 'min:3', 'max:30', 'regex:/^[A-Za-z][A-Za-z0-9_.]*$/'],
            'phone' => $this->phoneRules(),
            'email' => ['nullable', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'confirmed'],
            'staff_number' => ['required', 'string', 'max:30', Rule::unique('staff')->where('school_id', $this->schoolId())],
            'employment_date' => ['nullable', 'date'],
            'gender' => ['nullable', Constants::rule('gender')],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => [Rule::in($this->roleNames())],
        ]);

        DB::transaction(function () use ($data, $addSchoolMember) {
            $user = $this->findOrCreateUser($data);

            if (Staff::where('user_id', $user->id)->exists()) {
                throw ValidationException::withMessages(['username' => __('This person is already on your staff list.')]);
            }

            $addSchoolMember->handle($user, $data['roles']);

            Staff::create([
                'user_id' => $user->id,
                'staff_number' => $data['staff_number'],
                'employment_date' => $data['employment_date'] ?? null,
                'gender' => $data['gender'] ?? null,
                'employment_status' => 'active',
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name added to staff.', ['name' => $data['name']])]);

        return back();
    }

    public function update(Request $request, Staff $staff): RedirectResponse
    {
        $data = $request->validate([
            'staff_number' => ['required', 'string', 'max:30', Rule::unique('staff')->where('school_id', $this->schoolId())->ignore($staff->id)],
            'employment_status' => ['required', Constants::rule('employment_status')],
            'employment_date' => ['nullable', 'date'],
            'gender' => ['nullable', Constants::rule('gender')],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => [Rule::in($this->roleNames())],
        ]);

        $user = $staff->user;

        // Never let the last administrator remove their own access.
        if ($user->is($request->user()) && ! in_array('admin', $data['roles'], true)) {
            throw ValidationException::withMessages(['roles' => __('You cannot remove your own administrator role.')]);
        }

        DB::transaction(function () use ($staff, $user, $data) {
            $staff->update(Arr::except($data, ['roles']));

            // Keep a parent role if they also have children here.
            $keep = $user->hasRole('parent') ? ['parent'] : [];
            $user->syncRoles(array_values(array_unique([...$data['roles'], ...$keep])));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Staff details saved.')]);

        return back();
    }

    /**
     * Reuse an existing login when the username and phone both match (the
     * person works at another school, or is already a parent here).
     *
     * @param  array<string, mixed>  $data
     */
    private function findOrCreateUser(array $data): User
    {
        $existing = User::where('username', strtolower($data['username']))->first();

        if ($existing !== null) {
            if ($existing->phone !== PhoneNumber::normalize($data['phone'])) {
                throw ValidationException::withMessages(['username' => __('This username is already taken.')]);
            }

            return $existing;
        }

        if (blank($data['password'] ?? null)) {
            throw ValidationException::withMessages(['password' => __('Set a starting password for this new account.')]);
        }

        validator(['password' => $data['password'], 'password_confirmation' => $data['password']], [
            'password' => $this->passwordRules(),
        ])->validate();

        return User::create([
            'name' => $data['name'],
            'username' => $data['username'],
            'phone' => $data['phone'],
            'email' => $data['email'] ?? null,
            'password' => $data['password'],
        ]);
    }

    /**
     * @return list<string>
     */
    private function roleNames(): array
    {
        return array_values(Role::query()
            ->where('school_id', $this->schoolId())
            ->where('name', '!=', 'parent')
            ->orderBy('id')
            ->get()
            ->map(fn (Role $role): string => $role->name)
            ->all());
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function roleOptions(): array
    {
        $labels = Constants::options('default_roles');

        return array_map(
            fn (string $name) => ['value' => $name, 'label' => $labels[$name] ?? ucfirst($name)],
            $this->roleNames(),
        );
    }
}
