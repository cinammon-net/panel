<?php

namespace App\Console\Commands;

use App\Models\ServerSchedule;
use App\Services\Daemon\WingsClient;
use App\Support\MinecraftAddons;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * Ejecuta los reinicios programados. Lo lanza cada minuto el temporizador cinammon-panel-schedules
 * (deploy/schedules). Avisa en el chat 5 y 1 minutos antes y reinicia a la hora indicada (hora de Madrid).
 */
class RunServerSchedules extends Command
{
    protected $signature = 'servers:run-schedules';

    protected $description = 'Reinicios programados de los servidores (con avisos en el chat)';

    public function handle(WingsClient $wings): int
    {
        if (\App\Support\Panel::demoMode()) {
            return self::SUCCESS;
        }
        $now = Carbon::now('Europe/Madrid')->startOfMinute();

        foreach (ServerSchedule::with('server.egg', 'server.node')->where('enabled', true)->get() as $schedule) {
            $server = $schedule->server;
            if (! $server || ! preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $schedule->time)) {
                continue;
            }
            $target = $now->copy()->setTimeFromTimeString($schedule->time);
            $days = $schedule->days;
            $minutesLeft = (int) $now->diffInMinutes($target, false);
            if (! in_array($minutesLeft, [5, 1, 0], true)) {
                continue;
            }
            if (is_array($days) && $days !== [] && ! in_array($target->dayOfWeek, $days, true)) {
                continue;
            }

            try {
                $client = $wings->forServer($server)->timeout(10);
                if (($client->get('/servers/'.$server->uuid)->json('state')) !== 'running') {
                    continue;
                }
                $isMinecraft = MinecraftAddons::hasPlayerLists($server);
                if ($minutesLeft > 0) {
                    if ($schedule->warn && $isMinecraft) {
                        $text = $minutesLeft === 1 ? '1 minuto' : "{$minutesLeft} minutos";
                        $client->post('/servers/'.$server->uuid.'/commands', ['commands' => ["say §e[Cinammon] §fReinicio automático en §e{$text}§f."]]);
                    }
                    continue;
                }
                if ($schedule->last_run_at && $schedule->last_run_at->gt(now()->subMinutes(5))) {
                    continue;
                }
                if ($schedule->warn && $isMinecraft) {
                    $client->post('/servers/'.$server->uuid.'/commands', ['commands' => ['say §e[Cinammon] §fReiniciando el servidor...', 'save-all']]);
                    sleep(3);
                }
                $client->post('/servers/'.$server->uuid.'/power', ['action' => 'restart'])->throw();
                $schedule->forceFill(['last_run_at' => now()])->save();
                $this->info("Reiniciado {$server->name} ({$server->uuid})");
            } catch (\Throwable $e) {
                $this->warn("{$server->name}: {$e->getMessage()}");
            }
        }

        return self::SUCCESS;
    }
}
