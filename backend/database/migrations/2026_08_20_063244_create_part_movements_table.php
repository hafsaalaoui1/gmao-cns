<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // database/migrations/xxxx_xx_xx_create_part_movements_table.php
public function up(): void
{
    Schema::create('part_movements', function (Blueprint $table) {
        $table->id();
        $table->foreignId('part_id')->constrained()->onDelete('cascade');
        $table->enum('type', ['entree', 'sortie']);
        $table->integer('quantity');
        $table->string('reason');
        $table->foreignId('intervention_id')->nullable()->constrained()->onDelete('set null');
        $table->foreignId('user_id')->constrained('users');
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('part_movements');
    }
};
