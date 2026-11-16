<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read int $students_count
 * @property-read int $learners_count
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
     * The marking scale for this class: its grade's scale, otherwise the
     * school's default (or any scale, if none is marked default).
     */
    public function gradingScale(): ?GradingScale
    {
        $scaleId = GradeLevel::withoutSchoolScope()->whereKey($this->grade_level_id)->value('grading_scale_id');

        return GradingScale::withoutSchoolScope()
            ->where('school_id', $this->school_id)
            ->when($scaleId, fn ($q) => $q->orderByRaw('id = ? desc', [$scaleId]))
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->with('bands')
            ->first();
    }
}
