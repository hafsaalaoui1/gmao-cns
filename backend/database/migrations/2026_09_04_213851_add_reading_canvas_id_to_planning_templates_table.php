<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('planning_templates', function (Blueprint $table) {
            $table->foreign('reading_canvas_id')
                ->references('id')
                ->on('equipment_reading_templates')
                ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('planning_templates', function (Blueprint $table) {
            $table->dropForeign(['reading_canvas_id']);
        });
    }
};