<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class SchoolSetupTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    public function test_admin_sets_up_years_terms_grades_classes_and_subjects(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->actingAs($admin);

        $this->get(route('setup.years.index'))->assertOk();

        $this->post(route('setup.years.store'), [
            'name' => '2027', 'start_date' => '2027-01-15', 'end_date' => '2027-11-30', 'is_current' => '1',
        ])->assertSessionHasNoErrors();

        $year = AcademicYear::withoutSchoolScope()->firstOrFail();
        $this->assertSame($school->id, $year->school_id);
        $this->assertTrue($year->is_current);

        $this->post(route('setup.terms.store'), [
            'academic_year_id' => $year->id, 'name' => 'Term 1', 'start_date' => '2027-01-15', 'end_date' => '2027-04-10', 'is_current' => '1',
        ])->assertSessionHasNoErrors();

        $this->post(route('setup.grades.store'), ['name' => 'Grade 4'])->assertSessionHasNoErrors();
        $grade = GradeLevel::withoutSchoolScope()->firstOrFail();

        $this->post(route('setup.classrooms.store'), [
            'grade_level_id' => $grade->id, 'academic_year_id' => $year->id, 'name' => 'Grade 4A',
        ])->assertSessionHasNoErrors();

        // Same name in the same year is refused.
        $this->post(route('setup.classrooms.store'), [
            'grade_level_id' => $grade->id, 'academic_year_id' => $year->id, 'name' => 'Grade 4A',
        ])->assertSessionHasErrors('name');

        $this->post(route('setup.subjects.store'), ['name' => 'Mathematics', 'code' => 'math'])->assertSessionHasNoErrors();
        $this->assertSame('MATH', Subject::withoutSchoolScope()->value('code'));

        $this->get(route('setup.classes'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('setup/classes')
                ->where('selectedYearId', $year->id)
                ->where('gradeLevels.0.classrooms.0.name', 'Grade 4A'));

        $this->assertSame(1, Term::withoutSchoolScope()->count());
        $this->assertSame(1, Classroom::withoutSchoolScope()->count());
    }

    public function test_only_one_year_is_current(): void
    {
        [, $admin] = $this->schoolWithAdmin();
        $this->actingAs($admin);

        foreach (['2026', '2027'] as $name) {
            $this->post(route('setup.years.store'), [
                'name' => $name, 'start_date' => "{$name}-01-15", 'end_date' => "{$name}-11-30", 'is_current' => '1',
            ]);
        }

        $this->assertSame(['2027'], AcademicYear::withoutSchoolScope()->where('is_current', true)->pluck('name')->all());
    }

    public function test_a_year_with_classes_cannot_be_deleted(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->inSchool($school);
        $year = AcademicYear::create(['name' => '2027', 'start_date' => '2027-01-15', 'end_date' => '2027-11-30']);
        $grade = GradeLevel::create(['name' => 'Grade 1']);
        Classroom::create(['grade_level_id' => $grade->id, 'academic_year_id' => $year->id, 'name' => '1A']);

        $this->actingAs($admin)
            ->delete(route('setup.years.destroy', $year))
            ->assertSessionHasErrors('year');

        $this->assertModelExists($year);
    }

    public function test_another_schools_records_are_not_reachable(): void
    {
        [$schoolA] = $this->schoolWithAdmin('A');
        $this->inSchool($schoolA);
        $subjectA = Subject::create(['name' => 'Sesotho', 'code' => 'SES']);

        [, $adminB] = $this->schoolWithAdmin('B');

        $this->actingAs($adminB)
            ->put(route('setup.subjects.update', $subjectA), ['name' => 'Hacked', 'code' => 'HAX'])
            ->assertNotFound();

        $this->assertSame('Sesotho', $subjectA->fresh()->name);
    }

    public function test_a_class_cannot_use_another_schools_grade(): void
    {
        [$schoolA] = $this->schoolWithAdmin('A');
        $this->inSchool($schoolA);
        $gradeA = GradeLevel::create(['name' => 'Grade 1']);

        [$schoolB, $adminB] = $this->schoolWithAdmin('B');
        $this->inSchool($schoolB);
        $yearB = AcademicYear::create(['name' => '2027', 'start_date' => '2027-01-15', 'end_date' => '2027-11-30']);

        $this->actingAs($adminB)
            ->post(route('setup.classrooms.store'), [
                'grade_level_id' => $gradeA->id, 'academic_year_id' => $yearB->id, 'name' => '1A',
            ])
            ->assertSessionHasErrors('grade_level_id');
    }

    public function test_non_admins_cannot_open_setup(): void
    {
        [$school] = $this->schoolWithAdmin();
        $teacher = User::factory()->create();
        $school->users()->attach($teacher, ['status' => 'active']);
        $this->inSchool($school);
        $teacher->assignRole('teacher');

        $this->actingAs($teacher)->get(route('setup.years.index'))->assertForbidden();
        $this->actingAs($teacher)->get(route('dashboard'))->assertOk();
    }
}
