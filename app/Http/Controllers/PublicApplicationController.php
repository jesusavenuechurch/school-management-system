<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\GradeLevel;
use App\Models\School;
use App\Support\Constants;
use App\Support\PhoneNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The "Apply" form on a school's public page. Parents send their child's
 * details; the school reviews them under Applications.
 */
class PublicApplicationController extends Controller
{
    public function create(School $school): Response
    {
        abort_if($school->status !== 'active', 404);

        return Inertia::render('public/apply', [
            'school' => $this->brand($school),
            'open' => $this->isOpen($school),
            'grades' => GradeLevel::withoutSchoolScope()
                ->where('school_id', $school->id)
                ->orderBy('sort_order')
                ->get(['id', 'name'])
                ->map(fn (GradeLevel $g) => ['value' => (string) $g->id, 'label' => $g->name]),
            'genderOptions' => Constants::selectOptions('gender'),
            'relationshipOptions' => Constants::selectOptions('guardian_relationship'),
        ]);
    }

    public function store(Request $request, School $school): RedirectResponse
    {
        abort_unless($school->status === 'active' && $this->isOpen($school), 404);

        // A hidden field people never see; bots fill it in.
        if ($request->filled('website')) {
            return to_route('schools.apply.thanks', $school);
        }

        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'date_of_birth' => ['nullable', 'date', 'before:today'],
            'gender' => ['nullable', Constants::rule('gender')],
            'grade_level_id' => ['required', 'integer', fn ($attribute, $value, $fail) => GradeLevel::withoutSchoolScope()
                ->where('school_id', $school->id)->whereKey($value)->exists() ?: $fail(__('Choose a grade from the list.'))],
            'previous_school' => ['nullable', 'string', 'max:150'],
            'guardian_name' => ['required', 'string', 'max:150'],
            'guardian_phone' => ['required', 'string', 'max:20', 'regex:/^[+\d][\d\s\-()]{6,}$/'],
            'guardian_email' => ['nullable', 'email', 'max:150'],
            'guardian_relationship' => ['nullable', Constants::rule('guardian_relationship')],
            'address' => ['nullable', 'string', 'max:500'],
            'message' => ['nullable', 'string', 'max:1000'],
        ], [
            'guardian_phone.regex' => __('Enter a phone number, e.g. 5812 3456.'),
        ], [
            'first_name' => 'child’s first name',
            'last_name' => 'child’s surname',
            'grade_level_id' => 'grade',
            'guardian_name' => 'your name',
            'guardian_phone' => 'WhatsApp number',
            'guardian_email' => 'email',
        ]);

        $data['guardian_phone'] = PhoneNumber::normalize($data['guardian_phone']);

        // Sending the same application twice keeps the first one.
        $application = Application::withoutSchoolScope()
            ->where('school_id', $school->id)
            ->where('status', 'pending')
            ->where('guardian_phone', $data['guardian_phone'])
            ->whereRaw('lower(first_name) = ?', [mb_strtolower($data['first_name'])])
            ->whereRaw('lower(last_name) = ?', [mb_strtolower($data['last_name'])])
            ->first()
            ?? Application::create([...$data, 'school_id' => $school->id, 'reference' => Application::newReference()]);

        return to_route('schools.apply.thanks', $school)->with('application_reference', $application->reference);
    }

    public function thanks(Request $request, School $school): Response
    {
        abort_if($school->status !== 'active', 404);

        return Inertia::render('public/apply-thanks', [
            'school' => $this->brand($school),
            'reference' => $request->session()->get('application_reference'),
        ]);
    }

    /**
     * Applications open once the school's page is public and the school
     * hasn't switched them off.
     */
    public static function isOpen(School $school): bool
    {
        return $school->isPublic() && $school->accepts_applications;
    }

    /**
     * @return array<string, mixed>
     */
    private function brand(School $school): array
    {
        return [
            'name' => $school->name,
            'slug' => $school->slug,
            'logo_url' => $school->logo_url,
            'phone' => $school->isPublic() ? $school->phone : null,
        ];
    }
}
