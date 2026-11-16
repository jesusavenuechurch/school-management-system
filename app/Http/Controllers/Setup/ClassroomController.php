<?php

namespace App\Http\Controllers\Setup;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ClassroomController extends Controller
{
    use ScopesToSchool;

    public function store(Request $request): RedirectResponse
    {
        Classroom::create($this->validated($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Class added.')]);

        return back();
    }

    public function update(Request $request, Classroom $classroom): RedirectResponse
    {
        $classroom->update($this->validated($request, $classroom));

        return back();
    }

    public function destroy(Classroom $classroom): RedirectResponse
    {
        if ($classroom->enrollments()->exists()) {
            return back()->withErrors(['classroom' => __('This class has students, so it cannot be deleted.')]);
        }

        $classroom->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Classroom $classroom = null): array
    {
        return $request->validate([
            'grade_level_id' => ['required', $this->existsInSchool('grade_levels')],
            'academic_year_id' => ['required', $this->existsInSchool('academic_years')],
            'name' => [
                'required', 'string', 'max:50',
                Rule::unique('classrooms')
                    ->where('school_id', $this->schoolId())
                    ->where('academic_year_id', $request->input('academic_year_id'))
                    ->ignore($classroom?->id),
            ],
            'class_teacher_id' => ['nullable', $this->existsInSchool('staff')],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'room' => ['nullable', 'string', 'max:50'],
        ]);
    }
}
