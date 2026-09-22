<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    // database/migrations/xxxx_xx_xx_create_parts_table.php
public function up(): void
{
    Schema::create('parts', function (Blueprint $table) {
        $table->id();
        $table->string('reference')->unique();
        $table->string('name');
        $table->string('category')->nullable();
        $table->string('supplier')->nullable();
        $table->integer('quantity')->default(0);
        $table->integer('alert_threshold')->default(10);
        $table->string('location')->nullable();
        $table->decimal('unit_price', 10, 2)->nullable();
        $table->json('compatibility')->nullable(); // Équipements compatibles
        $table->timestamps();
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parts');
    }
};
