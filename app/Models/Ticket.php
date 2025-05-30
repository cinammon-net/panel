<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Ticket extends Model
{
    protected $fillable = ['subject', 'message', 'status', 'user_id'];

    public function messages()
    {
        return $this->hasMany(TicketMessage::class);
    }
}
