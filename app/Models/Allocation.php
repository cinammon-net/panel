<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Allocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'ip',
        'port',
        'alias',
        'node_id'
    ];

    // Define las relaciones si las hay
    public function servers()
    {
        return $this->hasMany(Server::class);
    }

    public function node()
    {
        return $this->belongsTo(Node::class);
    }

    /**
     * Host shown to customers instead of the node's real IP (client panel, Discord bot,
     * billing): config panel.public_host, e.g. play.cinammon.net. The allocation alias is a
     * free-text label customers can edit, so it is not used here. Admin pages keep $this->ip.
     * Loopback/private allocations are returned as-is.
     */
    public function publicHost(): string
    {
        $host = trim((string) config('panel.public_host', ''));
        $ip = (string) $this->ip;
        $isPublicIp = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;

        return ($host !== '' && $isPublicIp) ? $host : $ip;
    }

    public function publicAddress(): string
    {
        return $this->publicHost() . ':' . $this->port;
    }

}
