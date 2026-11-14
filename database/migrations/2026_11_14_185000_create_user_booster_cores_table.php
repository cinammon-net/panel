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
        if (!Schema::hasTable('user_booster_cores')) {
            Schema::create('user_booster_cores', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('user_id');
                $table->string('discord_id', 32)->index();
                $table->enum('mode', ['none', 'overclock', 'pod', 'shield'])->default('none');
                $table->unsignedBigInteger('target_server_id')->nullable();
                $table->unsignedBigInteger('allocated_server_id')->nullable();
                $table->boolean('boost_active')->default(true);
                $table->timestamp('boost_since')->nullable();
                $table->timestamp('last_reassigned_at')->nullable();
                $table->integer('extra_ram')->default(3072);
                $table->integer('extra_cpu')->default(150);
                $table->integer('extra_disk')->default(10240);
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('target_server_id')->references('id')->on('servers')->onDelete('set null');
                $table->foreign('allocated_server_id')->references('id')->on('servers')->onDelete('set null');
            });
        }

        Schema::table('servers', function (Blueprint $table) {
            if (!Schema::hasColumn('servers', 'booster_shield')) {
                $table->boolean('booster_shield')->default(false)->after('status');
            }
            if (!Schema::hasColumn('servers', 'is_booster_overclocked')) {
                $table->boolean('is_booster_overclocked')->default(false)->after('status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('servers', function (Blueprint $table) {
            if (Schema::hasColumn('servers', 'is_booster_overclocked')) {
                $table->dropColumn('is_booster_overclocked');
            }
            if (Schema::hasColumn('servers', 'booster_shield')) {
                $table->dropColumn('booster_shield');
            }
        });

        Schema::dropIfExists('user_booster_cores');
    }
};
