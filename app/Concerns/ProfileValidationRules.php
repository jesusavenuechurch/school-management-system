<?php

namespace App\Concerns;

use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;

trait ProfileValidationRules
{
    /**
     * Get the validation rules used to validate user profiles.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string|\Closure>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            'name' => $this->nameRules(),
            'username' => $this->usernameRules($userId),
            'phone' => $this->phoneRules(),
            'email' => $this->emailRules($userId),
        ];
    }

    /**
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function nameRules(): array
    {
        return ['required', 'string', 'max:255'];
    }

    /**
     * Must start with a letter, so a username can never be mistaken for a
     * phone number at login.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function usernameRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'min:3',
            'max:30',
            'regex:/^[A-Za-z][A-Za-z0-9_.]*$/',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }

    /**
     * Required, but not unique: family members may share a phone.
     *
     * @return array<int, ValidationRule|array<mixed>|string|\Closure>
     */
    protected function phoneRules(): array
    {
        return [
            'required',
            'string',
            'max:20',
            function (string $attribute, mixed $value, \Closure $fail) {
                $normalized = PhoneNumber::normalize((string) $value);
                $digits = $normalized === null ? 0 : strlen($normalized) - 1;

                if (! PhoneNumber::looksLikePhone((string) $value) || $digits < 8 || $digits > 15) {
                    $fail(__('Enter a valid WhatsApp number.'));
                }
            },
        ];
    }

    /**
     * Optional.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'nullable',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }
}
