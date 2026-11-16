<?php

namespace Tests\Feature;

use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class StudentPhotoTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    public function test_photos_are_private_to_the_school(): void
    {
        Storage::fake('local');
        [$school, $admin] = $this->schoolWithAdmin('A');

        $this->actingAs($admin)->post(route('students.store'), [
            'first_name' => 'Lerato', 'last_name' => 'M', 'admission_number' => 'A1',
            'photo' => UploadedFile::fake()->image('lerato.jpg', 300, 300),
        ])->assertSessionHasNoErrors();

        $student = Student::withoutSchoolScope()->firstOrFail();
        Storage::disk('local')->assertExists($student->photo_path);
        $this->assertStringStartsWith("students/{$school->id}/", $student->photo_path);

        $this->get(route('students.photo', $student))->assertOk();

        // Another school's admin can't see it, and neither can guests.
        [, $adminB] = $this->schoolWithAdmin('B');
        $this->actingAs($adminB)->get(route('students.photo', $student))->assertNotFound();

        auth()->logout();
        $this->get(route('students.photo', $student))->assertRedirect(route('login'));
    }

    public function test_changing_the_photo_removes_the_old_one(): void
    {
        Storage::fake('local');
        [$school, $admin] = $this->schoolWithAdmin();
        $this->inSchool($school);
        $student = Student::create(['first_name' => 'Lerato', 'last_name' => 'M', 'admission_number' => 'A1']);

        $this->actingAs($admin)->post(route('students.photo.update', $student), ['photo' => UploadedFile::fake()->image('a.jpg')]);
        $first = $student->fresh()->photo_path;

        $this->post(route('students.photo.update', $student), ['photo' => UploadedFile::fake()->image('b.png')]);

        Storage::disk('local')->assertMissing($first);
        Storage::disk('local')->assertExists($student->fresh()->photo_path);
    }
}
