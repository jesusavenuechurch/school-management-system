<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Anyone the school employs. Their job (teacher, accountant...) comes from
 * the roles on their user, scoped to this school.
 *
 * @property CarbonInterface|null $employment_date
 * @property CarbonInterface|null $date_of_birth
 */
class Staff extends Model
{
    use BelongsToSchool, SoftDeletes;

    protected $table = 'staff';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'employment_date' => 'date',
            'date_of_birth' => 'date',
        ];
    }

    /**
     * The next free staff number for the current school, like STF0007.
     */
    public static function nextNumber(): string
    {
        $n = static::withTrashed()->count() + 1;

        do {
            $number = sprintf('STF%04d', $n++);
        } while (static::withTrashed()->where('staff_number', $number)->exists());

        return $number;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return HasMany<ClassSubjectTeacher, $this>
     */
    public function teachingAssignments(): HasMany
    {
        return $this->hasMany(ClassSubjectTeacher::class);
    }

    /**
     * @return HasMany<Classroom, $this>
     */
    public function homeroomClasses(): HasMany
    {
        return $this->hasMany(Classroom::class, 'class_teacher_id');
    }
}
