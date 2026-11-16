<?php

namespace App\Http\Controllers\People;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Http\Middleware\SetCurrentSchool;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\School;
use App\Models\Student;
use App\Support\Constants;
use App\Support\CurrentSchool;
use App\Support\StudentCard;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Printable student ID cards, and the page a staff member sees when they
 * scan the QR code on one.
 */
class StudentCardController extends Controller
{
    use ScopesToSchool;

    /** Who may open a scanned card. Parents can't look up other children. */
    private const STAFF_ROLES = ['admin', 'teacher', 'registrar', 'accountant'];

    /** A print sheet: one student, a whole class, or the first class. */
    public function index(Request $request): Response
    {
        $classrooms = $this->classroomOptions();
        $studentId = $request->integer('student') ?: null;
        $classroomId = $studentId ? null : ($request->integer('classroom') ?: (int) ($classrooms[0]['value'] ?? 0));

        $students = Student::query()
            ->with(['currentEnrollment.classroom.gradeLevel', 'currentEnrollment.academicYear'])
            ->when($studentId, fn (Builder $q) => $q->whereKey($studentId))
            ->when(! $studentId, fn (Builder $q) => $q
                ->where('status', 'active')
                ->whereHas('currentEnrollment', fn (Builder $e) => $e->where('classroom_id', $classroomId)))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->limit(200)
            ->get();

        abort_if($studentId !== null && $students->isEmpty(), 404);

        return Inertia::render('cards/print', [
            'school' => StudentCard::school($this->school()),
            'cards' => $students->map(fn (Student $student) => StudentCard::for($student))->values(),
            'classrooms' => $classrooms,
            'filters' => ['student' => $studentId, 'classroom' => $classroomId ?: null],
            'backUrl' => $studentId ? route('students.show', $studentId) : route('students.index'),
        ]);
    }

    /**
     * Scanning a card: staff of that school see who the child is and who
     * may collect them. Anyone else gets "not found".
     */
    public function check(Request $request, string $code, CurrentSchool $currentSchool): Response
    {
        $student = Student::withoutSchoolScope()->where('card_code', $code)->firstOrFail();
        $user = $request->user();

        abort_unless(in_array($student->school_id, $user->activeSchoolIds(), true), 404);

        // Work inside the card's school for the rest of this request (and after).
        $currentSchool->set($student->school_id);
        $request->session()->put(SetCurrentSchool::SESSION_KEY, $student->school_id);

        $user->unsetRelation('roles');
        abort_unless($user->hasAnyRole(self::STAFF_ROLES), 404);

        $student->load([
            'currentEnrollment.classroom.gradeLevel',
            'currentEnrollment.academicYear',
            'guardians.user:id,name,phone',
        ]);

        /** @var School $school */
        $school = School::query()->findOrFail($student->school_id);

        return Inertia::render('cards/check', [
            'school' => StudentCard::school($school),
            'student' => [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'photo_url' => $student->photo_url,
                'admission_number' => $student->admission_number,
                'classroom' => $student->currentEnrollment?->classroom?->name,
                'status' => $student->status,
                'is_active' => $student->status === 'active' && $student->trashed() === false,
            ],
            'collectors' => $student->guardians
                ->sortByDesc(fn (Guardian $g) => (bool) $g->pivot->is_primary_contact)
                ->values()
                ->map(fn (Guardian $guardian) => [
                    'id' => $guardian->id,
                    'name' => $guardian->user->name,
                    'phone' => $guardian->user->phone,
                    'relationship' => $guardian->pivot->relationship,
                    'can_pickup' => (bool) $guardian->pivot->can_pickup,
                    'is_primary_contact' => (bool) $guardian->pivot->is_primary_contact,
                ]),
            'relationshipLabels' => Constants::options('guardian_relationship'),
            'canManage' => $user->hasRole('admin'),
        ]);
    }

    private function school(): School
    {
        return School::query()->findOrFail($this->schoolId());
    }

    /**
     * @return list<array{value: string, label: string}>
     */
    private function classroomOptions(): array
    {
        $year = AcademicYear::query()->orderByDesc('is_current')->orderByDesc('start_date')->first();

        if ($year === null) {
            return [];
        }

        return array_values(Classroom::query()
            ->where('academic_year_id', $year->id)
            ->join('grade_levels', 'grade_levels.id', '=', 'classrooms.grade_level_id')
            ->orderBy('grade_levels.sort_order')
            ->orderBy('classrooms.name')
            ->get(['classrooms.id', 'classrooms.name'])
            ->map(fn (Classroom $c) => ['value' => (string) $c->id, 'label' => $c->name])
            ->all());
    }
}
