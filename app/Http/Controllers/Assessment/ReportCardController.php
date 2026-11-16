<?php

namespace App\Http\Controllers\Assessment;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\ReportCard;
use App\Models\School;
use App\Models\Staff;
use App\Models\Student;
use App\Models\Term;
use App\Support\StudentCard;
use App\Support\TermReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Term report cards for a class. Admins see every class; class teachers
 * see their own class and write its class teacher remarks.
 */
class ReportCardController extends Controller
{
    use ScopesToSchool;

    public function index(Request $request): Response
    {
        [$terms, $term] = $this->terms($request);
        $classrooms = $term ? $this->classroomsFor($request, $term) : collect();
        $classroom = $classrooms->firstWhere('id', $request->integer('classroom'))
            ?? $classrooms->firstWhere(fn (Classroom $c) => $c->learners_count > 0)
            ?? $classrooms->first();
        $report = $term && $classroom ? new TermReport($term, $classroom) : null;
        $school = School::findOrFail($this->schoolId());

        return Inertia::render('reports/index', [
            'terms' => $terms,
            'selectedTermId' => $term?->id,
            'classrooms' => $classrooms->map(fn (Classroom $c) => ['value' => (string) $c->id, 'label' => $c->name])->values(),
            'selectedClassroomId' => $classroom?->id,
            'exams' => $report?->examColumns() ?? [],
            'learners' => $report?->learners ?? [],
            'rankedCount' => $report?->rankedCount() ?? 0,
            'hasScale' => $report?->scale !== null,
            'showsPosition' => $school->report_shows_position,
            'isAdmin' => $request->user()->hasRole('admin'),
            'published' => $report !== null && $report->learners !== [] && collect($report->learners)->every(fn ($l) => $l['published_at'] !== null),
        ]);
    }

    public function print(Request $request): Response
    {
        [, $term] = $this->terms($request);
        abort_if($term === null, 404);

        $studentId = $request->integer('student') ?: null;

        if ($studentId !== null) {
            $student = Student::with('currentEnrollment')->findOrFail($studentId);
            $classroom = Classroom::findOrFail($request->integer('classroom') ?: $student->currentEnrollment?->classroom_id);
        } else {
            $classroom = Classroom::findOrFail($request->integer('classroom'));
        }

        $this->authorizeClass($request, $classroom);
        abort_unless($classroom->academic_year_id === $term->academic_year_id, 404);

        $report = new TermReport($term, $classroom);
        $school = School::findOrFail($this->schoolId());
        $learners = collect($report->learners)
            ->when($studentId, fn (Collection $c) => $c->where('student.id', $studentId))
            ->values();

        abort_if($learners->isEmpty(), 404);

        return Inertia::render('reports/print', [
            'school' => [...StudentCard::school($school), 'shows_position' => $school->report_shows_position],
            'term' => ['name' => $term->name, 'year' => $term->academicYear?->name],
            'classroom' => [
                'name' => $classroom->name,
                'class_teacher' => $classroom->classTeacher?->user?->name,
            ],
            'exams' => $report->examColumns(),
            'learners' => $learners,
            'rankedCount' => $report->rankedCount(),
            'scaleKey' => $report->scaleKey(),
            'backUrl' => route('reports.index', ['term' => $term->id, 'classroom' => $classroom->id]),
        ]);
    }

    public function remarks(Request $request, Term $term, Student $student): RedirectResponse
    {
        $classroom = Classroom::findOrFail($request->integer('classroom_id'));
        $isAdmin = $this->authorizeClass($request, $classroom);

        $data = $request->validate([
            'classroom_id' => ['required'],
            'class_teacher_remark' => ['nullable', 'string', 'max:600'],
            'head_teacher_remark' => ['nullable', 'string', 'max:600'],
        ]);

        abort_unless(TermReport::learnersOf($classroom, $term)->contains('id', $student->id), 404);

        $card = ReportCard::firstOrNew(['student_id' => $student->id, 'term_id' => $term->id]);
        $card->classroom_id = $classroom->id;
        $card->class_teacher_remark = $data['class_teacher_remark'] ?? null;

        // Only the head (an admin) writes the head teacher's remark.
        if ($isAdmin) {
            $card->head_teacher_remark = $data['head_teacher_remark'] ?? null;
        }

        $card->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Remarks saved for :name.', ['name' => $student->first_name])]);

        return back();
    }

    /**
     * Saves each learner's average, symbol, position and attendance as they
     * stand now, and marks the reports as issued.
     */
    public function publish(Request $request, Term $term, Classroom $classroom): RedirectResponse
    {
        $report = new TermReport($term, $classroom);
        $publish = $request->boolean('published', true);

        DB::transaction(function () use ($report, $term, $classroom, $publish) {
            foreach ($report->learners as $learner) {
                $card = ReportCard::firstOrNew(['student_id' => $learner['student']['id'], 'term_id' => $term->id]);
                $card->fill([
                    'classroom_id' => $classroom->id,
                    'overall_average' => $learner['average'],
                    'overall_grade_label' => $learner['symbol'],
                    'position' => $learner['position'],
                    'days_present' => $learner['days_present'],
                    'days_absent' => $learner['days_absent'],
                    'published_at' => $publish ? ($card->published_at ?? now()) : null,
                ])->save();
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => $publish
            ? __('Reports for :class are issued.', ['class' => $classroom->name])
            : __('Reports for :class are back to draft.', ['class' => $classroom->name])]);

        return back();
    }

    public function settings(Request $request): RedirectResponse
    {
        $data = $request->validate(['report_shows_position' => ['required', 'boolean']]);

        School::findOrFail($this->schoolId())->update($data);

        return back();
    }

    /**
     * @return array{0: list<array{value: string, label: string}>, 1: Term|null}
     */
    private function terms(Request $request): array
    {
        $terms = Term::query()->with('academicYear:id,name')->orderByDesc('start_date')->get();
        $term = $terms->firstWhere('id', $request->integer('term'))
            ?? $terms->firstWhere('is_current', true)
            ?? $terms->first();

        return [
            $terms->map(fn (Term $t) => [
                'value' => (string) $t->id,
                'label' => "{$t->name}, {$t->academicYear?->name}".($t->is_current ? ' (current)' : ''),
            ])->values()->all(),
            $term,
        ];
    }

    /**
     * @return Collection<int, Classroom>
     */
    private function classroomsFor(Request $request, Term $term): Collection
    {
        $staff = Staff::where('user_id', $request->user()->id)->first();

        return Classroom::query()
            ->where('academic_year_id', $term->academic_year_id)
            ->unless($request->user()->hasRole('admin'), fn ($q) => $q->where('class_teacher_id', $staff?->id ?? 0))
            ->withCount(['enrollments as learners_count' => fn ($q) => $q->whereNull('left_on')])
            ->orderBy(GradeLevel::select('sort_order')->whereColumn('grade_levels.id', 'classrooms.grade_level_id'))
            ->orderBy('name')
            ->get();
    }

    /** Returns whether the user is an admin. */
    private function authorizeClass(Request $request, Classroom $classroom): bool
    {
        if ($request->user()->hasRole('admin')) {
            return true;
        }

        $staff = Staff::where('user_id', $request->user()->id)->first();
        abort_unless($staff !== null && $classroom->class_teacher_id === $staff->id, 403);

        return false;
    }
}
