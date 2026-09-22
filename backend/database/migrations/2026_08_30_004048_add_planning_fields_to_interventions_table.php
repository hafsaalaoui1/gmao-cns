<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
{
    Schema::table('interventions', function (Blueprint $table) {
        if (!Schema::hasColumn('interventions', 'maintenance_plan_id')) {
            $table->foreignId('maintenance_plan_id')->nullable()->constrained('maintenance_plans')->onDelete('set null');
        }
        if (!Schema::hasColumn('interventions', 'deadline')) {
            $table->date('deadline')->nullable();
        }
        if (!Schema::hasColumn('interventions', 'template_id')) {
            $table->foreignId('template_id')->nullable()->constrained('equipment_reading_templates')->onDelete('set null');
        }
    });
}
    public function down(): void
    {
        Schema::table('interventions', function (Blueprint $table) {
            $table->dropForeign(['maintenance_plan_id']);
            $table->dropColumn(['maintenance_plan_id', 'deadline', 'template_id']);
        });
    }
};