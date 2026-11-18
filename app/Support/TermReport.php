<?php

namespace App\Support;

use App\Models\Attendance;
use App\Models\Classroom;
use App\Models\ClassSubjectTeacher;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\GradingScale;
use App\Models\ReportCard;
use App\Models\School;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Models\Subject;
use App\Models\Term;
use Illuminate\Support\Collection;

/**
 * A class's results for one term, worked out from the marks entered:
 *
 *  - a subject's term mark weighs the average of its tests against the
 *    average of its exams (the school's test_weight, e.g. 30/70); with
 *    only tests or only exams, that average is the term mark;
 *  - the learner's average is the mean of their subject term marks;
 *  - position ranks learners by that average, ties sharing a place.
 */
class TermReport
{
    /** @var Collection<int, Exam> */
    public Collection $exams;

    /** @var Collection<int, Subject> */
    public Collection $subjects;

    /** @var list<array<string, mixed>> */
    public array $learners = [];

    public ?GradingScale $scale;

    /** Share of the term mark from tests; exams get the rest. */
    public int $testWeight;

    public function __construct(public Term $term, public Classroom $classroom)
    {
        $this->scale = $classroom->gradingScale();
        $this->testWeight = (int) (School::whereKey($classroom->school_id)->value('test_weight') ?? 30);
        $this->build();
    }

    /**
     * The learners placed in the class at any point during the term.
     *
     * @return Collection<int, Student>
     */
    public static function learnersOf(Classroom $classroom, ?Term $term = null): Collection
    {
        $studentIds = StudentEnrollment::query()
            ->where('classroom_id', $classroom->id)
            ->when($term, fn ($q) => $q
                ->whereDate('enrolled_on', '<=', $term->end_date)
                ->where(fn ($q) => $q->whereNull('left_on')->orWhereDate('left_on', '>=', $term->start_date)))
            ->when(! $term, fn ($q) => $q->whereNull('left_on'))
            ->pluck('student_id')
            ->unique();

        return Student::query()
            ->whereIn('id', $studentIds)
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->get();
    }

    private function build(): void
    {
        $this->exams = Exam::query()
            ->where('term_id', $this->term->id)
            ->whereHas('classrooms', fn ($q) => $q->whereKey($this->classroom->id))
            ->orderBy('start_date')
            ->orderBy('id')
            ->get();

        $students = self::learnersOf($this->classroom, $this->term);

        $results = ExamResult::query()
            ->whereIn('exam_id', $this->exams->pluck('id'))
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->groupBy('student_id');

        $assignments = ClassSubjectTeacher::query()
            ->where('classroom_id', $this->classroom->id)
            ->with('staff.user:id,name')
            ->get()
            ->keyBy('subject_id');

        $subjectIds = $assignments->keys()
            ->merge($results->flatten()->pluck('subject_id'))
            ->unique();

        $this->subjects = Subject::query()->whereIn('id', $subjectIds)->orderBy('name')->get();

        $cards = ReportCard::query()
            ->where('term_id', $this->term->id)
            ->whereIn('student_id', $students->pluck('id'))
            ->get()
            ->keyBy('student_id');

        $attendance = $this->attendance($students->pluck('id')->all());
        $kinds = $this->exams->pluck('kind', 'id');

        foreach ($students as $student) {
            /** @var Collection<int, ExamResult> $mine */
            $mine = $results->get($student->id, collect());
            $subjectRows = [];
            $marks = [];

            foreach ($this->subjects as $subject) {
                $percentages = ['test' => [], 'exam' => []];

                foreach ($mine->where('subject_id', $subject->id) as $result) {
                    if ($result->percentage !== null) {
                        $percentages[$kinds->get($result->exam_id) === 'exam' ? 'exam' : 'test'][] = $result->percentage;
                    }
                }

                $tests = self::mean($percentages['test']);
                $exams = self::mean($percentages['exam']);
                $mark = match (true) {
                    $tests !== null && $exams !== null => round(($tests * $this->testWeight + $exams * (100 - $this->testWeight)) / 100, 1),
                    default => $tests ?? $exams,
                };
                $band = $mark !== null ? $this->scale?->bandFor($mark) : null;

                if ($mark !== null) {
                    $marks[] = $mark;
                }

                $subjectRows[] = [
                    'subject_id' => $subject->id,
                    'name' => $subject->name,
                    'code' => $subject->code,
                    'teacher' => $assignments->get($subject->id)?->staff?->user?->name,
                    'tests' => $tests,
                    'tests_count' => count($percentages['test']),
                    'exam' => $exams,
                    'mark' => $mark,
                    'symbol' => $band?->label,
                    'remark' => $band?->remark,
                    'is_pass' => $band?->is_pass,
                ];
            }

            $average = $marks === [] ? null : round(array_sum($marks) / count($marks), 1);
            $overall = $average !== null ? $this->scale?->bandFor($average) : null;
            $card = $cards->get($student->id);

            $this->learners[] = [
                'student' => [
                    'id' => $student->id,
                    'full_name' => $student->full_name,
                    'admission_number' => $student->admission_number,
                    'photo_url' => $student->photo_url,
                ],
                'subjects' => $subjectRows,
                'average' => $average,
                'symbol' => $overall?->label,
                'symbol_remark' => $overall?->remark,
                'subjects_passed' => collect($subjectRows)->where('is_pass', true)->count(),
                'subjects_marked' => count($marks),
                'position' => null,
                'days_present' => $attendance[$student->id]['present'] ?? null,
                'days_absent' => $attendance[$student->id]['absent'] ?? null,
                'class_teacher_remark' => $card?->class_teacher_remark,
                'head_teacher_remark' => $card?->head_teacher_remark,
                'published_at' => $card?->published_at?->toIso8601String(),
            ];
        }

        $this->rank();
    }

