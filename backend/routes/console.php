<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Notifications des interventions prévues aujourd'hui
|--------------------------------------------------------------------------
| Envoie les notifications chaque jour à 08:00 aux intervenants
| concernés par les interventions prévues ce jour.
*/
Schedule::command('app:send-daily-intervention-notifications')
    ->dailyAt('08:00');

/*
|--------------------------------------------------------------------------
| Notifications des interventions en retard
|--------------------------------------------------------------------------
| Vérifie chaque minute si une intervention prévue est dépassée
| et n'a pas encore été commencée.
*/
Schedule::command('app:send-late-intervention-notifications')
    ->everyMinute();