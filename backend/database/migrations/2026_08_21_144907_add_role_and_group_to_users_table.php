<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'role')) {
                $table->enum('role', ['admin', 'responsable', 'intervenant'])->default('intervenant');
            }
            if (!Schema::hasColumn('users', 'group_id')) {
                $table->foreignId('group_id')->nullable();
                $table->foreign('group_id')->references('id')->on('groups')->onDelete('set null');
            }
            if (!Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'group_id', 'is_active']);
        });
    }
};
