<?php

namespace App\Http\Controllers\People;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\Classroom;
use App\Models\Student;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Places a student in a class. Any open placement is closed first, so moving
 * from 4A to 4B keeps both in the history.
 */
class EnrollmentController extends Controller
{
    use ScopesToSchool;

    public function store(Request $request, Student $student): RedirectResponse
    {
        $data = $request->validate([
            'classroom_id' => ['required', $this->existsInSchool('classrooms')],
        ]);

        $classroom = Classroom::whereKey($data['classroom_id'])->firstOrFail();

        if ($student->currentEnrollment?->classroom_id === $classroom->id) {
            return back();
        }

        StudentController::enroll($student, $classroom);

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name is now in :class.', ['name' => $student->full_name, 'class' => $classroom->name])]);

        return back();
    }
}
