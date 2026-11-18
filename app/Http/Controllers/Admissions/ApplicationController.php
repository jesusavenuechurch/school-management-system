<?php

namespace App\Http\Controllers\Admissions;

use App\Actions\People\CreateGuardian;
use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Http\Controllers\People\StudentController;
use App\Http\Controllers\PublicApplicationController;
use App\Models\Application;
use App\Models\Classroom;
use App\Models\School;
use App\Models\Student;
use App\Support\ClassPlacements;
use App\Support\Constants;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Applications parents sent from the school's public page. Accepting one
 * admits the child into a class and creates the parent's account.
 */
class ApplicationController extends Controller
{
    use ScopesToSchool;

    public function index(Request $request): Response
    {
        $status = in_array($request->query('status'), Constants::codes('application_status'), true)
            ? $request->query('status')
            : 'pending';
        $school = School::findOrFail($this->schoolId());

        $applications = Application::query()
            ->where('status', $status)
            ->with(['gradeLevel:id,name', 'student:id,first_name,last_name', 'decider:id,name'])
            ->when($status === 'pending', fn ($q) => $q->oldest(), fn ($q) => $q->latest('decided_at'))
            ->limit(200)
            ->get();

        $counts = Application::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('applications/index', [
            'status' => $status,
            'statuses' => Constants::selectOptions('application_status'),
            'counts' => (object) $counts->map(fn ($n) => (int) $n)->all(),
            'applications' => $applications->map(fn (Application $a) => [
                'id' => $a->id,
                'reference' => $a->reference,
                'full_name' => $a->full_name,
                'date_of_birth' => $a->date_of_birth?->toDateString(),
                'gender' => Constants::label('gender', $a->gender),
                'grade' => $a->gradeLevel ? ['id' => $a->gradeLevel->id, 'name' => $a->gradeLevel->name] : null,
                'previous_school' => $a->previous_school,
                'guardian_name' => $a->guardian_name,
                'guardian_phone' => $a->guardian_phone,
                'guardian_email' => $a->guardian_email,
                'guardian_relationship' => Constants::label('guardian_relationship', $a->guardian_relationship),
                'address' => $a->address,
                'message' => $a->message,
                'received_at' => $a->created_at->toIso8601String(),
                'decided_at' => $a->decided_at?->toIso8601String(),
                'decided_by' => $a->decider?->name,
                'decline_reason' => $a->decline_reason,
                'student_url' => $a->student ? route('students.show', $a->student) : null,
                'whatsapp_url' => $a->status === 'pending' ? null : $this->whatsAppLink($a, $school),
            ]),
            'nextAdmissionNumber' => Student::suggestAdmissionNumber(),
            'placements' => ClassPlacements::grades(),
            'acceptsApplications' => $school->accepts_applications,
            'isOpen' => PublicApplicationController::isOpen($school),
            'applyUrl' => route('schools.apply', $school),
        ]);
    }

    public function accept(Request $request, Application $application, CreateGuardian $createGuardian): RedirectResponse
    {
        abort_unless($application->status === 'pending', 409);

        $data = $request->validate([
            'classroom_id' => ['required', $this->existsInSchool('classrooms')],
            'admission_number' => ['required', 'string', 'max:30', Rule::unique('students')->where('school_id', $this->schoolId())],
        ], [], ['classroom_id' => 'class']);

        $student = DB::transaction(function () use ($application, $data, $createGuardian, $request) {
            $student = Student::create([
                'first_name' => $application->first_name,
                'middle_name' => $application->middle_name,
                'last_name' => $application->last_name,
                'date_of_birth' => $application->date_of_birth,
                'gender' => $application->gender,
                'address' => $application->address,
                'admission_number' => $data['admission_number'],
                'admission_date' => now()->toDateString(),
                'status' => 'active',
            ]);

            StudentController::enroll($student, Classroom::findOrFail($data['classroom_id']));

            $guardian = $createGuardian->handle([
                'name' => $application->guardian_name,
                'phone' => $application->guardian_phone,
                'email' => $application->guardian_email,
            ]);
            StudentController::link($student, $guardian, ['relationship' => $application->guardian_relationship], true);

            $application->update([
                'status' => 'accepted',
                'student_id' => $student->id,
                'decided_by' => $request->user()->id,
                'decided_at' => now(),
            ]);

            return $student;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name is admitted. Let the parent know on WhatsApp from the Accepted list.', ['name' => $student->full_name])]);

        return back();
    }

    public function decline(Request $request, Application $application): RedirectResponse
    {
        abort_unless($application->status === 'pending', 409);

        $data = $request->validate(['decline_reason' => ['nullable', 'string', 'max:500']]);

        $application->update([
            'status' => 'declined',
            'decline_reason' => $data['decline_reason'] ?? null,
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
        ]);

        return back();
    }

    public function settings(Request $request): RedirectResponse
    {
        $data = $request->validate(['accepts_applications' => ['required', 'boolean']]);

        School::findOrFail($this->schoolId())->update($data);

        return back();
    }

    private function whatsAppLink(Application $application, School $school): string
    {
        $parent = strtok($application->guardian_name, ' ');
        $text = $application->status === 'accepted'
            ? __('Dumela :parent. Good news: :child has been accepted at :school. We will be in touch about the first day. Reference :ref.', [
                'parent' => $parent, 'child' => $application->first_name, 'school' => $school->name, 'ref' => $application->reference,
            ])
            : __('Dumela :parent. Thank you for applying to :school for :child. Unfortunately we cannot offer a place this time.:reason Reference :ref.', [
                'parent' => $parent, 'child' => $application->first_name, 'school' => $school->name, 'ref' => $application->reference,
                'reason' => $application->decline_reason ? ' '.$application->decline_reason : '',
            ]);

        return 'https://wa.me/'.ltrim($application->guardian_phone, '+').'?text='.rawurlencode($text);
    }
}
