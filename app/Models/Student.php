<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * @property string|null $card_code
 * @property CarbonInterface|null $date_of_birth
 * @property CarbonInterface|null $admission_date
 * @property-read int $guardians_count
 */
class Student extends Model
{
    use BelongsToSchool, SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
            'admission_date' => 'date',
        ];
    }

    /**
     * Address of the (private) photo, with a version so a new photo isn't
     * hidden by the browser's cache.
     *
     * @return Attribute<string|null, never>
     */
    protected function photoUrl(): Attribute
    {
        return Attribute::get(fn () => $this->photo_path
            ? route('students.photo', ['student' => $this->id, 'v' => $this->updated_at?->getTimestamp()])
            : null);
    }

    /**
     * The code behind the QR on the student's ID card, created the first
     * time a card is printed.
     */
    public function cardCode(): string
    {
        if ($this->card_code === null) {
            do {
                $code = Str::lower(Str::random(16));
            } while (static::withoutSchoolScope()->withTrashed()->where('card_code', $code)->exists());

            $this->forceFill(['card_code' => $code])->saveQuietly();
        }

        return $this->card_code;
    }

    /**
     * @return Attribute<string, never>
     */
    protected function fullName(): Attribute
    {
        return Attribute::get(fn () => trim(implode(' ', array_filter([
            $this->first_name, $this->middle_name, $this->last_name,
        ]))));
    }

    /**
     * The student's own login, if the school gave them one.
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsToMany<Guardian, $this, StudentGuardian>
     */
    public function guardians(): BelongsToMany
    {
        return $this->belongsToMany(Guardian::class, 'student_guardians')
            ->using(StudentGuardian::class)
            ->withPivot(['id', 'school_id', 'relationship', 'is_primary_contact', 'can_pickup', 'receives_notifications'])
            ->withTimestamps();
    }

    /**
     * @return HasMany<StudentEnrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentEnrollment::class);
    }

    /**
     * The placement that is open right now (not yet left).
     *
     * @return HasOne<StudentEnrollment, $this>
     */
    public function currentEnrollment(): HasOne
    {
        // The filter must go inside ofMany, so it applies to the aggregate too;
        // otherwise a closed placement with a later date would hide this one.
        return $this->hasOne(StudentEnrollment::class)->ofMany(
            ['enrolled_on' => 'max', 'id' => 'max'],
            fn ($query) => $query->whereNull('left_on')->where('status', 'active'),
        );
    }

    /**
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    /**
     * @return HasMany<ExamResult, $this>
     */
    public function examResults(): HasMany
    {
        return $this->hasMany(ExamResult::class);
    }

    /**
     * @return HasMany<ReportCard, $this>
     */
    public function reportCards(): HasMany
    {
        return $this->hasMany(ReportCard::class);
    }

    /**
     * @return HasMany<Invoice, $this>
     */
    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    /**
     * One more than the highest number in use, keeping its prefix and
     * padding ("MPS-0041" -> "MPS-0042"). The first learner gets e.g.
     * "20270001".
     */
    public static function suggestAdmissionNumber(): string
    {
        $latest = static::withTrashed()->latest('id')->value('admission_number');

        if ($latest === null || ! preg_match('/^(.*?)(\d+)$/', $latest, $m)) {
            return now()->format('Y').'0001';
        }

        $prefix = $m[1];
        $highest = static::withTrashed()
            ->where('admission_number', 'like', $prefix.'%')
            ->pluck('admission_number')
            ->map(fn ($n) => preg_match('/^'.preg_quote($prefix, '/').'(\d+)$/', $n, $x) ? (int) $x[1] : 0)
            ->max();

        do {
            $candidate = $prefix.str_pad((string) ++$highest, strlen($m[2]), '0', STR_PAD_LEFT);
        } while (static::withTrashed()->where('admission_number', $candidate)->exists());

        return $candidate;
    }
}
