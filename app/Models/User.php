<?php

namespace App\Models;

use App\Support\PhoneNumber;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Spatie\Permission\Traits\HasRoles;

/**
 * A login and nothing more. What the person is to a school lives in staff,
 * guardians and students; what they may do lives in their roles, which are
 * scoped per school.
 *
 * @property int $id
 * @property string $name
 * @property string $username
 * @property string $phone
 * @property string|null $email
 * @property Carbon|null $email_verified_at
 * @property Carbon|null $phone_verified_at
 * @property string $password
 * @property string|null $avatar_path
 * @property Carbon|null $whatsapp_opted_out_at
 * @property Carbon|null $last_login_at
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'username', 'phone', 'email', 'password'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasRoles, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'whatsapp_opted_out_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            /* @chisel-2fa */
            'two_factor_confirmed_at' => 'datetime',
            /* @end-chisel-2fa */
        ];
    }

    /**
     * Always stored as "+26658123456" so phone logins match.
     *
     * @return Attribute<string, string>
     */
    protected function phone(): Attribute
    {
        return Attribute::set(fn (?string $value) => PhoneNumber::normalize($value));
    }

    /**
     * @return Attribute<string, string>
     */
    protected function username(): Attribute
    {
        return Attribute::set(fn (?string $value) => $value === null ? null : strtolower(trim($value)));
    }

    /**
     * @return Attribute<string|null, string|null>
     */
    protected function email(): Attribute
    {
        return Attribute::set(fn (?string $value) => blank($value) ? null : strtolower(trim($value)));
    }

    public function canReceiveWhatsApp(): bool
    {
        return $this->whatsapp_opted_out_at === null;
    }

    /**
     * @return BelongsToMany<School, $this>
     */
    public function schools(): BelongsToMany
    {
        return $this->belongsToMany(School::class)
            ->withPivot(['status', 'invited_at', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * IDs of schools this login is an active member of.
     *
     * @return list<int>
     */
    public function activeSchoolIds(): array
    {
        return array_values($this->schools()
            ->wherePivot('status', 'active')
            ->where('schools.status', 'active')
            ->orderBy('schools.id')
            ->pluck('schools.id')
            ->map(fn ($id) => (int) $id)
            ->all());
    }

    /**
     * Staff records, one per school this person works at.
     *
     * @return HasMany<Staff, $this>
     */
    public function staffProfiles(): HasMany
    {
        return $this->hasMany(Staff::class);
    }

    /**
     * Guardian records, one per school this person has children at.
     *
     * @return HasMany<Guardian, $this>
     */
    public function guardianProfiles(): HasMany
    {
        return $this->hasMany(Guardian::class);
    }

    /**
     * @return HasOne<Student, $this>
     */
    public function studentProfile(): HasOne
    {
        return $this->hasOne(Student::class);
    }

    /**
     * @return HasMany<NotificationMessage, $this>
     */
    public function notificationMessages(): HasMany
    {
        return $this->hasMany(NotificationMessage::class);
    }
}
