<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('nodes', function (Blueprint $table) {
            $table->id();

            $table->boolean('public')->default(true);
            $table->string('name');
            $table->string('fqdn');
            $table->string('scheme')->default('https');

            $table->integer('memory')->nullable();
            $table->integer('memory_overallocate')->default(0);
            $table->integer('disk')->nullable();
            $table->integer('disk_overallocate')->default(0);

            $table->string('daemon_token')->nullable();
            $table->integer('daemon_listen')->default(8080);
            $table->integer('daemon_sftp')->default(2022);
            $table->string('daemon_base')->default('/var/lib/cinammon');

            $table->timestamps();

            $table->integer('upload_size')->default(100);
            $table->boolean('behind_proxy')->default(false);
            $table->text('description')->nullable();
            $table->boolean('maintenance_mode')->default(false);
            $table->boolean('deployments')->default(false);

            $table->uuid('uuid')->unique();
            $table->unsignedBigInteger('daemon_token_id')->nullable();
            $table->text('tags')->nullable();

            $table->integer('cpu')->nullable();
            $table->integer('cpu_overallocate')->default(0);
            $table->string('daemon_sftp_alias')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nodes');
    }
};
