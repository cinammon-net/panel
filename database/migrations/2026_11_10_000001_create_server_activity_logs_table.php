<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('server_activity_logs')) {
            return;
        }
        Schema::create('server_activity_logs', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('server_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('user_name', 120)->nullable();
            $table->string('user_email', 190)->nullable();
            $table->string('user_avatar', 500)->nullable();
            $table->string('source', 16)->default('panel'); // panel | sftp | wings
            $table->string('action', 80);
            $table->string('description', 600);
            $table->string('ip', 45)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['server_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_activity_logs');
    }
};
