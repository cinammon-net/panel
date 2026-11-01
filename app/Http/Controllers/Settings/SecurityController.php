<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    /**
     * Página de seguridad: sesiones activas del usuario.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/security', [
            'sessions' => $this->sessions($request),
            'loginHistory' => DB::table('login_logs')
                ->where('user_id', $request->user()->id)
                ->orderByDesc('id')
                ->limit(10)
                ->get()
                ->map(fn ($log) => [
                    'id' => $log->id,
                    'ip_address' => $log->ip_address,
                    'user_agent' => $this->formatAgent((string) $log->user_agent),
                    'created_at' => date('d/m/Y H:i', strtotime($log->created_at)),
                ])
                ->values()
                ->all(),
        ]);
    }

    /**
     * Cierra todas las sesiones excepto la actual.
     */
    public function logoutOtherSessions(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        Auth::logoutOtherDevices($request->input('password'));

        DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        return back()->with('status', 'other-sessions-closed');
    }

    private function sessions(Request $request): array
    {
        return DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_activity')
            ->get()
            ->map(fn ($session) => [
                'id' => substr((string) $session->id, 0, 8),
                'ip_address' => $session->ip_address,
                'user_agent' => $this->formatAgent((string) $session->user_agent),
                'last_activity' => date('d/m/Y H:i', (int) $session->last_activity),
                'is_current' => $session->id === $request->session()->getId(),
            ])
            ->values()
            ->all();
    }

    private function formatAgent(string $agent): string
    {
        $browser = match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'OPR/') => 'Opera',
            str_contains($agent, 'Chrome/') => 'Chrome',
            str_contains($agent, 'Safari/') => 'Safari',
            str_contains($agent, 'Firefox/') => 'Firefox',
            default => 'Navegador desconocido',
        };

        $os = match (true) {
            str_contains($agent, 'Windows') => 'Windows',
            str_contains($agent, 'Mac OS X') => 'macOS',
            str_contains($agent, 'Android') => 'Android',
            str_contains($agent, 'iPhone'), str_contains($agent, 'iPad') => 'iOS',
            str_contains($agent, 'Linux') => 'Linux',
            default => 'SO desconocido',
        };

        return "{$browser} · {$os}";
    }
}
