<?php

namespace App\Http\Controllers\People;

use App\Actions\People\CreateGuardian;
use App\Http\Controllers\Controller;
use App\Models\Guardian;
use App\Models\Student;
use App\Support\Constants;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

class StudentGuardianController extends Controller
{
    public function store(Request $request, Student $student, CreateGuardian $createGuardian): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20'],
            'relationship' => ['nullable', Constants::rule('guardian_relationship')],
            'is_primary_contact' => ['boolean'],
            'can_pickup' => ['boolean'],
        ]);

        $guardian = $createGuardian->handle($data);
        StudentController::link($student, $guardian, $data, $student->guardians()->doesntExist());

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Guardian added.')]);

        return back();
    }

    public function update(Request $request, Student $student, Guardian $guardian): RedirectResponse
    {
        abort_unless($student->guardians()->whereKey($guardian->id)->exists(), 404);

        $data = $request->validate([
            'relationship' => ['nullable', Constants::rule('guardian_relationship')],
            'is_primary_contact' => ['boolean'],
            'can_pickup' => ['boolean'],
            'receives_notifications' => ['boolean'],
        ]);

        StudentController::link($student, $guardian, $data);

        return back();
    }

    public function destroy(Student $student, Guardian $guardian): RedirectResponse
    {
        $student->guardians()->detach($guardian->id);

        return back();
    }
}
