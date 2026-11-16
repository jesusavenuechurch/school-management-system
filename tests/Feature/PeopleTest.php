<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Staff;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class PeopleTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    /**
     * @return array{0: Classroom, 1: Classroom}
     */
    private function twoClasses(): array
    {
        $year = AcademicYear::create(['name' => '2027', 'start_date' => '2027-01-15', 'end_date' => '2027-11-30', 'is_current' => true]);
        $grade = GradeLevel::create(['name' => 'Grade 4']);

        return [
            Classroom::create(['grade_level_id' => $grade->id, 'academic_year_id' => $year->id, 'name' => 'Grade 4A']),
            Classroom::create(['grade_level_id' => $grade->id, 'academic_year_id' => $year->id, 'name' => 'Grade 4B']),
        ];
    }

    public function test_admin_adds_a_teacher_with_a_new_account(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();

        $this->actingAs($admin)->post(route('staff.store'), [
            'name' => 'Thabo Nthunya',
            'username' => 'thabo',
            'phone' => '62000001',
            'password' => 'password',
            'password_confirmation' => 'password',
            'staff_number' => 'STF0002',
            'roles' => ['teacher'],
        ])->assertSessionHasNoErrors();

        $this->inSchool($school);
        $teacher = User::where('username', 'thabo')->firstOrFail();
        $this->assertTrue($teacher->hasRole('teacher'));
        $this->assertSame([$school->id], $teacher->activeSchoolIds());
        $this->assertSame('STF0002', Staff::where('user_id', $teacher->id)->value('staff_number'));

        $this->actingAs($admin)->get(route('staff.index'))
            ->assertInertia(fn ($page) => $page->component('staff/index')->has('staff', 1)->where('staff.0.roles.0', 'teacher'));
    }

    public function test_an_existing_account_is_reused_when_username_and_phone_match(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $existing = User::factory()->create(['username' => 'lineo', 'phone' => '+26658000002']);

        $this->actingAs($admin)->post(route('staff.store'), [
            'name' => 'Lineo M', 'username' => 'Lineo', 'phone' => '5800 0002',
            'staff_number' => 'STF0002', 'roles' => ['teacher', 'accountant'],
        ])->assertSessionHasNoErrors();

        // No new login was created: the admin, and Lineo's existing account.
        $this->assertSame(2, User::count());
        $this->inSchool($school);
        $this->assertTrue($existing->fresh()->hasAllRoles(['teacher', 'accountant']));
    }

    public function test_a_taken_username_with_a_different_phone_is_refused(): void
    {
        [, $admin] = $this->schoolWithAdmin();
        User::factory()->create(['username' => 'lineo', 'phone' => '+26658000002']);

        $this->actingAs($admin)->post(route('staff.store'), [
            'name' => 'Someone Else', 'username' => 'lineo', 'phone' => '62999999',
            'staff_number' => 'STF0002', 'roles' => ['teacher'],
        ])->assertSessionHasErrors('username');
    }

    public function test_admins_cannot_remove_their_own_admin_role(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->inSchool($school);
        $staff = Staff::create(['user_id' => $admin->id, 'staff_number' => 'STF0001']);

        $this->actingAs($admin)->put(route('staff.update', $staff), [
            'staff_number' => 'STF0001', 'employment_status' => 'active', 'roles' => ['teacher'],
        ])->assertSessionHasErrors('roles');
    }

    public function test_admitting_a_student_places_them_and_links_guardians(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->inSchool($school);
        [$classA] = $this->twoClasses();

        $this->actingAs($admin)->post(route('students.store'), [
            'first_name' => 'Lerato',
            'last_name' => 'Mokoena',
            'admission_number' => '20270001',
            'classroom_id' => $classA->id,
            'guardians' => [
                ['name' => 'Palesa Mokoena', 'phone' => '58123456', 'relationship' => 'mother', 'can_pickup' => '1'],
                ['name' => 'Teboho Mokoena', 'phone' => '58123456', 'relationship' => 'father', 'can_pickup' => '0'],
            ],
        ])->assertRedirect();

        $student = Student::firstOrFail();
        $this->assertSame($classA->id, $student->currentEnrollment->classroom_id);

        $guardians = $student->guardians()->orderBy('guardians.id')->get();
        $this->assertCount(2, $guardians);
        $this->assertTrue((bool) $guardians[0]->pivot->is_primary_contact);
        $this->assertFalse((bool) $guardians[1]->pivot->can_pickup);

        // Shared phone, but two separate accounts.
        $this->assertNotSame($guardians[0]->user_id, $guardians[1]->user_id);
        $this->assertSame('+26658123456', $guardians[1]->user->phone);
        $this->assertTrue($guardians[0]->user->hasRole('parent'));
        $this->assertMatchesRegularExpression('/^palesa\d{4}$/', $guardians[0]->user->username);
    }

    public function test_a_second_child_reuses_the_same_guardian(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->inSchool($school);

        foreach (['A1', 'A2'] as $admission) {
            $this->actingAs($admin)->post(route('students.store'), [
                'first_name' => 'Child', 'last_name' => $admission, 'admission_number' => $admission,
                'guardians' => [['name' => 'Palesa Mokoena', 'phone' => '+266 5812 3456']],
            ])->assertSessionHasNoErrors();
        }

        $this->assertSame(1, Guardian::count());
        $this->assertSame(2, Guardian::first()->students()->count());
    }

    public function test_moving_class_keeps_the_history(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->inSchool($school);
        [$classA, $classB] = $this->twoClasses();
        $student = Student::create(['first_name' => 'Lerato', 'last_name' => 'M', 'admission_number' => 'A1']);
        $student->enrollments()->create(['classroom_id' => $classA->id, 'academic_year_id' => $classA->academic_year_id, 'enrolled_on' => '2027-01-15']);

        $this->actingAs($admin)
            ->post(route('students.enrollments.store', $student), ['classroom_id' => $classB->id])
            ->assertSessionHasNoErrors();

        $enrollments = $student->enrollments()->orderBy('id')->get();
        $this->assertCount(2, $enrollments);
        $this->assertSame('moved', $enrollments[0]->status);
        $this->assertNotNull($enrollments[0]->left_on);
        $this->assertSame($classB->id, $student->fresh()->currentEnrollment->classroom_id);
    }

    public function test_student_pages_render(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->inSchool($school);
        $student = Student::create(['first_name' => 'Lerato', 'last_name' => 'Mokoena', 'admission_number' => 'A1']);

        $this->actingAs($admin);
        $this->get(route('students.index', ['search' => 'Lera']))
            ->assertInertia(fn ($page) => $page->component('students/index')->where('students.total', 1));
        $this->get(route('students.create'))->assertOk();
        $this->get(route('students.show', $student))
            ->assertInertia(fn ($page) => $page->component('students/show')->where('student.full_name', 'Lerato Mokoena'));
    }
}
