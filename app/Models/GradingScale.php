<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A school's own grading policy. Once results have been graded with a scale,
 * create a new scale for changes instead of editing its bands.
 */
class GradingScale extends Model
{
    use BelongsToSchool;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'is_default' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<GradeLevel, $this>
     */
    public function gradeLevel(): BelongsTo
    {
        return $this->belongsTo(GradeLevel::class);
    }

    /**
     * @return HasMany<GradeBand, $this>
     */
    public function bands(): HasMany
    {
        return $this->hasMany(GradeBand::class)->orderByDesc('min_percentage');
    }

    /**
     * The band a percentage falls into: the highest band whose minimum it
     * reaches. Bands have no upper limit, so there are never gaps.
     */
    public function bandFor(float $percentage): ?GradeBand
    {
        return $this->bands->first(
            fn (GradeBand $band) => $percentage >= (float) $band->min_percentage,
        );
    }
}
