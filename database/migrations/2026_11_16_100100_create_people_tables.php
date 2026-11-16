<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->string('name');
            $table->timestamps();
        });

        // Anyone the school employs. Whether they teach, keep the books or
        // both comes from their roles, not from this table.
        Schema::create('staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('staff_number');
            $table->date('employment_date')->nullable();
            $table->string('employment_status', 30)->default('active'); // constants.employment_status
            $table->string('gender', 30)->nullable(); // constants.gender
            $table->string('national_id')->nullable();
            $table->date('date_of_birth')->nullable();
            $table->text('address')->nullable();
            $table->text('qualifications')->nullable();
            $table->string('photo_path')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['school_id', 'staff_number']);
            $table->unique(['school_id', 'user_id']);
        });

        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            // Optional: most students never get their own login.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // Names live here because a student may have no users row.
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->string('admission_number');
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 30)->nullable(); // constants.gender
            $table->date('admission_date')->nullable();
            $table->string('status', 30)->default('active'); // constants.student_status
            $table->string('blood_group', 10)->nullable();
            $table->string('birth_certificate_number')->nullable();
            $table->string('photo_path')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['school_id', 'admission_number']);
            $table->index(['school_id', 'status']);
        });

        // One guardian row per person per school; the person reuses one login.
        Schema::create('guardians', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('national_id')->nullable();
            $table->string('occupation')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['school_id', 'user_id']);
        });

        Schema::create('student_guardians', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('student_id')->constrained()->cascadeOnDelete();
            $table->foreignId('guardian_id')->constrained()->cascadeOnDelete();
            $table->string('relationship', 30)->nullable(); // constants.guardian_relationship
            $table->boolean('is_primary_contact')->default(false);
            $table->boolean('can_pickup')->default(true);
            $table->boolean('receives_notifications')->default(true);
            $table->timestamps();

            $table->unique(['student_id', 'guardian_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_guardians');
        Schema::dropIfExists('guardians');
        Schema::dropIfExists('students');
        Schema::dropIfExists('staff');
        Schema::dropIfExists('departments');
    }
};
