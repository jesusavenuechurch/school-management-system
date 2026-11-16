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
        Schema::create('fee_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->string('name'); // "Tuition", "Transport"
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // What a group of students is charged. Create a new structure for a
        // new term rather than editing one that invoices already came from.
        Schema::create('fee_structures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('academic_year_id')->constrained();
            $table->foreignId('term_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('grade_level_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('fee_structure_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('fee_structure_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_category_id')->constrained();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('LSL');
            $table->boolean('is_recurring')->default(false);
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('student_id')->constrained();
            $table->foreignId('academic_year_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('term_id')->nullable()->constrained()->nullOnDelete();
            $table->string('invoice_number');
            $table->string('currency', 3)->default('LSL');
            // amount_paid and balance are kept in sync by Invoice::recalculate().
            $table->decimal('total_amount', 12, 2)->default(0);
            $table->decimal('amount_paid', 12, 2)->default(0);
            $table->decimal('balance', 12, 2)->default(0);
            $table->date('due_date')->nullable();
            $table->string('status', 30)->default('pending'); // constants.invoice_status
            $table->foreignId('issued_by')->nullable()->constrained('staff')->nullOnDelete();
            $table->timestamps();

            $table->unique(['school_id', 'invoice_number']);
            $table->index(['school_id', 'status']);
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fee_category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('fee_structure_item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('description');
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            // Optional: someone paying cash at the desk may have no account.
            $table->foreignId('payer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('payer_name')->nullable();
            $table->string('payer_phone', 20)->nullable();
            $table->foreignId('student_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 3)->default('LSL');
            $table->string('method', 30); // constants.payment_method
            $table->string('gateway', 30)->nullable(); // constants.payment_gateway
            $table->string('gateway_reference')->nullable()->index();
            $table->string('status', 30)->default('pending'); // constants.payment_status
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('staff')->nullOnDelete();
            $table->timestamps();

            $table->index(['school_id', 'status']);
        });

        // Which invoices a payment covers, and how much of each.
        Schema::create('payment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount_allocated', 12, 2);
            $table->timestamps();
        });

        Schema::create('school_payment_gateways', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained()->cascadeOnDelete();
            $table->string('gateway', 30); // constants.payment_gateway
            $table->boolean('is_enabled')->default(true);
            $table->text('credentials')->nullable(); // encrypted by the model
            $table->timestamps();

            $table->unique(['school_id', 'gateway']);
        });

        // Append-only record of every request to and callback from a gateway.
        Schema::create('payment_gateway_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_id')->constrained();
            $table->foreignId('payment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('gateway', 30);
            $table->boolean('is_callback')->default(false);
            $table->json('payload');
            $table->unsignedSmallInteger('http_status')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_gateway_logs');
        Schema::dropIfExists('school_payment_gateways');
        Schema::dropIfExists('payment_allocations');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('fee_structure_items');
        Schema::dropIfExists('fee_structures');
        Schema::dropIfExists('fee_categories');
    }
};
