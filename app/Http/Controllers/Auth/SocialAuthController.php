<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\SocialProviderSetting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * Entrar, registrarse y vincular la cuenta con Discord, Google, Microsoft, GitHub, GitLab o Twitch.
 *
 * - Con la sesión iniciada: vincula el proveedor a tu cuenta (Ajustes → Perfil).
 * - Sin sesión: entra con la cuenta que ya tiene ese proveedor vinculado; si no hay
 *   ninguna, se vincula a la cuenta con el mismo correo solo si el proveedor lo ha
 *   verificado; si tampoco existe, se crea una cuenta nueva.
 */
class SocialAuthController extends Controller
{
    /** proveedor => [nombre, permisos] */
    public const PROVIDERS = [
        'discord' => ['Discord', ['identify', 'email', 'guilds.members.read']],
        'google' => ['Google', ['openid', 'profile', 'email']],
        'microsoft' => ['Microsoft', ['User.Read']],
        'github' => ['GitHub', ['read:user', 'user:email']],
        'cloudflare' => ['Cloudflare', ['openid', 'email', 'profile']],
        'gitlab' => ['GitLab', ['read_user']],
        'twitch' => ['Twitch', ['user:read:email']],
    ];

    /** Proveedores activos y con credenciales válidas (BD o .env). */
    public static function enabled(): array
    {
        $list = [];
        foreach (self::PROVIDERS as $key => [$name]) {
            if (SocialProviderSetting::resolveFor($key)['ready']) {
                $list[] = ['key' => $key, 'name' => $name];
            }
        }

        return $list;
    }

    public function redirect(Request $request, string $provider): RedirectResponse
    {
        $this->ensureEnabled($provider);
        $request->session()->put('social.intent', Auth::check() ? 'link' : 'login');

        if ($provider === 'cloudflare') {
            return $this->cloudflareRedirect($request);
        }

        return $this->driver($provider)->scopes(self::PROVIDERS[$provider][1])->redirect();
    }

    public function callback(Request $request, string $provider): RedirectResponse
    {
        $this->ensureEnabled($provider);
        $intent = $request->session()->pull('social.intent', 'login');
        $back = $intent === 'link' ? route('profile.edit') : route('login');

        try {
            $social = $provider === 'cloudflare'
                ? $this->cloudflareUser($request)
                : $this->driver($provider)->user();
        } catch (Throwable $e) {
            report($e);

            return redirect($back)->withErrors(['social' => 'No se pudo completar el acceso con '.self::PROVIDERS[$provider][0].'. Inténtalo de nuevo.']);
        }

        if ($provider === 'discord' && ($problem = $this->discordGate($social))) {
            return redirect($back)->withErrors(['social' => $problem]);
        }

        $column = $provider.'_id';
        $id = (string) $social->getId();
        $email = strtolower(trim((string) $social->getEmail()));
        $owner = User::where($column, $id)->first();

        // 1) Vincular a la cuenta con la sesión iniciada
        if ($intent === 'link' && ($user = $request->user())) {
            if ($owner && $owner->id !== $user->id) {
                return redirect($back)->withErrors(['social' => 'Esa cuenta de '.self::PROVIDERS[$provider][0].' ya está vinculada a otro usuario.']);
            }
            $this->attach($user, $provider, $social);

            return redirect($back)->with('success', self::PROVIDERS[$provider][0].' vinculado.');
        }

        // 2) Ya vinculada: entrar
        if ($owner) {
            $this->attach($owner, $provider, $social);

            return $this->login($request, $owner);
        }

        // 3) Mismo correo verificado por el proveedor: vincular y entrar
        $verified = $email !== '' && $this->emailVerified($provider, $social);
        if ($email !== '' && ($existing = User::whereRaw('LOWER(email) = ?', [$email])->first())) {
            if (! $verified) {
                return redirect($back)->withErrors(['social' => 'Ya hay una cuenta con ese correo. Entra con tu contraseña y vincula '.self::PROVIDERS[$provider][0].' desde tu perfil.']);
            }
            $this->attach($existing, $provider, $social);

            return $this->login($request, $existing);
        }

        // 4) Cuenta nueva
        if ($email === '') {
            return redirect(route('register'))->withErrors(['social' => self::PROVIDERS[$provider][0].' no nos ha dado un correo. Regístrate con correo y contraseña y vincúlalo después.']);
        }
        $user = new User([
            'name' => Str::limit(trim((string) ($social->getName() ?: $social->getNickname() ?: Str::before($email, '@'))), 60, ''),
            'email' => $email,
            'password' => Str::random(40), // se cifra solo; puede ponerse una con "¿Olvidaste tu contraseña?"
        ]);
        if ($verified) {
            $user->email_verified_at = now();
        }
        $user->save();
        $this->attach($user, $provider, $social);

        return $this->login($request, $user);
    }

    public function unlink(Request $request, string $provider): RedirectResponse
    {
        abort_unless(isset(self::PROVIDERS[$provider]), 404);
        $request->user()->forceFill([$provider.'_id' => null])->save();

        return back()->with('success', self::PROVIDERS[$provider][0].' desvinculado.');
    }

    /* ------------------------------------------------------------------ */

    private function ensureEnabled(string $provider): void
    {
        abort_unless(in_array($provider, array_column(self::enabled(), 'key'), true), 404);
    }

    private function driver(string $provider)
    {
        $cfg = SocialProviderSetting::resolveFor($provider);
        config([
            "services.$provider.client_id" => $cfg['client_id'],
            "services.$provider.client_secret" => $cfg['client_secret'],
            "services.$provider.redirect" => $cfg['redirect'],
        ]);
        if ($provider === 'microsoft') {
            config(['services.microsoft.tenant' => $cfg['tenant'] ?: 'common']);
        }

        return Socialite::driver($provider);
    }

