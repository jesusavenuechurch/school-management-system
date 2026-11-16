<?php

namespace App\Http\Controllers\Setup;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\Staff;
use App\Models\Subject;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The "Grades & classes" page: grade levels, and the classes in each for
 * the selected school year.
 */
class ClassStructureController extends Controller
{
    use ScopesToSchool;

    public function __invoke(Request $request): Response
    {
        $years = AcademicYear::query()->orderByDesc('start_date')->get(['id', 'name', 'is_current']);

        $year = $years->firstWhere('id', $request->integer('year'))
            ?? $years->firstWhere('is_current', true)
            ?? $years->first();

        return Inertia::render('setup/classes', [
            'subjects' => Subject::query()->orderBy('name')->get(['id', 'name', 'code']),
            'years' => $years,
            'selectedYearId' => $year?->id,
            'gradeLevels' => GradeLevel::query()
                ->orderBy('sort_order')
                ->orderBy('id')
                ->with(['classrooms' => fn ($q) => $q
                    ->where('academic_year_id', $year?->id)
                    ->with(['classTeacher.user:id,name', 'subjectTeachers:id,classroom_id,subject_id,staff_id'])
                    ->withCount(['enrollments as students_count' => fn ($e) => $e->whereNull('left_on')])
                    ->orderBy('name'),
                ])
                ->get()
                ->map(fn (GradeLevel $grade) => [
                    'id' => $grade->id,
                    'name' => $grade->name,
                    'sort_order' => $grade->sort_order,
                    'classrooms' => $grade->classrooms->map(fn (Classroom $class) => [
                        'id' => $class->id,
                        'name' => $class->name,
                        'capacity' => $class->capacity,
                        'room' => $class->room,
                        'class_teacher_id' => $class->class_teacher_id,
                        'class_teacher_name' => $class->classTeacher?->user?->name,
                        'students_count' => $class->students_count,
                        'subjects' => $class->subjectTeachers->map(fn ($a) => [
                            'subject_id' => $a->subject_id,
                            'staff_id' => $a->staff_id,
                        ])->values(),
                    ]),
                ]),
            'teachers' => Staff::query()
                ->where('employment_status', 'active')
                ->with('user:id,name')
                ->get()
                ->map(fn (Staff $staff) => ['value' => (string) $staff->id, 'label' => $staff->user->name])
                ->sortBy('label')
                ->values(),
        ]);
    }
}
