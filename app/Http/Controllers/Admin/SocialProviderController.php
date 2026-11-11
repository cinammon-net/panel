<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Auth\SocialAuthController;
use App\Http\Controllers\Controller;
use App\Models\SocialProviderSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Gestión desde el panel web (Owner/Admin) de los proveedores de inicio de sesión social (OAuth / OIDC).
 */
class SocialProviderController extends Controller
{
    private const META = [
        'discord' => [
            'description' => 'Permite entrar y vincular cuenta con Discord (comprueba verificación en el servidor).',
            'portal_url' => 'https://discord.com/developers/applications',
            'portal_label' => 'Discord Developer Portal',
            'needs_tenant' => false,
        ],
        'google' => [
            'description' => 'Inicio de sesión con cuentas de Google / Gmail mediante OAuth 2.0.',
            'portal_url' => 'https://console.cloud.google.com/apis/credentials',
            'portal_label' => 'Google Cloud Credentials',
            'needs_tenant' => false,
        ],
        'github' => [
            'description' => 'Acceso rápido con cuenta de GitHub y correo principal verificado.',
            'portal_url' => 'https://github.com/settings/developers',
            'portal_label' => 'GitHub OAuth Apps',
            'needs_tenant' => false,
        ],
        'microsoft' => [
            'description' => 'Inicio de sesión con Microsoft personal o empresarial (Entra ID).',
            'portal_url' => 'https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
            'portal_label' => 'Microsoft Entra App Registrations',
            'needs_tenant' => true,
            'tenant_label' => 'Tenant (por defecto: common)',
            'tenant_placeholder' => 'common',
        ],
        'cloudflare' => [
            'description' => 'Acceso con Cloudflare Zero Trust (Access SaaS OIDC). Indica tu Team Domain y credenciales de la app OIDC.',
            'portal_url' => 'https://one.dash.cloudflare.com/',
            'portal_label' => 'Cloudflare Zero Trust Dashboard',
            'needs_tenant' => true,
            'tenant_label' => 'Team Domain de Cloudflare Access',
            'tenant_placeholder' => 'mi-equipo.cloudflareaccess.com',
        ],
        'gitlab' => [
            'description' => 'Inicio de sesión con cuentas de GitLab.',
            'portal_url' => 'https://gitlab.com/-/user_settings/applications',
            'portal_label' => 'GitLab Applications',
            'needs_tenant' => false,
        ],
        'twitch' => [
            'description' => 'Inicio de sesión con cuentas de Twitch.',
            'portal_url' => 'https://dev.twitch.tv/console/apps',
            'portal_label' => 'Twitch Developer Console',
            'needs_tenant' => false,
        ],
    ];

    public function index(): Response
    {
        $providers = [];
        foreach (SocialAuthController::PROVIDERS as $key => [$name]) {
            $resolved = SocialProviderSetting::resolveFor($key);
            $meta = self::META[$key] ?? [];
            $secret = $resolved['client_secret'];
            $providers[] = [
                'key' => $key,
                'name' => $name,
                'description' => $meta['description'] ?? '',
                'portal_url' => $meta['portal_url'] ?? '',
                'portal_label' => $meta['portal_label'] ?? 'Abrir consola',
                'needs_tenant' => (bool) ($meta['needs_tenant'] ?? false),
                'tenant_label' => $meta['tenant_label'] ?? '',
                'tenant_placeholder' => $meta['tenant_placeholder'] ?? '',
                'enabled' => $resolved['enabled'],
                'ready' => $resolved['ready'],
                'client_id' => $resolved['client_id'],
                'has_secret' => $resolved['has_secret'],
                'secret_hint' => $secret !== '' ? '••••'.substr($secret, -4) : null,
                'tenant' => $resolved['tenant'],
                'callback_url' => $resolved['redirect'],
            ];
        }

        return Inertia::render('Admin/AuthProviders', [
            'providers' => $providers,
        ]);
    }

    public function update(Request $request, string $provider): RedirectResponse
    {
        abort_unless(isset(SocialAuthController::PROVIDERS[$provider]), 404);

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'client_id' => ['nullable', 'string', 'max:255'],
            'client_secret' => ['nullable', 'string', 'max:500'],
            'tenant' => ['nullable', 'string', 'max:255'],
            'clear_secret' => ['nullable', 'boolean'],
        ]);

        $record = SocialProviderSetting::firstOrNew(['provider' => $provider]);
        $existingSecret = $record->client_secret;

        $clientId = trim((string) ($data['client_id'] ?? ''));
        $newSecret = trim((string) ($data['client_secret'] ?? ''));
        $tenant = trim((string) ($data['tenant'] ?? ''));
        if ($provider === 'cloudflare') {
            $tenant = SocialProviderSetting::normalizeCloudflareTeamDomain($tenant);
        } elseif ($provider === 'microsoft' && $tenant === '') {
            $tenant = 'common';
        }

        $record->enabled = (bool) $data['enabled'];
        $record->client_id = $clientId !== '' ? $clientId : null;
        if (! empty($data['clear_secret'])) {
            $record->client_secret = null;
        } elseif ($newSecret !== '') {
            $record->client_secret = $newSecret;
        } else {
            $record->client_secret = $existingSecret;
        }
        $record->tenant = $tenant !== '' ? $tenant : null;
        $record->updated_by = $request->user()?->id;
        $record->save();

        $name = SocialAuthController::PROVIDERS[$provider][0];

        return back()->with('success', "Configuración de {$name} guardada.");
    }
}
