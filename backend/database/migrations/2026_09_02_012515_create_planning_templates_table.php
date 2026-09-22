<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planning_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipments')->onDelete('cascade');
            $table->integer('day_of_week'); // 1=lundi, 7=dimanche (on vérifie en PHP)
            $table->time('start_time')->default('09:00:00');
            $table->integer('duration')->default(60); // en minutes
            $table->string('type')->default('preventive');
            $table->enum('priority', ['faible', 'normale', 'elevée', 'urgente'])->default('normale');
            $table->text('description')->nullable();
            $table->foreignId('group_rotation_id')->nullable()->constrained('group_rotations')->onDelete('set null');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->constrained('users');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planning_templates');
    }
};