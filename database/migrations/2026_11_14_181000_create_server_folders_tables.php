<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('server_folders')) {
            Schema::create('server_folders', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('parent_id')->nullable()->constrained('server_folders')->cascadeOnDelete();
                $table->string('name', 100);
                $table->string('color', 30)->nullable();
                $table->string('icon', 50)->nullable();
                $table->timestamps();

                $table->index(['user_id', 'parent_id']);
            });
        }

        if (!Schema::hasTable('server_folder_members')) {
            Schema::create('server_folder_members', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('folder_id')->constrained('server_folders')->cascadeOnDelete();
                $table->foreignId('server_id')->constrained('servers')->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['user_id', 'server_id']);
                $table->index(['user_id', 'folder_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('server_folder_members');
        Schema::dropIfExists('server_folders');
    }
};
