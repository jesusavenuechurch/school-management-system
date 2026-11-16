<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Marking scales are chosen per grade (a grade points at its scale), so
     * one scale can serve Grade 1 to Grade 7. Tests get a weight for the
     * term mark, and schools choose whether reports show class position.
     */
    public function up(): void
    {
        Schema::table('grade_levels', function (Blueprint $table) {
            $table->foreignId('grading_scale_id')->nullable()->after('sort_order')->constrained()->nullOnDelete();
        });

        Schema::table('grading_scales', function (Blueprint $table) {
            $table->dropConstrainedForeignId('grade_level_id');
        });

        Schema::table('exams', function (Blueprint $table) {
            // Relative share of the term mark; equal weights = plain average.
            $table->unsignedSmallInteger('weight')->default(100)->after('name');
        });

        Schema::table('schools', function (Blueprint $table) {
            $table->boolean('report_shows_position')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn('report_shows_position');
        });

        Schema::table('exams', function (Blueprint $table) {
            $table->dropColumn('weight');
        });

        Schema::table('grading_scales', function (Blueprint $table) {
            $table->foreignId('grade_level_id')->nullable()->constrained()->nullOnDelete();
        });

        Schema::table('grade_levels', function (Blueprint $table) {
            $table->dropConstrainedForeignId('grading_scale_id');
        });
    }
};
