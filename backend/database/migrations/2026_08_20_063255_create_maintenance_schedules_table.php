<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('maintenance_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipments')->onDelete('cascade');
            $table->enum('day_of_week', ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']);
            $table->enum('frequency', ['hebdomadaire', 'bimensuelle', 'mensuelle', 'trimestrielle', 'annuelle'])->default('hebdomadaire');
            $table->time('preferred_time')->nullable();
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('maintenance_schedules');
    }
};