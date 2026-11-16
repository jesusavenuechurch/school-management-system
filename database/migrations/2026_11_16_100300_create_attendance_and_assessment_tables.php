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
        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('student_id')->constrained();
            $table->foreignId('classroom_id')->constrained();
            // null = daily register; set = attendance for one lesson.
            $table->foreignId('class_subject_teacher_id')->nullable()->constrained('class_subject_teacher')->nullOnDelete();
            $table->date('date');
            $table->string('status', 30); // constants.attendance_status
            $table->foreignId('recorded_by')->nullable()->constrained('staff')->nullOnDelete();
            $table->string('remarks')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'date']);
            $table->index(['classroom_id', 'date']);
        });

        Schema::create('assessment_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->string('name'); // "Quiz", "Midterm"
            $table->decimal('default_weight_percentage', 5, 2)->nullable();
            $table->timestamps();
        });

        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('academic_year_id')->constrained();
            $table->foreignId('term_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('assessment_type_id')->nullable()->constrained()->nullOnDelete();
            // Explicit override; otherwise the classroom's grade level decides.
            $table->foreignId('grading_scale_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->timestamps();
        });

        Schema::create('exam_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('student_id')->constrained();
            $table->foreignId('subject_id')->constrained();
            $table->decimal('score', 6, 2);
            $table->decimal('max_score', 6, 2);
            $table->foreignId('grade_band_id')->nullable()->constrained()->nullOnDelete();
            // Copied from the band when graded, so later edits to a scale
            // never change results that were already issued.
            $table->string('grade_label')->nullable();
            $table->string('grade_remark')->nullable();
            $table->boolean('is_pass')->nullable();
            $table->string('remarks')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('staff')->nullOnDelete();
            $table->timestamps();

            $table->unique(['exam_id', 'student_id', 'subject_id']);
        });

        Schema::create('report_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('student_id')->constrained();
            $table->foreignId('term_id')->constrained();
            $table->foreignId('classroom_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('overall_average', 5, 2)->nullable();
            $table->string('overall_grade_label')->nullable(); // snapshot, like exam_results
            $table->unsignedSmallInteger('position')->nullable();
            $table->unsignedSmallInteger('days_present')->nullable();
            $table->unsignedSmallInteger('days_absent')->nullable();
            $table->text('class_teacher_remark')->nullable();
            $table->text('head_teacher_remark')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['student_id', 'term_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('report_cards');
        Schema::dropIfExists('exam_results');
        Schema::dropIfExists('exams');
        Schema::dropIfExists('assessment_types');
        Schema::dropIfExists('attendances');
    }
};
