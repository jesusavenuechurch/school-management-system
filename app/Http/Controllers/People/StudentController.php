<?php

namespace App\Http\Controllers\People;

use App\Actions\People\CreateGuardian;
use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\Guardian;
use App\Models\Student;
use App\Models\StudentEnrollment;
use App\Support\Constants;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudentController extends Controller
{
    use ScopesToSchool;

    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search'));
        $classroomId = $request->integer('classroom') ?: null;

        $students = Student::query()
            ->with(['currentEnrollment.classroom:id,name'])
            ->withCount('guardians')
            ->when($search !== '', fn ($q) => $q->where(fn ($w) => $w
                ->where('first_name', 'like', "%{$search}%")
                ->orWhere('last_name', 'like', "%{$search}%")
                ->orWhere('admission_number', 'like', "%{$search}%")))
            ->when($classroomId, fn ($q) => $q->whereHas('currentEnrollment', fn ($e) => $e->where('classroom_id', $classroomId)))
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Student $student) => [
                'id' => $student->id,
                'full_name' => $student->full_name,
                'photo_url' => $student->photo_url,
                'admission_number' => $student->admission_number,
                'gender' => $student->gender,
                'status' => $student->status,
                'classroom' => $student->currentEnrollment?->classroom?->name,
                'guardians_count' => $student->guardians_count,
            ]);

        return Inertia::render('students/index', [
            'students' => $students,
            'filters' => ['search' => $search, 'classroom' => $classroomId],
            'classrooms' => $this->currentClassroomOptions(),
            'statusLabels' => Constants::options('student_status'),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('students/create', [
            'classrooms' => $this->currentClassroomOptions(),
            'genderOptions' => Constants::selectOptions('gender'),
            'relationshipOptions' => Constants::selectOptions('guardian_relationship'),
            'nextAdmissionNumber' => sprintf('%s%04d', now()->format('Y'), (int) Student::withTrashed()->count() + 1),
        ]);
    }

    public function store(Request $request, CreateGuardian $createGuardian): RedirectResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'admission_number' => ['required', 'string', 'max:30', Rule::unique('students')->where('school_id', $this->schoolId())],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Constants::rule('gender')],
            'admission_date' => ['nullable', 'date'],
            'address' => ['nullable', 'string', 'max:1000'],
            'classroom_id' => ['nullable', $this->existsInSchool('classrooms')],
            'photo' => self::photoRules(),
            'guardians' => ['array', 'max:4'],
            'guardians.*.name' => ['required', 'string', 'max:255'],
            'guardians.*.phone' => ['required', 'string', 'max:20'],
            'guardians.*.relationship' => ['nullable', Constants::rule('guardian_relationship')],
            'guardians.*.is_primary_contact' => ['boolean'],
            'guardians.*.can_pickup' => ['boolean'],
        ], [], [
            'guardians.*.name' => 'guardian name',
            'guardians.*.phone' => 'guardian phone',
        ]);

        $student = DB::transaction(function () use ($data, $createGuardian, $request) {
            $student = Student::create([
                ...Arr::except($data, ['classroom_id', 'guardians', 'photo']),
                'admission_date' => $data['admission_date'] ?? now()->toDateString(),
                'status' => 'active',
            ]);

            if ($request->hasFile('photo')) {
                $student->update(['photo_path' => self::storePhoto($request->file('photo'), $student)]);
            }

            if (! empty($data['classroom_id'])) {
                $this->enroll($student, Classroom::whereKey($data['classroom_id'])->firstOrFail());
            }

            foreach ($data['guardians'] ?? [] as $index => $guardianData) {
                $guardian = $createGuardian->handle($guardianData);
                $this->link($student, $guardian, $guardianData, $index === 0);
            }

            return $student;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __(':name has been admitted.', ['name' => $student->full_name])]);

        return to_route('students.show', $student);
    }

    public function show(Student $student): Response
    {
        $student->load([
            'guardians.user:id,name,username,phone,email',
            'enrollments' => fn ($q) => $q->with(['classroom:id,name', 'academicYear:id,name'])->orderByDesc('enrolled_on')->orderByDesc('id'),
        ]);

        return Inertia::render('students/show', [
            'student' => [
                'id' => $student->id,
                'first_name' => $student->first_name,
                'middle_name' => $student->middle_name,
                'last_name' => $student->last_name,
                'full_name' => $student->full_name,
                'photo_url' => $student->photo_url,
                'admission_number' => $student->admission_number,
                'date_of_birth' => $student->date_of_birth?->toDateString(),
                'gender' => $student->gender,
                'admission_date' => $student->admission_date?->toDateString(),
                'status' => $student->status,
                'address' => $student->address,
                'guardians' => $student->guardians->map(fn (Guardian $guardian) => [
                    'id' => $guardian->id,
                    'name' => $guardian->user->name,
                    'username' => $guardian->user->username,
                    'phone' => $guardian->user->phone,
                    'relationship' => $guardian->pivot->relationship,
                    'is_primary_contact' => (bool) $guardian->pivot->is_primary_contact,
                    'can_pickup' => (bool) $guardian->pivot->can_pickup,
                    'receives_notifications' => (bool) $guardian->pivot->receives_notifications,
                ]),
                'enrollments' => $student->enrollments->map(fn (StudentEnrollment $enrollment) => [
                    'id' => $enrollment->id,
                    'classroom' => $enrollment->classroom?->name,
                    'academic_year' => $enrollment->academicYear?->name,
                    'enrolled_on' => $enrollment->enrolled_on->toDateString(),
                    'left_on' => $enrollment->left_on?->toDateString(),
                    'status' => $enrollment->status,
                ]),
            ],
            'classrooms' => $this->currentClassroomOptions(),
            'genderOptions' => Constants::selectOptions('gender'),
            'statusOptions' => Constants::selectOptions('student_status'),
            'relationshipOptions' => Constants::selectOptions('guardian_relationship'),
            'labels' => [
                'gender' => Constants::options('gender'),
                'student_status' => Constants::options('student_status'),
                'enrollment_status' => Constants::options('enrollment_status'),
                'guardian_relationship' => Constants::options('guardian_relationship'),
            ],
        ]);
    }

    public function update(Request $request, Student $student): RedirectResponse
    {
        $student->update($request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'admission_number' => ['required', 'string', 'max:30', Rule::unique('students')->where('school_id', $this->schoolId())->ignore($student->id)],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Constants::rule('gender')],
            'status' => ['required', Constants::rule('student_status')],
            'address' => ['nullable', 'string', 'max:1000'],
        ]));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Student details saved.')]);

        return back();
    }

    /**
     * Replace (or remove) the learner's photo.
     */
    public function updatePhoto(Request $request, Student $student): RedirectResponse
    {
        $request->validate(['photo' => ['required', ...array_slice(self::photoRules(), 1)]]);

        $old = $student->photo_path;
        $student->update(['photo_path' => self::storePhoto($request->file('photo'), $student)]);

        if ($old !== null) {
            Storage::disk('local')->delete($old);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Photo updated.')]);

        return back();
    }

    /**
     * Serve the photo to signed-in members of the student's school only.
     * Children's photos never sit at a public address.
     */
    public function photo(Student $student): StreamedResponse
    {
        abort_if($student->photo_path === null || ! Storage::disk('local')->exists($student->photo_path), 404);

        return Storage::disk('local')->response($student->photo_path, null, [
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    /**
     * @return list<string>
     */
    public static function photoRules(): array
    {
        return ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'];
    }

    public static function storePhoto(UploadedFile $file, Student $student): string
    {
        $path = $file->store("students/{$student->school_id}", 'local');

        if ($path === false) {
            throw ValidationException::withMessages(['photo' => __('The photo could not be saved. Try again.')]);
        }

        return $path;
    }

    /**
     * Open a placement in a classroom, closing any open one first.
     */
    public static function enroll(Student $student, Classroom $classroom, string $closingStatus = 'moved'): StudentEnrollment
    {
        $student->enrollments()
            ->whereNull('left_on')
            ->update(['left_on' => now()->toDateString(), 'status' => $closingStatus]);

        return $student->enrollments()->create([
            'classroom_id' => $classroom->id,
            'academic_year_id' => $classroom->academic_year_id,
            'enrolled_on' => now()->toDateString(),
            'status' => 'active',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public static function link(Student $student, Guardian $guardian, array $data, bool $defaultPrimary = false): void
    {
        $isPrimary = (bool) ($data['is_primary_contact'] ?? $defaultPrimary);

        if ($isPrimary) {
            $student->guardians()->newPivotStatement()
                ->where('student_id', $student->id)
                ->update(['is_primary_contact' => false]);
        }

        $student->guardians()->syncWithoutDetaching([
            $guardian->id => [
                'school_id' => $student->school_id,
                'relationship' => $data['relationship'] ?? null,
                'is_primary_contact' => $isPrimary,
                'can_pickup' => (bool) ($data['can_pickup'] ?? true),
                'receives_notifications' => (bool) ($data['receives_notifications'] ?? true),
            ],
        ]);
    }

    /**
     * Classes in the current (or latest) school year, for select inputs.
     *
     * @return list<array{value: string, label: string}>
     */
    private function currentClassroomOptions(): array
    {
        $year = AcademicYear::query()->orderByDesc('is_current')->orderByDesc('start_date')->first();

        if ($year === null) {
            return [];
        }

        return array_values(Classroom::query()
            ->where('academic_year_id', $year->id)
            ->join('grade_levels', 'grade_levels.id', '=', 'classrooms.grade_level_id')
            ->orderBy('grade_levels.sort_order')
            ->orderBy('classrooms.name')
            ->get(['classrooms.id', 'classrooms.name'])
            ->map(fn (Classroom $c) => ['value' => (string) $c->id, 'label' => $c->name])
            ->all());
    }
}
