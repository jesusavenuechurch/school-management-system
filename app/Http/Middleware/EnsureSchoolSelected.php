<?php

namespace App\Http\Middleware;

use App\Support\CurrentSchool;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Put on every route that reads or writes school data. A user who is not a
 * member of any school is sent to set one up (the school filter is off when
 * no school is set, so these routes must never run without one).
 */
class EnsureSchoolSelected
{
    public function __construct(private CurrentSchool $currentSchool) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->currentSchool->has()) {
            abort_if($request->expectsJson(), 403, 'You are not a member of any school.');

            return redirect()->route('onboarding.create');
        }

        return $next($request);
    }
}