    /** Ties share a place: 1, 2, 2, 4. */
    private function rank(): void
    {
        $averages = collect($this->learners)->pluck('average')->filter(fn ($a) => $a !== null)->sortDesc()->values();

        foreach ($this->learners as $i => $learner) {
            if ($learner['average'] !== null) {
                $this->learners[$i]['position'] = $averages->search(fn ($a) => $a <= $learner['average']) + 1;
            }
        }
    }

    public function rankedCount(): int
    {
        return collect($this->learners)->whereNotNull('average')->count();
    }

    /**
     * Days present and absent from the daily register during the term.
     *
     * @param  list<int>  $studentIds
     * @return array<int, array{present: int, absent: int}>
     */
    private function attendance(array $studentIds): array
    {
        $counts = [];

        Attendance::query()
            ->whereIn('student_id', $studentIds)
            ->whereNull('class_subject_teacher_id')
            ->whereBetween('date', [$this->term->start_date->toDateString(), $this->term->end_date->toDateString()])
            ->selectRaw('student_id, status, count(*) as days')
            ->groupBy('student_id', 'status')
            ->get()
            ->each(function ($row) use (&$counts) {
                $counts[$row->student_id] ??= ['present' => 0, 'absent' => 0];
                $key = in_array($row->status, ['present', 'late'], true) ? 'present' : ($row->status === 'absent' ? 'absent' : null);

                if ($key !== null) {
                    $counts[$row->student_id][$key] += (int) $row->days;
                }
            });

        return $counts;
    }

    /**
     * @param  list<float>  $values
     */
    private static function mean(array $values): ?float
    {
        return $values === [] ? null : round(array_sum($values) / count($values), 1);
    }

    /**
     * How many tests and exams the class wrote this term.
     *
     * @return array{tests: int, exams: int}
     */
    public function counts(): array
    {
        return [
            'tests' => $this->exams->where('kind', '!=', 'exam')->count(),
            'exams' => $this->exams->where('kind', 'exam')->count(),
        ];
    }

    /**
     * @return list<array{label: string, min_percentage: float, remark: string|null, is_pass: bool}>
     */
    public function scaleKey(): array
    {
        return $this->scale?->bands->map(fn ($band) => [
            'label' => $band->label,
            'min_percentage' => (float) $band->min_percentage,
            'remark' => $band->remark,
            'is_pass' => $band->is_pass,
        ])->values()->all() ?? [];
    }
}
