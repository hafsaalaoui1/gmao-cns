<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_rotations', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // ex: "Rotation A-B-C"
            $table->text('groups_order'); // stocké en JSON: [1,2,3] ou ["Groupe A","Groupe B","Groupe C"]
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_rotations');
    }
};