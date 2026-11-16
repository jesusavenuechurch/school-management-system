<?php

namespace App\Http\Controllers\Setup;

use App\Http\Controllers\Controller;
use App\Models\GradeLevel;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class GradeLevelController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data['sort_order'] ??= (int) GradeLevel::max('sort_order') + 1;

        GradeLevel::create($data);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Grade added.')]);

        return back();
    }

    public function update(Request $request, GradeLevel $gradeLevel): RedirectResponse
    {
        $gradeLevel->update($this->validated($request));

        return back();
    }

    public function destroy(GradeLevel $gradeLevel): RedirectResponse
    {
        if ($gradeLevel->classrooms()->exists()) {
            return back()->withErrors(['grade' => __('Remove this grade\'s classes first.')]);
        }

        $gradeLevel->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:1000'],
        ]);
    }
}
