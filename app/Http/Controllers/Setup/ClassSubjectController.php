<?php

namespace App\Http\Controllers\Setup;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\ClassSubjectTeacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

/**
 * Which subjects a class takes and who teaches each. A subject teacher
 * enters that subject's marks for the class.
 */
class ClassSubjectController extends Controller
{
    use ScopesToSchool;

    public function update(Request $request, Classroom $classroom): RedirectResponse
    {
        $data = $request->validate([
            'subjects' => ['array'],
            'subjects.*.subject_id' => ['required', $this->existsInSchool('subjects')],
            'subjects.*.staff_id' => ['nullable', $this->existsInSchool('staff')],
        ]);

        // Only subjects with a teacher are taught in the class.
        $wanted = collect($data['subjects'] ?? [])
            ->filter(fn (array $row) => filled($row['staff_id'] ?? null))
            ->mapWithKeys(fn (array $row) => [(int) $row['subject_id'] => (int) $row['staff_id']]);

        DB::transaction(function () use ($classroom, $wanted) {
            ClassSubjectTeacher::where('classroom_id', $classroom->id)
                ->whereNotIn('subject_id', $wanted->keys())
                ->delete();

            foreach ($wanted as $subjectId => $staffId) {
                ClassSubjectTeacher::updateOrCreate(
                    ['classroom_id' => $classroom->id, 'subject_id' => $subjectId],
                    ['staff_id' => $staffId],
                );
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Subjects saved for :class.', ['class' => $classroom->name])]);

        return back();
    }
}
