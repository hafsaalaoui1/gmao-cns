<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class UserCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $userName;
    public string $userEmail;
    public string $password;

    public function __construct(
        string $userName,
        string $userEmail,
        string $password
    ) {
        $this->userName = $userName;
        $this->userEmail = $userEmail;
        $this->password = $password;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Votre compte GMAO CNS - ONDA'
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.user-created'
        );
    }

    public function attachments(): array
    {
        return [];
    }
}