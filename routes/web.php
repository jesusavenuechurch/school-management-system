<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InvitationController;
use App\Http\Controllers\OnboardingController;
use App\Http\Controllers\People\EnrollmentController;
use App\Http\Controllers\People\StaffController;
use App\Http\Controllers\People\StaffInvitationController;
use App\Http\Controllers\People\StudentCardController;
use App\Http\Controllers\People\StudentController;
use App\Http\Controllers\People\StudentGuardianController;
use App\Http\Controllers\PublicSchoolController;
use App\Http\Controllers\Setup\AcademicYearController;
use App\Http\Controllers\Setup\ClassroomController;
use App\Http\Controllers\Setup\ClassStructureController;
use App\Http\Controllers\Setup\GradeLevelController;
use App\Http\Controllers\Setup\SetupJourneyController;
use App\Http\Controllers\Setup\SubjectController;
use App\Http\Controllers\Setup\TermController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

// Each school's own page and branded sign-in.
Route::get('s/{school:slug}', [PublicSchoolController::class, 'show'])->name('schools.public');
Route::get('s/{school:slug}/login', [PublicSchoolController::class, 'login'])->middleware('guest')->name('schools.login');

// Staff invitation links: the person registers themselves.
Route::get('invite/{token}', [InvitationController::class, 'show'])->name('invitations.show');
Route::post('invite/{token}', [InvitationController::class, 'accept'])->middleware('throttle:10,1')->name('invitations.accept');
Route::get('invite/{token}/login', [InvitationController::class, 'login'])->middleware('guest')->name('invitations.login');

Route::middleware(['auth'])->group(function () {
    // Anyone can set up their own school; they become its administrator.
    Route::get('onboarding/school', [OnboardingController::class, 'create'])->name('onboarding.create');
    Route::post('onboarding/school', [OnboardingController::class, 'store'])->name('onboarding.store');
    Route::post('schools/{school}/switch', [OnboardingController::class, 'switch'])->name('schools.switch');
});

Route::middleware(['auth', 'school'])->group(function () {
    // Scanning the QR on a student ID card.
    Route::get('c/{code}', [StudentCardController::class, 'check'])->name('cards.check');

    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Any member of the student's school (the student lookup is limited to
    // the current school).
    Route::get('students/{student}/photo', [StudentController::class, 'photo'])->name('students.photo');

    // School setup and people management: administrators only.
    Route::middleware('role:admin')->group(function () {
        Route::prefix('setup')->name('setup.')->group(function () {
            // The guided setup journey with the chalkboard.
            Route::get('/', [SetupJourneyController::class, 'show'])->name('journey');
            Route::post('journey/school', [SetupJourneyController::class, 'saveSchool'])->name('journey.school');
            Route::post('journey/calendar', [SetupJourneyController::class, 'saveCalendar'])->name('journey.calendar');
            Route::post('journey/grades', [SetupJourneyController::class, 'saveGrades'])->name('journey.grades');
            Route::post('journey/subjects', [SetupJourneyController::class, 'saveSubjects'])->name('journey.subjects');
            Route::post('journey/skip', [SetupJourneyController::class, 'skip'])->name('journey.skip');

            Route::get('years', [AcademicYearController::class, 'index'])->name('years.index');
            Route::post('years', [AcademicYearController::class, 'store'])->name('years.store');
            Route::put('years/{academicYear}', [AcademicYearController::class, 'update'])->name('years.update');
            Route::delete('years/{academicYear}', [AcademicYearController::class, 'destroy'])->name('years.destroy');

            Route::post('terms', [TermController::class, 'store'])->name('terms.store');
            Route::put('terms/{term}', [TermController::class, 'update'])->name('terms.update');
            Route::delete('terms/{term}', [TermController::class, 'destroy'])->name('terms.destroy');

            Route::get('classes', ClassStructureController::class)->name('classes');
            Route::post('grades', [GradeLevelController::class, 'store'])->name('grades.store');
            Route::put('grades/{gradeLevel}', [GradeLevelController::class, 'update'])->name('grades.update');
            Route::delete('grades/{gradeLevel}', [GradeLevelController::class, 'destroy'])->name('grades.destroy');
            Route::post('classrooms', [ClassroomController::class, 'store'])->name('classrooms.store');
            Route::put('classrooms/{classroom}', [ClassroomController::class, 'update'])->name('classrooms.update');
            Route::delete('classrooms/{classroom}', [ClassroomController::class, 'destroy'])->name('classrooms.destroy');

            Route::get('subjects', [SubjectController::class, 'index'])->name('subjects.index');
            Route::post('subjects', [SubjectController::class, 'store'])->name('subjects.store');
            Route::put('subjects/{subject}', [SubjectController::class, 'update'])->name('subjects.update');
            Route::delete('subjects/{subject}', [SubjectController::class, 'destroy'])->name('subjects.destroy');
        });

        Route::get('staff', [StaffController::class, 'index'])->name('staff.index');
        Route::post('staff', [StaffController::class, 'store'])->name('staff.store');
        Route::put('staff/{staff}', [StaffController::class, 'update'])->name('staff.update');
        Route::post('staff/invitations', [StaffInvitationController::class, 'store'])->name('staff.invitations.store');
        Route::get('staff/invitations/template', [StaffInvitationController::class, 'template'])->name('staff.invitations.template');
        Route::post('staff/invitations/{invitation}/resend', [StaffInvitationController::class, 'resend'])->name('staff.invitations.resend');
        Route::delete('staff/invitations/{invitation}', [StaffInvitationController::class, 'destroy'])->name('staff.invitations.destroy');

        Route::get('students', [StudentController::class, 'index'])->name('students.index');
        Route::get('students/cards', [StudentCardController::class, 'index'])->name('students.cards');
        Route::get('students/create', [StudentController::class, 'create'])->name('students.create');
        Route::post('students', [StudentController::class, 'store'])->name('students.store');
        Route::get('students/{student}', [StudentController::class, 'show'])->name('students.show');
        Route::put('students/{student}', [StudentController::class, 'update'])->name('students.update');
        Route::post('students/{student}/photo', [StudentController::class, 'updatePhoto'])->name('students.photo.update');

        Route::post('students/{student}/guardians', [StudentGuardianController::class, 'store'])->name('students.guardians.store');
        Route::put('students/{student}/guardians/{guardian}', [StudentGuardianController::class, 'update'])->name('students.guardians.update');
        Route::delete('students/{student}/guardians/{guardian}', [StudentGuardianController::class, 'destroy'])->name('students.guardians.destroy');

        Route::post('students/{student}/enrollments', [EnrollmentController::class, 'store'])->name('students.enrollments.store');
    });
});

require __DIR__.'/settings.php';
