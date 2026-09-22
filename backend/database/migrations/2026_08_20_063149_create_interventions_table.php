<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('interventions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipments')->onDelete('cascade');
            $table->enum('type', ['preventive', 'corrective']);
            $table->date('scheduled_date');
            $table->time('scheduled_time');
            $table->integer('duration')->nullable();
            $table->enum('priority', ['faible', 'normale', 'elevée', 'urgente'])->default('normale');
            $table->enum('status', ['planifiee', 'en_cours', 'terminee', 'cloturee'])->default('planifiee');
            $table->foreignId('group_id')->nullable()->constrained('groups')->onDelete('set null');
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('created_by')->constrained('users');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('interventions');
    }
};