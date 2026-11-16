<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read int $students_count
 */
class Classroom extends Model
{
    use BelongsToSchool;

    protected $guarded = ['id'];

    /**
     * @return BelongsTo<GradeLevel, $this>
     */
    public function gradeLevel(): BelongsTo
    {
        return $this->belongsTo(GradeLevel::class);
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * @return BelongsTo<Staff, $this>
     */
    public function classTeacher(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'class_teacher_id');
    }

    /**
     * @return HasMany<ClassSubjectTeacher, $this>
     */
    public function subjectTeachers(): HasMany
    {
        return $this->hasMany(ClassSubjectTeacher::class);
    }

    /**
     * @return HasMany<StudentEnrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(StudentEnrollment::class);
    }

    /**
     * The grading scale for this class: one set for its grade level,
     * otherwise the school's default.
     */
    public function gradingScale(): ?GradingScale
    {
        return GradingScale::query()
            ->where('school_id', $this->school_id)
            ->where(fn ($q) => $q->where('grade_level_id', $this->grade_level_id)->orWhereNull('grade_level_id'))
            ->orderByRaw('grade_level_id is null') // grade-specific first
            ->orderByDesc('is_default')
            ->first();
    }
}
