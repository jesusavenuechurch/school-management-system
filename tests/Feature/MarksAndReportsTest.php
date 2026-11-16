<?php

namespace Tests\Feature;

use App\Actions\People\AddSchoolMember;
use App\Http\Controllers\People\StudentController;
use App\Models\AcademicYear;
use App\Models\Classroom;
use App\Models\ClassSubjectTeacher;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\GradeLevel;
use App\Models\GradingScale;
use App\Models\ReportCard;
use App\Models\School;
use App\Models\Staff;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Term;
use App\Models\User;
use App\Support\MarkingScales;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class MarksAndReportsTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    private School $school;

    private User $admin;

    private Term $term;

    private Classroom $class;

    private Subject $maths;

    private Subject $english;

    /** @var list<Student> */
    private array $learners = [];

    protected function setUp(): void
    {
        parent::setUp();

        [$this->school, $this->admin] = $this->schoolWithAdmin();
        $this->inSchool($this->school);

        $year = AcademicYear::create(['name' => '2027', 'start_date' => '2027-01-15', 'end_date' => '2027-11-30', 'is_current' => true]);
        $this->term = Term::create(['academic_year_id' => $year->id, 'name' => 'Term 1', 'start_date' => '2027-01-15', 'end_date' => '2027-04-10', 'is_current' => true]);

        GradeLevel::create(['name' => 'Grade 4']);
        $grade8 = GradeLevel::create(['name' => 'Grade 8']);
        MarkingScales::installPresets($this->school);

        $this->class = Classroom::create(['grade_level_id' => $grade8->id, 'academic_year_id' => $year->id, 'name' => 'Grade 8A']);
        $this->maths = Subject::create(['name' => 'Mathematics', 'code' => 'MATH']);
        $this->english = Subject::create(['name' => 'English Language', 'code' => 'ENG']);

        foreach (['Lerato Mokoena', 'Tumelo Khoabane', 'Neo Sello'] as $i => $name) {
            [$first, $last] = explode(' ', $name);
            $student = Student::create(['first_name' => $first, 'last_name' => $last, 'admission_number' => 'A'.($i + 1)]);
            StudentController::enroll($student, $this->class);
            $this->learners[] = $student;
        }
    }

    /**
     * @param  list<string>  $roles
     */
    private function teacher(string $name, array $roles = ['teacher']): array
    {
        $user = User::factory()->create(['name' => $name]);
        app(AddSchoolMember::class)->handle($user, $roles);
        $staff = Staff::create(['user_id' => $user->id, 'staff_number' => Staff::nextNumber()]);

        return [$user, $staff];
    }

    private function exam(string $name, int $weight = 100): Exam
    {
        return Exam::create([
            'academic_year_id' => $this->term->academic_year_id,
            'term_id' => $this->term->id,
            'name' => $name,
            'weight' => $weight,
        ]);
    }

    public function test_preset_scales_put_each_grade_on_its_level(): void
    {
        $primary = GradingScale::firstWhere('name', 'Primary');
        $high = GradingScale::firstWhere('name', 'High school (LGCSE)');

        $this->assertTrue($primary->is_default);
        $this->assertSame($primary->id, GradeLevel::firstWhere('name', 'Grade 4')->grading_scale_id);
        $this->assertSame($high->id, GradeLevel::firstWhere('name', 'Grade 8')->grading_scale_id);
        $this->assertSame($high->id, $this->class->gradingScale()->id);
        $this->assertSame('A*', $high->bandFor(93)->label);
        $this->assertFalse($high->bandFor(12)->is_pass);

        // Running it again adds nothing.
        MarkingScales::installPresets($this->school);
        $this->assertSame(2, GradingScale::count());
    }

    public function test_an_admin_edits_a_scale_and_the_grades_on_it(): void
    {
        $primary = GradingScale::firstWhere('name', 'Primary');
        $grade8 = GradeLevel::firstWhere('name', 'Grade 8');

        $this->actingAs($this->admin)
            ->put(route('scales.update', $primary), [
                'name' => 'Primary',
                'bands' => [
                    ['label' => 'Pass', 'min_percentage' => 50, 'remark' => 'Well done', 'is_pass' => '1'],
                    ['label' => 'Fail', 'min_percentage' => 10, 'is_pass' => '0'],
                ],
            ])
            ->assertSessionHasErrors('bands');

        $this->put(route('scales.update', $primary), [
            'name' => 'Primary',
            'bands' => [
                ['label' => 'Fail', 'min_percentage' => 0, 'is_pass' => '0'],
                ['label' => 'Pass', 'min_percentage' => 50, 'remark' => 'Well done', 'is_pass' => '1'],
            ],
            'grades' => [$grade8->id],
        ])->assertSessionHasNoErrors();

        $this->assertSame(['Pass', 'Fail'], $primary->fresh()->bands->pluck('label')->all());
        $this->assertSame($primary->id, $grade8->fresh()->grading_scale_id);
        // Grade 4 was taken off the scale, so it now falls back to the default (still Primary).
        $this->assertNull(GradeLevel::firstWhere('name', 'Grade 4')->grading_scale_id);

        $this->get(route('scales.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('marks/scales')
            ->has('scales', 2)
            ->has('presets', 2));
    }

    public function test_an_admin_chooses_who_teaches_each_subject_in_a_class(): void
    {
        [, $thabo] = $this->teacher('Thabo Nthunya');

        $this->actingAs($this->admin)
            ->put(route('setup.classrooms.subjects', $this->class), ['subjects' => [
                ['subject_id' => $this->maths->id, 'staff_id' => $thabo->id],
                ['subject_id' => $this->english->id, 'staff_id' => null],
            ]])
            ->assertSessionHasNoErrors();

        $this->assertSame([$this->maths->id], ClassSubjectTeacher::pluck('subject_id')->all());

        $this->put(route('setup.classrooms.subjects', $this->class), ['subjects' => [
            ['subject_id' => $this->english->id, 'staff_id' => $thabo->id],
        ]]);

        $this->assertSame([$this->english->id], ClassSubjectTeacher::pluck('subject_id')->all());
    }

    public function test_a_teacher_enters_marks_only_for_the_subjects_they_teach(): void
    {
        [$user, $staff] = $this->teacher('Thabo Nthunya');
        ClassSubjectTeacher::create(['classroom_id' => $this->class->id, 'subject_id' => $this->maths->id, 'staff_id' => $staff->id]);
        $test = $this->exam('Class test');
        [$lerato, $tumelo, $neo] = $this->learners;

        $this->actingAs($user)
            ->get(route('marks.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('marks/index')
                ->where('selectedExamId', $test->id)
                ->has('groups', 1)
                ->where('groups.0.classroom.name', 'Grade 8A')
                ->where('groups.0.learners', 3)
                ->has('groups.0.subjects', 1)
                ->where('groups.0.subjects.0.filled', 0));

        $this->get(route('marks.show', [$test, $this->class, $this->maths]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('marks/sheet')
                ->has('learners', 3)
                ->has('bands', 9));

        $this->put(route('marks.save', [$test, $this->class, $this->maths]), [
            'out_of' => 50,
            'marks' => [$lerato->id => 46, $tumelo->id => '31.5', $neo->id => null],
        ])->assertSessionHasNoErrors();

        $result = ExamResult::firstWhere('student_id', $lerato->id);
        $this->assertSame('A*', $result->grade_label); // 92%
        $this->assertSame($staff->id, $result->recorded_by);
        $this->assertSame('C', ExamResult::firstWhere('student_id', $tumelo->id)->grade_label); // 63%
        $this->assertSame(2, ExamResult::count());

        // A mark above the total is refused; clearing a mark removes it.
        $this->put(route('marks.save', [$test, $this->class, $this->maths]), [
            'out_of' => 50,
            'marks' => [$lerato->id => 51],
        ])->assertSessionHasErrors("marks.{$lerato->id}");

        $this->put(route('marks.save', [$test, $this->class, $this->maths]), [
            'out_of' => 50,
            'marks' => [$tumelo->id => ''],
        ]);
        $this->assertSame(1, ExamResult::count());

        // Not their subject.
        $this->get(route('marks.show', [$test, $this->class, $this->english]))->assertForbidden();
        $this->put(route('marks.save', [$test, $this->class, $this->english]), ['out_of' => 10, 'marks' => [$neo->id => 5]])->assertForbidden();
    }

    public function test_parents_cannot_open_marks_or_reports(): void
    {
        $parent = User::factory()->create();
        app(AddSchoolMember::class)->handle($parent, ['parent']);

        $this->actingAs($parent)->get(route('marks.index'))->assertForbidden();
        $this->actingAs($parent)->get(route('reports.index'))->assertForbidden();
    }

    public function test_the_report_combines_marks_by_weight_and_ranks_the_class(): void
    {
        $test = $this->exam('Class test', 30);
        $final = $this->exam('End of term exam', 70);
        [$lerato, $tumelo, $neo] = $this->learners;
        $scale = $this->class->gradingScale();

        $mark = function (Exam $exam, Student $student, Subject $subject, float $score) use ($scale) {
            (new ExamResult(['exam_id' => $exam->id, 'student_id' => $student->id, 'subject_id' => $subject->id, 'score' => $score, 'max_score' => 100]))
                ->applyGrade($scale)->save();
        };

        // Lerato: maths 60*0.3 + 80*0.7 = 74, English 90 -> average 82.
        $mark($test, $lerato, $this->maths, 60);
        $mark($final, $lerato, $this->maths, 80);
        $mark($final, $lerato, $this->english, 90);
        // Tumelo: only the exam, 82 -> average 82, ties with Lerato.
        $mark($final, $tumelo, $this->maths, 82);
        // Neo: 15 -> U.
        $mark($final, $neo, $this->maths, 15);

        $this->actingAs($this->admin)
            ->get(route('reports.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/index')
                ->where('selectedClassroomId', $this->class->id)
                ->has('exams', 2)
                ->has('learners', 3)
                ->where('learners.0.student.full_name', 'Tumelo Khoabane')
                ->where('learners.1.student.full_name', 'Lerato Mokoena')
                ->where('learners.1.subjects.1.name', 'Mathematics')
                ->where('learners.1.subjects.1.mark', 74)
                ->where('learners.1.subjects.1.symbol', 'B')
                ->where('learners.1.average', 82)
                ->where('learners.1.symbol', 'A')
                ->where('learners.1.position', 1)
                ->where('learners.0.position', 1)
                ->where('learners.2.position', 3)
                ->where('learners.2.symbol', 'U')
                ->where('learners.2.subjects_passed', 0)
                ->where('rankedCount', 3));

        $this->get(route('reports.print', ['term' => $this->term->id, 'classroom' => $this->class->id, 'student' => $lerato->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('reports/print')
                ->has('learners', 1)
                ->where('learners.0.student.id', $lerato->id)
                ->has('scaleKey', 9)
                ->where('school.shows_position', true));
    }

    public function test_class_teachers_write_remarks_and_admins_issue_the_reports(): void
    {
        [$user, $staff] = $this->teacher('Mpho Letsie');
        $this->class->update(['class_teacher_id' => $staff->id]);
        [$other] = $this->teacher('Not Theirs');
        [$lerato] = $this->learners;
        $remarks = route('reports.remarks', [$this->term, $lerato]);

        $this->actingAs($user)
            ->get(route('reports.index'))
            ->assertInertia(fn (Assert $page) => $page->has('classrooms', 1)->where('isAdmin', false));

        $this->put($remarks, [
            'classroom_id' => $this->class->id,
            'class_teacher_remark' => 'A hard-working learner.',
            'head_teacher_remark' => 'Sneaky',
        ])->assertSessionHasNoErrors();

        $card = ReportCard::firstWhere('student_id', $lerato->id);
        $this->assertSame('A hard-working learner.', $card->class_teacher_remark);
        $this->assertNull($card->head_teacher_remark);

        $this->actingAs($other)->put($remarks, ['classroom_id' => $this->class->id, 'class_teacher_remark' => 'x'])->assertForbidden();
        $this->actingAs($user)->put(route('reports.publish', [$this->term, $this->class]))->assertForbidden();

        $this->actingAs($this->admin)
            ->put($remarks, [
                'classroom_id' => $this->class->id,
                'class_teacher_remark' => 'A hard-working learner.',
                'head_teacher_remark' => 'Keep it up.',
            ]);
        $this->assertSame('Keep it up.', $card->fresh()->head_teacher_remark);

        $this->put(route('reports.publish', [$this->term, $this->class]), ['published' => true]);
        $this->assertSame(3, ReportCard::whereNotNull('published_at')->count());
        $this->assertSame('A hard-working learner.', $card->fresh()->class_teacher_remark);

        $this->put(route('reports.settings'), ['report_shows_position' => false]);
        $this->assertFalse($this->school->fresh()->report_shows_position);
    }

    public function test_tests_with_marks_cannot_be_removed(): void
    {
        $this->actingAs($this->admin)
            ->post(route('exams.store'), ['term_id' => $this->term->id, 'name' => 'Class test', 'weight' => 40])
            ->assertSessionHasNoErrors();

        $this->post(route('exams.store'), ['term_id' => $this->term->id, 'name' => 'Class test', 'weight' => 40])
            ->assertSessionHasErrors('name');

        $exam = Exam::firstWhere('name', 'Class test');
        $this->assertSame($this->term->academic_year_id, $exam->academic_year_id);

        ExamResult::create(['exam_id' => $exam->id, 'student_id' => $this->learners[0]->id, 'subject_id' => $this->maths->id, 'score' => 5, 'max_score' => 10]);

        $this->delete(route('exams.destroy', $exam))->assertSessionHasErrors('exam');
        $this->assertModelExists($exam);

        $this->get(route('exams.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('marks/exams')
            ->where('terms.0.exams.0.results_count', 1));
    }
}
