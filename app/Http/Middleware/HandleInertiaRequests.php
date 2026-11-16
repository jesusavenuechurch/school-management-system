<?php

namespace App\Http\Middleware;

use App\Models\School;
use App\Support\CurrentSchool;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $current = app(CurrentSchool::class);
        $school = $current->has() ? School::find($current->id()) : null;

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user,
                'roles' => $user && $school ? $user->getRoleNames()->values() : [],
            ],
            'school' => $school ? [
                'id' => $school->id,
                'name' => $school->name,
                'slug' => $school->slug,
                'currency' => $school->currency,
                'logo_url' => $school->logo_url,
                'levels' => $school->levels ?? [],
                'is_verified' => $school->isVerified(),
                'setup_complete' => $school->setup_completed_at !== null,
            ] : null,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
