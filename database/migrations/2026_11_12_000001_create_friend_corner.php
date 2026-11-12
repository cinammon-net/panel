<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Dedicatoria del Owner que sale en el reverso del carné de cada amigo.
        Schema::table('role_grants', function (Blueprint $table) {
            if (! Schema::hasColumn('role_grants', 'dedication')) {
                $table->string('dedication', 280)->nullable();
            }
        });

        // Rincón de Amigos: notas del muro (las ven todos los amigos) y deseos (solo quien lo pide y el Owner).
        if (! Schema::hasTable('friend_posts')) {
            Schema::create('friend_posts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('kind', 10);              // note | wish
                $table->string('body', 280);
                $table->string('color', 10)->nullable();  // color del pósit
                $table->timestamp('granted_at')->nullable(); // deseo concedido por el Owner
                $table->string('reply', 280)->nullable();     // respuesta del Owner al deseo
                $table->timestamps();
                $table->index(['kind', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('friend_posts');
        Schema::table('role_grants', function (Blueprint $table) {
            $table->dropColumn('dedication');
        });
    }
};
