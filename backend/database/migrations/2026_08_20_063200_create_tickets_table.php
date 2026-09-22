<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipments')->onDelete('cascade');
            $table->foreignId('declared_by')->constrained('users');
            $table->timestamp('declared_date')->useCurrent();
            $table->text('description');
            $table->enum('priority', ['faible', 'normale', 'elevée', 'urgente'])->default('normale');
            $table->enum('status', ['nouveau', 'assigne', 'en_cours', 'en_attente', 'resolu', 'cloture'])->default('nouveau');
            $table->text('diagnostic')->nullable();
            $table->text('solution')->nullable();
            $table->json('parts_used')->nullable();
            $table->timestamp('resolution_date')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tickets');
    }
};