<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TicketMessage extends Model
{
    protected $fillable = [
        'user_id',
        'ticket_id',
        'message',
        'sender_name',
        'sender_avatar',
        'reply_to_id',
    ];

    // Usuario que envió el mensaje
    public function sender()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Mensaje al que se respondió (reply)
    public function replyTo()
    {
        return $this->belongsTo(self::class, 'reply_to_id');
    }

    // Respuestas que tiene este mensaje
    public function replies()
    {
        return $this->hasMany(self::class, 'reply_to_id');
    }
}
