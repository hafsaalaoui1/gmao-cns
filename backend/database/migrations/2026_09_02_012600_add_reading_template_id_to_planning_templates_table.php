<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::table('planning_templates', function (Blueprint $table) {
        $table->foreignId('reading_template_id')->nullable()->constrained('equipment_reading_templates')->onDelete('set null');
    });
}

public function down()
{
    Schema::table('planning_templates', function (Blueprint $table) {
        $table->dropForeign(['reading_template_id']);
        $table->dropColumn('reading_template_id');
    });
}
};
