<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('server_databases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('server_id')->constrained('servers')->cascadeOnDelete();
            $table->string('database', 64)->unique();
            $table->string('username', 32)->unique();
            $table->text('password'); // cifrada con la APP_KEY
            $table->string('remote', 64)->default('172.18.%');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_databases');
    }
};
