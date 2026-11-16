<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A school invites someone by WhatsApp number; they open the link,
        // fill in their own details and choose their password.
        Schema::create('staff_invitations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('phone', 20);
            $table->string('name')->nullable();
            $table->json('roles');
            $table->string('token_hash', 64)->unique(); // sha256, for lookups
            $table->text('token'); // encrypted, so the admin can copy the link again
            $table->timestamp('expires_at');
            $table->timestamp('last_sent_at')->nullable();
            $table->string('sent_via', 30)->nullable(); // 'whatsapp' when sent by the platform
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamps();

            $table->index(['school_id', 'phone']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('staff_invitations');
    }
};
