<?php

namespace Tests\Concerns;

use App\Actions\Schools\CreateSchool;
use App\Http\Middleware\SetCurrentSchool;
use App\Models\School;
use App\Models\User;
use App\Support\CurrentSchool;

trait CreatesSchools
{
    /**
     * A school set up through the real onboarding action, with its admin.
     *
     * @return array{0: School, 1: User}
     */
    protected function schoolWithAdmin(string $name = 'Morija Primary'): array
    {
        $admin = User::factory()->create();
        $school = app(CreateSchool::class)->handle($admin, ['name' => $name, 'levels' => ['primary', 'high_school']]);

        // Requests pick the school from the session, as in the app.
        $this->withSession([SetCurrentSchool::SESSION_KEY => $school->id]);

        return [$school, $admin];
    }

    protected function inSchool(School $school): void
    {
        app(CurrentSchool::class)->set($school->id);
    }
}
