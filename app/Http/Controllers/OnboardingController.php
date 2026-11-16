<?php

namespace App\Http\Controllers;

use App\Actions\Schools\CreateSchool;
use App\Http\Middleware\SetCurrentSchool;
use App\Models\School;
use App\Support\Constants;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class OnboardingController extends Controller
{
    public function create(Request $request): Response
    {
        return Inertia::render('onboarding/create-school', [
            'hasSchool' => $request->user()->activeSchoolIds() !== [],
            'defaults' => [
                'country' => 'Lesotho',
                'currency' => config('constants.default_currency'),
                'timezone' => config('constants.default_timezone'),
            ],
            'timezones' => timezone_identifiers_list(),
            'levelOptions' => Constants::selectOptions('school_levels'),
        ]);
    }

    public function store(Request $request, CreateSchool $createSchool): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'country' => ['nullable', 'string', 'max:100'],
            'currency' => ['required', 'string', 'size:3', 'alpha'],
            'timezone' => ['required', 'timezone:all'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:1000'],
            'levels' => ['required', 'array', 'min:1'],
            'levels.*' => [Constants::rule('school_levels')],
            'logo' => self::logoRules(),
        ], [
            'levels.required' => __('Choose at least one: primary school, high school, or both.'),
        ]);

        $school = $createSchool->handle($request->user(), $validated, $request->file('logo'));

        $request->session()->put(SetCurrentSchool::SESSION_KEY, $school->id);

        Inertia::flash('chalk', 'school');

        return to_route('setup.journey');
    }

    /**
     * Store an uploaded logo in the school's folder on the public disk.
     */
    public static function storeLogo(UploadedFile $file, School $school): string
    {
        $path = $file->store("schools/{$school->id}", 'public');

        if ($path === false) {
            throw ValidationException::withMessages(['logo' => __('The logo could not be saved. Try again.')]);
        }

        return $path;
    }

    /**
     * PNG, JPG or WebP up to 2 MB. SVG is refused: it can carry scripts.
     *
     * @return list<string>
     */
    public static function logoRules(): array
    {
        return ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048', 'dimensions:min_width=64,min_height=64'];
    }

    /**
     * Switch the school the user is working in.
     */
    public function switch(Request $request, int $school): RedirectResponse
    {
        abort_unless(in_array($school, $request->user()->activeSchoolIds(), true), 403);

        $request->session()->put(SetCurrentSchool::SESSION_KEY, $school);

        return to_route('dashboard');
    }
}
