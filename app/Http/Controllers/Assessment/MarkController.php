<?php

namespace App\Http\Controllers\Assessment;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\ClassSubjectTeacher;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\GradeLevel;
use App\Models\School;
use App\Models\Staff;
use App\Models\Subject;
use App\Models\Term;
use App\Support\Constants;
use App\Support\TermReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The marks workspace: this term's tests, setting a new one, and the mark
 * sheet for one class and subject. Teachers see the classes and subjects
 * they teach; admins see everything.
 */
class MarkController extends Controller
{
    use ScopesToSchool;

    public function index(Request $request): Response
    {
        $terms = Term::query()->with('academicYear:id,name,start_date')->orderByDesc('start_date')->get();
        $term = $terms->firstWhere('id', $request->integer('term'))
            ?? $terms->firstWhere('is_current', true)
            ?? $terms->first();

        $isAdmin = $request->user()->hasRole('admin');
        $staff = Staff::where('user_id', $request->user()->id)->first();
        $previous = $term ? ExamController::previousTerm($term) : null;

        return Inertia::render('marks/index', [
            'terms' => $terms->map(fn (Term $t) => [
                'value' => (string) $t->id,
                'label' => "{$t->name}, {$t->academicYear?->name}".($t->is_current ? ' (current)' : ''),
            ]),
            'term' => $term ? ['id' => $term->id, 'name' => $term->name] : null,
            'tests' => $term ? $this->tests($term, $staff, $isAdmin) : [],
            'choices' => $term ? $this->choices($term, $staff, $isAdmin) : ['grades' => [], 'subjects' => []],
            'kinds' => Constants::selectOptions('assessment_kinds'),
            'previousTerm' => $previous && Exam::where('term_id', $previous->id)->exists()
                ? "{$previous->name}, {$previous->academicYear?->name}"
                : null,
            'testWeight' => School::findOrFail($this->schoolId())->test_weight,
            'isAdmin' => $isAdmin,
        ]);
    }

    public function show(Request $request, Exam $exam, Classroom $classroom, Subject $subject): Response
    {
        $this->authorizeSheet($request, $exam, $classroom, $subject);

        $students = TermReport::learnersOf($classroom);
        $results = ExamResult::query()
            ->where('exam_id', $exam->id)
            ->where('subject_id', $subject->id)
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->keyBy('student_id');

        $scale = $classroom->gradingScale();

        return Inertia::render('marks/sheet', [
            'exam' => ['id' => $exam->id, 'name' => $exam->name, 'term' => $exam->term?->name],
            'classroom' => ['id' => $classroom->id, 'name' => $classroom->name],
            'subject' => ['id' => $subject->id, 'name' => $subject->name, 'code' => $subject->code],
            'outOf' => (float) ($results->first()?->max_score ?? $exam->max_score),
            'learners' => $students->map(fn ($student) => [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'admission_number' => $student->admission_number,
                'photo_url' => $student->photo_url,
                'score' => $results->has($student->id) ? (float) $results[$student->id]->score : null,
                'remarks' => $results->get($student->id)?->remarks,
            ])->values(),
            'bands' => $scale?->bands->map(fn ($band) => [
                'label' => $band->label,
                'min_percentage' => (float) $band->min_percentage,
                'is_pass' => $band->is_pass,
            ])->values() ?? [],
            'backUrl' => route('marks.index', ['term' => $exam->term_id]),
        ]);
    }

