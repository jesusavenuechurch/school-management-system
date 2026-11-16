<?php

namespace App\Support;

/**
 * Normalises phone numbers to one stored form: "+" followed by digits.
 *
 * "5812 3456", "058123456" and "+266 5812 3456" all become "+26658123456",
 * so the same WhatsApp number always matches at login.
 */
class PhoneNumber
{
    /**
     * Numbers this short are treated as local and get the default country code.
     */
    private const MAX_LOCAL_DIGITS = 9;

    public static function normalize(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }

        $input = trim($input);
        $digits = preg_replace('/\D+/', '', $input) ?? '';

        if ($digits === '') {
            return null;
        }

        if (str_starts_with($input, '+')) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '00')) {
            return '+'.substr($digits, 2);
        }

        if (strlen($digits) <= self::MAX_LOCAL_DIGITS) {
            return '+'.config('constants.default_country_code').ltrim($digits, '0');
        }

        return '+'.$digits;
    }

    /**
     * Whether a login input looks like a phone number rather than a username.
     * Usernames must start with a letter, so anything starting with a digit
     * or "+" is a phone number.
     */
    public static function looksLikePhone(string $input): bool
    {
        return (bool) preg_match('/^\+?[\d\s\-()]{6,}$/', trim($input));
    }
}
