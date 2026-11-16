<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Laravel\Fortify\Features;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered()
    {
        $response = $this->get(route('login'));

        $response->assertOk();
    }

    public function test_users_can_authenticate_using_the_login_screen()
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'login' => $user->username,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_authenticate_with_their_whatsapp_number()
    {
        $user = User::factory()->create(['phone' => '+26658123456']);

        // Typed the local way, with spaces.
        $this->post(route('login.store'), [
            'login' => '5812 3456',
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
    }

    public function test_usernames_are_not_case_sensitive()
    {
        $user = User::factory()->create(['username' => 'mpho']);

        $this->post(route('login.store'), [
            'login' => 'Mpho',
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
    }

    public function test_a_shared_number_asks_for_the_username()
    {
        User::factory()->count(2)->create(['phone' => '+26658123456']);

        $response = $this->post(route('login.store'), [
            'login' => '+266 5812 3456',
            'password' => 'password',
        ]);

        $response->assertSessionHasErrors('login');
        $this->assertGuest();
    }

    public function test_users_sharing_a_number_can_still_log_in_with_their_username()
    {
        $first = User::factory()->create(['phone' => '+26658123456']);
        User::factory()->create(['phone' => '+26658123456']);

        $this->post(route('login.store'), [
            'login' => $first->username,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($first);
    }

    public function test_logging_in_records_the_time()
    {
        $user = User::factory()->create();

        $this->post(route('login.store'), [
            'login' => $user->username,
            'password' => 'password',
        ]);

        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_users_with_two_factor_enabled_are_redirected_to_two_factor_challenge()
    {
        $this->skipUnlessFortifyHas(Features::twoFactorAuthentication());

        Features::twoFactorAuthentication([
            'confirm' => true,
            'confirmPassword' => true,
        ]);

        $user = User::factory()->withTwoFactor()->create();

        $response = $this->post(route('login'), [
            'login' => $user->username,
            'password' => 'password',
        ]);

        $response->assertRedirect(route('two-factor.login'));
        $response->assertSessionHas('login.id', $user->id);
        $this->assertGuest();
    }

    public function test_users_can_not_authenticate_with_invalid_password()
    {
        $user = User::factory()->create();

        $this->post(route('login.store'), [
            'login' => $user->username,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('logout'));

        $response->assertRedirect(route('home'));

        $this->assertGuest();
    }

    public function test_users_are_rate_limited()
    {
        $user = User::factory()->create();

        RateLimiter::increment(md5('login'.implode('|', [$user->username, '127.0.0.1'])), amount: 5);

        $response = $this->post(route('login.store'), [
            'login' => $user->username,
            'password' => 'wrong-password',
        ]);

        $response->assertTooManyRequests();
    }
}
