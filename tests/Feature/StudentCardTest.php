<?php

namespace Tests\Feature;

use App\Actions\People\AddSchoolMember;
use App\Actions\People\CreateGuardian;
use App\Actions\Schools\CreateSchool;
use App\Http\Controllers\People\StudentController;
use App\Http\Middleware\SetCurrentSchool;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class StudentCardTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    /**
     * @return array{0: School, 1: User, 2: Classroom, 3: Student}
     */
    private function schoolWithLearner(string $name = 'Morija Primary'): array
    {
        [$school, $admin] = $this->schoolWithAdmin($name);
        $this->inSchool($school);

        $year = AcademicYear::create(['name' => '2027', 'start_date' => '2027-01-15', 'end_date' => '2027-11-30', 'is_current' => true]);
        $grade = GradeLevel::create(['name' => 'Grade 8', 'description' => 'Foundation year 1']);
        $class = Classroom::create(['grade_level_id' => $grade->id, 'academic_year_id' => $year->id, 'name' => 'Grade 8A']);

        $student = Student::create(['first_name' => 'Lerato', 'last_name' => 'Mokoena', 'admission_number' => 'A1']);
        StudentController::enroll($student, $class);

        return [$school, $admin, $class, $student];
    }

    public function test_an_admin_prints_cards_for_a_class(): void
    {
        [, $admin, $class, $lerato] = $this->schoolWithLearner();
        $tumelo = Student::create(['first_name' => 'Tumelo', 'last_name' => 'Khoabane', 'admission_number' => 'A2']);
        StudentController::enroll($tumelo, $class);
        Student::create(['first_name' => 'Not', 'last_name' => 'Placed', 'admission_number' => 'A3']);

        $this->actingAs($admin)
            ->get(route('students.cards', ['classroom' => $class->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('cards/print')
                ->has('cards', 2)
                ->where('cards.0.full_name', 'Tumelo Khoabane')
                ->where('cards.1.classroom', 'Grade 8A')
                ->where('cards.1.grade_description', 'Foundation year 1')
                ->where('cards.1.year', '2027')
                ->where('cards.1.qr_svg', fn (string $svg) => str_starts_with($svg, '<svg')));

        // Each card gets its own unguessable code, kept between prints.
        $code = $lerato->fresh()->card_code;
        $this->assertSame(16, strlen((string) $code));
        $this->get(route('students.cards', ['student' => $lerato->id]))->assertOk();
        $this->assertSame($code, $lerato->fresh()->card_code);
    }

    public function test_scanning_a_card_shows_who_may_collect_the_child(): void
    {
        [, $admin, , $student] = $this->schoolWithLearner();

        $mother = app(CreateGuardian::class)->handle(['name' => 'Palesa Mokoena', 'phone' => '58001122']);
        StudentController::link($student, $mother, ['relationship' => 'mother', 'is_primary_contact' => true]);
        $uncle = app(CreateGuardian::class)->handle(['name' => 'Teboho Mokoena', 'phone' => '62003344']);
        StudentController::link($student, $uncle, ['relationship' => 'other', 'can_pickup' => false]);

        $teacher = User::factory()->create();
        app(AddSchoolMember::class)->handle($teacher, ['teacher']);

        $this->actingAs($teacher)
            ->get(route('cards.check', $student->cardCode()))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('cards/check')
                ->where('student.full_name', 'Lerato Mokoena')
                ->has('collectors', 2)
                ->where('collectors.0.name', 'Palesa Mokoena')
                ->where('collectors.0.can_pickup', true)
                ->where('collectors.1.can_pickup', false)
                ->where('canManage', false));
    }

    public function test_only_staff_of_that_school_can_check_a_card(): void
    {
        [, , , $student] = $this->schoolWithLearner();
        $code = $student->cardCode();

        // A parent at the same school can't look children up.
        $parent = app(CreateGuardian::class)->handle(['name' => 'Someone Else', 'phone' => '58009999'])->user;
        $this->actingAs($parent)->get(route('cards.check', $code))->assertNotFound();

        // Staff at another school can't either.
        [, $otherAdmin] = $this->schoolWithAdmin('Other School');
        $this->actingAs($otherAdmin)->get(route('cards.check', $code))->assertNotFound();

        // Guests are asked to sign in first.
        auth()->logout();
        $this->get(route('cards.check', $code))->assertRedirect(route('login'));
    }

    public function test_a_staff_member_scanning_switches_to_the_cards_school(): void
    {
        [$schoolA, $admin, , $student] = $this->schoolWithLearner('School A');
        $code = $student->cardCode();

        // The same admin also runs a second school and is working in it.
        $schoolB = app(CreateSchool::class)->handle($admin, ['name' => 'School B', 'levels' => ['primary']]);

        $this->actingAs($admin)
            ->withSession([SetCurrentSchool::SESSION_KEY => $schoolB->id])
            ->get(route('cards.check', $code))
            ->assertOk()
            ->assertSessionHas(SetCurrentSchool::SESSION_KEY, $schoolA->id);
    }
}
