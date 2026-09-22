<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipments');
            $table->enum('type', ['preventive', 'corrective', 'inspection', 'control', 'other']);
            $table->enum('frequency', ['daily', 'weekly', 'monthly', 'yearly'])->nullable();
            $table->integer('day_of_week')->nullable();
            $table->integer('day_of_month')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->time('preferred_time')->nullable();
            $table->integer('duration')->nullable();
            $table->foreignId('group_id')->nullable()->constrained('groups');
            $table->enum('priority', ['faible', 'normale', 'elevée', 'urgente'])->default('normale');
            $table->enum('status', ['planifie', 'en_cours', 'termine', 'annule'])->default('planifie');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_plans');
    }
};