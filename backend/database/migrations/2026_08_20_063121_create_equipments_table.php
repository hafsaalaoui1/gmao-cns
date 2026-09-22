<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // database/migrations/xxxx_xx_xx_create_equipments_table.php
public function up(): void
{
    Schema::create('equipments', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('type');
        $table->string('brand')->nullable();
        $table->string('model')->nullable();
        $table->string('serial_number')->unique()->nullable();
        $table->string('location')->nullable();
        $table->date('commissioning_date')->nullable();
        $table->enum('status', ['operationnel', 'en_maintenance', 'en_panne', 'hors_service', 'retire'])->default('operationnel');
        $table->string('maintenance_frequency')->nullable();
        $table->text('description')->nullable();
        $table->json('technical_docs')->nullable();
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipments');
    }
};
