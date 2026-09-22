<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('interventions', function (Blueprint $table) {

            $table->text('diagnostic')
                ->nullable()
                ->after('description');

            $table->text('actions')
                ->nullable()
                ->after('diagnostic');

            $table->text('observations')
                ->nullable()
                ->after('actions');

            $table->json('parts_used')
                ->nullable()
                ->after('observations');
        });
    }

    public function down(): void
    {
        Schema::table('interventions', function (Blueprint $table) {

            $table->dropColumn([
                'diagnostic',
                'actions',
                'observations',
                'parts_used',
            ]);
        });
    }
};