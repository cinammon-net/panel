<?php

namespace App\Services;

use App\Models\Post;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class DiscordWebhookService
{
    /**
     * Envía una notificación de artículo a un canal de Discord mediante webhook.
     */
    public static function sendArticleNotification(Post $post): bool
    {
        $webhookUrl = config('services.discord.webhook_url') ?: env('DISCORD_WEBHOOK_URL');

        if (!$webhookUrl) {
            return false;
        }

        $newsHost = config('panel.news_host', 'news.cinammon.net');
        $articleUrl = "https://{$newsHost}/articulo/{$post->id}";

        $categoryColors = [
            'actualizacion' => 0x3b82f6, // Azul
            'mantenimiento' => 0xef4444, // Rojo
            'comunidad' => 0x10b981,     // Verde
            'guias' => 0x8b5cf6,         // Púrpura
            'evento' => 0xf59e0b,        // Ámbar
            'opinion' => 0xec4899,       // Rosa
        ];

        $color = $categoryColors[$post->category] ?? 0xf59e0b;

        $embed = [
            'title' => $post->title,
            'url' => $articleUrl,
            'description' => $post->summary ?: substr(strip_tags($post->content), 0, 200) . '...',
            'color' => $color,
            'fields' => [
                [
                    'name' => 'Categoría',
                    'value' => ucfirst($post->category),
                    'inline' => true,
                ],
                [
                    'name' => 'Autor',
                    'value' => $post->user ? $post->user->name : 'Cinammon Team',
                    'inline' => true,
                ],
            ],
            'footer' => [
                'text' => 'Cinammon Network · Novedades Oficiales',
                'icon_url' => 'https://cinammon.net/favicon.ico',
            ],
            'timestamp' => $post->created_at ? $post->created_at->toISOString() : now()->toISOString(),
        ];

        if ($post->picture) {
            $pictureUrl = str_starts_with($post->picture, 'http')
                ? $post->picture
                : 'https://cinammon.net' . $post->picture;
            $embed['image'] = ['url' => $pictureUrl];
        }

        try {
            $response = Http::withoutVerifying()->timeout(5)->post($webhookUrl, [
                'username' => 'Cinammon News',
                'avatar_url' => 'https://cinammon.net/favicon.ico',
                'embeds' => [$embed],
            ]);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning('Error enviando notificación de post a Discord: ' . $e->getMessage());
            return false;
        }
    }
}
