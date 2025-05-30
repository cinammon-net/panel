<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('subusers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('server_id')->constrained()->onDelete('cascade');
            $table->string('permissions'); // Puedes usar 'text' si guardas muchos permisos
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subusers');
    }
};
