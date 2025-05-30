<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Egg extends Model
{
    protected $table = 'eggs';

    protected $fillable = [
        'uuid',
        'author',
        'name',
        'description',
        'category',
        'startup',
        'config_from',
        'config_stop',
        'config_logs',
        'config_startup',
        'config_files',
        'script_install',
        'script_is_privileged',
        'script_entry',
        'script_container',
        'copy_script_from',
        'features',
        'docker_images',
        'update_url',
        'file_denylist',
        'force_outgoing_ip',
        'tags',
    ];

    public function servers(): HasMany
    {
        return $this->hasMany(Server::class, 'egg_id');
    }

    public function variables(): HasMany
    {
        return $this->hasMany(EggVariable::class, 'egg_id');
    }
}
