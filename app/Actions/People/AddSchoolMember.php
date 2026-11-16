<?php

namespace App\Actions\People;

use App\Models\School;
use App\Models\User;
use App\Support\CurrentSchool;

/**
 * Makes a user an active member of the current school with the given roles.
 */
class AddSchoolMember
{
    public function __construct(private CurrentSchool $currentSchool) {}

    /**
     * @param  list<string>  $roles
     */
    public function handle(User $user, array $roles): void
    {
        $school = School::findOrFail($this->currentSchool->id());

        $school->users()->syncWithoutDetaching([
            $user->id => ['status' => 'active', 'joined_at' => now()],
        ]);

        $user->unsetRelation('roles');

        foreach ($roles as $role) {
            if (! $user->hasRole($role)) {
                $user->assignRole($role);
            }
        }
    }
}
