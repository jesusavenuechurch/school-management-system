<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Admission applications sent by parents from the school's public page.
     * The school accepts one into a class (creating the learner and the
     * parent's account) or declines it.
     */
    public function up(): void
    {
        Schema::create('applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->string('reference', 20)->unique();
            $table->string('status', 20)->default('pending'); // constants.application_status

            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 30)->nullable();
            $table->foreignId('grade_level_id')->nullable()->constrained()->nullOnDelete();
            $table->string('previous_school')->nullable();

            $table->string('guardian_name');
            $table->string('guardian_phone', 20);
            $table->string('guardian_email')->nullable();
            $table->string('guardian_relationship', 30)->nullable();
            $table->text('address')->nullable();
            $table->text('message')->nullable();

            $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('decline_reason', 500)->nullable();
            $table->timestamps();

            $table->index(['school_id', 'status']);
        });

        Schema::table('schools', function (Blueprint $table) {
            $table->boolean('accepts_applications')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropColumn('accepts_applications');
        });

        Schema::dropIfExists('applications');
    }
};
