<?php

namespace App\Http\Controllers;

use App\Actions\People\AddSchoolMember;
use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Http\Middleware\SetCurrentSchool;
use App\Models\School;
use App\Models\Staff;
use App\Models\StaffInvitation;
use App\Models\User;
use App\Support\Constants;
use App\Support\CurrentSchool;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Someone opens their invitation link, fills in their own details and
 * chooses a password. If they already have an account (as a parent, or at
 * another school), they sign in and join with it instead.
 */
class InvitationController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    public function show(Request $request, string $token): Response
    {
        $invitation = StaffInvitation::findByToken($token);
        $school = $invitation ? School::find($invitation->school_id) : null;

        if ($invitation === null || $school === null || ! $invitation->isUsable()) {
            return Inertia::render('invite/accept', ['status' => 'expired', 'school' => $school?->only(['name']), 'invitation' => null]);
        }

        $user = $request->user();
        $labels = Constants::options('default_roles');

        return Inertia::render('invite/accept', [
            'status' => $user === null ? 'new' : ($user->phone === $invitation->phone ? 'match' : 'mismatch'),
            'school' => ['name' => $school->name, 'logo_url' => $school->logo_url, 'slug' => $school->slug],
            'invitation' => [
                'token' => $token,
                'name' => $invitation->name,
                'phone' => $invitation->phone,
                'roles' => array_map(fn ($r) => $labels[$r] ?? ucfirst($r), $invitation->roles),
                'inviter' => $invitation->inviter?->name,
                'phone_has_account' => $user === null && User::where('phone', $invitation->phone)->exists(),
            ],
        ]);
    }

    /**
     * Register a new account from the invitation, or join with the account
     * already signed in (when its number matches the invitation).
     */
    public function accept(Request $request, string $token, AddSchoolMember $addMember): RedirectResponse
    {
        $invitation = StaffInvitation::findByToken($token);
        abort_if($invitation === null || ! $invitation->isUsable(), 410, 'This invitation has expired.');

        $user = $request->user();

        if ($user !== null) {
            abort_unless($user->phone === $invitation->phone, 403, 'This invitation is for a different WhatsApp number.');
        } else {
            $data = $request->validate([
                'name' => $this->nameRules(),
                'username' => $this->usernameRules(),
                'email' => $this->emailRules(),
                'password' => $this->passwordRules(),
            ]);

            $user = User::create([...$data, 'phone' => $invitation->phone]);

            if ($invitation->sent_via === 'whatsapp') {
                // They received the link on this number, so it's theirs.
                $user->forceFill(['phone_verified_at' => now()])->save();
            }
        }

        DB::transaction(function () use ($invitation, $user, $addMember) {
            app(CurrentSchool::class)->set($invitation->school_id);

            $addMember->handle($user, $invitation->roles);

            if (! Staff::where('user_id', $user->id)->exists()) {
                Staff::create([
                    'user_id' => $user->id,
                    'staff_number' => Staff::nextNumber(),
                    'employment_status' => 'active',
                ]);
            }

            $invitation->update(['accepted_at' => now(), 'user_id' => $user->id]);
        });

        if (! Auth::check()) {
            Auth::login($user);
            $request->session()->regenerate();
        }

        $request->session()->put(SetCurrentSchool::SESSION_KEY, $invitation->school_id);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Welcome to the team!')]);

        return redirect()->route('dashboard');
    }

    /**
     * "I already have an account": sign in, then come back here.
     */
    public function login(Request $request, string $token): RedirectResponse
    {
        $invitation = StaffInvitation::findByToken($token);
        abort_if($invitation === null, 404);

        $request->session()->put('url.intended', route('invitations.show', $token));
        $school = School::findOrFail($invitation->school_id);

        return redirect()->route('schools.login', $school->slug);
    }
}
