<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * @property list<string> $roles
 * @property CarbonInterface $expires_at
 * @property CarbonInterface|null $last_sent_at
 * @property CarbonInterface|null $accepted_at
 */
class StaffInvitation extends Model
{
    use BelongsToSchool;

    public const DAYS_VALID = 14;

    protected $guarded = ['id'];

    protected $hidden = ['token', 'token_hash'];

    protected function casts(): array
    {
        return [
            'roles' => 'array',
            'token' => 'encrypted',
            'expires_at' => 'datetime',
            'last_sent_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    /**
     * A new invitation with a fresh random link.
     *
     * @param  array<string, mixed>  $attributes
     */
    public static function issue(array $attributes): self
    {
        $token = Str::random(48);

        return self::create([
            ...$attributes,
            'token' => $token,
            'token_hash' => hash('sha256', $token),
            'expires_at' => now()->addDays(self::DAYS_VALID),
        ]);
    }

    /**
     * Find an invitation from the link, across all schools (the person
     * opening it isn't signed in to any school yet).
     */
    public static function findByToken(string $token): ?self
    {
        return self::withoutSchoolScope()->where('token_hash', hash('sha256', $token))->first();
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->whereNull('accepted_at');
    }

    public function isUsable(): bool
    {
        return $this->accepted_at === null && $this->expires_at->isFuture();
    }

    public function url(): string
    {
        return route('invitations.show', $this->token);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }
}
