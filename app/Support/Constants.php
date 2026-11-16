<?php

namespace App\Support;

use Illuminate\Validation\Rules\In;
use InvalidArgumentException;

/**
 * Reads the predefined value lists in config/constants.php.
 */
class Constants
{
    /**
     * Code => label pairs for one list, e.g. Constants::options('attendance_status').
     *
     * @return array<string, string>
     */
    public static function options(string $type): array
    {
        $options = config("constants.{$type}");

        if (! is_array($options)) {
            throw new InvalidArgumentException("Unknown constants list [{$type}].");
        }

        return $options;
    }

    /**
     * The codes allowed in a list.
     *
     * @return list<string>
     */
    public static function codes(string $type): array
    {
        return array_keys(self::options($type));
    }

    /**
     * The label for a code, falling back to the code itself.
     */
    public static function label(string $type, ?string $code): ?string
    {
        if ($code === null) {
            return null;
        }

        return self::options($type)[$code] ?? $code;
    }

    /**
     * A list in the shape select inputs expect: [{value, label}, ...].
     *
     * @return list<array{value: string, label: string}>
     */
    public static function selectOptions(string $type): array
    {
        $options = [];

        foreach (self::options($type) as $value => $label) {
            $options[] = ['value' => (string) $value, 'label' => $label];
        }

        return $options;
    }

    /**
     * Suggested grades for a kind of school, name => description (or null).
     *
     * @return array<string, string|null>
     */
    public static function gradePresets(string $level): array
    {
        $grades = config("constants.grade_presets.{$level}");
        $presets = [];

        foreach (is_array($grades) ? $grades : [] as $name => $description) {
            $presets[(string) $name] = is_string($description) ? $description : null;
        }

        return $presets;
    }

    /**
     * Suggested subjects for a kind of school, code => name.
     *
     * @return array<string, string>
     */
    public static function subjectPresets(string $level): array
    {
        $subjects = config("constants.subject_presets.{$level}");
        $presets = [];

        foreach (is_array($subjects) ? $subjects : [] as $code => $name) {
            if (is_string($name)) {
                $presets[(string) $code] = $name;
            }
        }

        return $presets;
    }

    /**
     * A validation rule accepting only codes from a list.
     */
    public static function rule(string $type): In
    {
        return new In(self::codes($type));
    }
}
