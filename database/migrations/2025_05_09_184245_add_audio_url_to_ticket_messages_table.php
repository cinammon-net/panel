<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('ticket_messages', function (Blueprint $table) {
            $table->string('audio_url')->nullable();
        });
    }
    /**
     * Reverse the migrations.
     */
    public function down()
    {
        Schema::table('ticket_messages', function (Blueprint $table) {
            $table->dropColumn('audio_url');
        });
    }
};
