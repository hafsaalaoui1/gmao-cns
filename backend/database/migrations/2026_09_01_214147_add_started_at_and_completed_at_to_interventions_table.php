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
    Schema::table('interventions', function (Blueprint $table) {
        $table->timestamp('started_at')->nullable()->after('status');
        $table->timestamp('completed_at')->nullable()->after('started_at');
    });
}
    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('interventions', function (Blueprint $table) {
            //
        });
    }
};
