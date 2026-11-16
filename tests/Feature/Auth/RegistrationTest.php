<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->skipUnlessFortifyHas(Features::registration());
    }

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get(route('register'));

        $response->assertOk();
    }

    public function test_new_users_can_register()
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'username' => 'TestUser',
            'phone' => '5812 3456',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));

        $user = User::first();
        $this->assertSame('testuser', $user->username);
        $this->assertSame('+26658123456', $user->phone);
    }

    public function test_email_is_optional()
    {
        $this->post(route('register.store'), [
            'name' => 'Test User',
            'username' => 'testuser',
            'phone' => '+266 5812 3456',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $this->assertNull(User::first()->email);
    }

    public function test_two_accounts_can_share_a_phone_number()
    {
        User::factory()->create(['phone' => '+26658123456']);

        $this->post(route('register.store'), [
            'name' => 'Second Parent',
            'username' => 'secondparent',
            'phone' => '58123456',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $this->assertSame(2, User::where('phone', '+26658123456')->count());
    }

    public function test_usernames_must_start_with_a_letter()
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'username' => '58123456',
            'phone' => '58123456',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('username');
        $this->assertGuest();
    }
}
