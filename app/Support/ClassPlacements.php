<?php

namespace App\Support;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradeLevel;

/**
 * This year's grades and their classes with how many learners each has
 * and can take, for choosing where to place a learner.
 */
class ClassPlacements
{
    /**
     * @return list<array{id: int, name: string, classes: list<array{id: int, name: string, learners: int, capacity: int|null}>}>
     */
    public static function grades(): array
    {
        $year = AcademicYear::query()->orderByDesc('is_current')->orderByDesc('start_date')->first();

        if ($year === null) {
            return [];
        }

        $classes = Classroom::query()
            ->where('academic_year_id', $year->id)
            ->withCount(['enrollments as learners' => fn ($q) => $q->whereNull('left_on')])
            ->orderBy('name')
            ->get(['id', 'name', 'grade_level_id', 'capacity']);

        return GradeLevel::query()
            ->whereIn('id', $classes->pluck('grade_level_id'))
            ->orderBy('sort_order')
            ->get(['id', 'name'])
            ->map(fn (GradeLevel $grade) => [
                'id' => $grade->id,
                'name' => $grade->name,
                'classes' => $classes->where('grade_level_id', $grade->id)->map(fn (Classroom $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'learners' => (int) $c->learners,
                    'capacity' => $c->capacity,
                ])->values()->all(),
            ])
            ->values()
            ->all();
    }

    /**
     * "Grade 8A · 12 of 40" (or "· 12 learners" without a capacity).
     */
    public static function label(string $name, int $learners, ?int $capacity): string
    {
        return $capacity
            ? "{$name} · {$learners} of {$capacity}".($learners >= $capacity ? ' (full)' : '')
            : "{$name} · {$learners} ".($learners === 1 ? 'learner' : 'learners');
    }
}
