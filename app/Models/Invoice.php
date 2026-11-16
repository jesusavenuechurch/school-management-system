<?php

namespace App\Models;

use App\Models\Concerns\BelongsToSchool;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property CarbonInterface|null $due_date
 */
class Invoice extends Model
{
    use BelongsToSchool;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'balance' => 'decimal:2',
            'due_date' => 'date',
        ];
    }

    /**
     * Recompute total, amount paid, balance and status from the items and
     * from allocations of successful payments. Call this (inside the same
     * transaction) whenever items, allocations or payment statuses change.
     */
    public function recalculate(): static
    {
        $total = (float) $this->items()->sum('amount');

        $paid = (float) $this->allocations()
            ->whereHas('payment', fn ($q) => $q->where('status', 'successful'))
            ->sum('amount_allocated');

        $this->total_amount = $total;
        $this->amount_paid = $paid;
        $this->balance = max($total - $paid, 0);

        if ($this->status !== 'cancelled') {
            $this->status = match (true) {
                $total > 0 && $paid >= $total => 'paid',
                $this->due_date !== null && $this->due_date->isPast() => 'overdue',
                $paid > 0 => 'partial',
                default => 'pending',
            };
        }

        $this->save();

        return $this;
    }

    /**
     * @return BelongsTo<Student, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    /**
     * @return BelongsTo<AcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    /**
     * @return BelongsTo<Term, $this>
     */
    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    /**
     * @return HasMany<InvoiceItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    /**
     * @return HasMany<PaymentAllocation, $this>
     */
    public function allocations(): HasMany
    {
        return $this->hasMany(PaymentAllocation::class);
    }

    /**
     * @return BelongsTo<Staff, $this>
     */
    public function issuer(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'issued_by');
    }
}
