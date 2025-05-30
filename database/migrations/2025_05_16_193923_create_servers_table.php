<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('servers', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->string('uuid_short')->unique();

            $table->foreignId('node_id')->constrained('nodes')->onDelete('cascade');
            $table->string('name');
            $table->boolean('active');
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');

            $table->unsignedInteger('memory');
            $table->unsignedInteger('swap');
            $table->unsignedInteger('disk');
            $table->unsignedInteger('io');
            $table->unsignedInteger('cpu');

            $table->foreignId('egg_id')->nullable()->constrained('eggs')->onDelete('set null');
            $table->text('startup');

            $table->timestamps();

            $table->text('image')->nullable();
            $table->text('description')->nullable();
            $table->boolean('skip_scripts')->default(false);
            $table->string('external_id')->nullable();

            $table->unsignedInteger('database_limit')->default(0);
            $table->unsignedInteger('allocation_limit')->default(0);
            $table->unsignedInteger('threads')->default(0);
            $table->unsignedInteger('backup_limit')->default(0);

            $table->boolean('status')->default(false);
            $table->timestamp('installed_at')->nullable();
            $table->boolean('oom_killer')->default(false);
            $table->json('docker_labels')->nullable();

            $table->unsignedInteger('allocation_id')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servers');
    }
};
