<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            if (!Schema::hasColumn('posts', 'author_id')) {
                $table->foreignId('author_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('posts', 'category')) {
                $table->string('category', 50)->default('actualizacion')->after('title');
            }
            if (!Schema::hasColumn('posts', 'summary')) {
                $table->string('summary', 500)->nullable()->after('category');
            }
            if (!Schema::hasColumn('posts', 'is_pinned')) {
                $table->boolean('is_pinned')->default(false)->after('summary');
            }
            if (!Schema::hasColumn('posts', 'views_count')) {
                $table->unsignedInteger('views_count')->default(0)->after('picture');
            }
            if (!Schema::hasColumn('posts', 'likes_count')) {
                $table->unsignedInteger('likes_count')->default(0)->after('views_count');
            }
        });

        // Tabla de reacciones/likes por usuario y sesión para evitar likes duplicados
        if (!Schema::hasTable('post_likes')) {
            Schema::create('post_likes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('post_id')->constrained('posts')->cascadeOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->cascadeOnDelete();
                $table->string('ip_address', 45)->nullable();
                $table->timestamps();

                $table->unique(['post_id', 'user_id']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('post_likes');

        Schema::table('posts', function (Blueprint $table) {
            $cols = ['author_id', 'category', 'summary', 'is_pinned', 'views_count', 'likes_count'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('posts', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
