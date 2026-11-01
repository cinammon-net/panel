<?php

namespace App\Listeners;

use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\DB;

class RecordLogin
{
    public function handle(Login $event): void
    {
        DB::table('login_logs')->insert([
            'user_id' => $event->user->getAuthIdentifier(),
            'ip_address' => request()->ip(),
            'user_agent' => substr((string) request()->userAgent(), 0, 500),
            'created_at' => now(),
        ]);

        // Conserva solo los últimos 20 accesos por usuario
        $ids = DB::table('login_logs')
            ->where('user_id', $event->user->getAuthIdentifier())
            ->orderByDesc('id')
            ->skip(20)
            ->take(100)
            ->pluck('id');

        if ($ids->isNotEmpty()) {
            DB::table('login_logs')->whereIn('id', $ids)->delete();
        }
    }
}
