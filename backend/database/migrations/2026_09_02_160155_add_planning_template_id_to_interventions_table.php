<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interventions', function (Blueprint $table) {
            $table->foreignId('planning_template_id')
                ->nullable()
                ->constrained('planning_templates')
                ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('interventions', function (Blueprint $table) {
            $table->dropForeign(['planning_template_id']);
            $table->dropColumn('planning_template_id');
        });
    }
};