<?php

namespace App\Http\Controllers\Assessment;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassSubjectTeacher;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\Staff;
use App\Models\Term;
use App\Support\Constants;
use App\Support\TermReport;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Creating tests and exams from the Marks workspace. A teacher sets a test
 * for one subject and the classes of a grade they teach it in; an admin can
 * also set an exam for every subject and whole grades.
 */
class ExamController extends Controller
{
    use ScopesToSchool;

    public function store(Request $request): RedirectResponse
    {
        $staff = $this->staff($request);
        [$data, $classroomIds] = $this->validated($request, $staff);

        DB::transaction(function () use ($data, $classroomIds, $staff) {
            $exam = Exam::create([...$data, 'created_by' => $staff?->id]);
            $exam->classrooms()->sync($classroomIds);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name is ready for marks.', ['name' => $data['name']])]);

        return back();
    }

    public function update(Request $request, Exam $exam): RedirectResponse
    {
        $staff = $this->staff($request);
        $this->authorizeEdit($request, $exam, $staff);
        [$data, $classroomIds] = $this->validated($request, $staff, $exam);

        DB::transaction(function () use ($exam, $data, $classroomIds) {
            $oldTotal = (float) $exam->max_score;
            $exam->update($data);
            $exam->classrooms()->sync($classroomIds);

            if ($oldTotal !== (float) $exam->max_score) {
                $this->regrade($exam, $oldTotal);
            }
        });

        return back();
    }

    public function destroy(Request $request, Exam $exam): RedirectResponse
    {
        $this->authorizeEdit($request, $exam, $this->staff($request));

        if ($exam->results()->exists()) {
            return back()->withErrors(['exam' => __('Marks have been entered for :name, so it cannot be removed.', ['name' => $exam->name])]);
        }

        $exam->delete();

        return back();
    }

    /**
     * Copies last year's tests for the same term (Term 1 to Term 1) into
     * this term, for this year's classes of the same grades.
     */
    public function bringForward(Request $request): RedirectResponse
    {
        $request->validate(['term_id' => ['required', $this->existsInSchool('terms')]]);

        $term = Term::findOrFail($request->integer('term_id'));
        $staff = $this->staff($request);
        $isAdmin = $request->user()->hasRole('admin');
        $source = self::previousTerm($term);
        $copied = 0;

        if ($source !== null) {
            $classes = Classroom::where('academic_year_id', $term->academic_year_id)->get(['id', 'name', 'grade_level_id']);
            $mine = $isAdmin ? null : ClassSubjectTeacher::query()
                ->where('academic_year_id', $term->academic_year_id)
                ->where('staff_id', $staff?->id ?? 0)
                ->get(['classroom_id', 'subject_id']);

            DB::transaction(function () use ($source, $term, $classes, $mine, $staff, &$copied) {
                foreach (Exam::where('term_id', $source->id)->with('classrooms:id,name')->get() as $old) {
                    $candidates = $classes->when($old->grade_level_id, fn (Collection $c) => $c->where('grade_level_id', $old->grade_level_id));

                    if ($mine !== null) {
                        $candidates = $candidates->filter(fn (Classroom $c) => $old->subject_id !== null
                            && $mine->contains(fn ($a) => $a->classroom_id === $c->id && $a->subject_id === $old->subject_id));
                    }

                    // Keep to the same streams (9B stays 9B) when the names match.
                    $sameNames = $candidates->whereIn('name', $old->classrooms->pluck('name'));
                    $targets = $sameNames->isNotEmpty() ? $sameNames : $candidates;

                    $exists = Exam::query()
                        ->where('term_id', $term->id)
                        ->where('name', $old->name)
                        ->where('grade_level_id', $old->grade_level_id)
                        ->where('subject_id', $old->subject_id)
                        ->exists();

                    if ($targets->isEmpty() || $exists) {
                        continue;
                    }

                    $new = Exam::create([
                        'academic_year_id' => $term->academic_year_id,
                        'term_id' => $term->id,
                        'grade_level_id' => $old->grade_level_id,
                        'subject_id' => $old->subject_id,
                        'name' => $old->name,
                        'kind' => $old->kind,
                        'max_score' => $old->max_score,
                        'created_by' => $staff?->id,
                    ]);
                    $new->classrooms()->sync($targets->pluck('id'));
                    $copied++;
                }
            });
        }

        Inertia::flash('toast', ['type' => $copied > 0 ? 'success' : 'info', 'message' => $copied > 0
            ? trans_choice(':count test brought forward. Add dates when you know them.|:count tests brought forward. Add dates when you know them.', $copied)
            : __('Nothing to bring forward: last year’s tests are already here, or none are yours to set.')]);

        return back();
    }

    /**
     * The term in the previous school year at the same place (its Term 1
     * for this Term 1).
     */
    public static function previousTerm(Term $term): ?Term
    {
        $year = $term->academicYear;
        $previous = $year === null ? null : AcademicYear::query()
            ->where('start_date', '<', $year->start_date)
            ->orderByDesc('start_date')
            ->first();

        if ($previous === null) {
            return null;
        }

        $position = Term::where('academic_year_id', $year->id)->orderBy('start_date')->pluck('id')->search($term->id);

        return Term::where('academic_year_id', $previous->id)->orderBy('start_date')->get()->get((int) $position);
    }

    /**
     * @return array{0: array<string, mixed>, 1: list<int>}
     */
    private function validated(Request $request, ?Staff $staff, ?Exam $exam = null): array
    {
        $isAdmin = $request->user()->hasRole('admin');

        if (! $isAdmin) {
            $request->merge(['kind' => 'test']);
        }

        $isExam = $request->input('kind') === 'exam';

        $data = $request->validate([
            'term_id' => ['required', $this->existsInSchool('terms')],
            'kind' => ['required', Constants::rule('assessment_kinds')],
            'grade_level_id' => [$isExam ? 'nullable' : 'required', $this->existsInSchool('grade_levels')],
            'subject_id' => [$isExam ? 'nullable' : 'required', $this->existsInSchool('subjects')],
            'name' => [
                'required', 'string', 'max:80',
                Rule::unique('exams')
                    ->where('term_id', $request->input('term_id'))
                    ->where('grade_level_id', $request->input('grade_level_id') ?: null)
                    ->where('subject_id', $request->input('subject_id') ?: null)
                    ->ignore($exam?->id),
            ],
            'max_score' => ['required', 'numeric', 'min:1', 'max:1000'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'classrooms' => ['required', 'array', 'min:1'],
            'classrooms.*' => ['integer'],
        ], [
            'name.unique' => __('This grade already has a test with that name this term.'),
            'classrooms.required' => __('Choose at least one class.'),
        ], [
            'grade_level_id' => 'grade',
            'subject_id' => 'subject',
            'max_score' => 'total',
        ]);

        $term = Term::findOrFail($data['term_id']);
        $classroomIds = Classroom::query()
            ->where('academic_year_id', $term->academic_year_id)
            ->whereIn('id', $data['classrooms'])
            ->when($data['grade_level_id'] ?? null, fn ($q, $grade) => $q->where('grade_level_id', $grade))
            ->pluck('id');

        if ($classroomIds->count() !== count(array_unique($data['classrooms']))) {
            throw ValidationException::withMessages(['classrooms' => __('Choose classes from this grade and year.')]);
        }

        if (! $isAdmin) {
            $taught = ClassSubjectTeacher::query()
                ->whereIn('classroom_id', $classroomIds)
                ->where('subject_id', $data['subject_id'])
                ->where('staff_id', $staff?->id ?? 0)
                ->count();

            if ($taught !== $classroomIds->count()) {
                throw ValidationException::withMessages(['classrooms' => __('You can only set tests for classes where you teach this subject.')]);
            }
        }

        unset($data['classrooms']);
        $data['academic_year_id'] = $term->academic_year_id;
        $data['grade_level_id'] = $data['grade_level_id'] ?? null;
        $data['subject_id'] = $data['subject_id'] ?? null;

        return [$data, $classroomIds->all()];
    }

    /**
     * When the total changes, marks that were out of the old total are now
     * out of the new one, and get their symbol again.
     */
    private function regrade(Exam $exam, float $oldTotal): void
    {
        foreach ($exam->classrooms as $classroom) {
            $scale = $classroom->gradingScale();
            $results = ExamResult::query()
                ->where('exam_id', $exam->id)
                ->where('max_score', $oldTotal)
                ->whereIn('student_id', TermReport::learnersOf($classroom)->pluck('id'))
                ->get();

            foreach ($results as $result) {
                $result->max_score = $exam->max_score;

                if ($scale !== null) {
                    $result->applyGrade($scale);
                }

                $result->save();
            }
        }
    }

    private function authorizeEdit(Request $request, Exam $exam, ?Staff $staff): void
    {
        abort_unless($request->user()->hasRole('admin') || ($staff !== null && $exam->created_by === $staff->id), 403);
    }

    private function staff(Request $request): ?Staff
    {
        return Staff::where('user_id', $request->user()->id)->first();
    }
}
