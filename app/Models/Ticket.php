<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;

class Ticket extends Model
{
    protected $fillable = ['subject', 'message', 'status', 'user_id', 'category', 'server_id', 'claimed_by', 'rating'];

    public function server()
    {
        return $this->belongsTo(Server::class);
    }

    public function messages()
    {
        return $this->hasMany(TicketMessage::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
