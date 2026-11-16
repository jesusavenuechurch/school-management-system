<?php

use App\Models\School;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
 * Until the platform admin area exists, schools are approved from the
 * command line. Approving also publishes the school's page; the school's
 * admin can hide it again from their dashboard.
 */
Artisan::command('school:verify {school : The school id or slug} {--undo : Remove the verification}', function (string $school) {
    $record = School::query()
        ->where(is_numeric($school) ? 'id' : 'slug', $school)
        ->first();

    if ($record === null) {
        $this->error("No school found for \"{$school}\".");
        $this->line('Schools: '.School::query()->orderBy('id')->get(['id', 'slug'])->map(fn (School $s) => "{$s->id} ({$s->slug})")->implode(', '));

        return 1;
    }

    if ($this->option('undo')) {
        $record->forceFill(['verified_at' => null, 'published_at' => null])->save();
        $this->info("{$record->name} is no longer verified; its page is hidden.");

        return 0;
    }

    $record->forceFill([
        'verified_at' => $record->verified_at ?? now(),
        'published_at' => $record->published_at ?? now(),
    ])->save();

    $this->info("{$record->name} is verified and its page is live:");
    $this->line(route('schools.public', $record));

    return 0;
})->purpose('Approve (verify) a school and publish its page');
