<?php

namespace Tests\Feature;

use App\Http\Middleware\SetCurrentSchool;
use App\Models\School;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class PublicSchoolTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    public function test_an_unverified_school_shows_only_its_name(): void
    {
        $school = School::create(['name' => 'Sunrise Combined', 'phone' => '+26622000000', 'about' => 'Hello']);

        $this->get(route('schools.public', $school->slug))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('public/school')
                ->where('page.name', 'Sunrise Combined')
                ->where('page.is_public', false)
                ->where('page.phone', null)
                ->where('page.about', null));
    }

    public function test_a_verified_published_school_shows_its_details(): void
    {
        $school = School::create([
            'name' => 'Sunrise Combined', 'phone' => '+26622000000', 'about' => 'Hello',
            'verified_at' => now(), 'published_at' => now(),
        ]);

        $this->get(route('schools.public', $school->slug))
            ->assertInertia(fn ($page) => $page
                ->where('page.is_public', true)
                ->where('page.phone', '+26622000000'));
    }

    public function test_school_sign_in_is_branded_and_opens_that_school(): void
    {
        [$a, $admin] = $this->schoolWithAdmin('School A');
        [$b] = $this->schoolWithAdmin('School B');
        $b->users()->attach($admin, ['status' => 'active']);

        $this->flushSession();

        $this->get(route('schools.login', $b->slug))
            ->assertInertia(fn ($page) => $page->component('auth/login')->where('brand.name', 'School B'))
            ->assertSessionHas(SetCurrentSchool::SESSION_KEY, $b->id);

        $this->post(route('login.store'), ['login' => $admin->username, 'password' => 'password']);

        $this->get(route('dashboard'))->assertInertia(fn ($page) => $page->where('school.name', 'School B'));
        $this->assertNotSame($a->id, session(SetCurrentSchool::SESSION_KEY));
    }

    public function test_slugs_are_unique(): void
    {
        $first = School::create(['name' => 'Sunrise']);
        $second = School::create(['name' => 'Sunrise']);

        $this->assertSame('sunrise', $first->slug);
        $this->assertSame('sunrise-2', $second->slug);
    }

    public function test_suspended_schools_have_no_page(): void
    {
        $school = School::create(['name' => 'Gone', 'status' => 'suspended']);

        $this->get(route('schools.public', $school->slug))->assertNotFound();
    }
}
