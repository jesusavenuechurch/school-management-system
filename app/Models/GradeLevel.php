<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GradeLevel extends Model
{
    use BelongsToSchool;

    protected $guarded = ['id'];

    /**
     * @return HasMany<Classroom, $this>
     */
    public function classrooms(): HasMany
    {
        return $this->hasMany(Classroom::class);
    }

    /**
     * @return HasMany<GradingScale, $this>
     */
    public function gradingScales(): HasMany
    {
        return $this->hasMany(GradingScale::class);
    }
}
