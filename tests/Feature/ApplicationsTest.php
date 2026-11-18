<?php

namespace Tests\Feature;

use App\Actions\People\AddSchoolMember;
use App\Models\AcademicYear;
use App\Models\Application;
use App\Models\Classroom;
use App\Models\GradeLevel;
use App\Models\School;
use App\Models\Student;
use App\Models\User;
use App\Support\CurrentSchool;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class ApplicationsTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    private School $school;

    private User $admin;

    private GradeLevel $grade;

    private Classroom $class;

    protected function setUp(): void
    {
        parent::setUp();

        [$this->school, $this->admin] = $this->schoolWithAdmin();
        $this->inSchool($this->school);

        $year = AcademicYear::create(['name' => '2027', 'start_date' => '2027-01-15', 'end_date' => '2027-11-30', 'is_current' => true]);
        $this->grade = GradeLevel::create(['name' => 'Grade 4']);
        $this->class = Classroom::create(['grade_level_id' => $this->grade->id, 'academic_year_id' => $year->id, 'name' => 'Grade 4A', 'capacity' => 30]);
        Student::create(['first_name' => 'Old', 'last_name' => 'Learner', 'admission_number' => 'MPS-0041']);

        app(CurrentSchool::class)->set(null);
    }

    /**
     * @return array<string, mixed>
     */
    private function form(array $extra = []): array
    {
        return [
            'first_name' => 'Palesa',
            'last_name' => 'Mokoena',
            'date_of_birth' => '2017-03-02',
            'gender' => 'female',
            'grade_level_id' => $this->grade->id,
            'guardian_name' => 'Mpho Mokoena',
            'guardian_phone' => '5812 3456',
            'guardian_relationship' => 'mother',
            'message' => 'She loves reading.',
            ...$extra,
        ];
    }

    private function publish(): void
    {
        $this->school->forceFill(['verified_at' => now(), 'published_at' => now()])->save();
    }

    public function test_parents_can_only_apply_once_the_school_page_is_public(): void
    {
        $this->get(route('schools.apply', $this->school))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('public/apply')->where('open', false));
        $this->post(route('schools.apply.store', $this->school), $this->form())->assertNotFound();

        $this->publish();

        $this->get(route('schools.public', $this->school))
            ->assertInertia(fn (Assert $page) => $page->where('page.applications_open', true));
        $this->get(route('schools.apply', $this->school))
            ->assertInertia(fn (Assert $page) => $page->where('open', true)->has('grades', 1));

        $this->school->update(['accepts_applications' => false]);
        $this->post(route('schools.apply.store', $this->school), $this->form())->assertNotFound();
    }

    public function test_a_parent_applies_and_gets_a_reference(): void
    {
        $this->publish();

        $this->post(route('schools.apply.store', $this->school), $this->form(['guardian_phone' => 'abc', 'gender' => 'other']))
            ->assertSessionHasErrors(['guardian_phone', 'gender']);

        $this->post(route('schools.apply.store', $this->school), $this->form())
            ->assertRedirect(route('schools.apply.thanks', $this->school))
            ->assertSessionHas('application_reference');

        $application = Application::withoutSchoolScope()->sole();
        $this->assertSame($this->school->id, $application->school_id);
        $this->assertSame('+26658123456', $application->guardian_phone);
        $this->assertSame('pending', $application->status);
        $this->assertMatchesRegularExpression('/^AP-[A-Z2-9]{5}$/', $application->reference);

        // Sending it again doesn't make a second one; a bot filling the hidden field saves nothing.
        $this->post(route('schools.apply.store', $this->school), $this->form());
        $this->post(route('schools.apply.store', $this->school), $this->form(['first_name' => 'Bot', 'website' => 'spam']));
        $this->assertSame(1, Application::withoutSchoolScope()->count());

        // A grade from another school is refused.
        [$other] = $this->schoolWithAdmin('Other School');
        $otherGrade = GradeLevel::withoutSchoolScope()->create(['school_id' => $other->id, 'name' => 'Grade 9']);
        $this->post(route('schools.apply.store', $this->school), $this->form(['first_name' => 'Thato', 'grade_level_id' => $otherGrade->id]))
            ->assertSessionHasErrors('grade_level_id');
    }

    public function test_an_admin_admits_an_applicant_into_a_class(): void
    {
        $this->publish();
        $this->post(route('schools.apply.store', $this->school), $this->form());
        $application = Application::withoutSchoolScope()->sole();

        $this->withSession(['current_school_id' => $this->school->id]);
        $this->inSchool($this->school);

        $this->actingAs($this->admin)
            ->get(route('applications.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('applications/index')
                ->has('applications', 1)
                ->where('applications.0.full_name', 'Palesa Mokoena')
                ->where('counts.pending', 1)
                ->where('nextAdmissionNumber', 'MPS-0042')
                ->where('placements.0.name', 'Grade 4')
                ->where('placements.0.classes.0', ['id' => $this->class->id, 'name' => 'Grade 4A', 'learners' => 0, 'capacity' => 30])
                ->where('isOpen', true));

        $this->put(route('applications.accept', $application), ['classroom_id' => $this->class->id, 'admission_number' => 'MPS-0041'])
            ->assertSessionHasErrors('admission_number');

        $this->put(route('applications.accept', $application), ['classroom_id' => $this->class->id, 'admission_number' => 'MPS-0042'])
            ->assertSessionHasNoErrors();

        $student = Student::firstWhere('admission_number', 'MPS-0042');
        $this->assertSame('Palesa', $student->first_name);
        $this->assertSame($this->class->id, $student->currentEnrollment->classroom_id);

        $guardian = $student->guardians()->with('user')->sole();
        $this->assertSame('+26658123456', $guardian->user->phone);
        $this->assertTrue($guardian->user->hasRole('parent'));
        $this->assertSame('mother', $guardian->pivot->relationship);

        $application->refresh();
        $this->assertSame('accepted', $application->status);
        $this->assertSame($student->id, $application->student_id);

        // Can't be decided twice; the accepted list offers a WhatsApp message.
        $this->put(route('applications.decline', $application))->assertStatus(409);
        $this->get(route('applications.index', ['status' => 'accepted']))
            ->assertInertia(fn (Assert $page) => $page->where('applications.0.whatsapp_url', fn ($url) => str_starts_with($url, 'https://wa.me/26658123456?text=')));
    }

    public function test_an_admin_declines_and_only_admins_see_applications(): void
    {
        $this->publish();
        $this->post(route('schools.apply.store', $this->school), $this->form());
        $application = Application::withoutSchoolScope()->sole();
        $this->inSchool($this->school);

        $this->actingAs($this->admin)
            ->put(route('applications.decline', $application), ['decline_reason' => 'Grade 4 is full.'])
            ->assertSessionHasNoErrors();

        $this->assertSame('declined', $application->fresh()->status);
        $this->assertSame(0, Student::where('first_name', 'Palesa')->count());

        $this->put(route('applications.settings'), ['accepts_applications' => false]);
        $this->assertFalse($this->school->fresh()->accepts_applications);

        $parent = User::factory()->create();
        app(AddSchoolMember::class)->handle($parent, ['parent']);
        $this->actingAs($parent)->get(route('applications.index'))->assertForbidden();
    }
}
