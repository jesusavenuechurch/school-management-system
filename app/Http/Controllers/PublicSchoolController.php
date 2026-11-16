<?php

namespace App\Http\Controllers;

use App\Http\Middleware\SetCurrentSchool;
use App\Models\School;
use App\Support\Constants;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

/**
 * Each school's own page (/s/{slug}) and its branded sign-in for parents
 * and staff. Details appear only once the platform team has verified the
 * school; until then the page shows just the name and the sign-in button.
 */
class PublicSchoolController extends Controller
{
    public function show(School $school): Response
    {
        abort_if($school->status !== 'active', 404);

        $public = $school->isPublic();
        $labels = Constants::options('school_levels');

        return Inertia::render('public/school', [
            'page' => [
                'name' => $school->name,
                'slug' => $school->slug,
                'logo_url' => $school->logo_url,
                'is_public' => $public,
                'levels' => array_map(fn ($l) => $labels[$l] ?? $l, $school->levels ?? []),
                'about' => $public ? $school->about : null,
                'phone' => $public ? $school->phone : null,
                'email' => $public ? $school->email : null,
                'address' => $public ? $school->address : null,
                'country' => $public ? $school->country : null,
            ],
        ]);
    }

    public function login(Request $request, School $school): Response
    {
        abort_if($school->status !== 'active', 404);

        // After signing in, open this school (if they belong to it).
        $request->session()->put(SetCurrentSchool::SESSION_KEY, $school->id);

        return Inertia::render('auth/login', [
            'canResetPassword' => Features::enabled(Features::resetPasswords()),
            'status' => $request->session()->get('status'),
            'brand' => [
                'name' => $school->name,
                'logo_url' => $school->logo_url,
                'slug' => $school->slug,
            ],
        ]);
    }
}
