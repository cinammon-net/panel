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
        // Otros campos que necesites agregar
    ];

    // Define las relaciones si las hay
    public function servers()
    {
        return $this->hasMany(Server::class);
    }
}
