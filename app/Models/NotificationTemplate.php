<?php

namespace App\Models;

use App\Support\CurrentSchool;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Message templates. school_id null = platform default; a school's own
 * template with the same key and channel takes priority. Not scoped by
 * BelongsToSchool because platform defaults must stay visible.
 */
class NotificationTemplate extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    /**
     * The template to use for a key and channel in a school.
     */
    public static function resolve(string $key, string $channel, ?int $schoolId = null): ?self
    {
        $schoolId ??= app(CurrentSchool::class)->id();

        return static::query()
            ->where('key', $key)
            ->where('channel', $channel)
            ->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('school_id')->orWhere('school_id', $schoolId))
            ->orderByRaw('school_id is null') // school's own first
            ->first();
    }

    /**
     * Fill {{placeholders}} in the body with values.
     *
     * @param  array<string, scalar|null>  $values
     */
    public function render(array $values): string
    {
        return preg_replace_callback(
            '/{{\s*(\w+)\s*}}/',
            fn ($m) => (string) ($values[$m[1]] ?? $m[0]),
            $this->body_template,
        ) ?? $this->body_template;
    }

    /**
     * @return BelongsTo<School, $this>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
