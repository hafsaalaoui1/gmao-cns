<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('planning_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planning_template_id')->constrained()->onDelete('cascade');
            $table->date('exception_date');
            $table->foreignId('group_id_override')->nullable()->constrained('groups')->onDelete('set null');
            $table->enum('status_override', ['annulee', 'reportee'])->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('planning_exceptions');
    }
};