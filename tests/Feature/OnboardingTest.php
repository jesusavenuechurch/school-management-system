<?php

namespace Tests\Feature;

use App\Models\School;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Role;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    public function test_a_new_account_is_led_to_set_up_a_school(): void
    {
        $this->post(route('register.store'), [
            'name' => 'Palesa Mokoena',
            'username' => 'palesa',
            'phone' => '58123456',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect(route('dashboard', absolute: false));

        $this->get(route('dashboard'))->assertRedirect(route('onboarding.create'));
        $this->get(route('onboarding.create'))->assertOk();
    }

    public function test_creating_a_school_makes_you_its_admin(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('onboarding.store'), [
                'name' => 'Morija Primary',
                'country' => 'Lesotho',
                'currency' => 'lsl',
                'timezone' => 'Africa/Maseru',
                'levels' => ['primary', 'high_school'],
            ])
            ->assertRedirect(route('setup.journey'));

        $school = School::firstOrFail();
        $this->assertSame('LSL', $school->currency);
        $this->assertSame('morija-primary', $school->slug);
        $this->assertSame(['primary', 'high_school'], $school->levels);
        $this->assertFalse($school->isVerified());
        $this->assertSame([$school->id], $user->activeSchoolIds());

        setPermissionsTeamId($school->id);
        $this->assertTrue($user->fresh()->hasRole('admin'));
        $this->assertEqualsCanonicalizing(
            ['admin', 'teacher', 'accountant', 'registrar', 'parent'],
            Role::where('school_id', $school->id)->pluck('name')->all(),
        );

        $this->get(route('dashboard'))->assertOk();
    }

    public function test_a_kind_of_school_must_be_chosen(): void
    {
        $this->actingAs(User::factory()->create())
            ->post(route('onboarding.store'), ['name' => 'X', 'currency' => 'LSL', 'timezone' => 'Africa/Maseru'])
            ->assertSessionHasErrors('levels');
    }

    public function test_the_logo_is_stored_and_svg_is_refused(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $base = ['name' => 'Logo School', 'currency' => 'LSL', 'timezone' => 'Africa/Maseru', 'levels' => ['primary']];

        $this->actingAs($user)
            ->post(route('onboarding.store'), [...$base, 'logo' => UploadedFile::fake()->create('logo.svg', 10, 'image/svg+xml')])
            ->assertSessionHasErrors('logo');

        $this->actingAs($user)
            ->post(route('onboarding.store'), [...$base, 'logo' => UploadedFile::fake()->image('logo.png', 200, 200)])
            ->assertSessionHasNoErrors();

        $school = School::firstOrFail();
        Storage::disk('public')->assertExists($school->logo_path);
        $this->assertStringContainsString('/storage/schools/', $school->logo_url);
    }

    public function test_two_schools_get_separate_roles(): void
    {
        [$a, $adminA] = $this->schoolWithAdmin('A');
        [$b] = $this->schoolWithAdmin('B');

        $this->assertSame(5, Role::where('school_id', $a->id)->count());
        $this->assertSame(5, Role::where('school_id', $b->id)->count());

        setPermissionsTeamId($b->id);
        $this->assertFalse($adminA->fresh()->hasRole('admin'));
    }

    public function test_switching_to_a_school_you_do_not_belong_to_is_refused(): void
    {
        [, $admin] = $this->schoolWithAdmin('A');
        $other = School::create(['name' => 'Elsewhere']);

        $this->actingAs($admin)
            ->post(route('schools.switch', $other->id))
            ->assertForbidden();
    }
}
