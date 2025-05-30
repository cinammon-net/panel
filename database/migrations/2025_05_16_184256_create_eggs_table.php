<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('eggs', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36);
            $table->string('author');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category')->nullable(); // categoría del egg
            $table->timestamps();

            $table->text('startup')->nullable();
            $table->unsignedBigInteger('config_from')->nullable();
            $table->text('config_stop')->nullable();
            $table->text('config_logs')->nullable();
            $table->text('config_startup')->nullable();
            $table->longText('config_files')->nullable();

            $table->longText('script_install')->nullable();
            $table->boolean('script_is_privileged')->default(false);
            $table->text('script_entry')->nullable();
            $table->text('script_container')->nullable();

            $table->unsignedBigInteger('copy_script_from')->nullable();
            $table->longText('features')->nullable();
            $table->longText('docker_images')->nullable();
            $table->text('update_url')->nullable();
            $table->longText('file_denylist')->nullable();
            $table->boolean('force_outgoing_ip')->nullable();
            $table->text('tags')->nullable();

            // Foreign keys (opcional)
            // $table->foreign('config_from')->references('id')->on('eggs')->nullOnDelete();
            // $table->foreign('copy_script_from')->references('id')->on('eggs')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eggs');
    }
};
