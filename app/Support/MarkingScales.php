<?php

namespace App\Support;

use App\Models\GradeLevel;
use App\Models\GradingScale;
use App\Models\School;
use Illuminate\Support\Facades\DB;

/**
 * The starting marking scales (primary A–E, high school A*–U) from
 * config/constants.php, and putting each grade on the right one.
 */
class MarkingScales
{
    /**
     * @return array<string, array{name: string, bands: list<array{label: string, min_percentage: int, remark: string, is_pass: bool}>}>
     */
    public static function presets(): array
    {
        $presets = [];

        foreach ((array) config('constants.grading_scale_presets') as $level => $preset) {
            $bands = [];

            foreach ($preset['bands'] as $label => [$min, $remark, $isPass]) {
                $bands[] = ['label' => (string) $label, 'min_percentage' => (int) $min, 'remark' => $remark, 'is_pass' => (bool) $isPass];
            }

            $presets[(string) $level] = ['name' => $preset['name'], 'bands' => $bands];
        }

        return $presets;
    }

    /**
     * Creates the preset scale for each kind of school the school is (unless
     * one with that name exists) and puts grades without a scale on theirs:
     * Grade 1–7 on primary, Grade 8–11 on high school. The first scale
     * becomes the default.
     *
     * @param  list<string>|null  $levels  defaults to the school's levels
     */
    public static function installPresets(School $school, ?array $levels = null): void
    {
        $levels ??= $school->levels ?: ['primary'];
        $presets = self::presets();

        DB::transaction(function () use ($school, $levels, $presets) {
            $hasDefault = GradingScale::where('is_default', true)->exists();

            foreach ($levels as $level) {
                if (! isset($presets[$level])) {
                    continue;
                }

                $scale = GradingScale::firstWhere('name', $presets[$level]['name']);

                if ($scale === null) {
                    $scale = GradingScale::create([
                        'school_id' => $school->id,
                        'name' => $presets[$level]['name'],
                        'is_default' => ! $hasDefault,
                    ]);
                    $scale->bands()->createMany(self::numbered($presets[$level]['bands']));
                    $hasDefault = true;
                }

                GradeLevel::query()
                    ->whereNull('grading_scale_id')
                    ->whereIn('name', array_keys(Constants::gradePresets($level)))
                    ->update(['grading_scale_id' => $scale->id]);
            }
        });
    }

    /**
     * @param  list<array<string, mixed>>  $bands
     * @return list<array<string, mixed>>
     */
    public static function numbered(array $bands): array
    {
        return array_values(array_map(
            fn (array $band, int $i) => [...$band, 'sort_order' => $i],
            $bands,
            array_keys($bands),
        ));
    }
}
