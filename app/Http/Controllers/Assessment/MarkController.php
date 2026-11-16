<?php

namespace App\Http\Controllers\Assessment;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\ClassSubjectTeacher;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Staff;
use App\Models\Subject;
use App\Models\Term;
use App\Support\TermReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Entering marks: a teacher picks a test, then one of their classes and
 * subjects, and types a mark for each learner. Admins can mark any class.
 */
class MarkController extends Controller
{
    use ScopesToSchool;

    public function index(Request $request): Response
    {
        $terms = Term::query()->with('academicYear:id,name')->orderByDesc('start_date')->get();
        $term = $terms->firstWhere('id', $request->integer('term'))
            ?? $terms->firstWhere('is_current', true)
            ?? $terms->first();

        $exams = $term
            ? Exam::where('term_id', $term->id)->orderBy('start_date')->orderBy('id')->get(['id', 'academic_year_id', 'term_id', 'name', 'weight', 'start_date'])
            : collect();

        $exam = $exams->firstWhere('id', $request->integer('exam')) ?? $exams->last();

        return Inertia::render('marks/index', [
            'terms' => $terms->map(fn (Term $t) => [
                'value' => (string) $t->id,
                'label' => "{$t->name}, {$t->academicYear?->name}".($t->is_current ? ' (current)' : ''),
            ]),
            'selectedTermId' => $term?->id,
            'exams' => $exams->map(fn (Exam $e) => ['id' => $e->id, 'name' => $e->name]),
            'selectedExamId' => $exam?->id,
            'groups' => $exam ? $this->groups($request, $exam) : [],
            'isAdmin' => $request->user()->hasRole('admin'),
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
            'outOf' => (float) ($results->first()?->max_score ?? 100),
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
            'backUrl' => route('marks.index', ['term' => $exam->term_id, 'exam' => $exam->id]),
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
     * Admins may mark any class; teachers only the subjects they teach there.
     */
    private function authorizeSheet(Request $request, Exam $exam, Classroom $classroom, Subject $subject): ?Staff
    {
        abort_unless($exam->academic_year_id === $classroom->academic_year_id, 404);

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
     * The class and subject pairs this person marks for the exam, by class,
     * with how many marks are in so far.
     *
     * @return list<array<string, mixed>>
     */
    private function groups(Request $request, Exam $exam): array
    {
        $staff = Staff::where('user_id', $request->user()->id)->first();

        $assignments = ClassSubjectTeacher::query()
            ->where('academic_year_id', $exam->academic_year_id)
            ->unless($request->user()->hasRole('admin'), fn ($q) => $q->where('staff_id', $staff?->id ?? 0))
            ->with(['classroom:id,name,grade_level_id', 'classroom.gradeLevel:id,sort_order', 'subject:id,name,code', 'staff.user:id,name'])
            ->get()
            ->sortBy(fn ($a) => [$a->classroom->gradeLevel?->sort_order, $a->classroom->name, $a->subject->name]);

        $filled = ExamResult::query()
            ->where('exam_id', $exam->id)
            ->join('student_enrollments', function ($join) {
                $join->on('student_enrollments.student_id', '=', 'exam_results.student_id')->whereNull('student_enrollments.left_on');
            })
            ->selectRaw('student_enrollments.classroom_id, exam_results.subject_id, count(*) as filled')
            ->groupBy('student_enrollments.classroom_id', 'exam_results.subject_id')
            ->get()
            ->mapWithKeys(fn ($row) => ["{$row->classroom_id}-{$row->subject_id}" => (int) $row->filled]);

        $sizes = $this->classSizes($assignments->pluck('classroom_id')->unique());

        return $assignments
            ->groupBy('classroom_id')
            ->map(fn (Collection $items) => [
                'classroom' => ['id' => $items->first()->classroom->id, 'name' => $items->first()->classroom->name],
                'learners' => $sizes[$items->first()->classroom_id] ?? 0,
                'subjects' => $items->map(fn (ClassSubjectTeacher $a) => [
                    'id' => $a->subject->id,
                    'name' => $a->subject->name,
                    'code' => $a->subject->code,
                    'teacher' => $a->staff?->user?->name,
                    'filled' => $filled["{$a->classroom_id}-{$a->subject_id}"] ?? 0,
                    'url' => route('marks.show', [$exam, $a->classroom_id, $a->subject_id]),
                ])->values(),
            ])
            ->values()
            ->all();
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
