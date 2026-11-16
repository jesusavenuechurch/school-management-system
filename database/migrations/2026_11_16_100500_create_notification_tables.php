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
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            // null = platform default that any school can override.
            $table->foreignId('school_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('key'); // "invoice.created"
            $table->string('channel', 30); // constants.notification_channel
            $table->string('title');
            $table->text('body_template'); // "Hi {{guardian_name}}, ..."
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['key', 'channel']);
        });

        // Outbox and delivery log. Named to avoid Laravel's own
        // `notifications` table used by the database notification channel.
        Schema::create('notification_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // recipient, any role
            $table->nullableMorphs('related'); // what triggered it, e.g. an invoice
            $table->string('channel', 30); // constants.notification_channel
            $table->foreignId('template_id')->nullable()->constrained('notification_templates')->nullOnDelete();
            $table->json('payload')->nullable();
            $table->string('status', 30)->default('queued'); // constants.notification_status
            $table->string('provider_message_id')->nullable()->index();
            $table->text('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->index(['school_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification_messages');
        Schema::dropIfExists('notification_templates');
    }
};
