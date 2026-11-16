<?php

namespace App\Actions\People;

use App\Models\Guardian;
use App\Models\User;
use App\Support\PhoneNumber;
use Illuminate\Support\Str;

/**
 * Finds or creates the guardian record for a parent at the current school.
 *
 * The same person is reused when a guardian with the same name and phone
 * already exists here (e.g. a second child at the school). Otherwise a new
 * login is created, even if the phone is shared, because each guardian has
 * their own account.
 */
class CreateGuardian
{
    public function __construct(private AddSchoolMember $addSchoolMember) {}

    /**
     * @param  array{name: string, phone: string, email?: string|null, occupation?: string|null}  $data
     */
    public function handle(array $data): Guardian
    {
        $phone = PhoneNumber::normalize($data['phone']);
        $name = trim($data['name']);

        $existing = Guardian::query()
            ->whereHas('user', fn ($q) => $q
                ->where('phone', $phone)
                ->whereRaw('lower(name) = ?', [Str::lower($name)]))
            ->first();

        if ($existing !== null) {
            return $existing;
        }

        $user = User::create([
            'name' => $name,
            'username' => self::uniqueUsername($name),
            'phone' => $phone,
            'email' => $data['email'] ?? null,
            // They set their own password later (WhatsApp invite or reset).
            'password' => Str::password(24),
        ]);

        $this->addSchoolMember->handle($user, ['parent']);

        return Guardian::create([
            'user_id' => $user->id,
            'occupation' => $data['occupation'] ?? null,
        ]);
    }

    /**
     * "Mpho Mokoena" -> "mpho4821". Always starts with a letter so it can
     * never be mistaken for a phone number at login.
     */
    public static function uniqueUsername(string $name): string
    {
        $base = Str::of(Str::ascii($name))->lower()->replaceMatches('/[^a-z]/', ' ')->trim()->explode(' ')->first();
        $base = $base === '' || $base === null ? 'user' : substr($base, 0, 20);

        do {
            $username = $base.random_int(1000, 9999);
        } while (User::where('username', $username)->exists());

        return $username;
    }
}
