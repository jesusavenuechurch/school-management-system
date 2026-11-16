<?php

namespace App\Models\Concerns;

use App\Models\School;
use App\Support\CurrentSchool;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * For tables with a school_id column.
 *
 * While a current school is set, queries only see that school's rows and new
 * rows get its school_id automatically. Use withoutSchoolScope() for
 * deliberate cross-school queries (platform admin, reports).
 */
trait BelongsToSchool
{
    public static function bootBelongsToSchool(): void
    {
        static::addGlobalScope('school', function (Builder $query) {
            $current = app(CurrentSchool::class);

            if ($current->has()) {
                $query->where($query->qualifyColumn('school_id'), $current->id());
            }
        });

        static::creating(function ($model) {
            $current = app(CurrentSchool::class);

            if ($model->school_id === null && $current->has()) {
                $model->school_id = $current->id();
            }
        });
    }

    /**
     * @return BelongsTo<School, $this>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    /**
     * Model::withoutSchoolScope() — query across all schools.
     *
     * @param  Builder<static>  $query
     */
    public function scopeWithoutSchoolScope(Builder $query): void
    {
        $query->withoutGlobalScope('school');
    }
}
