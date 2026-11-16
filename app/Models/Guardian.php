<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A parent or caregiver at one school. Each person gets their own guardian
 * row and login, even when sharing a phone, so pickup, notifications and
 * payments can be managed per person (e.g. shared custody).
 *
 * @property-read StudentGuardian $pivot
 */
class Guardian extends Model
{
    use BelongsToSchool, SoftDeletes;

    protected $guarded = ['id'];

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsToMany<Student, $this, StudentGuardian>
     */
    public function students(): BelongsToMany
    {
        return $this->belongsToMany(Student::class, 'student_guardians')
            ->using(StudentGuardian::class)
            ->withPivot(['id', 'school_id', 'relationship', 'is_primary_contact', 'can_pickup', 'receives_notifications'])
            ->withTimestamps();
    }
}
