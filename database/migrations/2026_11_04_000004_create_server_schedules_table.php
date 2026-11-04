<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('server_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained('servers')->cascadeOnDelete();
            $table->string('action', 20)->default('restart');
            $table->string('time', 5); // HH:MM, hora de Madrid
            $table->json('days')->nullable(); // 0=domingo ... 6=sábado; null = todos los días
            $table->boolean('warn')->default(true);
            $table->boolean('enabled')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->timestamps();
            $table->unique(['server_id', 'action']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_schedules');
    }
};
