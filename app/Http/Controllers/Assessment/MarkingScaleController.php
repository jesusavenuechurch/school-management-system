<?php

namespace App\Http\Controllers\Assessment;

use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\GradeBand;
use App\Models\GradeLevel;
use App\Models\GradingScale;
use App\Models\School;
use App\Support\MarkingScales;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Marking scales: which symbol (A, B... or A*... U) a percentage earns,
 * and which grades use which scale.
 */
class MarkingScaleController extends Controller
{
    use ScopesToSchool;

    public function index(): Response
    {
        $scales = GradingScale::query()->with('bands')->orderByDesc('is_default')->orderBy('name')->get();

        return Inertia::render('marks/scales', [
            'scales' => $scales->map(fn (GradingScale $scale) => [
                'id' => $scale->id,
                'name' => $scale->name,
                'is_default' => $scale->is_default,
                'bands' => $scale->bands->map(fn (GradeBand $band) => [
                    'label' => $band->label,
                    'min_percentage' => (float) $band->min_percentage,
                    'remark' => $band->remark,
                    'is_pass' => $band->is_pass,
                ])->values(),
            ]),
            'grades' => GradeLevel::query()->orderBy('sort_order')->orderBy('id')->get(['id', 'name', 'grading_scale_id']),
            'presets' => collect(MarkingScales::presets())
                ->map(fn (array $preset, string $level) => ['level' => $level, 'name' => $preset['name'], 'bands' => $preset['bands']])
                ->values(),
            'schoolLevels' => School::findOrFail($this->schoolId())->levels ?? [],
        ]);
    }

    /** Adds the ready-made primary and/or high school scales. */
    public function install(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'levels' => ['required', 'array', 'min:1'],
            'levels.*' => [Rule::in(array_keys(MarkingScales::presets()))],
        ]);

        MarkingScales::installPresets(School::findOrFail($this->schoolId()), array_values($data['levels']));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Marking scales added.')]);

        return back();
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($data) {
            $scale = GradingScale::create([
                'name' => $data['name'],
                'is_default' => ! GradingScale::where('is_default', true)->exists(),
            ]);
            $this->save($scale, $data);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Marking scale added.')]);

        return back();
    }

    public function update(Request $request, GradingScale $scale): RedirectResponse
    {
        $data = $this->validated($request, $scale);

        DB::transaction(function () use ($scale, $data) {
            $scale->update(['name' => $data['name']]);
            $this->save($scale, $data);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Marking scale saved.')]);

        return back();
    }

    public function makeDefault(GradingScale $scale): RedirectResponse
    {
        GradingScale::whereKeyNot($scale->id)->update(['is_default' => false]);
        $scale->update(['is_default' => true]);

        return back();
    }

    public function destroy(GradingScale $scale): RedirectResponse
    {
        if ($scale->is_default && GradingScale::count() > 1) {
            return back()->withErrors(['scale' => __('Make another scale the default before removing this one.')]);
        }

        // Grades on it fall back to the default; results keep their symbols.
        $scale->delete();

        return back();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function save(GradingScale $scale, array $data): void
    {
        $bands = collect($data['bands'])
            ->map(fn (array $band) => [
                'label' => trim($band['label']),
                'min_percentage' => (float) $band['min_percentage'],
                'remark' => filled($band['remark'] ?? null) ? trim($band['remark']) : null,
                'is_pass' => filter_var($band['is_pass'] ?? false, FILTER_VALIDATE_BOOL),
            ])
            ->sortByDesc('min_percentage')
            ->values()
            ->all();

        $scale->bands()->delete();
        $scale->bands()->createMany(MarkingScales::numbered($bands));

        $gradeIds = array_map('intval', $data['grades'] ?? []);
        GradeLevel::where('grading_scale_id', $scale->id)->whereNotIn('id', $gradeIds)->update(['grading_scale_id' => null]);
        GradeLevel::whereIn('id', $gradeIds)->update(['grading_scale_id' => $scale->id]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?GradingScale $scale = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60', Rule::unique('grading_scales')->where('school_id', $this->schoolId())->ignore($scale?->id)],
            'bands' => ['required', 'array', 'min:2', 'max:20'],
            'bands.*.label' => ['required', 'string', 'max:20'],
            'bands.*.min_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'bands.*.remark' => ['nullable', 'string', 'max:60'],
            'bands.*.is_pass' => ['nullable'],
            'grades' => ['nullable', 'array'],
            'grades.*' => [$this->existsInSchool('grade_levels')],
        ], [], [
            'bands.*.label' => 'symbol',
            'bands.*.min_percentage' => 'starting percentage',
        ]);

        $mins = array_map(fn (array $band) => (float) $band['min_percentage'], $data['bands']);

        if (min($mins) > 0) {
            throw ValidationException::withMessages(['bands' => __('The lowest symbol must start at 0%, so every mark gets a symbol.')]);
        }

        if (count($mins) !== count(array_unique($mins))) {
            throw ValidationException::withMessages(['bands' => __('Two symbols start at the same percentage.')]);
        }

        return $data;
    }
}
