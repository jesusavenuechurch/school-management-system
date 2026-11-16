<?php

namespace App\Http\Controllers\Setup;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\School;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * The admin shows or hides the school's public page. Only verified
 * schools can show it, so nobody can pose as a real school.
 */
class SchoolPageController extends Controller
{
    use ScopesToSchool;

    public function update(Request $request): RedirectResponse
    {
        $data = $request->validate(['published' => ['required', 'boolean']]);
        $school = School::query()->findOrFail($this->schoolId());

        abort_unless($school->isVerified(), 403, __('Your school must be verified before its page can go live.'));

        $school->forceFill(['published_at' => $data['published'] ? ($school->published_at ?? now()) : null])->save();

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $data['published'] ? __('Your school page is live.') : __('Your school page is hidden. Parents can still sign in there.'),
        ]);

        return back();
    }
}
