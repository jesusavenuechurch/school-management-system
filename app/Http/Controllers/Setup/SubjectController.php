<?php

namespace App\Http\Controllers\Setup;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\Subject;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SubjectController extends Controller
{
    use ScopesToSchool;

    public function index(): Response
    {
        return Inertia::render('setup/subjects', [
            'subjects' => Subject::query()
                ->withCount('classAssignments')
                ->orderBy('name')
                ->get(['id', 'name', 'code']),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Subject::create($this->validated($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Subject added.')]);

        return back();
    }

    public function update(Request $request, Subject $subject): RedirectResponse
    {
        $subject->update($this->validated($request, $subject));

        return back();
    }

    public function destroy(Subject $subject): RedirectResponse
    {
        if ($subject->classAssignments()->exists()) {
            return back()->withErrors(['subject' => __('This subject is taught in some classes, so it cannot be deleted.')]);
        }

        $subject->delete();

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Subject $subject = null): array
    {
        $request->merge(['code' => strtoupper(trim((string) $request->input('code')))]);

        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'code' => [
                'required', 'string', 'max:20', 'alpha_dash',
                Rule::unique('subjects')->where('school_id', $this->schoolId())->ignore($subject?->id),
            ],
        ]);
    }
}
