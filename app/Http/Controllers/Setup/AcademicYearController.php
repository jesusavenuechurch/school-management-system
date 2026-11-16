<?php

namespace App\Http\Controllers\Setup;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Term;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AcademicYearController extends Controller
{
    use ScopesToSchool;

    public function index(): Response
    {
        return Inertia::render('setup/academic-years', [
            'years' => AcademicYear::query()
                ->with(['terms' => fn ($q) => $q->orderBy('start_date')])
                ->withCount('classrooms')
                ->orderByDesc('start_date')
                ->get()
                ->map(fn (AcademicYear $year) => [
                    'id' => $year->id,
                    'name' => $year->name,
                    'start_date' => $year->start_date->toDateString(),
                    'end_date' => $year->end_date->toDateString(),
                    'is_current' => $year->is_current,
                    'classrooms_count' => $year->classrooms_count,
                    'terms' => $year->terms->map(fn (Term $term) => [
                        'id' => $term->id,
                        'name' => $term->name,
                        'start_date' => $term->start_date->toDateString(),
                        'end_date' => $term->end_date->toDateString(),
                        'is_current' => $term->is_current,
                    ]),
                ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($data) {
            $year = AcademicYear::create($data);
            $this->keepSingleCurrent($year);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('School year added.')]);

        return back();
    }

    public function update(Request $request, AcademicYear $academicYear): RedirectResponse
    {
        $academicYear->update($this->validated($request));
        $this->keepSingleCurrent($academicYear);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('School year updated.')]);

        return back();
    }

    public function destroy(AcademicYear $academicYear): RedirectResponse
    {
        if ($academicYear->classrooms()->exists()) {
            return back()->withErrors(['year' => __('This year already has classes, so it cannot be deleted.')]);
        }

        $academicYear->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_current' => ['boolean'],
        ]);

        $data['is_current'] = $request->boolean('is_current');

        return $data;
    }

    private function keepSingleCurrent(AcademicYear $year): void
    {
        if ($year->is_current) {
            AcademicYear::whereKeyNot($year->id)->update(['is_current' => false]);
        }
    }
}
