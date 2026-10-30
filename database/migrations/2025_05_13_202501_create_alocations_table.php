<?php

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('allocations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->mediumInteger('node_id')->unsigned();
            $table->mediumInteger('server_id')->unsigned()->nullable();
            $table->string('ip');
            $table->mediumInteger('port')->unsigned();
            $table->string('alias')->nullable();
            $table->mediumInteger('assigned_to')->unsigned()->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('allocations');
    }
};
