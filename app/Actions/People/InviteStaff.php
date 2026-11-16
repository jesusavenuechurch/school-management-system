<?php

namespace App\Actions\People;

use App\Models\School;
use App\Models\Staff;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Support\Constants;
use App\Support\PhoneNumber;

/**
 * Creates staff invitations from a list of people and sends each one by
 * WhatsApp where possible. People already on the staff, or already
 * invited, are skipped and reported back.
 */
class InviteStaff
{
    public function __construct(private SendStaffInvitation $send) {}

    /**
     * @param  list<array{name: string|null, phone: string, role: string|null}>  $people
     * @param  list<string>  $defaultRoles
     * @param  list<string>  $allowedRoles
     * @return array{invited: list<StaffInvitation>, skipped: list<array{phone: string, reason: string}>, sent: int}
     */
    public function handle(School $school, User $inviter, array $people, array $defaultRoles, array $allowedRoles): array
    {
        $invited = [];
        $skipped = [];
        $sent = 0;
        $seen = [];

        foreach ($people as $person) {
            $phone = PhoneNumber::normalize($person['phone']);
            $digits = $phone === null ? 0 : strlen($phone) - 1;

            if ($phone === null || ! PhoneNumber::looksLikePhone($person['phone']) || $digits < 8 || $digits > 15) {
                $skipped[] = ['phone' => $person['phone'], 'reason' => __('not a valid WhatsApp number')];

                continue;
            }

            if (isset($seen[$phone])) {
                continue;
            }

            $seen[$phone] = true;

            if (Staff::whereHas('user', fn ($q) => $q->where('phone', $phone))->exists()) {
                $skipped[] = ['phone' => $phone, 'reason' => __('already on your staff')];

                continue;
            }

            if (StaffInvitation::pending()->where('phone', $phone)->where('expires_at', '>', now())->exists()) {
                $skipped[] = ['phone' => $phone, 'reason' => __('already invited')];

                continue;
            }

            $invitation = StaffInvitation::issue([
                'school_id' => $school->id,
                'invited_by' => $inviter->id,
                'phone' => $phone,
                'name' => $person['name'],
                'roles' => $this->rolesFor($person['role'], $defaultRoles, $allowedRoles),
            ]);

            $invited[] = $invitation;

            if ($this->send->handle($invitation, $school, $inviter)) {
                $sent++;
            }
        }

        return ['invited' => $invited, 'skipped' => $skipped, 'sent' => $sent];
    }

    /**
     * A role written in the sheet ("Teacher", "bursar") if the school has
     * it, otherwise the roles chosen in the form.
     *
     * @param  list<string>  $defaultRoles
     * @param  list<string>  $allowedRoles
     * @return list<string>
     */
    private function rolesFor(?string $written, array $defaultRoles, array $allowedRoles): array
    {
        if ($written === null || trim($written) === '') {
            return $defaultRoles;
        }

        $labels = array_change_key_case(array_flip(array_map('strtolower', Constants::options('default_roles'))));
        $written = strtolower(trim($written));
        $role = in_array($written, $allowedRoles, true) ? $written : ($labels[$written] ?? null);

        return is_string($role) && in_array($role, $allowedRoles, true) ? [$role] : $defaultRoles;
    }
}
