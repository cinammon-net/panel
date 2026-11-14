<?php

namespace App\Models;

use App\Services\Daemon\WingsClient;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBoosterCore extends Model
{
    protected $connection = 'bot_server';
    protected $table = 'user_booster_cores';

    protected $fillable = [
        'user_id',
        'discord_id',
        'mode',
        'target_server_id',
        'allocated_server_id',
        'boost_active',
        'boost_since',
        'last_reassigned_at',
        'extra_ram',
        'extra_cpu',
        'extra_disk',
    ];

    protected $casts = [
        'boost_active' => 'boolean',
        'boost_since' => 'datetime',
        'last_reassigned_at' => 'datetime',
        'extra_ram' => 'integer',
        'extra_cpu' => 'integer',
        'extra_disk' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function targetServer(): BelongsTo
    {
        return $this->belongsTo(Server::class, 'target_server_id');
    }

    public function allocatedServer(): BelongsTo
    {
        return $this->belongsTo(Server::class, 'allocated_server_id');
    }

    /**
     * Aplica el Overclock a un servidor especifico.
     */
    public function applyOverclock(Server $server): void
    {
        // Revertir servidor previo si existia
        if ($this->target_server_id && $this->target_server_id !== $server->id) {
            $prev = Server::find($this->target_server_id);
            if ($prev && $prev->is_booster_overclocked) {
                $prev->memory = max(512, $prev->memory - $this->extra_ram);
                $prev->cpu = max(50, $prev->cpu - $this->extra_cpu);
                $prev->disk = max(1024, $prev->disk - $this->extra_disk);
                $prev->is_booster_overclocked = false;
                $prev->save();
            }
        }

        // Aplicar a nuevo servidor si no estaba ya aplicado
        if (!$server->is_booster_overclocked) {
            $server->memory += $this->extra_ram;
            $server->cpu += $this->extra_cpu;
            $server->disk += $this->extra_disk;
            $server->is_booster_overclocked = true;
            $server->save();
        }

        $this->mode = 'overclock';
        $this->target_server_id = $server->id;
        $this->last_reassigned_at = now();
        $this->save();
    }

    /**
     * Aplica el Escudo de Inmunidad a un servidor especifico.
     */
    public function applyShield(Server $server): void
    {
        // Retirar escudo del servidor previo si existia
        if ($this->target_server_id && $this->target_server_id !== $server->id) {
            $prev = Server::find($this->target_server_id);
            if ($prev && $prev->booster_shield) {
                $prev->booster_shield = false;
                $prev->save();
            }
        }

        $server->booster_shield = true;
        $server->save();

        $this->mode = 'shield';
        $this->target_server_id = $server->id;
        $this->last_reassigned_at = now();
        $this->save();
    }

    /**
     * Reasigna o reinicia el modo del nucleo.
     */
    public function resetCore(): void
    {
        if ($this->target_server_id) {
            $srv = Server::find($this->target_server_id);
            if ($srv) {
                if ($this->mode === 'overclock' && $srv->is_booster_overclocked) {
                    $srv->memory = max(512, $srv->memory - $this->extra_ram);
                    $srv->cpu = max(50, $srv->cpu - $this->extra_cpu);
                    $srv->disk = max(1024, $srv->disk - $this->extra_disk);
                    $srv->is_booster_overclocked = false;
                    $srv->save();
                } elseif ($this->mode === 'shield' && $srv->booster_shield) {
                    $srv->booster_shield = false;
                    $srv->save();
                }
            }
        }

        $this->mode = 'none';
        $this->target_server_id = null;
        $this->last_reassigned_at = now();
        $this->save();
    }
}
