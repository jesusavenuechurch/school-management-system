<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\Subject;
use App\Models\Term;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class SetupJourneyTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    private function calendar(): array
    {
        return [
            'name' => '2027',
            'start_date' => '2027-01-15',
            'end_date' => '2027-12-04',
            'terms' => [
                ['name' => 'Term 1', 'start_date' => '2027-01-15', 'end_date' => '2027-04-09'],
                ['name' => 'Term 2', 'start_date' => '2027-04-26', 'end_date' => '2027-08-06'],
                ['name' => 'Term 3', 'start_date' => '2027-08-23', 'end_date' => '2027-12-04'],
            ],
        ];
    }

    public function test_a_new_school_starts_at_the_calendar_step_with_suggestions(): void
    {
        [, $admin] = $this->schoolWithAdmin();

        $this->actingAs($admin)->get(route('setup.journey'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('setup/journey')
                ->where('currentStep', 'calendar')
                ->where('steps.0.done', true)
                ->where('gradeSuggestions.0.grades.0.name', 'Grade 1')
                ->where('gradeSuggestions.1.grades.0.name', 'Grade 8')
                ->where('gradeSuggestions.1.grades.0.description', 'Foundation year 1')
                ->where('gradeSuggestions.1.grades.3.name', 'Grade 11')
                ->where('subjectSuggestions.0.name', 'Sesotho'));
    }

    public function test_walking_through_calendar_grades_and_subjects(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->actingAs($admin);

        $this->post(route('setup.journey.calendar'), $this->calendar())
            ->assertRedirect(route('setup.journey'))
            ->assertSessionHasNoErrors();

        $this->inSchool($school);
        $year = AcademicYear::firstOrFail();
        $this->assertTrue($year->is_current);
        $this->assertSame(3, Term::count());
        $this->assertSame(1, Term::where('is_current', true)->count());

        // Each grade has its own number of classes.
        $this->post(route('setup.journey.grades'), [
            'levels' => ['primary'],
            'grades' => [
                ['name' => 'Grade 1', 'classes' => 3],
                ['name' => 'Grade 2', 'classes' => 1],
                ['name' => 'Reception', 'classes' => 2],
            ],
        ])->assertSessionHasNoErrors();

        $this->assertSame(3, GradeLevel::count());
        $this->assertEqualsCanonicalizing(
            ['Grade 1A', 'Grade 1B', 'Grade 1C', 'Grade 2', 'ReceptionA', 'ReceptionB'],
            Classroom::pluck('name')->all(),
        );
        $this->assertSame(['primary'], $school->fresh()->levels);

        $this->post(route('setup.journey.subjects'), [
            'subjects' => ['SES', 'MATH'],
            'extra' => ['French', 'Music', 'mathematics', 'music'],
        ])->assertSessionHasNoErrors();

        // "mathematics" is already there, so it isn't added twice.
        $this->assertEqualsCanonicalizing(['Sesotho', 'Mathematics', 'French', 'Music'], Subject::pluck('name')->all());
        $this->assertSame('FREN', Subject::where('name', 'French')->value('code'));

        $this->get(route('setup.journey'))->assertInertia(fn ($page) => $page
            ->where('currentStep', 'teachers')
            ->where('steps.2.doneLabel', '3 grades, 6 classes'));
    }

    public function test_high_school_grades_carry_their_descriptions(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->actingAs($admin)->post(route('setup.journey.calendar'), $this->calendar());

        $this->post(route('setup.journey.grades'), [
            'levels' => ['high_school'],
            'grades' => [['name' => 'Grade 11', 'description' => 'Pre-final year 4, LGCSE', 'classes' => 12]],
        ])->assertSessionHasNoErrors();

        $this->inSchool($school);
        $this->assertSame('Pre-final year 4, LGCSE', GradeLevel::where('name', 'Grade 11')->value('description'));
        $this->assertSame(12, Classroom::count());
        $this->assertTrue(Classroom::where('name', 'Grade 11L')->exists());
        $this->assertSame(['high_school'], $school->fresh()->levels);
    }

    public function test_more_than_twenty_classes_in_a_grade_is_refused(): void
    {
        [, $admin] = $this->schoolWithAdmin();
        $this->actingAs($admin)->post(route('setup.journey.calendar'), $this->calendar());

        $this->post(route('setup.journey.grades'), [
            'levels' => ['primary'],
            'grades' => [['name' => 'Grade 1', 'classes' => 21]],
        ])->assertSessionHasErrors('grades.0.classes');
    }

    public function test_one_class_per_grade_uses_the_grade_name(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->actingAs($admin)->post(route('setup.journey.calendar'), $this->calendar());
        $this->post(route('setup.journey.grades'), ['levels' => ['high_school'], 'grades' => [['name' => 'Grade 8', 'classes' => 1]]]);

        $this->inSchool($school);
        $this->assertSame(['Grade 8'], Classroom::pluck('name')->all());
    }

    public function test_grades_need_a_calendar_first(): void
    {
        [, $admin] = $this->schoolWithAdmin();

        $this->actingAs($admin)
            ->post(route('setup.journey.grades'), ['levels' => ['primary'], 'grades' => [['name' => 'Grade 1', 'classes' => 1]]])
            ->assertSessionHasErrors('grades');
    }

    public function test_terms_must_fit_inside_the_year(): void
    {
        [, $admin] = $this->schoolWithAdmin();
        $calendar = $this->calendar();
        $calendar['terms'][2]['end_date'] = '2028-01-30';

        $this->actingAs($admin)
            ->post(route('setup.journey.calendar'), $calendar)
            ->assertSessionHasErrors('terms.2.end_date');
    }

    public function test_skipping_every_step_completes_setup(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->actingAs($admin);

        foreach (['calendar', 'grades', 'subjects', 'teachers'] as $step) {
            $this->post(route('setup.journey.skip'), ['step' => $step]);
            $this->assertNull($school->fresh()->setup_completed_at);
        }

        $this->post(route('setup.journey.skip'), ['step' => 'students']);

        $this->assertNotNull($school->fresh()->setup_completed_at);
        $this->get(route('setup.journey'))->assertInertia(fn ($page) => $page->where('currentStep', null));
    }

    public function test_editing_the_school_step(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();

        $this->actingAs($admin)->post(route('setup.journey.school'), [
            'name' => 'Sunrise Primary',
            'levels' => ['primary'],
        ])->assertSessionHasNoErrors();

        $school->refresh();
        $this->assertSame('Sunrise Primary', $school->name);
        $this->assertSame(['primary'], $school->levels);
    }
}
