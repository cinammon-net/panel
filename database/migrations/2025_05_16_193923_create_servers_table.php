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
            $table->foreignId('allocation_id')->nullable()->constrained('allocations')->nullOnDelete();
            $table->string('name');
            $table->boolean('active');
            $table->foreignId('owner_id')->constrained('users')->onDelete('cascade');

            $table->unsignedInteger('memory') ->default(0);
            $table->unsignedInteger('swap') ->default(0);
            $table->unsignedInteger('disk') ->default(0);
            $table->unsignedInteger('io') ->default(0);
            $table->unsignedInteger('cpu') ->default(0);

            $table->foreignId('egg_id')->nullable()->constrained('eggs')->onDelete('set null');
            $table->text('startup');

            $table->boolean('run_install_script')->default(true);
            $table->boolean('start_after_install')->default(true);
            $table->boolean('cpu_pinning')->default(false);
            $table->string('swap_memory')->default('0');

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
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('servers');
    }
};
