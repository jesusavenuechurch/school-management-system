<?php

namespace App\Actions\People;

use App\Contracts\WhatsAppSender;
use App\Models\School;
use App\Models\StaffInvitation;
use App\Models\User;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sends an invitation by WhatsApp (template `staff_invite`), but only for
 * verified schools with WhatsApp configured. Otherwise the admin shares
 * the link from their own WhatsApp.
 */
class SendStaffInvitation
{
    public function __construct(private WhatsAppSender $whatsapp) {}

    public function canSend(School $school): bool
    {
        return $school->isVerified() && $this->whatsapp->isConfigured();
    }

    public function handle(StaffInvitation $invitation, School $school, User $inviter): bool
    {
        if (! $this->canSend($school)) {
            return false;
        }

        try {
            $this->whatsapp->sendTemplate(
                $invitation->phone,
                'staff_invite',
                [$invitation->name ?: __('there'), $inviter->name, $school->name],
                'invite/'.$invitation->token,
            );
        } catch (Throwable $e) {
            Log::warning('Staff invitation WhatsApp failed', ['invitation' => $invitation->id, 'error' => $e->getMessage()]);

            return false;
        }

        $invitation->update(['last_sent_at' => now(), 'sent_via' => 'whatsapp']);

        return true;
    }

    /**
     * The message an admin sends from their own WhatsApp when the platform
     * can't send it yet.
     */
    public static function shareText(StaffInvitation $invitation, School $school, User $inviter): string
    {
        return __('Hello :name, :inviter has added you to :school on :app. Set up your account here: :url', [
            'name' => $invitation->name ?: __('there'),
            'inviter' => $inviter->name,
            'school' => $school->name,
            'app' => config('app.name'),
            'url' => $invitation->url(),
        ]);
    }
}
