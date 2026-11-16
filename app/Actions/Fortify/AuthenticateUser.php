<?php

namespace App\Actions\Fortify;

use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Fortify;

/**
 * Logs a user in with either their username or their WhatsApp number.
 *
 * Phone numbers are not unique (family members may share one). If a number
 * belongs to more than one account, the user is asked for their username.
 */
class AuthenticateUser
{
    public function __invoke(Request $request): ?User
    {
        $login = trim((string) $request->input(Fortify::username()));
        $password = (string) $request->input('password');

        if ($login === '') {
            return null;
        }

        $user = PhoneNumber::looksLikePhone($login)
            ? $this->findByPhone($login)
            : User::query()->where('username', strtolower($login))->first();

        if ($user === null || ! Hash::check($password, $user->password)) {
            return null;
        }

        return $user;
    }

    private function findByPhone(string $login): ?User
    {
        $users = User::query()
            ->where('phone', PhoneNumber::normalize($login))
            ->limit(2)
            ->get();

        if ($users->count() > 1) {
            throw ValidationException::withMessages([
                Fortify::username() => __('This number is used by more than one account. Please log in with your username.'),
            ]);
        }

        return $users->first();
    }
}
