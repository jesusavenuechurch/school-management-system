<?php

namespace App\Http\Controllers\Setup;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\Term;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TermController extends Controller
{
    use ScopesToSchool;

    public function store(Request $request): RedirectResponse
    {
        $term = Term::create($this->validated($request));
        $this->keepSingleCurrent($term);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Term added.')]);

        return back();
    }

    public function update(Request $request, Term $term): RedirectResponse
    {
        $term->update($this->validated($request));
        $this->keepSingleCurrent($term);

        return back();
    }

    public function destroy(Term $term): RedirectResponse
    {
        $term->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'academic_year_id' => ['required', $this->existsInSchool('academic_years')],
            'name' => ['required', 'string', 'max:50'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'is_current' => ['boolean'],
        ]);

        $data['is_current'] = $request->boolean('is_current');

        return $data;
    }

    private function keepSingleCurrent(Term $term): void
    {
        if ($term->is_current) {
            Term::whereKeyNot($term->id)->update(['is_current' => false]);
        }
    }
}
