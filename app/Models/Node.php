<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Node extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
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
        'uuid'
    ];
}
