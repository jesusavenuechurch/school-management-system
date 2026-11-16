<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property-read int $class_assignments_count
 */
class Subject extends Model
{
    use BelongsToSchool;

    protected $guarded = ['id'];

    /**
     * @return BelongsTo<Department, $this>
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * @return HasMany<ClassSubjectTeacher, $this>
     */
    public function classAssignments(): HasMany
    {
        return $this->hasMany(ClassSubjectTeacher::class);
    }
}
