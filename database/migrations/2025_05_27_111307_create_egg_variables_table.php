<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateEggVariablesTable extends Migration
{
    public function up()
    {
        Schema::create('egg_variables', function (Blueprint $table) {
            $table->id();
            $table->foreignId('egg_id')->constrained('eggs')->onDelete('cascade');
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('env_variable')->nullable();
            $table->string('default_value')->nullable();
            $table->boolean('user_viewable')->default(false);
            $table->boolean('user_editable')->default(false);
            $table->string('rules')->nullable();
            $table->integer('sort')->default(0);
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('egg_variables');
    }
}
