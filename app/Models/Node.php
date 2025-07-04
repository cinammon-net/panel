<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Node extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'online',
        'fqdn',
        'daemon_listen',
        'scheme',
        'maintenance_mode',
        'deployments',
        'upload_size',
        'daemon_sftp',
        'daemon_sftp_alias',
        'tags',
        'memory',
        'disk',
        'cpu',
        'uuid',
        'daemon_token_id',
        'daemon_token'
    ];

    public function servers()
    {
        return $this->hasMany(Server::class);
    }

    public function allocations()
    {
        return $this->hasMany(\App\Models\Allocation::class);
    }
}
