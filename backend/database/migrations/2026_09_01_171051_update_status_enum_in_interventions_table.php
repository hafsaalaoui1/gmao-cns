<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up()
    {
        // Pour modifier un ENUM, il faut le recréer (ou utiliser une requête brute)
        DB::statement("ALTER TABLE interventions MODIFY status ENUM('en_attente', 'planifiee', 'en_cours', 'terminee', 'validee', 'cloturee', 'en_retard', 'annulee') NOT NULL DEFAULT 'en_attente'");
    }

    public function down()
    {
        DB::statement("ALTER TABLE interventions MODIFY status ENUM('planifiee', 'en_cours', 'terminee', 'cloturee') NOT NULL DEFAULT 'planifiee'");
    }
};