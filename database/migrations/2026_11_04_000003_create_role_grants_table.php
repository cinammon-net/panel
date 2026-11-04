<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('role_grants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role');
            // billing = rango comprado · auto = rol automático por lo contratado
            $table->string('source', 20);
            // Pedido de billing que lo concedió (billing-rank-123)
            $table->string('external_id', 60)->nullable()->unique();
            // Ventajas del rango: discount, backups, databases, allocations, priority
            $table->json('perks')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('role_grants');
    }
};