    public function save(Request $request, Exam $exam, Classroom $classroom, Subject $subject): RedirectResponse
    {
        $staff = $this->authorizeSheet($request, $exam, $classroom, $subject);
        $studentIds = TermReport::learnersOf($classroom)->pluck('id')->all();

        $data = $request->validate([
            'out_of' => ['required', 'numeric', 'min:1', 'max:1000'],
            'marks' => ['array'],
            'marks.*' => ['nullable', 'numeric', 'min:0', 'lte:out_of'],
        ], [
            'marks.*.lte' => __('A mark can\'t be more than the total.'),
        ], [
            'out_of' => 'total',
            'marks.*' => 'mark',
        ]);

        $scale = $classroom->gradingScale();
        $saved = 0;

        DB::transaction(function () use ($data, $studentIds, $exam, $subject, $scale, $staff, &$saved) {
            foreach ($data['marks'] ?? [] as $studentId => $score) {
                if (! in_array((int) $studentId, $studentIds, true)) {
                    continue;
                }

                $match = ['exam_id' => $exam->id, 'student_id' => (int) $studentId, 'subject_id' => $subject->id];

                if ($score === null || $score === '') {
                    ExamResult::where($match)->delete();

                    continue;
                }

                $result = ExamResult::firstOrNew($match);
                $result->fill(['score' => $score, 'max_score' => $data['out_of'], 'recorded_by' => $staff?->id]);

                if ($scale !== null) {
                    $result->applyGrade($scale);
                }

                $result->save();
                $saved++;
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => trans_choice(':count mark saved.|:count marks saved.', $saved)]);

        return back();
    }

    /**
     * The sheet must belong to the test (one of its classes, and its subject
     * when it has one). Admins may mark any of them; teachers only the
     * subjects they teach in that class.
     */
    private function authorizeSheet(Request $request, Exam $exam, Classroom $classroom, Subject $subject): ?Staff
    {
        abort_unless($exam->classrooms()->whereKey($classroom->id)->exists(), 404);
        abort_unless($exam->subject_id === null || $exam->subject_id === $subject->id, 404);

        $staff = Staff::where('user_id', $request->user()->id)->first();

        if ($request->user()->hasRole('admin')) {
            return $staff;
        }

        abort_unless($staff !== null && ClassSubjectTeacher::query()
            ->where('classroom_id', $classroom->id)
            ->where('subject_id', $subject->id)
            ->where('staff_id', $staff->id)
            ->exists(), 403);

        return $staff;
    }

    /**
     * This term's tests, newest first, each with its mark sheets (a class and
     * subject) and how many marks are in so far. Teachers only see the tests
     * that have a sheet for them.
     *
     * @return list<array<string, mixed>>
     */
    private function tests(Term $term, ?Staff $staff, bool $isAdmin): array
    {
        $exams = Exam::query()
            ->where('term_id', $term->id)
            ->with(['classrooms:id,name,grade_level_id', 'gradeLevel:id,name', 'subject:id,name,code'])
            ->withCount('results')
            ->orderByDesc('start_date')
            ->orderByDesc('id')
            ->get();

        $assignments = ClassSubjectTeacher::query()
            ->where('academic_year_id', $term->academic_year_id)
            ->with(['subject:id,name,code', 'staff.user:id,name'])
            ->get()
            ->groupBy('classroom_id');

        $filled = ExamResult::query()
            ->whereIn('exam_id', $exams->pluck('id'))
            ->join('student_enrollments', function ($join) {
                $join->on('student_enrollments.student_id', '=', 'exam_results.student_id')->whereNull('student_enrollments.left_on');
            })
            ->selectRaw('exam_results.exam_id, student_enrollments.classroom_id, exam_results.subject_id, count(*) as filled')
            ->groupBy('exam_results.exam_id', 'student_enrollments.classroom_id', 'exam_results.subject_id')
            ->get()
            ->mapWithKeys(fn ($row) => ["{$row->exam_id}-{$row->classroom_id}-{$row->subject_id}" => (int) $row->filled]);

        $sizes = $this->classSizes($exams->flatMap->classrooms->pluck('id')->unique());

        return $exams->map(function (Exam $exam) use ($assignments, $filled, $sizes, $staff, $isAdmin) {
            $classes = $exam->classrooms->sortBy('name')->map(function (Classroom $classroom) use ($exam, $assignments, $filled, $staff, $isAdmin) {
                /** @var Collection<int, ClassSubjectTeacher> $taught */
                $taught = $assignments->get($classroom->id, collect());

                $subjects = $exam->subject !== null
                    ? collect([['subject' => $exam->subject, 'assignment' => $taught->firstWhere('subject_id', $exam->subject_id)]])
                    : $taught->sortBy('subject.name')->map(fn (ClassSubjectTeacher $a) => ['subject' => $a->subject, 'assignment' => $a]);

                $sheets = $subjects
                    ->filter(fn ($s) => $isAdmin || ($staff !== null && $s['assignment']?->staff_id === $staff->id))
                    ->map(fn ($s) => [
                        'subject' => ['id' => $s['subject']->id, 'name' => $s['subject']->name, 'code' => $s['subject']->code],
                        'teacher' => $s['assignment']?->staff?->user?->name,
                        'filled' => $filled["{$exam->id}-{$classroom->id}-{$s['subject']->id}"] ?? 0,
                        'url' => route('marks.show', [$exam, $classroom, $s['subject']]),
                    ])
                    ->values();

                return [
                    'id' => $classroom->id,
                    'name' => $classroom->name,
                    'sheets' => $sheets,
                ];
            })->values();

            $visible = $classes->filter(fn ($c) => $c['sheets']->isNotEmpty() || $isAdmin)->values();

            return [
                'id' => $exam->id,
                'name' => $exam->name,
                'kind' => $exam->kind,
                'grade' => $exam->gradeLevel ? ['id' => $exam->gradeLevel->id, 'name' => $exam->gradeLevel->name] : null,
                'subject' => $exam->subject ? ['id' => $exam->subject->id, 'name' => $exam->subject->name] : null,
                'max_score' => (float) $exam->max_score,
                'start_date' => $exam->start_date?->toDateString(),
                'end_date' => $exam->end_date?->toDateString(),
                'classroom_ids' => $exam->classrooms->pluck('id')->values(),
                'results_count' => $exam->results_count,
                'can_edit' => $isAdmin || ($staff !== null && $exam->created_by === $staff->id),
                'classes' => $visible->map(fn ($c) => [...$c, 'learners' => $sizes[$c['id']] ?? 0]),
            ];
        })
            ->filter(fn ($t) => $isAdmin || $t['classes']->contains(fn ($c) => $c['sheets']->isNotEmpty()) || $t['can_edit'])
            ->values()
            ->all();
    }

    /**
     * What the person may choose when setting a test: grades with this
     * year's classes, and per class the subjects they may set it for
     * (null = any subject, for admins).
     *
     * @return array{grades: list<array<string, mixed>>, subjects: list<array{id: int, name: string}>}
     */
    private function choices(Term $term, ?Staff $staff, bool $isAdmin): array
    {
        $mine = $isAdmin ? null : ClassSubjectTeacher::query()
            ->where('academic_year_id', $term->academic_year_id)
            ->where('staff_id', $staff?->id ?? 0)
            ->get(['classroom_id', 'subject_id'])
            ->groupBy('classroom_id');

        $classes = Classroom::query()
            ->where('academic_year_id', $term->academic_year_id)
            ->when($mine !== null, fn ($q) => $q->whereIn('id', $mine->keys()))
            ->orderBy('name')
            ->get(['id', 'name', 'grade_level_id']);

        $grades = GradeLevel::query()
            ->whereIn('id', $classes->pluck('grade_level_id'))
            ->orderBy('sort_order')
            ->get(['id', 'name']);

        $subjectIds = $mine?->flatten(1)->pluck('subject_id')->unique();

        return [
            'grades' => $grades->map(fn (GradeLevel $grade) => [
                'id' => $grade->id,
                'name' => $grade->name,
                'classes' => $classes->where('grade_level_id', $grade->id)->map(fn (Classroom $c) => [
                    'id' => $c->id,
                    'name' => $c->name,
                    'subject_ids' => $mine?->get($c->id)->pluck('subject_id')->values(),
                ])->values(),
            ])->values()->all(),
            'subjects' => Subject::query()
                ->when($subjectIds !== null, fn ($q) => $q->whereIn('id', $subjectIds))
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Subject $s) => ['id' => $s->id, 'name' => $s->name])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  Collection<int, int>  $classroomIds
     * @return array<int, int>
     */
    private function classSizes(Collection $classroomIds): array
    {
        return Classroom::query()
            ->whereIn('id', $classroomIds)
            ->withCount(['enrollments as learners' => fn ($q) => $q->whereNull('left_on')])
            ->pluck('learners', 'id')
            ->all();
    }
}
