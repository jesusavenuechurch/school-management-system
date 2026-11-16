<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One band of a grading scale, e.g. "A" from 80%. Belongs to a school
 * through its scale, so it has no school_id of its own.
 */
class GradeBand extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'min_percentage' => 'decimal:2',
            'is_pass' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<GradingScale, $this>
     */
    public function gradingScale(): BelongsTo
    {
        return $this->belongsTo(GradingScale::class);
    }
}