    private function cloudflareRedirect(Request $request): RedirectResponse
    {
        $cfg = SocialProviderSetting::resolveFor('cloudflare');
        $state = Str::random(40);
        $request->session()->put('social.cf_state', $state);

        $query = http_build_query([
            'client_id' => $cfg['client_id'],
            'redirect_uri' => $cfg['redirect'],
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
        ]);

        return redirect()->away("{$cfg['tenant']}/cdn-cgi/access/sso/oidc/{$cfg['client_id']}/authorization?{$query}");
    }

    private function cloudflareUser(Request $request): object
    {
        $expected = (string) $request->session()->pull('social.cf_state', '');
        $state = (string) $request->query('state', '');
        if ($expected === '' || ! hash_equals($expected, $state)) {
            throw new \RuntimeException('Invalid Cloudflare OIDC state.');
        }
        $code = (string) $request->query('code', '');
        if ($code === '') {
            throw new \RuntimeException('Missing Cloudflare OIDC code.');
        }

        $cfg = SocialProviderSetting::resolveFor('cloudflare');
        $base = "{$cfg['tenant']}/cdn-cgi/access/sso/oidc/{$cfg['client_id']}";

        $tokenRes = Http::asForm()->acceptJson()->timeout(10)->post("{$base}/token", [
            'grant_type' => 'authorization_code',
            'client_id' => $cfg['client_id'],
            'client_secret' => $cfg['client_secret'],
            'redirect_uri' => $cfg['redirect'],
            'code' => $code,
        ]);
        if (! $tokenRes->successful() || blank($tokenRes->json('access_token'))) {
            throw new \RuntimeException('Cloudflare OIDC token exchange failed.');
        }

        $userRes = Http::withToken((string) $tokenRes->json('access_token'))->acceptJson()->timeout(10)->get("{$base}/userinfo");
        if (! $userRes->successful()) {
            throw new \RuntimeException('Cloudflare OIDC userinfo failed.');
        }

        $raw = (array) $userRes->json();
        $id = (string) ($raw['sub'] ?? '');
        if ($id === '') {
            throw new \RuntimeException('Cloudflare OIDC userinfo missing sub.');
        }

        return new class($id, $raw)
        {
            public array $user;

            public function __construct(private string $id, array $raw)
            {
                $this->user = $raw;
            }

            public function getId(): string
            {
                return $this->id;
            }

            public function getEmail(): ?string
            {
                return $this->user['email'] ?? null;
            }

            public function getName(): ?string
            {
                return $this->user['name'] ?? ($this->user['email'] ?? null);
            }

            public function getNickname(): ?string
            {
                return $this->user['preferred_username'] ?? null;
            }

            public function getAvatar(): ?string
            {
                return $this->user['picture'] ?? null;
            }
        };
    }

    private function attach(User $user, string $provider, $social): void
    {
        $user->forceFill([$provider.'_id' => (string) $social->getId()]);
        if (blank($user->getAttributes()['avatar'] ?? null) && $social->getAvatar()) {
            $user->avatar = $social->getAvatar();
        }
        $user->save();
    }

    /**
     * Discord: solo quien está en el servidor de la comunidad y se ha verificado (rol Miembro).
     * Devuelve el motivo si no puede entrar, o null si todo está bien.
     */
    private function discordGate($social): ?string
    {
        $guild = (string) config('services.discord.guild_id');
        if ($guild === '') {
            return null;
        }
        $invite = \App\Support\Discord::invite();
        try {
            $res = Http::withToken((string) $social->token)->acceptJson()->timeout(6)
                ->get("https://discord.com/api/v10/users/@me/guilds/{$guild}/member");
        } catch (Throwable $e) {
            report($e);

            return 'No se pudo comprobar tu cuenta de Discord. Inténtalo de nuevo en un momento.';
        }
        if ($res->status() === 404) {
            return "Primero entra en nuestro Discord ({$invite}) y verifícate en #verificación; después podrás entrar con Discord.";
        }
        if (! $res->successful()) {
            return 'No se pudo comprobar tu cuenta de Discord. Inténtalo de nuevo en un momento.';
        }
        $role = (string) config('services.discord.verified_role');
        if ($role !== '' && ! in_array($role, (array) $res->json('roles', []), true)) {
            return 'Ya estás en nuestro Discord, pero aún no te has verificado. Pulsa "Verificarme" en #verificación y vuelve a intentarlo.';
        }

        return null;
    }

    /** Solo se une a una cuenta existente por correo si el proveedor confirma que el correo es suyo. */
    private function emailVerified(string $provider, $social): bool
    {
        $raw = (array) ($social->user ?? []);

        return match ($provider) {
            'discord' => ($raw['verified'] ?? false) === true,
            'google' => ($raw['email_verified'] ?? $raw['verified_email'] ?? false) == true,
            'github' => true, // Socialite usa el correo principal verificado de GitHub
            'gitlab' => filled($raw['confirmed_at'] ?? null),
            'twitch' => true, // Twitch solo entrega correos verificados
            'cloudflare' => true, // Cloudflare Access OIDC entrega identidad verificada por su IdP
            // Microsoft: en cuentas de empresa la organización puede poner cualquier correo; no se usa para unir cuentas.
            'microsoft' => false,
            default => false,
        };
    }

    private function login(Request $request, User $user): RedirectResponse
    {
        Auth::login($user, true);
        $request->session()->regenerate();

        return redirect()->intended(route('dashboard', absolute: false));
    }
}
