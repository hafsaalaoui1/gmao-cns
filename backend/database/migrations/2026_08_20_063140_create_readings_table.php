<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_reading_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipments')->onDelete('cascade');
            $table->string('template_name');
            $table->string('template_type');
            $table->string('frequency')->default('hebdomadaire');
            $table->json('parameters');
            $table->json('signatures')->nullable();
            $table->json('annexes')->nullable();
            $table->foreignId('created_by')->constrained('users');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_reading_templates');
    }
};