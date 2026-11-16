<?php

namespace App\Http\Controllers\Concerns;

use App\Support\CurrentSchool;
use Illuminate\Validation\Rules\Exists;

trait ScopesToSchool
{
    protected function schoolId(): int
    {
        return (int) app(CurrentSchool::class)->id();
    }

    /**
     * An exists rule limited to the current school's rows, so a form can
     * never point at another school's class, subject or person.
     */
    protected function existsInSchool(string $table, string $column = 'id'): Exists
    {
        return (new Exists($table, $column))->where('school_id', $this->schoolId());
    }
}
