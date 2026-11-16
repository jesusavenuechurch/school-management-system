<?php

namespace App\Http\Controllers\Setup;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Http\Controllers\OnboardingController;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\School;
use App\Models\Staff;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Term;
use App\Support\Constants;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The guided setup a new school walks through, one step at a time, with the
 * chalkboard checklist alongside. Each step offers sensible suggestions so
 * most of it is "check this and confirm", and any step can be put off.
 */
class SetupJourneyController extends Controller
{
    use ScopesToSchool;

    public const STEPS = ['school', 'calendar', 'grades', 'subjects', 'teachers', 'students'];

    public function show(Request $request): Response
    {
        $school = $this->school();
        $steps = $this->steps($school, $request->user()->id);

        $requested = $request->query('step');
        $current = in_array($requested, self::STEPS, true)
            ? $requested
            : collect($steps)->first(fn ($s) => ! $s['done'] && ! $s['skipped'])['key'] ?? null;

        $year = AcademicYear::query()->orderByDesc('is_current')->orderByDesc('start_date')->first();

        return Inertia::render('setup/journey', [
            'steps' => $steps,
            'currentStep' => $current,
            'school' => [
                'name' => $school->name,
                'levels' => $school->levels ?? [],
                'logo_url' => $school->logo_url,
            ],
            'levelOptions' => Constants::selectOptions('school_levels'),
            'calendar' => $this->calendarSuggestion(),
            'currentYear' => $year?->only(['id', 'name']),
            'gradeSuggestions' => $this->gradeSuggestions(),
            'subjectSuggestions' => $this->subjectSuggestions($school),
            'counts' => [
                'staff' => Staff::where('user_id', '!=', $request->user()->id)->count(),
                'students' => Student::count(),
            ],
        ]);
    }

