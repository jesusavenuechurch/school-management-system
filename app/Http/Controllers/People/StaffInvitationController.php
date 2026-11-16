<?php

namespace App\Http\Controllers\People;

use App\Actions\People\InviteStaff;
use App\Actions\People\SendStaffInvitation;
use App\Http\Controllers\Concerns\ScopesToSchool;
use App\Http\Controllers\Controller;
use App\Models\School;
use App\Models\StaffInvitation;
use App\Support\Constants;
use App\Support\PeopleSheet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Common\Entity\Style\Color;
use OpenSpout\Common\Entity\Style\Style;
use OpenSpout\Writer\XLSX\Writer;
use Spatie\Permission\Models\Role;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Admins invite staff by WhatsApp number (typed or from a spreadsheet).
 * Each person then registers themselves from the link.
 */
class StaffInvitationController extends Controller
{
    use ScopesToSchool;

    public function store(Request $request, InviteStaff $invite): RedirectResponse
    {
        $data = $request->validate([
            'people' => ['nullable', 'string', 'max:20000'],
            'file' => ['nullable', 'file', 'mimes:csv,txt,xlsx', 'max:2048'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => [Rule::in($this->roleNames())],
        ], [
            'file.mimes' => __('Upload an Excel (.xlsx) or CSV file.'),
        ]);

        $people = $request->hasFile('file')
            ? PeopleSheet::fromUpload($request->file('file'))
            : PeopleSheet::fromText((string) ($data['people'] ?? ''));

        if ($people === []) {
            throw ValidationException::withMessages([
                $request->hasFile('file') ? 'file' : 'people' => __('Add at least one WhatsApp number.'),
            ]);
        }

        $result = $invite->handle($this->school(), $request->user(), $people, array_values($data['roles']), $this->roleNames());

        $count = count($result['invited']);
        $message = $count === 0
            ? __('No new invitations: everyone on the list is already on your staff or invited.')
            : ($result['sent'] === $count
                ? trans_choice(':count invitation sent on WhatsApp.|:count invitations sent on WhatsApp.', $count)
                : trans_choice(':count invitation ready. Send it from your WhatsApp below.|:count invitations ready. Send them from your WhatsApp below.', $count));

        Inertia::flash('toast', ['type' => $count === 0 ? 'info' : 'success', 'message' => $message]);
        Inertia::flash('inviteSkipped', $result['skipped']);

        return back();
    }

    public function resend(Request $request, StaffInvitation $invitation, SendStaffInvitation $send): RedirectResponse
    {
        abort_if($invitation->accepted_at !== null, 404);

        $invitation->update(['expires_at' => now()->addDays(StaffInvitation::DAYS_VALID)]);

        $sent = $send->handle($invitation, $this->school(), $request->user());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => $sent ? __('Invitation sent again.') : __('Invitation renewed for :days days.', ['days' => StaffInvitation::DAYS_VALID]),
        ]);

        return back();
    }

    public function destroy(StaffInvitation $invitation): RedirectResponse
    {
        abort_if($invitation->accepted_at !== null, 404);

        $invitation->delete();

        return back();
    }

    /**
     * A ready-made spreadsheet to fill in.
     */
    /**
     * A ready-made Excel sheet: headings, two sample rows and the role
     * names this school uses.
     */
    public function template(): BinaryFileResponse
    {
        $path = sys_get_temp_dir().'/staff-sheet-'.bin2hex(random_bytes(8)).'.xlsx';

        $heading = (new Style)->withFontBold(true)->withFontColor(Color::WHITE)->withBackgroundColor('1F3A2E');
        $text = (new Style)->withFormat('@');

        $writer = new Writer;
        $writer->openToFile($path);

        $sheet = $writer->getCurrentSheet()->setName('Staff');
        $sheet->setColumnWidth(28, 1);
        $sheet->setColumnWidth(22, 2);
        $sheet->setColumnWidth(16, 3);
        $writer->addRow(Row::fromValuesWithStyle(['Name', 'WhatsApp number', 'Role'], $heading));
        $writer->addRow(Row::fromValuesWithStyles(['Thabo Nthunya', '+266 5812 3456', 'Teacher'], [1 => $text]));
        $writer->addRow(Row::fromValuesWithStyles(['Lineo Mokoena', '6212 3456', 'Bursar'], [1 => $text]));

        $writer->addNewSheetAndMakeItCurrent()->setName('How to fill it');
        $writer->getCurrentSheet()->setColumnWidth(90, 1);
        $help = [
            'One person per row. Replace the two sample rows with your staff.',
            'Name: optional. They can fill it in themselves when they open the link.',
            'WhatsApp number: required. Local numbers like 5812 3456 are fine; we add +266.',
            'Role: optional. One of: '.implode(', ', $this->roleLabels()).'. Leave it empty to use the role you pick in the form.',
            'Up to '.PeopleSheet::MAX_ROWS.' people per file. Keep the headings in the first row.',
        ];

        foreach ($help as $line) {
            $writer->addRow(Row::fromValues([$line]));
        }

        $writer->setCurrentSheet($writer->getSheets()[0]);
        $writer->close();

        return response()->download($path, 'staff-invitations.xlsx')->deleteFileAfterSend();
    }

    /**
     * @return list<string>
     */
    private function roleLabels(): array
    {
        return array_map(fn (string $name): string => Constants::label('default_roles', $name) ?? $name, $this->roleNames());
    }

    /**
     * @return list<string>
     */
    private function roleNames(): array
    {
        return array_values(Role::query()
            ->where('school_id', $this->schoolId())
            ->where('name', '!=', 'parent')
            ->get()
            ->map(fn (Role $role): string => $role->name)
            ->all());
    }

    private function school(): School
    {
        return School::findOrFail($this->schoolId());
    }
}
