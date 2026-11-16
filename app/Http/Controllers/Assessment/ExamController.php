<?php

namespace App\Http\Controllers\Assessment;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\Term;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The tests and exams of each term ("Term 1 test", "End of term exam").
 * Teachers enter marks against them; the report combines them by weight.
 */
class ExamController extends Controller
{
    use ScopesToSchool;

    public function index(Request $request): Response
    {
        $years = AcademicYear::query()->orderByDesc('start_date')->get(['id', 'name', 'is_current']);
        $year = $years->firstWhere('id', $request->integer('year'))
            ?? $years->firstWhere('is_current', true)
            ?? $years->first();

        $terms = $year
            ? Term::where('academic_year_id', $year->id)->orderBy('start_date')->get(['id', 'name', 'is_current'])
            : collect();

        $exams = Exam::query()
            ->whereIn('term_id', $terms->pluck('id'))
            ->withCount('results')
            ->orderBy('start_date')
            ->orderBy('id')
            ->get();

        return Inertia::render('marks/exams', [
            'years' => $years,
            'selectedYearId' => $year?->id,
            'terms' => $terms->map(fn (Term $term) => [
                'id' => $term->id,
                'name' => $term->name,
                'is_current' => $term->is_current,
                'exams' => $exams->where('term_id', $term->id)->map(fn (Exam $exam) => [
                    'id' => $exam->id,
                    'name' => $exam->name,
                    'weight' => $exam->weight,
                    'start_date' => $exam->start_date?->toDateString(),
                    'end_date' => $exam->end_date?->toDateString(),
                    'results_count' => $exam->results_count,
                ])->values(),
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Exam::create($this->validated($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Added. Teachers can now enter marks for it.')]);

        return back();
    }

    public function update(Request $request, Exam $exam): RedirectResponse
    {
        $exam->update($this->validated($request, $exam));

        return back();
    }

    public function destroy(Exam $exam): RedirectResponse
    {
        if ($exam->results()->exists()) {
            return back()->withErrors(['exam' => __('Marks have been entered for :name, so it cannot be removed.', ['name' => $exam->name])]);
        }

        $exam->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Exam $exam = null): array
    {
        $data = $request->validate([
            'term_id' => ['required', $this->existsInSchool('terms')],
            'name' => [
                'required', 'string', 'max:80',
                Rule::unique('exams')->where('term_id', $request->input('term_id'))->ignore($exam?->id),
            ],
            'weight' => ['required', 'integer', 'min:1', 'max:100'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $data['academic_year_id'] = Term::whereKey($data['term_id'])->value('academic_year_id');

        return $data;
    }
}
