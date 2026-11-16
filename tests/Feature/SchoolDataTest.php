<?php

namespace Tests\Feature;

use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassSubjectTeacher;
use App\Models\ExamResult;
use App\Models\GradeLevel;
use App\Models\GradingScale;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\NotificationTemplate;
use App\Models\Payment;
use App\Models\School;
use App\Models\Staff;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use App\Support\Constants;
use App\Support\CurrentSchool;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SchoolDataTest extends TestCase
{
    use RefreshDatabase;

    private function school(string $name = 'Test School'): School
    {
        return School::create(['name' => $name]);
    }

    private function student(School $school, string $admission = 'A001'): Student
    {
        return Student::create([
            'school_id' => $school->id,
            'first_name' => 'Lerato',
            'last_name' => 'Mokoena',
            'admission_number' => $admission,
        ]);
    }

    public function test_queries_only_see_the_current_schools_rows(): void
    {
        $a = $this->school('A');
        $b = $this->school('B');
        $this->student($a, 'A001');
        $this->student($b, 'B001');

        $this->assertSame(2, Student::count()); // no school set: no filter

        app(CurrentSchool::class)->set($a->id);

        $this->assertSame(['A001'], Student::pluck('admission_number')->all());
        $this->assertSame(2, Student::withoutSchoolScope()->count());
    }

    public function test_new_rows_get_the_current_school(): void
    {
        $school = $this->school();
        app(CurrentSchool::class)->set($school->id);

        $student = Student::create([
            'first_name' => 'Thabo',
            'last_name' => 'Nthunya',
            'admission_number' => 'A002',
        ]);

        $this->assertSame($school->id, $student->school_id);
        $this->assertSame('Thabo Nthunya', $student->full_name);
    }

    public function test_middleware_picks_the_users_active_school(): void
    {
        $school = $this->school();
        $user = User::factory()->create();
        $user->schools()->attach($school, ['status' => 'active']);

        $this->actingAs($user)->get(route('dashboard'))->assertOk();

        $this->assertSame($school->id, app(CurrentSchool::class)->id());
        $this->assertSame($school->id, session('current_school_id'));
    }

    public function test_middleware_ignores_suspended_memberships(): void
    {
        $school = $this->school();
        $user = User::factory()->create();
        $user->schools()->attach($school, ['status' => 'suspended']);

        $this->actingAs($user)->get(route('dashboard'))->assertRedirect(route('onboarding.create'));

        $this->assertNull(app(CurrentSchool::class)->id());
    }

    public function test_one_login_can_be_a_teacher_at_one_school_and_a_parent_at_another(): void
    {
        $a = $this->school('A');
        $b = $this->school('B');
        $user = User::factory()->create();

        app(CurrentSchool::class)->set($a->id);
        Role::create(['name' => 'teacher', 'school_id' => $a->id]);
        $user->assignRole('teacher');

        app(CurrentSchool::class)->set($b->id);
        Role::create(['name' => 'parent', 'school_id' => $b->id]);
        $user->unsetRelation('roles')->assignRole('parent');

        $this->assertTrue($user->unsetRelation('roles')->hasRole('parent'));
        $this->assertFalse($user->hasRole('teacher'));

        app(CurrentSchool::class)->set($a->id);
        $this->assertTrue($user->unsetRelation('roles')->hasRole('teacher'));
        $this->assertFalse($user->hasRole('parent'));
    }

    public function test_two_schools_grade_the_same_score_with_their_own_scales(): void
    {
        $a = $this->school('A');
        $b = $this->school('B');

        $scaleA = $a->hasMany(GradingScale::class)->create(['name' => 'Standard', 'is_default' => true]);
        $scaleA->bands()->createMany([
            ['label' => 'A', 'min_percentage' => 80],
            ['label' => 'B', 'min_percentage' => 70],
            ['label' => 'C', 'min_percentage' => 60],
            ['label' => 'F', 'min_percentage' => 0, 'is_pass' => false],
        ]);

        $scaleB = $b->hasMany(GradingScale::class)->create(['name' => 'Standard', 'is_default' => true]);
        $scaleB->bands()->createMany([
            ['label' => 'Distinction', 'min_percentage' => 75],
            ['label' => 'Merit', 'min_percentage' => 60],
            ['label' => 'Pass', 'min_percentage' => 50],
            ['label' => 'Fail', 'min_percentage' => 0, 'is_pass' => false],
        ]);

        // 39/49 = 79.59%, which fell in the gap between 79.99 and 80 bands
        // in the old min/max design. With minimum-only bands it is a B.
        $result = new ExamResult(['score' => 39, 'max_score' => 49]);

        $this->assertSame(79.59, $result->percentage);
        $this->assertSame('B', $result->applyGrade($scaleA)->grade_label);
        $this->assertSame('Distinction', $result->applyGrade($scaleB)->grade_label);

        $fail = new ExamResult(['score' => 20, 'max_score' => 50]);
        $this->assertFalse($fail->applyGrade($scaleB)->is_pass);
    }

    public function test_invoice_totals_follow_successful_payments_only(): void
    {
        $school = $this->school();
        app(CurrentSchool::class)->set($school->id);
        $student = $this->student($school);

        $invoice = Invoice::create(['student_id' => $student->id, 'invoice_number' => 'INV-1']);
        $invoice->items()->create(['description' => 'Tuition', 'amount' => 1000]);

        $paid = Payment::create(['amount' => 400, 'method' => 'mobile_money', 'status' => 'successful']);
        $failed = Payment::create(['amount' => 600, 'method' => 'mobile_money', 'status' => 'failed']);
        $paid->allocations()->create(['invoice_id' => $invoice->id, 'amount_allocated' => 400]);
        $failed->allocations()->create(['invoice_id' => $invoice->id, 'amount_allocated' => 600]);

        $invoice->recalculate();
        $this->assertSame('1000.00', $invoice->total_amount);
        $this->assertSame('400.00', $invoice->amount_paid);
        $this->assertSame('600.00', $invoice->balance);
        $this->assertSame('partial', $invoice->status);

        $failed->update(['status' => 'successful']);
        $this->assertSame('paid', $invoice->recalculate()->status);
    }

    public function test_a_walk_in_payer_needs_no_account(): void
    {
        $school = $this->school();
        app(CurrentSchool::class)->set($school->id);

        $payment = Payment::create([
            'payer_name' => 'Nkhono Palesa',
            'payer_phone' => '+26658000000',
            'amount' => 250,
            'method' => 'cash',
        ]);

        $this->assertNull($payment->payer);
    }

    public function test_guardians_sharing_a_phone_are_managed_separately(): void
    {
        $school = $this->school();
        app(CurrentSchool::class)->set($school->id);
        $student = $this->student($school);

        $mother = Guardian::create(['user_id' => User::factory()->create(['phone' => '+26658123456'])->id]);
        $father = Guardian::create(['user_id' => User::factory()->create(['phone' => '+26658123456'])->id]);

        $student->guardians()->attach($mother, ['school_id' => $school->id, 'relationship' => 'mother', 'is_primary_contact' => true]);
        $student->guardians()->attach($father, ['school_id' => $school->id, 'relationship' => 'father', 'can_pickup' => false]);

        $pickup = $student->guardians()->wherePivot('can_pickup', true)->pluck('guardians.id')->all();

        $this->assertSame([$mother->id], $pickup);
    }

    public function test_a_schools_own_template_overrides_the_platform_default(): void
    {
        $a = $this->school('A');
        $b = $this->school('B');

        NotificationTemplate::create(['key' => 'invoice.created', 'channel' => 'whatsapp', 'title' => 'Default', 'body_template' => 'Hi {{name}}, you owe {{amount}}.']);
        NotificationTemplate::create(['school_id' => $a->id, 'key' => 'invoice.created', 'channel' => 'whatsapp', 'title' => 'School A', 'body_template' => 'Dumela {{name}}']);

        $this->assertSame('School A', NotificationTemplate::resolve('invoice.created', 'whatsapp', $a->id)->title);

        $default = NotificationTemplate::resolve('invoice.created', 'whatsapp', $b->id);
        $this->assertSame('Default', $default->title);
        $this->assertSame('Hi Mpho, you owe M500.', $default->render(['name' => 'Mpho', 'amount' => 'M500']));
    }

    public function test_constants_validate_codes_from_config(): void
    {
        $rules = ['status' => ['required', Constants::rule('attendance_status')]];

        $this->assertTrue(Validator::make(['status' => 'late'], $rules)->passes());
        $this->assertFalse(Validator::make(['status' => 'half_day'], $rules)->passes());
        $this->assertSame('Mobile money', Constants::label('payment_method', 'mobile_money'));
    }

    public function test_class_subject_teacher_copies_the_academic_year_from_the_classroom(): void
    {
        $school = $this->school();
        app(CurrentSchool::class)->set($school->id);

        $year = AcademicYear::create(['name' => '2027', 'start_date' => '2027-01-15', 'end_date' => '2027-11-30']);
        $level = GradeLevel::create(['name' => 'Grade 4']);
        $classroom = Classroom::create(['grade_level_id' => $level->id, 'academic_year_id' => $year->id, 'name' => 'Grade 4A']);
        $subject = Subject::create(['name' => 'Mathematics', 'code' => 'MATH']);
        $staff = Staff::create(['user_id' => User::factory()->create()->id, 'staff_number' => 'S001']);

        $assignment = ClassSubjectTeacher::create([
            'classroom_id' => $classroom->id,
            'subject_id' => $subject->id,
            'staff_id' => $staff->id,
        ]);

        $this->assertSame($year->id, $assignment->academic_year_id);
    }
}
