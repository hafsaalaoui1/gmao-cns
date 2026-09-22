<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ajouter le groupe responsable au planning.
     */
    public function up(): void
    {
        Schema::table('planning_templates', function (Blueprint $table) {
            $table->foreignId('group_id')
                ->nullable()
                ->after('description')
                ->constrained('groups')
                ->nullOnDelete();
        });
    }

    /**
     * Annuler la modification.
     */
    public function down(): void
    {
        Schema::table('planning_templates', function (Blueprint $table) {
            $table->dropForeign(['group_id']);
            $table->dropColumn('group_id');
        });
    }
};