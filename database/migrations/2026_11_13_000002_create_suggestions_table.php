<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('suggestions')) {
            Schema::create('suggestions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('discord_id', 25)->nullable()->index();
                $table->string('author_name', 80);
                $table->string('title', 140);
                $table->text('what');
                $table->text('why')->nullable();
                $table->string('category', 25)->default('general');
                $table->string('status', 20)->default('pending'); // pending, review, accepted, done, rejected
                $table->text('staff_note')->nullable();
                $table->string('discord_thread_id', 25)->nullable()->unique();
                $table->string('discord_message_id', 25)->nullable();
                $table->unsignedInteger('upvotes')->default(0);
                $table->unsignedInteger('downvotes')->default(0);
                $table->integer('score')->default(0);
                $table->timestamp('status_updated_at')->nullable();
                $table->timestamps();

                $table->index(['status', 'score']);
                $table->index(['category', 'created_at']);
            });
        }

        if (! Schema::hasTable('suggestion_votes')) {
            Schema::create('suggestion_votes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('suggestion_id')->constrained('suggestions')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
                $table->string('discord_id', 25)->nullable()->index();
                $table->tinyInteger('direction')->default(1); // 1 = up, -1 = down
                $table->timestamps();

                $table->unique(['suggestion_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('suggestion_votes');
        Schema::dropIfExists('suggestions');
    }
};
