<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Dudas de la comunidad: preguntas públicas (con cuenta) que cualquiera puede responder.
        // También llegan de Discord: lo resuelto en #soporte se guarda aquí resumido y sin datos personales.
        if (! Schema::hasTable('community_questions')) {
            Schema::create('community_questions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('author_name', 80)->nullable();     // si viene de Discord sin cuenta vinculada
                $table->string('title', 140);
                $table->text('body')->nullable();
                $table->string('category', 20)->default('general');
                $table->string('source', 10)->default('web');      // web | discord
                $table->string('discord_thread_id', 25)->nullable()->unique();
                $table->unsignedBigInteger('best_answer_id')->nullable();
                $table->timestamp('solved_at')->nullable();
                $table->boolean('pinned')->default(false);
                $table->unsignedInteger('views')->default(0);
                $table->timestamps();
                $table->index(['category', 'created_at']);
            });
        }
        if (! Schema::hasTable('community_answers')) {
            Schema::create('community_answers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('question_id')->constrained('community_questions')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('author_name', 80)->nullable();
                $table->text('body');
                $table->string('source', 10)->default('web');      // web | discord | assistant
                $table->string('discord_message_id', 25)->nullable()->unique();
                $table->unsignedInteger('helpful')->default(0);
                $table->timestamps();
            });
        }
        if (! Schema::hasTable('community_votes')) {
            Schema::create('community_votes', function (Blueprint $table) {
                $table->foreignId('answer_id')->constrained('community_answers')->cascadeOnDelete();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->primary(['answer_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('community_votes');
        Schema::dropIfExists('community_answers');
        Schema::dropIfExists('community_questions');
    }
};
