<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A test now belongs to a grade and (usually) a subject, and lists the
     * classes that write it, so it can be brought forward to next year.
     * Weights move from each test to the school: tests vs exams.
     */
    public function up(): void
    {
        Schema::table('exams', function (Blueprint $table) {
            $table->string('kind', 20)->default('test')->after('name');
            // Null grade: every grade (a whole-school exam).
            $table->foreignId('grade_level_id')->nullable()->after('term_id')->constrained()->nullOnDelete();
            // Null subject: every subject the classes take (an exam).
            $table->foreignId('subject_id')->nullable()->after('grade_level_id')->constrained()->nullOnDelete();
            $table->decimal('max_score', 6, 2)->default(100)->after('kind');
            $table->foreignId('created_by')->nullable()->constrained('staff')->nullOnDelete();
            $table->dropColumn('weight');
        });

        Schema::create('exam_classroom', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('classroom_id')->constrained()->cascadeOnDelete();

            $table->unique(['exam_id', 'classroom_id']);
        });

        Schema::table('schools', function (Blueprint $table) {
            // Share of the term mark from tests; exams get the rest.
            $table->unsignedTinyInteger('test_weight')->default(30);
        });

        // Existing tests were for the whole school.
        foreach (DB::table('exams')->get(['id', 'name', 'academic_year_id']) as $exam) {
            DB::table('exams')->where('id', $exam->id)->update([
                'kind' => str_contains(strtolower($exam->name), 'exam') ? 'exam' : 'test',
            ]);

            DB::table('exam_classroom')->insert(
                DB::table('classrooms')
                    ->where('academic_year_id', $exam->academic_year_id)
                    ->pluck('id')
                    ->map(fn ($id) => ['exam_id' => $exam->id, 'classroom_id' => $id])
                    ->all()
            );
        }
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn('test_weight');
        });

        Schema::dropIfExists('exam_classroom');

        Schema::table('exams', function (Blueprint $table) {
            $table->unsignedSmallInteger('weight')->default(100)->after('name');
            $table->dropConstrainedForeignId('created_by');
            $table->dropConstrainedForeignId('subject_id');
            $table->dropConstrainedForeignId('grade_level_id');
            $table->dropColumn(['kind', 'max_score']);
        });
    }
};
