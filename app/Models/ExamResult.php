<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExamResult extends Model
{
    use BelongsToSchool;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'score' => 'decimal:2',
            'max_score' => 'decimal:2',
            'is_pass' => 'boolean',
        ];
    }

    /**
     * Grade bands compare against this, never the raw score.
     *
     * @return Attribute<float|null, never>
     */
    protected function percentage(): Attribute
    {
        return Attribute::get(fn () => (float) $this->max_score > 0
            ? round((float) $this->score / (float) $this->max_score * 100, 2)
            : null);
    }

    /**
     * Find the band for this result's percentage and copy its label, remark
     * and pass flag onto the result, so later scale edits don't change it.
     */
    public function applyGrade(GradingScale $scale): static
    {
        $band = $this->percentage === null ? null : $scale->bandFor($this->percentage);

        $this->grade_band_id = $band?->id;
        $this->grade_label = $band?->label;
        $this->grade_remark = $band?->remark;
        $this->is_pass = $band?->is_pass;

        return $this;
    }

    /**
     * @return BelongsTo<Exam, $this>
     */
    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<Subject, $this>
     */
    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    /**
     * @return BelongsTo<GradeBand, $this>
     */
    public function gradeBand(): BelongsTo
    {
        return $this->belongsTo(GradeBand::class);
    }

    /**
     * @return BelongsTo<Staff, $this>
     */
    public function recorder(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'recorded_by');
    }
}
