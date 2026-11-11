<?php

namespace App\Mail;

use Illuminate\Notifications\Messages\MailMessage;

/** Correo de "he olvidado mi contraseña" en español. */
class ResetPasswordMail
{
    public static function build(object $notifiable, string $token): MailMessage
    {
        $url = url(route('password.reset', ['token' => $token, 'email' => $notifiable->getEmailForPasswordReset()], false));
        $minutes = config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60);

        return (new MailMessage)
            ->subject('Restablecer tu contraseña de Cinammon Network')
            ->greeting('Hola, '.($notifiable->name ?? '').'.')
            ->line('Hemos recibido una solicitud para cambiar la contraseña de tu cuenta.')
            ->action('Elegir una contraseña nueva', $url)
            ->line("El enlace caduca en {$minutes} minutos.")
            ->line('Si no lo has pedido tú, ignora este correo: tu contraseña no cambiará.')
            ->salutation('El equipo de Cinammon Network');
    }
}
