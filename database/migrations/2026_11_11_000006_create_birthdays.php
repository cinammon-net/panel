<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Solo día y mes: no hace falta el año (ni la edad) para felicitar.
            if (! Schema::hasColumn('users', 'birthday_day')) {
                $table->unsignedTinyInteger('birthday_day')->nullable();
                $table->unsignedTinyInteger('birthday_month')->nullable();
                $table->timestamp('birthday_set_at')->nullable();
                $table->boolean('birthday_public')->default(true);
            }
        });

        if (! Schema::hasTable('birthday_celebrations')) {
            Schema::create('birthday_celebrations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->unsignedSmallInteger('year');
                $table->json('gifts')->nullable();      // lo que se le ha regalado (null = sin regalo)
                $table->string('no_gift_reason', 120)->nullable();
                $table->json('wishes')->nullable();     // [{discord_id, name, at}]
                $table->timestamp('seen_at')->nullable(); // cuando abrió la sorpresa en el panel
                $table->timestamp('card_sent_at')->nullable(); // correo con las felicitaciones recibidas
                $table->timestamps();
                $table->unique(['user_id', 'year']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('birthday_celebrations');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['birthday_day', 'birthday_month', 'birthday_set_at', 'birthday_public']);
        });
    }
};
