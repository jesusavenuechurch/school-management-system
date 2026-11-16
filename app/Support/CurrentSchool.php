<?php

namespace App\Support;

/**
 * Holds the school the current request is working in.
 *
 * Set by the SetCurrentSchool middleware for web requests. Console commands,
 * seeders and jobs leave it empty unless they call set() themselves, and
 * while it is empty no school filter is applied.
 */
class CurrentSchool
{
    private ?int $schoolId = null;

    public function set(?int $schoolId): void
    {
        $this->schoolId = $schoolId;

        if (function_exists('setPermissionsTeamId')) {
            setPermissionsTeamId($schoolId);
        }
    }

    public function id(): ?int
    {
        return $this->schoolId;
    }

    public function has(): bool
    {
        return $this->schoolId !== null;
    }

    /**
     * Run a callback inside another school, then restore the previous one.
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    public function runAs(int $schoolId, callable $callback): mixed
    {
        $previous = $this->schoolId;
        $this->set($schoolId);

        try {
            return $callback();
        } finally {
            $this->set($previous);
        }
    }
}
