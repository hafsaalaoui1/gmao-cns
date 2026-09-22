<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class UserCreatedNotification extends Notification
{
    use Queueable;

    protected $user;
    protected $password;

    public function __construct($user, $password)
    {
        $this->user = $user;
        $this->password = $password;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('Bienvenue sur GMAO CNS - Vos accès')
            ->greeting('Bonjour ' . $this->user->name . ' !')
            ->line('Votre compte a été créé avec succès sur la plateforme GMAO CNS.')
            ->line('Voici vos identifiants de connexion :')
            ->line('**Email :** ' . $this->user->email)
            ->line('**Mot de passe :** ' . $this->password)
            ->action('Se connecter', url('http://localhost:3000/login'))
            ->line('Nous vous recommandons de changer votre mot de passe lors de votre première connexion.')
            ->line('Cordialement,')
            ->line('**Office National des Aéroports - Service Radar & Radionavigation**')
            ->salutation('L\'équipe GMAO CNS');
    }
}