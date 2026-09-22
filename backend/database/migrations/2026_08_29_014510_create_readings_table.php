<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipments')->onDelete('cascade');
            $table->foreignId('template_id')->constrained('equipment_reading_templates')->onDelete('cascade');
            $table->foreignId('intervention_id')->nullable()->constrained('interventions')->onDelete('set null');
            $table->json('values');
            $table->text('commentaire')->nullable();
            $table->enum('validation_status', ['brouillon', 'en_attente', 'valide', 'rejete', 'modifications_demandees'])->default('brouillon');
            $table->text('validation_commentaire')->nullable();
            $table->foreignId('taken_by')->constrained('users');
            $table->timestamp('taken_at')->useCurrent();
            $table->foreignId('validated_by')->nullable()->constrained('users');
            $table->timestamp('validated_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('readings');
    }
};