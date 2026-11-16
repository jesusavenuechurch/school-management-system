<?php

namespace App\Actions\Schools;

use App\Http\Controllers\OnboardingController;
use App\Models\School;
use App\Models\User;
use App\Support\Constants;
use App\Support\CurrentSchool;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

/**
 * Creates a school for the person setting it up: they become an active
 * member with the admin role, and the school gets its default roles. New
 * schools start unverified: the platform team verifies them later.
 */
class CreateSchool
{
    public function __construct(private CurrentSchool $currentSchool) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function handle(User $owner, array $attributes, ?UploadedFile $logo = null): School
    {
        return DB::transaction(function () use ($owner, $attributes, $logo) {
            $school = School::create([
                'name' => $attributes['name'],
                'country' => $attributes['country'] ?? null,
                'currency' => strtoupper($attributes['currency'] ?? config('constants.default_currency')),
                'timezone' => $attributes['timezone'] ?? config('constants.default_timezone'),
                'phone' => $attributes['phone'] ?? null,
                'email' => $attributes['email'] ?? null,
                'address' => $attributes['address'] ?? null,
                'levels' => array_values($attributes['levels'] ?? ['primary']),
                'status' => 'active',
            ]);

            if ($logo !== null) {
                $school->update(['logo_path' => OnboardingController::storeLogo($logo, $school)]);
            }

            $school->users()->attach($owner, ['status' => 'active', 'joined_at' => now()]);

            $this->currentSchool->set($school->id);

            foreach (array_keys(Constants::options('default_roles')) as $roleName) {
                Role::findOrCreate($roleName, 'web');
            }

            $owner->unsetRelation('roles')->assignRole('admin');

            return $school;
        });
    }
}
