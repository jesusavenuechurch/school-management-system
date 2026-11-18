<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * @property list<string>|null $levels
 * @property list<string>|null $setup_skipped
 * @property CarbonInterface|null $verified_at
 * @property CarbonInterface|null $published_at
 * @property CarbonInterface|null $setup_completed_at
 */
class School extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'levels' => 'array',
            'setup_skipped' => 'array',
            'verified_at' => 'datetime',
            'published_at' => 'datetime',
            'setup_completed_at' => 'datetime',
            'report_shows_position' => 'boolean',
            'test_weight' => 'integer',
            'accepts_applications' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (self $school) {
            $school->slug ??= self::uniqueSlug($school->name);
        });
    }

    /**
     * "Sunrise Combined School" -> "sunrise-combined-school", with a number
     * added if another school already has it.
     */
    public static function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'school';
        $slug = $base;
        $n = 2;

        while (static::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$n}";
            $n++;
        }

        return $slug;
    }

    public function isVerified(): bool
    {
        return $this->verified_at !== null;
    }

    /**
     * The public page shows the school's details only once it is verified
     * and published, so nobody can pose as a real school.
     */
    public function isPublic(): bool
    {
        return $this->isVerified() && $this->published_at !== null;
    }

    public function hasLevel(string $level): bool
    {
        return in_array($level, $this->levels ?? [], true);
    }

    /**
     * @return Attribute<string|null, never>
     */
    protected function logoUrl(): Attribute
    {
        return Attribute::get(fn () => $this->logo_path ? Storage::disk('public')->url($this->logo_path) : null);
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['status', 'invited_at', 'joined_at'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<Staff, $this>
     */
    public function staff(): HasMany
    {
        return $this->hasMany(Staff::class);
    }

    /**
     * @return HasMany<Student, $this>
     */
    public function students(): HasMany
    {
        return $this->hasMany(Student::class);
    }

    /**
     * @return HasMany<Guardian, $this>
     */
    public function guardians(): HasMany
    {
        return $this->hasMany(Guardian::class);
    }

    /**
     * @return HasMany<AcademicYear, $this>
     */
    public function academicYears(): HasMany
    {
        return $this->hasMany(AcademicYear::class);
    }
}
