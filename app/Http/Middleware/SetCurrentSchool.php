<?php

namespace App\Http\Middleware;

use App\Support\CurrentSchool;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Picks the school the logged-in user is working in for this request:
 * the one stored in the session if they are still an active member of it,
 * otherwise their first active school.
 */
class SetCurrentSchool
{
    public const SESSION_KEY = 'current_school_id';

    public function __construct(private CurrentSchool $currentSchool) {}

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user !== null) {
            $schoolIds = $user->activeSchoolIds();
            $selected = $request->session()->get(self::SESSION_KEY);

            if (! in_array($selected, $schoolIds, true)) {
                $selected = $schoolIds[0] ?? null;
                $request->session()->put(self::SESSION_KEY, $selected);
            }

            $this->currentSchool->set($selected);
        }

        return $next($request);
    }
}
