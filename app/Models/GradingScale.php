<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A school's marking scale: the symbols (A, B... or A*, A... U) and the
 * percentage each starts at. Grades point at the scale they use; the
 * default scale covers every other grade. Results copy their symbol when
 * marked, so editing a scale never changes marks already given.
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
     * @return HasMany<GradeLevel, $this>
     */
    public function gradeLevels(): HasMany
    {
        return $this->hasMany(GradeLevel::class);
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
