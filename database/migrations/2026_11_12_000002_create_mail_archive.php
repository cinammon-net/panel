<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mail_archive', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('to')->index();
            $table->string('subject');
            $table->string('view');
            $table->json('data');
            $table->timestamp('sent_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mail_archive');
    }
};
