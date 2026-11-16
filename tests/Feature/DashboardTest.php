<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_users_without_a_school_are_sent_to_set_one_up()
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertRedirect(route('onboarding.create'));
    }

    public function test_school_members_can_visit_the_dashboard()
    {
        [, $admin] = $this->schoolWithAdmin();

        $this->actingAs($admin)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('dashboard')
                ->where('isAdmin', true)
                ->has('setup.steps', 6)
                ->where('setup.complete', false)
                ->where('verified', false)
                ->where('school.name', 'Morija Primary'));
    }
}
