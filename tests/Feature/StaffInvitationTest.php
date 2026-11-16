<?php

namespace Tests\Feature;

use App\Contracts\WhatsAppSender;
use App\Models\School;
use App\Models\Staff;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Support\PeopleSheet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Tests\Concerns\CreatesSchools;
use Tests\TestCase;

class StaffInvitationTest extends TestCase
{
    use CreatesSchools, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Http::preventStrayRequests();
        config(['services.whatsapp.access_token' => null, 'services.whatsapp.phone_number_id' => null]);
    }

    public function test_admin_invites_by_typing_numbers(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();

        $this->actingAs($admin)->post(route('staff.invitations.store'), [
            'people' => "Thabo Nthunya, 5812 3456\n6212 3456\nnot a number\n5812 3456",
            'roles' => ['teacher'],
        ])->assertSessionHasNoErrors();

        $this->inSchool($school);
        $invitations = StaffInvitation::orderBy('id')->get();

        $this->assertCount(2, $invitations);
        $this->assertSame('+26658123456', $invitations[0]->phone);
        $this->assertSame('Thabo Nthunya', $invitations[0]->name);
        $this->assertSame(['teacher'], $invitations[0]->roles);
        $this->assertNull($invitations[1]->name);
        $this->assertNull($invitations[0]->last_sent_at); // unverified school: not sent

        $this->get(route('staff.index'))->assertInertia(fn ($page) => $page
            ->has('invitations', 2)
            ->where('canSendWhatsApp', false)
            ->where('invitations.0.share_url', fn ($url) => str_starts_with($url, 'https://wa.me/266')));
    }

    public function test_admin_invites_from_an_excel_sheet_with_roles(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();

        $path = tempnam(sys_get_temp_dir(), 'staff').'.xlsx';
        $writer = new Writer;
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues(['Name', 'WhatsApp number', 'Role']));
        $writer->addRow(Row::fromValues(['Thabo Nthunya', '+266 5812 3456', 'Teacher']));
        $writer->addRow(Row::fromValues(['Lineo Mokoena', '6212 3456', 'Bursar']));
        $writer->addRow(Row::fromValues(['No Role', '6299 9999', '']));
        $writer->close();

        $this->actingAs($admin)->post(route('staff.invitations.store'), [
            'file' => new UploadedFile($path, 'staff.xlsx', test: true),
            'roles' => ['registrar'],
        ])->assertSessionHasNoErrors();

        $this->inSchool($school);
        $this->assertSame(['teacher'], StaffInvitation::where('name', 'Thabo Nthunya')->value('roles'));
        $this->assertSame(['accountant'], StaffInvitation::where('name', 'Lineo Mokoena')->value('roles'));
        $this->assertSame(['registrar'], StaffInvitation::where('name', 'No Role')->value('roles'));
    }

    public function test_admin_invites_from_a_csv_file(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $csv = UploadedFile::fake()->createWithContent('staff.csv', "Name,Phone\nThabo,58123456\n");

        $this->actingAs($admin)->post(route('staff.invitations.store'), ['file' => $csv, 'roles' => ['teacher']])
            ->assertSessionHasNoErrors();

        $this->inSchool($school);
        $this->assertSame(1, StaffInvitation::count());
    }

    public function test_people_already_on_staff_are_skipped(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->inSchool($school);
        Staff::create(['user_id' => User::factory()->create(['phone' => '+26658123456'])->id, 'staff_number' => 'S1']);

        $this->actingAs($admin)->post(route('staff.invitations.store'), ['people' => '58123456', 'roles' => ['teacher']])
            ->assertSessionHas('inertia.flash_data.inviteSkipped', fn ($skipped) => $skipped[0]['reason'] === 'already on your staff');

        $this->assertSame(0, StaffInvitation::count());
    }

    public function test_verified_schools_send_the_invitation_on_whatsapp(): void
    {
        config(['services.whatsapp.access_token' => 'test-token', 'services.whatsapp.phone_number_id' => '123']);
        $this->app->forgetInstance(WhatsAppSender::class);
        Http::fake(['graph.facebook.com/*' => Http::response(['messages' => [['id' => 'wamid.1']]])]);

        [$school, $admin] = $this->schoolWithAdmin();
        $school->update(['verified_at' => now()]);

        $this->actingAs($admin)->post(route('staff.invitations.store'), ['people' => 'Thabo, 58123456', 'roles' => ['teacher']]);

        $this->inSchool($school);
        $invitation = StaffInvitation::firstOrFail();
        $this->assertSame('whatsapp', $invitation->sent_via);

        Http::assertSent(fn ($request) => $request['template']['name'] === 'staff_invite'
            && $request['to'] === '26658123456'
            && $request['template']['components'][0]['parameters'][0]['text'] === 'Thabo'
            && $request['template']['components'][1]['parameters'][0]['text'] === 'invite/'.$invitation->token);
    }

    public function test_the_invited_person_registers_themselves(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $this->inSchool($school);
        $invitation = StaffInvitation::issue(['school_id' => $school->id, 'invited_by' => $admin->id, 'phone' => '+26658123456', 'name' => 'Thabo', 'roles' => ['teacher']]);
        $this->flushSession();
        auth()->logout();

        $this->get(route('invitations.show', $invitation->token))
            ->assertInertia(fn ($page) => $page->component('invite/accept')->where('status', 'new')->where('invitation.roles.0', 'Teacher'));

        $this->post(route('invitations.accept', $invitation->token), [
            'name' => 'Thabo Nthunya',
            'username' => 'thabo',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertRedirect(route('dashboard'));

        $user = User::where('username', 'thabo')->firstOrFail();
        $this->assertAuthenticatedAs($user);
        $this->assertSame('+26658123456', $user->phone);
        $this->assertSame([$school->id], $user->activeSchoolIds());
        $this->assertTrue($user->hasRole('teacher'));
        $this->assertSame('STF0001', Staff::where('user_id', $user->id)->value('staff_number'));
        $this->assertNotNull($invitation->fresh()->accepted_at);

        // The link can't be used twice.
        $this->get(route('invitations.show', $invitation->token))->assertInertia(fn ($page) => $page->where('status', 'expired'));
    }

    public function test_someone_already_signed_in_with_that_number_joins_with_their_account(): void
    {
        [$schoolA] = $this->schoolWithAdmin('A');
        [$schoolB, $adminB] = $this->schoolWithAdmin('B');
        $teacher = User::factory()->create(['phone' => '+26658123456']);
        $invitation = StaffInvitation::issue(['school_id' => $schoolB->id, 'invited_by' => $adminB->id, 'phone' => '+26658123456', 'roles' => ['teacher']]);

        $this->actingAs($teacher)->get(route('invitations.show', $invitation->token))
            ->assertInertia(fn ($page) => $page->where('status', 'match'));

        $this->post(route('invitations.accept', $invitation->token))->assertRedirect(route('dashboard'));

        $this->assertSame([$schoolB->id], $teacher->activeSchoolIds());
        $this->assertSame(3, User::count()); // two admins and the teacher: no new account
    }

    public function test_a_different_number_cannot_accept(): void
    {
        [$school, $admin] = $this->schoolWithAdmin();
        $invitation = StaffInvitation::issue(['school_id' => $school->id, 'phone' => '+26658123456', 'roles' => ['teacher']]);

        $this->actingAs($admin)->post(route('invitations.accept', $invitation->token))->assertForbidden();
    }

    public function test_expired_invitations_cannot_be_used(): void
    {
        [$school] = $this->schoolWithAdmin();
        $invitation = StaffInvitation::issue(['school_id' => $school->id, 'phone' => '+26658123456', 'roles' => ['teacher']]);
        $invitation->update(['expires_at' => now()->subDay()]);
        auth()->logout();

        $this->post(route('invitations.accept', $invitation->token), [
            'name' => 'X', 'username' => 'xavier', 'password' => 'password', 'password_confirmation' => 'password',
        ])->assertStatus(410);
    }

    public function test_another_schools_invitation_cannot_be_cancelled(): void
    {
        [$schoolA] = $this->schoolWithAdmin('A');
        $invitation = StaffInvitation::issue(['school_id' => $schoolA->id, 'phone' => '+26658123456', 'roles' => ['teacher']]);
        [, $adminB] = $this->schoolWithAdmin('B');

        $this->actingAs($adminB)->delete(route('staff.invitations.destroy', $invitation->id))->assertNotFound();
        $this->assertModelExists($invitation);
    }

    public function test_the_spreadsheet_template_downloads(): void
    {
        [, $admin] = $this->schoolWithAdmin();

        $response = $this->actingAs($admin)->get(route('staff.invitations.template'));
        $response->assertOk()->assertDownload('staff-invitations.xlsx');

        // The sheet we hand out reads straight back in.
        $file = $response->getFile();
        $people = PeopleSheet::fromUpload(new UploadedFile($file->getPathname(), 'staff-invitations.xlsx', null, null, true));
        $this->assertSame([
            ['name' => 'Thabo Nthunya', 'phone' => '+266 5812 3456', 'role' => 'Teacher'],
            ['name' => 'Lineo Mokoena', 'phone' => '6212 3456', 'role' => 'Bursar'],
        ], $people);
    }
}
