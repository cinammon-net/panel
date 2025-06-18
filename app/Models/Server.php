<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Server extends Model
{
    use HasFactory;

    protected $table = 'servers';

    protected $fillable = ['uuid', 'uuid_short', 'node_id', 'name', 'active', 'owner_id', 'memory', 'swap', 'disk', 'io', 'cpu', 'egg_id', 'oom_disabled', 'ip', 'port', 'service', 'option', 'startup', 'daemon_secret', 'username', 'installed_at', 'description', 'status', 'database_limit', 'allocation_limit', 'threads', 'backup_limit', 'docker_labels', 'allocation_id', 'primary_allocation', 'additional_allocations', 'run_install_script', 'start_after_install', 'bungee_version', 'bungee_jar_file', 'cpu_pinning', 'swap_memory'];

    protected $appends = ['short_uuid'];

    public function getShortUuidAttribute()
    {
        return substr($this->uuid, 0, 8);
    }

    public function egg()
    {
        return $this->belongsTo(Egg::class);
    }

    public function node()
    {
        return $this->belongsTo(Node::class, 'node_id');
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function allocation()
    {
        return $this->belongsTo(Allocation::class, 'allocation_id');
    }
}
