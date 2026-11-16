<?php

namespace App\Services\WhatsApp;

use App\Contracts\WhatsAppSender;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Meta's WhatsApp Cloud API. Configured in config/services.php ('whatsapp').
 */
class CloudApiSender implements WhatsAppSender
{
    public function __construct(
        private ?string $accessToken,
        private ?string $phoneNumberId,
        private string $version = 'v21.0',
        private string $language = 'en',
    ) {}

    public function isConfigured(): bool
    {
        return filled($this->accessToken) && filled($this->phoneNumberId);
    }

    public function sendTemplate(string $to, string $template, array $bodyParameters, ?string $buttonUrlSuffix = null): ?string
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('WhatsApp is not configured.');
        }

        $components = [[
            'type' => 'body',
            'parameters' => array_map(fn (string $text) => ['type' => 'text', 'text' => $text], $bodyParameters),
        ]];

        if ($buttonUrlSuffix !== null) {
            $components[] = [
                'type' => 'button',
                'sub_type' => 'url',
                'index' => '0',
                'parameters' => [['type' => 'text', 'text' => $buttonUrlSuffix]],
            ];
        }

        $response = Http::withToken((string) $this->accessToken)
            ->acceptJson()
            ->timeout(15)
            ->post("https://graph.facebook.com/{$this->version}/{$this->phoneNumberId}/messages", [
                'messaging_product' => 'whatsapp',
                'to' => ltrim($to, '+'),
                'type' => 'template',
                'template' => [
                    'name' => $template,
                    'language' => ['code' => $this->language],
                    'components' => $components,
                ],
            ])
            ->throw();

        $id = $response->json('messages.0.id');

        return is_string($id) ? $id : null;
    }
}
