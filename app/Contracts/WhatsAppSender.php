<?php

namespace App\Contracts;

/**
 * Sends approved WhatsApp message templates (see docs/whatsapp.md).
 */
interface WhatsAppSender
{
    /**
     * Whether messages can actually be sent (credentials configured).
     */
    public function isConfigured(): bool;

    /**
     * Send a template. Returns the provider's message id.
     *
     * @param  list<string>  $bodyParameters  values for {{1}}, {{2}}...
     * @param  string|null  $buttonUrlSuffix  the dynamic part of a URL button
     */
    public function sendTemplate(string $to, string $template, array $bodyParameters, ?string $buttonUrlSuffix = null): ?string;
}
