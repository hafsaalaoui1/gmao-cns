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
    Schema::table('maintenance_plans', function (Blueprint $table) {
        $table->string('reading_pdf_path')->nullable();
    });
}

public function down()
{
    Schema::table('maintenance_plans', function (Blueprint $table) {
        $table->dropColumn('reading_pdf_path');
    });
}
};
