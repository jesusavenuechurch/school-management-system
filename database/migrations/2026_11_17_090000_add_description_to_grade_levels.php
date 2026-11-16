<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('grade_levels', function (Blueprint $table) {
            // e.g. "Foundation year 1" for Grade 8.
            $table->string('description')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('grade_levels', function (Blueprint $table) {
            $table->dropColumn('description');
        });
    }
};
