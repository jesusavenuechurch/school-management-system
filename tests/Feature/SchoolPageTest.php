<?php

namespace Tests\Feature;

use App\Actions\People\AddSchoolMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class SchoolPageTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    public function test_the_dashboard_shows_the_school_page_link(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();

        $this->actingAs($admin)->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('publicPage.url', route('schools.public', $school))
                ->where('publicPage.published', false));
    }

    public function test_approving_a_school_publishes_its_page(): void
    {
        [$school] = $this->schoolWithAdmin();

        $this->artisan('school:verify', ['school' => $school->slug])
            ->expectsOutputToContain('is verified')
            ->assertSuccessful();

        $this->assertTrue($school->fresh()->isPublic());
        $this->get(route('schools.public', $school))
            ->assertInertia(fn (Assert $page) => $page->where('page.is_public', true));

        $this->artisan('school:verify', ['school' => (string) $school->id, '--undo' => true])->assertSuccessful();
        $this->assertFalse($school->fresh()->isVerified());

        $this->artisan('school:verify', ['school' => 'no-such-school'])->assertFailed();
    }

    public function test_the_admin_can_hide_and_show_a_verified_page(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->artisan('school:verify', ['school' => $school->slug]);

        $this->actingAs($admin)->put(route('school-page.update'), ['published' => false])->assertRedirect();
        $this->assertFalse($school->fresh()->isPublic());

        $this->put(route('school-page.update'), ['published' => true])->assertRedirect();
        $this->assertTrue($school->fresh()->isPublic());
    }

    public function test_an_unverified_school_cannot_publish(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();

        $this->actingAs($admin)->put(route('school-page.update'), ['published' => true])->assertForbidden();
        $this->assertNull($school->fresh()->published_at);
    }

    public function test_only_admins_can_publish(): void
    {
        [$school] = $this->schoolWithAdmin();
        $this->artisan('school:verify', ['school' => $school->slug]);
        $this->inSchool($school);

        $teacher = User::factory()->create();
        app(AddSchoolMember::class)->handle($teacher, ['teacher']);

        $this->actingAs($teacher)->put(route('school-page.update'), ['published' => false])->assertForbidden();
        $this->assertTrue($school->fresh()->isPublic());
    }
}
