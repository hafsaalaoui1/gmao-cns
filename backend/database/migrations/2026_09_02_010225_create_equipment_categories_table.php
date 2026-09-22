<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable();
            $table->text('description')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('equipment_categories')->onDelete('cascade');
            $table->integer('order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Ajouter la colonne category_id à la table equipments
        Schema::table('equipments', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->constrained('equipment_categories')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('equipments', function (Blueprint $table) {
            $table->dropForeign(['category_id']);
            $table->dropColumn('category_id');
        });
        Schema::dropIfExists('equipment_categories');
    }
};