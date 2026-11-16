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
        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->string('name'); // "2027"
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_current')->default(false);
            $table->timestamps();
        });

        Schema::create('terms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('academic_year_id')->constrained()->cascadeOnDelete();
            $table->string('name'); // "Term 1"
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_current')->default(false);
            $table->timestamps();
        });

        Schema::create('grade_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->string('name'); // "Grade 4", "Form B"
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // A grade level's section for one academic year; re-created yearly.
        Schema::create('classrooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('grade_level_id')->constrained();
            $table->foreignId('academic_year_id')->constrained();
            $table->string('name'); // "Grade 4A"
            $table->foreignId('class_teacher_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->unsignedSmallInteger('capacity')->nullable();
            $table->string('room')->nullable();
            $table->timestamps();

            $table->unique(['school_id', 'academic_year_id', 'name']);
        });

        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('department_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('code');
            $table->timestamps();

            $table->unique(['school_id', 'code']);
        });

        // Who teaches what, where.
        Schema::create('class_subject_teacher', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained();
            $table->foreignId('staff_id')->constrained('staff');
            $table->foreignId('academic_year_id')->constrained(); // copied from classroom for fast lookups
            $table->timestamps();

            $table->unique(['classroom_id', 'subject_id']);
            $table->index(['staff_id', 'academic_year_id']);
        });

        // A student's placement. Several rows per year are allowed, so a move
        // from 4A to 4B mid-year keeps the history (left_on closes the old one).
        Schema::create('student_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('student_id')->constrained();
            $table->foreignId('classroom_id')->constrained();
            $table->foreignId('academic_year_id')->constrained();
            $table->date('enrolled_on');
            $table->date('left_on')->nullable();
            $table->string('status', 30)->default('active'); // constants.enrollment_status
            $table->timestamps();

            $table->index(['student_id', 'academic_year_id']);
            $table->index(['classroom_id', 'status']);
        });

        Schema::create('grading_scales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            // null = school-wide; set = e.g. a different scale for secondary.
            $table->foreignId('grade_level_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        // A band covers percentages from min_percentage up to the next band's
        // minimum, so there are never gaps between bands.
        Schema::create('grade_bands', function (Blueprint $table) {
            $table->id();
            $table->foreignId('grading_scale_id')->constrained()->cascadeOnDelete();
            $table->string('label'); // "A", "Distinction"
            $table->decimal('min_percentage', 5, 2);
            $table->boolean('is_pass')->default(true);
            $table->string('remark')->nullable(); // "Excellent"
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('grade_bands');
        Schema::dropIfExists('grading_scales');
        Schema::dropIfExists('student_enrollments');
        Schema::dropIfExists('class_subject_teacher');
        Schema::dropIfExists('subjects');
        Schema::dropIfExists('classrooms');
        Schema::dropIfExists('grade_levels');
        Schema::dropIfExists('terms');
        Schema::dropIfExists('academic_years');
    }
};
