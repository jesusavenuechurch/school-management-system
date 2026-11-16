<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Who teaches which subject in which classroom.
 */
class ClassSubjectTeacher extends Model
{
    use BelongsToSchool;

    protected $table = 'class_subject_teacher';

    protected $guarded = ['id'];

    protected static function booted(): void
    {
        // academic_year_id is copied from the classroom for fast lookups.
        static::saving(function (self $model) {
            if ($model->isDirty('classroom_id')) {
                $model->academic_year_id = Classroom::withoutSchoolScope()
                    ->whereKey($model->classroom_id)
                    ->value('academic_year_id');
            }
        });
    }

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return BelongsTo<Subject, $this>
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * @return BelongsTo<Staff, $this>
     */
    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }
}
