<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The code printed (as a QR) on a student's ID card. Random, so a card
     * can't be guessed from an admission number.
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('card_code', 32)->nullable()->unique()->after('admission_number');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropUnique(['card_code']);
            $table->dropColumn('card_code');
        });
    }
};
