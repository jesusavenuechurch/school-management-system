<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A student's placement in a classroom. Moving class mid-year closes the old
 * row (left_on + status) and opens a new one, keeping the history.
 *
 * @property CarbonInterface $enrolled_on
 * @property CarbonInterface|null $left_on
 */
class StudentEnrollment extends Model
{
    use BelongsToSchool;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'enrolled_on' => 'date',
            'left_on' => 'date',
        ];
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<Classroom, $this>
     */
    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }
}