    /**
     * Step 1: the school itself (already filled in at sign-up; editable).
     */
    public function saveSchool(Request $request): RedirectResponse
    {
        $school = $this->school();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'levels' => ['required', 'array', 'min:1'],
            'levels.*' => [Constants::rule('school_levels')],
            'logo' => OnboardingController::logoRules(),
        ]);

        $school->name = $data['name'];
        $school->levels = array_values($data['levels']);

        if ($request->hasFile('logo')) {
            $school->logo_path = OnboardingController::storeLogo($request->file('logo'), $school);
        }

        $school->save();

        return $this->next('school');
    }

    /**
     * Step 2: the school year and its terms.
     */
    public function saveCalendar(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('academic_years')->where('school_id', $this->schoolId())],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'terms' => ['required', 'array', 'min:1', 'max:4'],
            'terms.*.name' => ['required', 'string', 'max:50'],
            'terms.*.start_date' => ['required', 'date', 'after_or_equal:start_date', 'before_or_equal:end_date'],
            'terms.*.end_date' => ['required', 'date', 'after:terms.*.start_date', 'before_or_equal:end_date'],
        ], [], [
            'terms.*.start_date' => 'term start',
            'terms.*.end_date' => 'term end',
            'name' => 'year name',
        ]);

        DB::transaction(function () use ($data) {
            AcademicYear::query()->update(['is_current' => false]);
            Term::query()->update(['is_current' => false]);

            $year = AcademicYear::create([
                'name' => $data['name'],
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'is_current' => true,
            ]);

            // The current term is the one today falls in, else the first.
            $today = now()->toDateString();
            $terms = array_values($data['terms']);
            $currentIndex = 0;

            foreach ($terms as $i => $term) {
                if ($term['start_date'] <= $today && $today <= $term['end_date']) {
                    $currentIndex = $i;
                }
            }

            foreach ($terms as $i => $term) {
                $year->terms()->create([
                    'name' => $term['name'],
                    'start_date' => $term['start_date'],
                    'end_date' => $term['end_date'],
                    'is_current' => $i === $currentIndex,
                ]);
            }
        });

        return $this->next('calendar');
    }

    /**
     * Step 3: which kinds of school (primary, high school), the grades, and
     * how many classes each grade has this year. Grades can differ: Grade 1
     * might have three classes while Grade 7 has one.
     */
    public function saveGrades(Request $request): RedirectResponse
    {
        $year = AcademicYear::where('is_current', true)->first();

        if ($year === null) {
            throw ValidationException::withMessages(['grades' => __('Set up your school calendar first, so we know which year these classes are for.')]);
        }

        $data = $request->validate([
            'levels' => ['required', 'array', 'min:1'],
            'levels.*' => [Constants::rule('school_levels')],
            'grades' => ['required', 'array', 'min:1', 'max:30'],
            'grades.*.name' => ['required', 'string', 'max:50', 'distinct'],
            'grades.*.description' => ['nullable', 'string', 'max:100'],
            'grades.*.classes' => ['required', 'integer', 'min:1', 'max:20'],
        ], [
            'levels.required' => __('Choose primary school, high school, or both.'),
            'grades.required' => __('Choose at least one grade.'),
        ], [
            'grades.*.classes' => 'number of classes',
        ]);

        DB::transaction(function () use ($data, $year) {
            $school = $this->school();
            $school->levels = array_values(array_unique($data['levels']));
            $school->save();

            $order = (int) GradeLevel::max('sort_order');

            foreach ($data['grades'] as $gradeData) {
                $grade = GradeLevel::firstOrCreate(
                    ['name' => $gradeData['name']],
                    ['description' => $gradeData['description'] ?? null, 'sort_order' => ++$order],
                );

                foreach (self::classNames($grade->name, (int) $gradeData['classes']) as $className) {
                    Classroom::firstOrCreate(
                        ['academic_year_id' => $year->id, 'name' => $className],
                        ['grade_level_id' => $grade->id],
                    );
                }
            }
        });

        return $this->next('grades');
    }

    /**
     * One class: "Grade 4". Several: "Grade 4A", "Grade 4B"...
     *
     * @return list<string>
     */
    public static function classNames(string $grade, int $count): array
    {
        if ($count <= 1) {
            return [$grade];
        }

        return array_map(fn (int $i) => $grade.chr(65 + $i), range(0, $count - 1));
    }

    /**
     * Step 4: subjects, from the suggestions plus any the school adds.
     */
    public function saveSubjects(Request $request): RedirectResponse
    {
        $school = $this->school();
        $suggested = collect($this->subjectSuggestions($school))->pluck('name', 'code');

        $data = $request->validate([
            'subjects' => ['array'],
            'subjects.*' => [Rule::in($suggested->keys()->all())],
            'extra' => ['array', 'max:30'],
            'extra.*' => ['string', 'max:100'],
        ]);

        $extra = [];

        foreach ($data['extra'] ?? [] as $name) {
            $name = trim((string) $name);

            if ($name !== '' && ! isset($extra[Str::lower($name)])) {
                $extra[Str::lower($name)] = $name;
            }
        }

        $extra = array_values($extra);

        if (empty($data['subjects']) && $extra === []) {
            throw ValidationException::withMessages(['subjects' => __('Tick at least one subject, or type your own.')]);
        }

        DB::transaction(function () use ($data, $suggested, $extra) {
            foreach ($data['subjects'] ?? [] as $code) {
                Subject::firstOrCreate(['code' => $code], ['name' => $suggested[$code]]);
            }

            foreach ($extra as $name) {
                if (Subject::whereRaw('lower(name) = ?', [Str::lower($name)])->exists()) {
                    continue;
                }

                Subject::create(['name' => $name, 'code' => $this->uniqueSubjectCode($name)]);
            }
        });

        return $this->next('subjects');
    }

    /**
     * Put a step off for later. Steps 5 and 6 happen on their own pages, so
     * this is also how the journey moves past them.
     */
    public function skip(Request $request): RedirectResponse
    {
        $data = $request->validate(['step' => ['required', Rule::in(self::STEPS)]]);

        $school = $this->school();
        $school->setup_skipped = array_values(array_unique([...($school->setup_skipped ?? []), $data['step']]));
        $school->save();

        $this->completeIfFinished($school);

        return to_route('setup.journey');
    }

    /**
     * Where each step stands. Also shown on the dashboard's chalkboard.
     *
     * @return list<array{key: string, label: string, done: bool, skipped: bool, doneLabel: string|null}>
     */
    public function steps(School $school, int $ownerId): array
    {
        $skipped = $school->setup_skipped ?? [];
        $year = AcademicYear::where('is_current', true)->withCount('terms')->first();
        $grades = GradeLevel::count();
        $classes = $year ? Classroom::where('academic_year_id', $year->id)->count() : 0;
        $subjects = Subject::count();
        $staff = Staff::where('user_id', '!=', $ownerId)->count();
        $students = Student::count();

        $steps = [
            ['key' => 'school', 'label' => 'Our school', 'done' => true, 'doneLabel' => $school->name],
            ['key' => 'calendar', 'label' => 'The school calendar', 'done' => $year !== null && $year->terms_count > 0,
                'doneLabel' => $year ? trans_choice(':year · :count term|:year · :count terms', $year->terms_count, ['year' => $year->name]) : null],
            ['key' => 'grades', 'label' => 'Grades and classes', 'done' => $grades > 0 && $classes > 0,
                'doneLabel' => trans_choice(':count grade|:count grades', $grades).', '.trans_choice(':count class|:count classes', $classes)],
            ['key' => 'subjects', 'label' => 'Subjects', 'done' => $subjects > 0,
                'doneLabel' => trans_choice(':count subject|:count subjects', $subjects)],
            ['key' => 'teachers', 'label' => 'Teachers on board', 'done' => $staff > 0,
                'doneLabel' => trans_choice(':count member of staff|:count members of staff', $staff)],
            ['key' => 'students', 'label' => 'Students admitted', 'done' => $students > 0,
                'doneLabel' => trans_choice(':count student|:count students', $students)],
        ];

        return array_map(fn ($s) => [...$s, 'skipped' => ! $s['done'] && in_array($s['key'], $skipped, true)], $steps);
    }

    private function next(string $finished): RedirectResponse
    {
        $school = $this->school();
        $this->completeIfFinished($school);

        Inertia::flash('chalk', $finished);

        return to_route('setup.journey');
    }

    private function completeIfFinished(School $school): void
    {
        if ($school->setup_completed_at !== null) {
            return;
        }

        $open = collect($this->steps($school, (int) request()->user()?->id))
            ->contains(fn ($s) => ! $s['done'] && ! $s['skipped']);

        if (! $open) {
            $school->update(['setup_completed_at' => now()]);
        }
    }

    /**
     * Next year if it's already late in this one; terms split evenly.
     *
     * @return array{name: string, start_date: string, end_date: string}
     */
    private function calendarSuggestion(): array
    {
        $year = now()->month >= 10 ? now()->year + 1 : now()->year;

        return [
            'name' => (string) $year,
            'start_date' => Carbon::create($year, 1, 15)->toDateString(),
            'end_date' => Carbon::create($year, 12, 4)->toDateString(),
        ];
    }

    /**
     * Suggested grades for every kind of school (so a school can add the
     * other level later), minus grades it already has.
     *
     * @return list<array{level: string, label: string, grades: list<array{name: string, description: string|null}>}>
     */
    private function gradeSuggestions(): array
    {
        $existing = GradeLevel::pluck('name')->all();
        $suggestions = [];

        foreach (Constants::options('school_levels') as $level => $label) {
            $grades = [];

            foreach (Constants::gradePresets($level) as $name => $description) {
                if (! in_array($name, $existing, true)) {
                    $grades[] = ['name' => $name, 'description' => $description];
                }
            }

            $suggestions[] = ['level' => $level, 'label' => $label, 'grades' => $grades];
        }

        return $suggestions;
    }

    /**
     * Suggested subjects for the school's levels, minus ones already added.
     *
     * @return list<array{code: string, name: string}>
     */
    private function subjectSuggestions(School $school): array
    {
        $existing = Subject::pluck('code')->all();
        $merged = [];

        foreach ($school->levels ?? ['primary'] as $level) {
            $merged += Constants::subjectPresets($level);
        }

        $suggestions = [];

        foreach ($merged as $code => $name) {
            if (! in_array($code, $existing, true)) {
                $suggestions[] = ['code' => $code, 'name' => $name];
            }
        }

        return $suggestions;
    }

    private function uniqueSubjectCode(string $name): string
    {
        $base = Str::upper(Str::substr(preg_replace('/[^A-Za-z]/', '', Str::ascii($name)) ?: 'SUBJ', 0, 4));
        $code = $base;
        $n = 2;

        while (Subject::where('code', $code)->exists()) {
            $code = $base.$n++;
        }

        return $code;
    }

    private function school(): School
    {
        return School::findOrFail($this->schoolId());
    }
}
