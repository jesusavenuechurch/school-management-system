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
        Schema::table('schools', function (Blueprint $table) {
            // Web address of the school's own page: /s/{slug}.
            $table->string('slug')->nullable()->unique()->after('name');
            // Which kinds of school this is: constants.school_levels codes.
            $table->json('levels')->nullable()->after('slug');
            $table->text('about')->nullable()->after('address');
            // Set by the platform team once the school is checked. Until then
            // no messages to parents, no public page, no online payments.
            $table->timestamp('verified_at')->nullable()->after('status');
            $table->timestamp('published_at')->nullable()->after('verified_at');
            // Setup journey: steps put off for later, and when it was finished.
            $table->json('setup_skipped')->nullable()->after('published_at');
            $table->timestamp('setup_completed_at')->nullable()->after('setup_skipped');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('schools', function (Blueprint $table) {
            $table->dropUnique(['slug']);
            $table->dropColumn(['slug', 'levels', 'about', 'verified_at', 'published_at', 'setup_skipped', 'setup_completed_at']);
        });
    }
};
