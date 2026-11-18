<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Setup\SetupJourneyController;
use App\Models\AcademicYear;
use App\Models\Application;
use App\Models\Classroom;
use App\Models\ClassSubjectTeacher;
use App\Models\Guardian;
use App\Models\School;
use App\Models\Staff;
use App\Models\Student;
use App\Models\Term;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    use ScopesToSchool;

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $year = AcademicYear::where('is_current', true)->first();
        $term = Term::where('is_current', true)->first();

        $props = [
            'currentYear' => $year?->name,
            'currentTerm' => $term?->name,
            'isAdmin' => $user->hasRole('admin'),
        ];

        if ($props['isAdmin']) {
            $props['stats'] = [
                'students' => Student::where('status', 'active')->count(),
                'staff' => Staff::where('employment_status', 'active')->count(),
                'classes' => $year ? Classroom::where('academic_year_id', $year->id)->count() : 0,
                'guardians' => Guardian::count(),
            ];

            $school = School::findOrFail($this->schoolId());
            $props['setup'] = [
                'complete' => $school->setup_completed_at !== null,
                'steps' => app(SetupJourneyController::class)->steps($school, $user->id),
            ];
            $props['verified'] = $school->isVerified();
            $props['pendingApplications'] = Application::where('status', 'pending')->count();
            $props['publicPage'] = [
                'url' => route('schools.public', $school),
                'published' => $school->isPublic(),
            ];
        }

        $staff = Staff::where('user_id', $user->id)->first();

        if ($staff !== null && $year !== null) {
            $props['myClasses'] = Classroom::query()
                ->where('academic_year_id', $year->id)
                ->where(fn ($q) => $q
                    ->where('class_teacher_id', $staff->id)
                    ->orWhereIn('id', ClassSubjectTeacher::where('staff_id', $staff->id)->select('classroom_id')))
                ->withCount(['enrollments as students_count' => fn ($e) => $e->whereNull('left_on')])
                ->orderBy('name')
                ->get(['id', 'name', 'class_teacher_id'])
                ->map(fn (Classroom $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'students_count' => $c->students_count,
                    'is_class_teacher' => $c->class_teacher_id === $staff->id,
                ]);
        }

        $guardian = Guardian::where('user_id', $user->id)->first();

        if ($guardian !== null) {
            $props['myChildren'] = $guardian->students()
                ->with('currentEnrollment.classroom:id,name')
                ->get()
                ->map(fn (Student $s) => [
                    'id' => $s->id,
                    'full_name' => $s->full_name,
                    'classroom' => $s->currentEnrollment?->classroom?->name,
                ]);
        }

        return Inertia::render('dashboard', $props);
    }
}
